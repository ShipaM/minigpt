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
