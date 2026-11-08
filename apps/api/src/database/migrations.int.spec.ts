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
    expect(await tableExists('users')).toBe(true);
    expect(await tableExists('refresh_tokens')).toBe(true);
  });

  it('can be reverted (down) and applied again (up)', async () => {
    await ds.undoLastMigration();
    expect(await tableExists('refresh_tokens')).toBe(false);
    expect(await tableExists('users')).toBe(true);
    await ds.runMigrations();
    expect(await tableExists('refresh_tokens')).toBe(true);
  });

  it('schema matches the entities: no new migration needs to be generated', async () => {
    const sqlInMemory = await ds.driver.createSchemaBuilder().log();
    expect(sqlInMemory.upQueries.map((q) => q.query)).toEqual([]);
  });
});
