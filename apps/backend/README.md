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

## Effect conventions

The backend uses Effect 3 for runtime validation, upstream failures, and serialized
background writes. NestJS remains the dependency injection and HTTP/GraphQL layer.

- Define payloads with `Schema.Struct`, `Schema.Array`, and `Schema.Schema.Type`.
  Use mutable schemas where existing service interfaces require mutable arrays.
- Decode requests with `Schema.decodeUnknownEither` and map failures to a NestJS
  HTTP 400. Decode trusted service outputs with `Schema.decodeUnknownSync`.
  Validation error details now use Effect's formatter.
- Use the coercions in `src/schema/coercion.ts` for the existing query and upstream
  conversions. Number validation must reject `NaN`; optional query defaults must
  distinguish missing values from explicit `null`.
- Backend environment validation is defined in `src/schema/env.schema.ts`. Keep
  the common variable constraints aligned with `lib/shared/src/env.ts`, which
  still serves the other applications using Zod.
- Compose asynchronous upstream operations with `Effect.gen`, `Effect.tryPromise`,
  and tagged errors. `fetchJson` / `fetchResponse` validate HTTP status and retain
  causes without including URLs containing API keys in error messages.
- Run effects at NestJS/cache callbacks through `src/common/upstream.ts`'s
  `runPromise`, which rejects with the original typed error. Cache keys and TTLs
  stay in the existing cache layer; rejected loads are not successful results.
- `SerializedWriter` stores the latest background fiber in a `Ref`. Both logging
  services enqueue writes in order, recover write failures, and join pending work
  through `flush()` during shutdown. Keep these writes independent of the request
  lifecycle so a completed request does not interrupt its log write.

Run `pnpm lint`, `pnpm types:check`, `pnpm test:unit --runInBand`, and `pnpm build`
from this directory when changing these boundaries. Unit tests mock upstreams and
storage; end-to-end checks require the configured PostgreSQL, Redis, and API keys.
