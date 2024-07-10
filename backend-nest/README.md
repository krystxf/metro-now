# METRO NOW BACKEND

## Setup

```shell
cp .env.local.example .env.local
cp .env.docker.example .env.docker


## production
docker compose up


## dev
# run postgres container if needed
docker compose -f compose.postgres.yaml up -d

pnpm i
pnpm prisma:push
pnpm prisma:generate

pnpm dev
```
