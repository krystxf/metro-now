# Database

Shared database package using [Kysely](https://kysely.dev/) as the query builder with PostgreSQL.

## Prerequisites

- Node.js 20
- PostgreSQL 16 (use `pnpm docker:up:dev` from repo root)

## Setup

The database package reads its connection config from `apps/backend/.env.local`. Make sure that file exists (see [backend README](../backend/README.md)).

## Commands

| Command | Description |
| --- | --- |
| `pnpm build` | Compile to `dist/` |
| `pnpm migrate:deploy` | Run all pending migrations |
| `pnpm migrate:rollback` | Roll back the last migration |
| `pnpm seed` | Seed the database |
| `pnpm lint` | Lint with Biome |
| `pnpm types:check` | TypeScript type check |

## Migrations

Migration files are in `migrations/` and use Kysely's migration API. To add a new migration, create a file following the naming pattern `NNNN_description.ts`.
