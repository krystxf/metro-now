import assert from "node:assert/strict";
import test from "node:test";

import { z } from "zod";

import {
    commonServerEnvSchema,
    databaseEnvSchema,
    redisEnvSchema,
    validateEnv,
} from "../env";

const VALID_DB_ENV = {
    POSTGRES_USER: "postgres_user",
    POSTGRES_PASSWORD: "postgres_password",
    POSTGRES_DB: "metro-now",
    DB_HOST: "localhost",
    DB_PORT: "5432",
    DB_SCHEMA: "public",
} as const;

test("validateEnv returns the parsed env when every required field is present", () => {
    const parsed = validateEnv(databaseEnvSchema, VALID_DB_ENV);

    assert.equal(parsed.POSTGRES_USER, "postgres_user");
    assert.equal(parsed.DB_HOST, "localhost");
});

test("databaseEnvSchema coerces DB_PORT from string to number", () => {
    const parsed = validateEnv(databaseEnvSchema, VALID_DB_ENV);

    assert.equal(typeof parsed.DB_PORT, "number");
    assert.equal(parsed.DB_PORT, 5432);
});

test("databaseEnvSchema preserves optional DATABASE_URL when provided", () => {
    const parsed = validateEnv(databaseEnvSchema, {
        ...VALID_DB_ENV,
        DATABASE_URL: "postgres://a:b@localhost:5432/db",
    });

    assert.equal(parsed.DATABASE_URL, "postgres://a:b@localhost:5432/db");
});

test("databaseEnvSchema rejects env missing a required field", () => {
    const { DB_HOST: _omitted, ...missingHost } = VALID_DB_ENV;

    assert.throws(
        () => validateEnv(databaseEnvSchema, missingHost as NodeJS.ProcessEnv),
        (error: unknown) => error instanceof z.ZodError,
        "omitting DB_HOST must produce a ZodError, not a generic Error",
    );
});

test("databaseEnvSchema rejects empty-string required fields", () => {
    assert.throws(
        () =>
            validateEnv(databaseEnvSchema, {
                ...VALID_DB_ENV,
                POSTGRES_USER: "",
            }),
        (error: unknown) => error instanceof z.ZodError,
        "min(1) strings must not accept empty POSTGRES_USER",
    );
});

test("databaseEnvSchema rejects a non-positive DB_PORT", () => {
    assert.throws(
        () =>
            validateEnv(databaseEnvSchema, {
                ...VALID_DB_ENV,
                DB_PORT: "0",
            }),
        (error: unknown) => error instanceof z.ZodError,
        "DB_PORT=0 is never valid for Postgres; schema must reject it",
    );
});

test("redisEnvSchema accepts an empty env (all fields optional)", () => {
    const parsed = validateEnv(redisEnvSchema, {});

    assert.equal(parsed.REDIS_HOST, undefined);
    assert.equal(parsed.REDIS_PORT, undefined);
});

test("redisEnvSchema coerces REDIS_PORT when provided", () => {
    const parsed = validateEnv(redisEnvSchema, {
        REDIS_HOST: "redis.internal",
        REDIS_PORT: "6379",
    });

    assert.equal(parsed.REDIS_PORT, 6379);
    assert.equal(typeof parsed.REDIS_PORT, "number");
});

test("commonServerEnvSchema merges db + redis + server fields", () => {
    const parsed = validateEnv(commonServerEnvSchema, {
        ...VALID_DB_ENV,
        REDIS_HOST: "redis.internal",
        REDIS_PORT: "6379",
        PORT: "8080",
        LOGS: "debug",
    });

    assert.equal(parsed.POSTGRES_USER, "postgres_user");
    assert.equal(parsed.REDIS_HOST, "redis.internal");
    assert.equal(parsed.PORT, 8080);
    assert.equal(parsed.LOGS, "debug");
});

test("commonServerEnvSchema coerces PORT to a number", () => {
    const parsed = validateEnv(commonServerEnvSchema, {
        ...VALID_DB_ENV,
        PORT: "3000",
    });

    assert.equal(parsed.PORT, 3000);
    assert.equal(typeof parsed.PORT, "number");
});

test("validateEnv defaults to process.env when no env is supplied", () => {
    const schema = z.object({ NODE_OPTIONS: z.string().optional() });
    const parsed = validateEnv(schema);

    assert.ok(
        typeof parsed.NODE_OPTIONS === "string" ||
            parsed.NODE_OPTIONS === undefined,
        "default process.env argument must produce a well-formed parsed object",
    );
});
