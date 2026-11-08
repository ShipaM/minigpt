# MiniGPT

A small training platform for neural networks: Next.js (FSD) + NestJS (CQRS) + Postgres.
Built following an interview preparation plan; work with agents is documented in `docs/agent-log.md`.

## Requirements

Node.js 26 LTS (22.13+ and 24 also work; 23 and 25 are not supported), npm 10.9+ (ships with Node), Docker.

## Quick start

```bash
npm install
cp .env.example .env
npm run check

# API (in one terminal)
npm run build -w @minigpt/api && npm start -w @minigpt/api

# website (in another terminal)
npm run dev -w @minigpt/web
```

API: http://localhost:4000/health · Web: http://localhost:3000

## Structure

- `apps/api` — NestJS 12
- `apps/web` — Next.js 16 (App Router)
- `packages/contracts` — shared Zod schemas and types
- `CLAUDE.md` — rules for the agent

## Database

```bash
npm run db:up                           # Postgres in Docker
npm run migration:run -w @minigpt/api   # create tables
npm run test:int -w @minigpt/api        # integration tests (need Postgres)
```

Swagger: http://localhost:4000/docs (outside production)
