# Dataloader

Background worker that syncs transit data from external APIs into the database on a cron schedule. Built with TypeScript, Express, and node-cron.

## Supported providers

The worker imports Prague/PID and the existing Leo Express integration only.
PID supplies Prague integrated transit, including its regional rail services;
Leo Express adds the existing rail feed and stop matching. Leo's current feed
coverage is preserved.

Brno, Bratislava, Liberec, Plzeň/PMDP, Ústí, and Slovak ŽSR importers have been
removed. Their stored entities are pruned by the existing transactional snapshot
sync on its next successful run. Historical database and GraphQL feed enum values
remain for compatibility with existing databases and clients; they do not enable
additional importers.

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
