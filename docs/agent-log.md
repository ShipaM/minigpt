# Agent log

## 2026-11-02

- Project scaffold: npm workspaces with `apps/api`, `apps/web`, `packages/contracts`.
- Translated `CLAUDE.md` and `README.md` to English.
- Fixed the findings from the scaffold code review:
  - Postgres port is published on `127.0.0.1` only.
  - `parseEnv` rejects the `.env.example` JWT secret in production, non-Postgres `DATABASE_URL`, and out-of-range `PORT`; an empty `PORT` falls back to the default.
  - `.gitignore` covers all `.env*` files except `.env.example`.
  - API and web scripts build `@minigpt/contracts` first, so they work on a clean clone.
  - `engines` matches the Node versions supported by Vitest.
  - Added an HTTP test for `GET /health`; `uptimeSeconds` must be an integer.
  - `types: ["node"]` moved from the base tsconfig to `apps/api`.
- Translated all remaining Russian text to English: comments, test descriptions, log and error messages, web page text; `<html lang>` is now `en`.
- Added `npm run dev`: builds contracts and API, then runs them in watch mode together with `next dev` (`scripts/dev.mjs`, no new dependencies). API restarts keep the terminal output (`--watch-preserve-output`), so the Next.js URL stays visible.
- `docker-compose.yml` reads Postgres credentials from the root `.env` (`POSTGRES_USER`, `POSTGRES_PASSWORD`, `POSTGRES_DB`); Compose fails with a clear message if one is missing. Added them to `.env.example`.

## 2026-11-03

- Added tests for `UserResponseSchema` (`users.spec.ts` was a copy of the health tests and failed) and `ErrorResponseSchema` (`errors.spec.ts`).
- Fixed `UsersController` validation: `CreateUserDto` was imported with `import type`, so decorator metadata held `Object` and `ValidationPipe` skipped validation and transforms (3 tests failed). Now a value import.

## 2026-11-08

- Added tests for `GET /users` (`getAllUsers`): controller spec (list mapped to the contract without `updatedAt`, empty array) and integration spec (returns all created users). The endpoint was missing from Swagger because `dist/` was stale; a rebuild fixed it, no code change needed.
- `UsersService.getAllUsers` now orders by `createdAt ASC`; the integration test checks the order.
- Added `npm run docs` (`scripts/docs.mjs`): opens Swagger UI in the browser; if the API is not running, builds and starts it first (Ctrl+C stops it). No new dependencies.
