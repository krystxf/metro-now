import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import * as path from "node:path";
import test from "node:test";

import { STOP_ID_PREFIX_TO_FEED } from "../stop-feed-prefix";

// __dirname resolves to dist/tests after compilation (rootDir is the package
// root, so the tests folder is mirrored under dist). Go up two levels and then
// into the source migrations directory.
const MIGRATION_PATH = path.join(
    __dirname,
    "..",
    "..",
    "migrations",
    "0014_add_stop_feed.ts",
);
const MIGRATION_SOURCE = readFileSync(MIGRATION_PATH, "utf8");

test("migration 0014 contains each prefix→feed mapping declared in STOP_ID_PREFIX_TO_FEED", () => {
    for (const { prefix, feed } of STOP_ID_PREFIX_TO_FEED) {
        // Matches: WHEN "id" LIKE 'BRS:%' THEN 'BRNO'::"GtfsFeedId"
        const pattern = new RegExp(
            `WHEN\\s+"id"\\s+LIKE\\s+'${prefix}%'\\s+THEN\\s+'${feed}'::"GtfsFeedId"`,
        );

        assert.match(
            MIGRATION_SOURCE,
            pattern,
            `migration 0014 is missing the WHEN branch for prefix '${prefix}' → ${feed}`,
        );
    }
});

test("migration 0014 defaults unknown stop ids to PID (ELSE branch)", () => {
    assert.match(
        MIGRATION_SOURCE,
        /ELSE\s+'PID'::"GtfsFeedId"/,
        "migration 0014 ELSE branch must map to PID so that legacy U-prefixed PID stops get the correct feed",
    );
});

test("migration 0014 enforces NOT NULL on feed after the backfill", () => {
    assert.match(
        MIGRATION_SOURCE,
        /ALTER\s+COLUMN\s+"feed"\s+SET\s+NOT\s+NULL/,
        "migration 0014 must SET NOT NULL on Stop.feed after the backfill",
    );
});

test("migration 0014 only rewrites rows where feed IS NULL (idempotent re-runs)", () => {
    assert.match(
        MIGRATION_SOURCE,
        /WHERE\s+"feed"\s+IS\s+NULL/,
        "migration 0014 must guard the backfill UPDATE with `WHERE feed IS NULL` to stay safe against re-runs",
    );
});
