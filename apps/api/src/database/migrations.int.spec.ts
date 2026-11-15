import type { DataSource } from 'typeorm';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { ensureDatabase, resetDatabase, TEST_DATABASE_URL } from '../test/test-db.ts';

describe('Migrations (integration)', () => {
  let ds: DataSource;

  beforeAll(async () => {
    await ensureDatabase(TEST_DATABASE_URL);
    ds = await resetDatabase();
  });

  afterAll(async () => {
    await ds?.destroy();
  });

  const tableExists = async (name: string) =>
    (await ds.query('SELECT to_regclass($1) AS t', [`public.${name}`]))[0].t !== null;

  it('apply to an empty database from scratch', async () => {
    for (const table of ['users', 'refresh_tokens', 'chats', 'messages']) {
      expect(await tableExists(table)).toBe(true);
    }
  });

  it('can be reverted (down) and applied again (up)', async () => {
    await ds.undoLastMigration();

    expect(await tableExists('messages')).toBe(false);
    expect(await tableExists('chats')).toBe(false);
    expect(await tableExists('users')).toBe(true);

    await ds.runMigrations();

    expect(await tableExists('messages')).toBe(true);
  });

  it('the database rejects a message role other than user and assistant', async () => {
    const [{ id: userId }] = await ds.query(
      "INSERT INTO users (email, display_name, password_hash) VALUES ('c@example.com', 'C', 'x') RETURNING id",
    );

    const [{ id: chatId }] = await ds.query(
      "INSERT INTO chats (user_id, title) VALUES ($1, 'T') RETURNING id",
      [userId],
    );

    await expect(
      ds.query("INSERT INTO messages (chat_id, role, content) VALUES ($1, 'system', 'hi')", [
        chatId,
      ]),
    ).rejects.toThrow(/CHK_messages_role/);
  });

  it('schema matches the entities: no new migration needs to be generated', async () => {
    const sqlInMemory = await ds.driver.createSchemaBuilder().log();

    expect(sqlInMemory.upQueries.map((q) => q.query)).toEqual([]);
  });
});
