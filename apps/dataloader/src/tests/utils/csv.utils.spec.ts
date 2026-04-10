import assert from "node:assert/strict";
import test from "node:test";

import { parseCsvString } from "./csv.utils";

test("parseCsvString parses a basic CSV with headers", async () => {
    const csv = "name,value\nfoo,1\nbar,2";
    const rows = await parseCsvString<{ name: string; value: string }>(csv);

    assert.deepEqual(rows, [
        { name: "foo", value: "1" },
        { name: "bar", value: "2" },
    ]);
});

test("parseCsvString returns an empty array for header-only CSV", async () => {
    const csv = "name,value";
    const rows = await parseCsvString<{ name: string; value: string }>(csv);

    assert.deepEqual(rows, []);
});

test("parseCsvString handles quoted fields with commas", async () => {
    const csv = 'name,value\n"hello, world",42';
    const rows = await parseCsvString<{ name: string; value: string }>(csv);

    assert.equal(rows.length, 1);
    assert.equal(rows[0]?.name, "hello, world");
    assert.equal(rows[0]?.value, "42");
});

test("parseCsvString handles empty field values", async () => {
    const csv = "a,b\n,filled\nfilled,";
    const rows = await parseCsvString<{ a: string; b: string }>(csv);

    assert.equal(rows.length, 2);
    assert.equal(rows[0]?.a, "");
    assert.equal(rows[0]?.b, "filled");
    assert.equal(rows[1]?.a, "filled");
    assert.equal(rows[1]?.b, "");
});
