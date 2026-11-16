{ pkgs, lib, config, ... }:
let
  testing = config.devenv.isTesting;
  database = if testing then "metro-now-test" else "metro-now";
  postgresPort = config.processes.postgres.ports.main.value;
  redisPort = config.processes.redis.ports.main.value;
in
{
  languages.javascript = {
    enable = true;
    package = pkgs.nodejs_22;
    # Corepack honors the exact pnpm version in package.json.
    corepack.enable = true;
    lsp.enable = false;
  };

  packages = [ pkgs.git pkgs.curl pkgs.direnv ];

  services.postgres = {
    enable = true;
    package = pkgs.postgresql_16;
    listen_addresses = "127.0.0.1";
    port = if testing then 15432 else 5432;
    initialDatabases = [{
      name = database;
      user = "postgres_user";
      pass = "postgres_password";
    }];
  };

  services.redis = {
    enable = true;
    bind = "127.0.0.1";
    port = if testing then 16379 else 6379;
  };

  env = {
    POSTGRES_USER = "postgres_user";
    POSTGRES_PASSWORD = "postgres_password";
    POSTGRES_DB = database;
    DB_HOST = "127.0.0.1";
    DB_PORT = postgresPort;
    DB_SCHEMA = "public";
    DATABASE_URL = "postgresql://postgres_user:postgres_password@127.0.0.1:${toString postgresPort}/${database}?schema=public";
    REDIS_HOST = "127.0.0.1";
    REDIS_PORT = redisPort;
  } // lib.optionalAttrs testing {
    # These E2E suites exercise local data, not authenticated upstream calls.
    GOLEMIO_API_KEY = "devenv-local-e2e";
  };

  scripts.metro-setup.exec = ''
    set -euo pipefail
    cd "$DEVENV_ROOT"
    pnpm install --frozen-lockfile
  '';

  scripts.metro-db-setup.exec = ''
    set -euo pipefail
    cd "$DEVENV_ROOT"
    pnpm --filter @metro-now/database migrate:deploy
    pnpm --filter @metro-now/database seed
  '';

  enterTest = ''
    set -euo pipefail
    cd "$DEVENV_ROOT"
    test "$(node --version | cut -d. -f1)" = v22
    test "$(pnpm --version)" = "$(node -p "require('./package.json').packageManager.split('@')[1]")"
    wait_for_processes
    wait_for_port ${toString postgresPort}
    wait_for_port ${toString redisPort}
    metro-setup
    metro-db-setup
    # Forward the service environment through Turbo and always run against this DB.
    pnpm turbo run test:e2e --filter=@metro-now/backend --env-mode=loose --force
  '';
}
