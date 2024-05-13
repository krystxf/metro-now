# Metro now websocket server

Websocket endpoint to simplify getting real-time data from Golemio departureboards API

-   stack: [Bun](https://github.com/oven-sh/bun), [Typescript](https://github.com/microsoft/TypeScript)

## Run dev

1. install dependencies:

    ```bash
    bun install
    ```

2. create `.env` according to `.env.example`

3. run
    ```bash
    bun run start
    # run in watch mode
    bun run start:dev
    ```

## Run build

```bash
bun run build

bun run start:build
```

## Run in Docker

```bash
bun run docker:build

# update GOLEMIO_API_KEY in docker-compose.yml
docker-compose up
```
