ARG NODE_IMAGE=node:24-slim@sha256:03eae3ef7e88a9de535496fb488d67e02b9d96a063a8967bae657744ecd513f2

FROM ${NODE_IMAGE} AS base
ENV PNPM_HOME="/pnpm"
ENV PATH="$PNPM_HOME:$PATH"
RUN corepack enable && corepack prepare pnpm@10.33.0 --activate

FROM base AS deps
WORKDIR /usr/src/app
COPY pnpm-lock.yaml pnpm-workspace.yaml package.json ./
COPY apps/web/package.json ./apps/web/
COPY apps/backend/package.json ./apps/backend/
COPY apps/mobile/package.json ./apps/mobile/
COPY apps/dataloader/package.json ./apps/dataloader/
COPY lib/database/package.json ./lib/database/
COPY lib/server/package.json ./lib/server/
COPY lib/shared/package.json ./lib/shared/
RUN --mount=type=cache,id=pnpm,target=/pnpm/store pnpm install --frozen-lockfile

FROM deps AS build
COPY . /usr/src/app
RUN pnpm exec turbo run build --filter=@metro-now/backend --filter=@metro-now/dataloader --filter=@metro-now/web

FROM build AS deploy_backend
RUN pnpm deploy --filter=@metro-now/backend --prod /prod/backend

FROM build AS deploy_dataloader
RUN pnpm deploy --filter=@metro-now/dataloader --prod /prod/dataloader

FROM build AS deploy_migrations
RUN pnpm deploy --filter=@metro-now/database /prod/migrations

FROM ${NODE_IMAGE} AS metro-now_migrations
LABEL org.opencontainers.image.source="https://github.com/krystxf/metro-now"
COPY --from=deploy_migrations --chown=node:node /prod/migrations /prod/migrations
WORKDIR /prod/migrations
USER node
CMD [ "node_modules/.bin/ts-node", "migrate.ts", "up" ]

FROM ${NODE_IMAGE} AS metro-now_web
LABEL org.opencontainers.image.source="https://github.com/krystxf/metro-now"
WORKDIR /prod/web
COPY --from=build --chown=node:node /usr/src/app/apps/web/.next/standalone /prod/web/
COPY --from=build --chown=node:node /usr/src/app/apps/web/.next/static /prod/web/apps/web/.next/static
COPY --from=build --chown=node:node /usr/src/app/apps/web/public /prod/web/apps/web/public
USER node
EXPOSE 3000
CMD [ "node", "apps/web/server.js" ]

FROM ${NODE_IMAGE} AS metro-now_backend
LABEL org.opencontainers.image.source="https://github.com/krystxf/metro-now"
COPY --from=deploy_backend --chown=node:node /prod/backend /prod/backend
WORKDIR /prod/backend
USER node
EXPOSE 3001
CMD [ "node", "dist/main" ]

FROM ${NODE_IMAGE} AS metro-now_dataloader
LABEL org.opencontainers.image.source="https://github.com/krystxf/metro-now"
COPY --from=deploy_dataloader --chown=node:node /prod/dataloader /prod/dataloader
WORKDIR /prod/dataloader
ENV NODE_OPTIONS="--max-old-space-size=4096"
USER node
EXPOSE 3008
CMD [ "node", "dist/app.js" ]
