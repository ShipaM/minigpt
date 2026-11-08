import { Client } from 'pg';
import { DataSource } from 'typeorm';
import { buildDataSourceOptions } from '../database/data-source.options.ts';

//URL of the test database. By default next to the dev DB from docker-compose, but a separate database.
export const TEST_DATABASE_URL =
  process.env['TEST_DATABASE_URL'] ?? 'postgresql://minigpt:minigpt@localhost:5432/minigpt_test';

//Creates the test database if it does not exist yet (idempotent).
export async function ensureDatabase(url: string): Promise<void> {
  const target = new URL(url);
  const dbName = target.pathname.replace(/^\//, '');
  const admin = new URL(url);
  admin.pathname = '/postgres';

  const client = new Client({ connectionString: admin.toString() });
  await client.connect();

  try {
    const { rowCount } = await client.query('SELECT 1 FROM pg_database WHERE datname = $1', [
      dbName,
    ]);
    if (!rowCount) {
      // A database name cannot be passed as a parameter; only safe identifiers are allowed.
      if (!/^[a-z0-9_]+$/i.test(dbName)) throw new Error(`Invalid database name: ${dbName}`);
      await client.query(`CREATE DATABASE "${dbName}"`);
    }
  } finally {
    await client.end();
  }
}

//Clean schema + all migrations from scratch: also proves migrations apply to an empty DB.
export async function resetDatabase(): Promise<DataSource> {
  const ds = new DataSource(
    buildDataSourceOptions({ DATABASE_URL: TEST_DATABASE_URL, NODE_ENV: 'test' }),
  );
  await ds.initialize();
  await ds.dropDatabase();
  await ds.runMigrations();
  return ds;
}
