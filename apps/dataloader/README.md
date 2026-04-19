# Dataloader

Background worker that syncs transit data from external APIs into the database on a cron schedule. Built with TypeScript, Express, and node-cron.

## Prerequisites

- Node.js 20
- PostgreSQL 16
- Redis
- [Golemio API key](https://api.golemio.cz/api-keys/auth/sign-up)

## Setup

1. Start the database and Redis:

```bash
# from repo root
pnpm docker:up:dev
```

2. The dataloader shares the backend's env file. Make sure `apps/backend/.env.local` exists (see [backend README](../backend/README.md)).

3. Run database migrations if not done already:

```bash
pnpm turbo run migrate:deploy --filter=@metro-now/database
```

4. Start the dev server:

```bash
pnpm turbo run dev --filter=@metro-now/dataloader
```

## Commands

| Command | Description |
| --- | --- |
| `pnpm dev` | Start with file watching (nodemon) |
| `pnpm build` | Compile to `dist/` |
| `pnpm start` | Run compiled `dist/app.js` |
| `pnpm test:unit` | Run unit tests (Node test runner) |
| `pnpm lint` | Lint with Biome |
| `pnpm types:check` | TypeScript type check |
