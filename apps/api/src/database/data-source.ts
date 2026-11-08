import 'reflect-metadata';
import { DataSource } from 'typeorm';
import { parseEnv } from '../config/env.ts';
import { buildDataSourceOptions } from './data-source.options.ts';

//Entry point for the TypeORM CLI (see the `migration:*` scripts in package.json).
export default new DataSource(buildDataSourceOptions(parseEnv(process.env)));
