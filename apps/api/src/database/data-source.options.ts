import type { DataSourceOptions } from 'typeorm';
import type { Env } from '../config/env.ts';
import { RefreshTokenEntity } from '../modules/auth/refresh-token.entity.ts';
import { UserEntity } from '../modules/users/user.entity.ts';
import { migrations } from './migrations/index.ts';

//The single source of database settings: used both by the application and by the migration CLI.
//`synchronize` is off on purpose: the schema changes only through migrations.
export function buildDataSourceOptions(
  env: Pick<Env, 'DATABASE_URL' | 'NODE_ENV'>,
): DataSourceOptions {
  return {
    type: 'postgres',
    url: env.DATABASE_URL,
    entities: [UserEntity, RefreshTokenEntity],
    migrations,
    synchronize: false,
    uuidExtension: 'pgcrypto',
    installExtensions: false,
    // In development we see every SQL query: this is how N+1 problems are caught.
    logging: env.NODE_ENV === 'development' ? ['query', 'error'] : ['error'],
  };
}
