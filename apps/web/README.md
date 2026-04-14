# Web

Documentation and marketing site built with [Next.js](https://nextjs.org/), [Nextra](https://nextra.site/), and [Tailwind CSS](https://tailwindcss.com/).

## Prerequisites

- Node.js 20
- [Mapbox access token](https://docs.mapbox.com/help/getting-started/access-tokens/)

## Setup

1. Copy env and add your Mapbox token:

```bash
cp .env.local.example .env.local
```

2. Start the dev server:

```bash
pnpm turbo run dev --filter=@metro-now/web
```

The site is available at `http://localhost:3000`.

## Commands

| Command | Description |
| --- | --- |
| `pnpm dev` | Start dev server |
| `pnpm build` | Production build |
| `pnpm start` | Start production server |
| `pnpm lint` | Lint with ESLint |
| `pnpm types:check` | TypeScript type check |

## Environment variables

See [`.env.local.example`](.env.local.example).

| Variable | Required | Description |
| --- | --- | --- |
| `NEXT_PUBLIC_MAPBOX_TOKEN` | Yes | Mapbox GL token for map views |
