FROM mcr.microsoft.com/devcontainers/javascript-node:20

WORKDIR /workspaces/metro-now

ENV PNPM_HOME=/workspaces/pnpm
RUN corepack enable pnpm

COPY pnpm-lock.yaml ./

# pre-loads required packages from pnpm-lock.yaml into the store,
# ready to be installed with `pnpm install`
RUN pnpm fetch