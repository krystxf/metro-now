<a href="https://apps.apple.com/cz/app/metro-now/id6504659402?platform=appleWatch">
  <img alt="App store link" src="https://raw.githubusercontent.com/krystxf/metro-now/refs/heads/main/apps/web/public/download-on-appstore-dark.svg" />
</a>
<a href="https://play.google.com/store/apps/details?id=dev.metronow.android&hl=en">
  <img alt="Get it on Google Play" src="https://play.google.com/intl/en_us/badges/static/images/badges/en_badge_web_generic.png" height="54" />
</a>

<br/>

# Metro now

<div align="center">
  <a href="https://api.metronow.dev">
    <b>REST API</b>
  </a>
  •
  <a href="https://api.metronow.dev/graphql">
    <b>GraphQL</b>
  </a>
  •
  <a href="https://status.uptime-monitor.io/6712f0b0063af5950476d77c">
    <b>Status</b>
  </a>
</div>

![Apple watch screenshots](https://github.com/krystxf/metro-now/assets/48121710/3ce8f583-c260-4588-b63d-63ecadd22333)

Metro Now is a transit monorepo built around a NestJS backend, a Next.js web app, a background dataloader, and shared database packages. The repository uses `pnpm` workspaces and Turborepo for task orchestration, caching, and dependency-aware builds.

## Architecture

```mermaid
flowchart LR
    subgraph Clients["Client apps"]
        mobile["Mobile app<br/>iOS / watchOS"]
        web["Web app<br/>landing page and map"]
    end

    subgraph Runtime["Runtime services"]
        backend["Backend API<br/>NestJS REST + GraphQL"]
        dataloader["Dataloader<br/>sync jobs and validation"]
        redis["Redis<br/>response cache"]
        postgres["PostgreSQL<br/>persistent transit data"]
    end

    subgraph Shared["Shared packages"]
        database["Database package<br/>schema, migrations, seeds"]
        shared["Shared library<br/>types and helpers"]
    end

    subgraph Sources["External data sources"]
        pid["PID / GTFS feeds"]
        golemio["Golemio API"]
    end

    mobile -->|"requests departures, stops, routes"| backend
    web -->|"loads API-backed content"| backend
    backend -->|"reads application data"| postgres
    backend -->|"stores and reads cached responses"| redis
    backend -->|"fetches selected live data"| golemio
    dataloader -->|"downloads scheduled datasets"| pid
    dataloader -->|"normalizes and writes snapshots"| postgres
    database -.->|"defines schema for"| postgres
    shared -.->|"shared code for"| backend
    shared -.->|"shared code for"| dataloader
```

## Workspace layout

```text
apps/
  backend/      NestJS API
  database/     database package, migrations, seeds
  dataloader/   background sync worker
  mobile/       iOS / watchOS app
  web/          Next.js website
lib/
  shared/       shared TypeScript package
```

## Requirements

- Node.js 20
- `pnpm` 9.1.0 via Corepack
- Docker Desktop for local PostgreSQL, Redis, and container builds
- Xcode for the mobile app

## Getting started

Install dependencies once at the repository root:

```bash
corepack enable
pnpm install --frozen-lockfile
```

Create the backend local environment file:

```bash
cp apps/backend/.env.local.example apps/backend/.env.local
```

Then update `apps/backend/.env.local` with your local values. For containerized runs, the repo also includes `.env.docker` and `.env.web.docker`.

## Development

Start local infrastructure only:

```bash
pnpm docker:up:dev
```

Run the main JavaScript development tasks through Turborepo:

```bash
pnpm dev
```

Useful scoped commands:

```bash
pnpm turbo run dev --filter=@metro-now/backend
pnpm turbo run start:debug --filter=@metro-now/backend
pnpm turbo run dev --filter=@metro-now/web
pnpm turbo run dev --filter=@metro-now/dataloader
```

Open the Apple app in Xcode:

```bash
pnpm xcode
```

## Common commands

All commands are run from the repository root.

```bash
pnpm build
pnpm test
pnpm lint
pnpm types:check
pnpm format:check
pnpm format
pnpm app:format
```

`pnpm format` and `pnpm format:check` run Biome for `apps/backend`, `apps/dataloader`, and `lib/shared`. `pnpm app:format` is the separate Swift formatting entry point for the mobile app.

Scoped commands:

```bash
pnpm turbo run build --filter=@metro-now/backend
pnpm turbo run test --filter=@metro-now/backend
pnpm turbo run test:e2e --filter=@metro-now/backend
pnpm turbo run lint --filter=@metro-now/backend
pnpm turbo run types:check --filter=@metro-now/backend
pnpm turbo run typegen --filter=@metro-now/backend

pnpm turbo run build --filter=@metro-now/web
pnpm turbo run lint --filter=@metro-now/web
pnpm turbo run types:check --filter=@metro-now/web

pnpm turbo run migrate:deploy --filter=@metro-now/database
pnpm turbo run migrate:rollback --filter=@metro-now/database
pnpm turbo run seed --filter=@metro-now/database
```

## Docker

Start the full stack with container builds:

```bash
pnpm docker:up
```

Stop containers and remove volumes:

```bash
pnpm docker:down
```

The default compose setup exposes:

- Web: `http://localhost:3000`
- Backend: `http://localhost:3001`
- PostgreSQL: `localhost:5532`
- Redis: `localhost:6479`
- Redis Stack UI: `http://localhost:8101`

## Turborepo

Turborepo is the task runner for this repository. Root scripts such as `pnpm build`, `pnpm dev`, and `pnpm test` resolve package dependencies automatically instead of relying on manual `cd`-based workflows.

Package-specific task configuration lives in:

- `turbo.json`
- `apps/backend/turbo.json`
- `apps/web/turbo.json`

## CI

GitHub Actions uses the same root commands exposed locally:

- backend CI runs the backend Turbo tasks
- web CI runs the web Turbo tasks
- format CI runs Biome from the root
- Docker CI builds the production images from the root `Dockerfile`

## Notes

- The mobile app is part of the monorepo, but it is developed through Xcode rather than a Turbo `build` or `dev` task.
- Backend GraphQL types are generated through `pnpm turbo run typegen --filter=@metro-now/backend` and are also wired into the Turbo task graph for backend builds and e2e tests.
