FROM node:20-slim AS base
ENV PNPM_HOME="/pnpm"
ENV PATH="$PNPM_HOME:$PATH"
RUN npm install -g corepack
RUN corepack enable
RUN corepack prepare pnpm@10.33.0 --activate

RUN apt-get update \
    && apt-get install -y openssl \
    && rm -rf /var/lib/apt/lists/* \
    && rm -rf /var/cache/apt/*

FROM base AS build

ARG TURBO_TOKEN=
ARG TURBO_TEAM=
ENV TURBO_TOKEN=$TURBO_TOKEN
ENV TURBO_TEAM=$TURBO_TEAM

COPY . /usr/src/app
WORKDIR /usr/src/app
RUN --mount=type=cache,id=pnpm,target=/pnpm/store pnpm install --frozen-lockfile
RUN pnpm exec turbo run build --filter=@metro-now/backend --filter=@metro-now/dataloader --filter=@metro-now/web
RUN pnpm deploy --filter=@metro-now/web --prod --legacy /prod/web
RUN pnpm deploy --filter=@metro-now/backend --prod --legacy /prod/backend
RUN pnpm deploy --filter=@metro-now/dataloader --prod --legacy /prod/dataloader
COPY apps/backend/src/**.*.graphql /prod/backend/dist

FROM build AS metro-now_migrations
WORKDIR /usr/src/app/apps/database
CMD [ "npx", "ts-node", "migrate.ts", "up" ]

FROM base AS metro-now_web
COPY --from=build /prod/web /prod/web
WORKDIR /prod/web
EXPOSE 3000
CMD [ "pnpm", "start" ]

FROM base AS metro-now_backend
COPY --from=build /prod/backend /prod/backend
WORKDIR /prod/backend
EXPOSE 3001
CMD [ "pnpm", "start:prod" ]

FROM base AS metro-now_dataloader
COPY --from=build /prod/dataloader /prod/dataloader
WORKDIR /prod/dataloader
ENV NODE_OPTIONS="--max-old-space-size=4096"
EXPOSE 3008
CMD [ "pnpm", "start" ]
