# CLAUDE.md

# MiniGPT

A small training platform for neural networks (chats, response streaming, token balance).
Project goal: practice the stack from the job posting (Next.js + FSD, NestJS + CQRS) and working with agents.

## Commands

- `npm install` # dependencies (npm workspaces)
- `npm run check` # build contracts + lint + typecheck + tests. RUN BEFORE FINISHING A TASK
- `npm run db:up` # Postgres in Docker
- `npm run format` # Prettier
- Single-package script: `npm run <script> -w @minigpt/api` (or `-w @minigpt/web`, `-w @minigpt/contracts`)
- API: `npm run build -w @minigpt/api`, then `npm start -w @minigpt/api` (variables come from the root `.env`)

## Structure

- `apps/api` — NestJS 12 (ESM). Controllers are thin; logic lives in CommandBus/QueryBus (CQRS, from day 4).
- `apps/web` — Next.js 16 (App Router). From day 7, FSD structure: app/pages/widgets/features/entities/shared.
- `packages/contracts` — shared Zod schemas and types. After editing, run `npm run build:contracts`.

## Stack and code style

- Everything is ESM (`"type": "module"`), TypeScript 6 (`module: nodenext`, `verbatimModuleSyntax`).
- Write relative imports with the `.ts` extension: `import { x } from './x.ts'` (TS rewrites them to `.js` at build time). In `apps/web` extensions are not needed (bundler).
- Import types with `import type`. Node built-in modules: `node:fs`, `node:path`.
- Zod 4: `z.url()`, `z.email()`, `z.uuid()`, `z.iso.datetime()` (not `z.string().url()`).
- Tests: Vitest, import everything explicitly from `vitest` (no global `describe/it`).
- Environment variables for the API are loaded by Node: `node --env-file-if-exists=../../.env`. The `dotenv` package is not needed.

## Architecture rules

- FSD: imports only go down the layers; slices of the same layer do not import each other; access a slice from outside only through its `index.ts`.
- A controller contains no business logic and does not access the database directly.
- All input (HTTP, env) is validated: class-validator in DTOs, Zod for env and contracts.
- Every endpoint checks not only "who you are" but also "whether this resource is yours".
- Money/balance: only inside a transaction and with an idempotency key for the operation.
- The database schema changes only through migrations.
- Next.js 16: the `middleware.ts` file was renamed to `proxy.ts`. Do not create a proxy without a clear need: check access in Server Components (through the data access layer), Route Handlers, Server Actions, and on the API (guards).

## Prohibitions

- Do not add dependencies without approval.
- Do not use `any`, `@ts-ignore`, or empty `catch` blocks.
- Do not change a test to make it pass without explaining why the expectation was wrong.
- No secrets in code or in `NEXT_PUBLIC_*`. Do not commit `.env`.
- Do not run `npm audit fix --force` (it proposes downgrading ESLint to 4.0.0). `audit` findings for dev tools are reviewed separately.
- Versions: use the latest stable ones. Exception: keep TypeScript on `~6.0` until `typescript-eslint` and `@nestjs/swagger` announce TypeScript 7 support (check when updating).

## Process

- For a task touching more than 3 files: plan first, code after approval.
- One meaningful diff per task. Do not touch unrelated files.
- Add a test for every logic change.
- After finishing work, briefly add an entry to `docs/agent-log.md`.

## Database and migrations

- ORM: TypeORM 1.x. The schema changes only through migrations (`synchronize` is off). Read every generated migration: check `down` and defaults.
- `npm run migration:generate -w @minigpt/api -- src/database/migrations/<Name>` generates a migration from the entity diff; then register the new class in `src/database/migrations/index.ts`.
- `npm run migration:run -w @minigpt/api` applies migrations; `npm run migration:revert -w @minigpt/api` reverts the last one.
- `npm run test:int -w @minigpt/api` runs integration tests (needs Postgres: `npm run db:up`; the `minigpt_test` database is created automatically).
- Tests that need a database are named `*.int.spec.ts`; fast ones without external services are `*.spec.ts`.
- The API never returns database entities: map to types from `packages/contracts`.
- New app-wide settings (pipes, filters) go to `app.setup.ts`, so both production and tests see them.
- Swagger is available at `/docs` outside production.

## Authentication

- Every endpoint requires a valid access token by default (global `JwtAuthGuard`). Only endpoints
  ↪ marked `@Public()` are open: health, register, login, refresh, logout. Never remove the global
  ↪ guard; mark the exception instead.
- Access token: JWT (HS256, 15 min) with only `sub`. Send it as `Authorization: Bearer <token>` an
  ↪ d keep it in memory on the client, not in `localStorage`.
- Refresh token: random opaque string in an `httpOnly`, `SameSite=Strict`, `Path=/auth` cookie. Th
  ↪ e database stores only its SHA-256. Every refresh rotates it; reuse of a rotated token revokes
  ↪ all sessions of the user.
- Passwords: scrypt via `PasswordService`. Never log, return or store a password or a refresh toke
  ↪ n. The `password_hash` column is `select: false`; load it explicitly only for login.
- Every endpoint that takes a resource id must check that the resource belongs to `@CurrentUser()`
  ↪ (see `GET /users/:id`).
- Login answers with the same 401 message for an unknown email and a wrong password.
- Users are created only by `POST /auth/register`.
