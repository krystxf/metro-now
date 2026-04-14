# Backend

REST and GraphQL API built with [NestJS](https://nestjs.com/) and [Apollo Server](https://www.apollographql.com/docs/apollo-server/).

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

2. Copy env and fill in your Golemio API key:

```bash
cp .env.local.example .env.local
```

3. Run database migrations:

```bash
pnpm turbo run migrate:deploy --filter=@metro-now/database
```

4. Start the dev server:

```bash
pnpm turbo run dev --filter=@metro-now/backend
```

The API is available at `http://localhost:3001`. GraphQL playground is at `/graphql`.

## Commands

| Command | Description |
| --- | --- |
| `pnpm dev` | Start dev server with watch |
| `pnpm start:debug` | Start with debugger attached |
| `pnpm build` | Compile to `dist/` |
| `pnpm test:unit` | Run unit tests |
| `pnpm test:e2e` | Run end-to-end tests |
| `pnpm typegen` | Generate GraphQL types |
| `pnpm lint` | Lint with Biome |
| `pnpm types:check` | TypeScript type check |

## Environment variables

See [`.env.local.example`](.env.local.example) for the full list. Key variables:

| Variable | Required | Description |
| --- | --- | --- |
| `GOLEMIO_API_KEY` | Yes | Prague transit data API |
| `TRANSIT_LAND_API_KEY` | No | Transit.land API |
| `DATABASE_URL` | Yes | PostgreSQL connection string |
| `REDIS_HOST` / `REDIS_PORT` | Yes | Redis connection |
