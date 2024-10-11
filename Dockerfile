FROM node:20-slim AS base
ENV PNPM_HOME="/pnpm"
ENV PATH="$PNPM_HOME:$PATH"
RUN corepack enable

RUN apt-get update \
    && apt-get install -y openssl \
    && rm -rf /var/lib/apt/lists/* \
    && rm -rf /var/cache/apt/*

FROM base AS build
COPY . /usr/src/app
WORKDIR /usr/src/app
RUN --mount=type=cache,id=pnpm,target=/pnpm/store pnpm install --frozen-lockfile
RUN pnpm run -r --parallel build
RUN pnpm deploy --filter=@metro-now/web --prod /prod/web
RUN pnpm deploy --filter=@metro-now/backend --prod /prod/backend


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