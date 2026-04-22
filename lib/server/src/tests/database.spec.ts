import assert from "node:assert/strict";
import test from "node:test";

import { createDatabaseUrl } from "../database";

test("createDatabaseUrl expands ${VAR} placeholders in DATABASE_URL", () => {
    const url = createDatabaseUrl({
        DATABASE_URL:
            "postgresql://${POSTGRES_USER}:${POSTGRES_PASSWORD}@${DB_HOST}:${DB_PORT}/${POSTGRES_DB}?schema=${DB_SCHEMA}",
        POSTGRES_USER: "postgres_user",
        POSTGRES_PASSWORD: "postgres_password",
        POSTGRES_DB: "metro-now",
        DB_HOST: "localhost",
        DB_PORT: "5432",
        DB_SCHEMA: "public",
    });

    assert.equal(
        url,
        "postgresql://postgres_user:postgres_password@localhost:5432/metro-now?schema=public",
    );
});

test("createDatabaseUrl strips matching double quotes around DATABASE_URL", () => {
    const url = createDatabaseUrl({
        DATABASE_URL: '"postgresql://user:pw@host:5432/db?schema=public"',
    });

    assert.equal(url, "postgresql://user:pw@host:5432/db?schema=public");
});

test("createDatabaseUrl strips matching single quotes around DATABASE_URL", () => {
    const url = createDatabaseUrl({
        DATABASE_URL: "'postgresql://user:pw@host:5432/db?schema=public'",
    });

    assert.equal(url, "postgresql://user:pw@host:5432/db?schema=public");
});

test("createDatabaseUrl trims whitespace around DATABASE_URL", () => {
    const url = createDatabaseUrl({
        DATABASE_URL: "   postgresql://user:pw@host:5432/db   ",
    });

    assert.equal(url, "postgresql://user:pw@host:5432/db");
});

test("createDatabaseUrl substitutes missing ${VAR} references with empty strings", () => {
    const url = createDatabaseUrl({
        DATABASE_URL:
            "postgresql://${POSTGRES_USER}:${POSTGRES_PASSWORD}@localhost:5432/db",
        POSTGRES_USER: "user",
    });

    assert.equal(url, "postgresql://user@localhost:5432/db");
});

test("createDatabaseUrl does not touch literal $ sequences that are not ${VAR}", () => {
    const url = createDatabaseUrl({
        DATABASE_URL: "postgresql://user:pw$raw@localhost:5432/db",
    });

    assert.equal(url, "postgresql://user:pw$raw@localhost:5432/db");
});

test("createDatabaseUrl falls back to assembled parts when DATABASE_URL is unparseable", () => {
    const url = createDatabaseUrl({
        DATABASE_URL: "not-a-valid-url",
        POSTGRES_USER: "u",
        POSTGRES_PASSWORD: "p",
        POSTGRES_DB: "d",
        DB_HOST: "h",
        DB_PORT: "1",
        DB_SCHEMA: "s",
    });

    assert.equal(url, "postgresql://u:p@h:1/d?schema=s");
});

test("createDatabaseUrl falls back to assembled parts when DATABASE_URL is missing", () => {
    const url = createDatabaseUrl({
        POSTGRES_USER: "u",
        POSTGRES_PASSWORD: "p",
        POSTGRES_DB: "d",
        DB_HOST: "h",
        DB_PORT: "1",
        DB_SCHEMA: "s",
    });

    assert.equal(url, "postgresql://u:p@h:1/d?schema=s");
});

test("createDatabaseUrl throws when DATABASE_URL is missing and fallback parts are incomplete", () => {
    assert.throws(
        () =>
            createDatabaseUrl({
                POSTGRES_USER: "u",
            }),
        /Missing database environment variables:.*POSTGRES_PASSWORD.*POSTGRES_DB.*DB_HOST.*DB_PORT.*DB_SCHEMA/,
    );
});

test("createDatabaseUrl treats an empty DATABASE_URL as unset and falls back", () => {
    const url = createDatabaseUrl({
        DATABASE_URL: "",
        POSTGRES_USER: "u",
        POSTGRES_PASSWORD: "p",
        POSTGRES_DB: "d",
        DB_HOST: "h",
        DB_PORT: "1",
        DB_SCHEMA: "s",
    });

    assert.equal(url, "postgresql://u:p@h:1/d?schema=s");
});

test("createDatabaseUrl handles mismatched quotes without stripping them", () => {
    const url = createDatabaseUrl({
        DATABASE_URL: '"postgresql://user:pw@host:5432/db',
        POSTGRES_USER: "u",
        POSTGRES_PASSWORD: "p",
        POSTGRES_DB: "d",
        DB_HOST: "h",
        DB_PORT: "1",
        DB_SCHEMA: "s",
    });

    assert.equal(url, "postgresql://u:p@h:1/d?schema=s");
});
