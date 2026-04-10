import { parseCsvString } from "src/utils/csv.utils";

describe("parseCsvString", () => {
    it("parses a basic CSV with headers", async () => {
        const csv = "name,value\nfoo,1\nbar,2";
        const rows = await parseCsvString<{ name: string; value: string }>(csv);

        expect(rows).toEqual([
            { name: "foo", value: "1" },
            { name: "bar", value: "2" },
        ]);
    });

    it("returns an empty array for header-only CSV", async () => {
        const csv = "name,value";
        const rows = await parseCsvString<{ name: string; value: string }>(csv);

        expect(rows).toEqual([]);
    });

    it("handles quoted fields with commas", async () => {
        const csv = 'name,value\n"hello, world",42';
        const rows = await parseCsvString<{ name: string; value: string }>(csv);

        expect(rows).toHaveLength(1);
        expect(rows[0]?.name).toBe("hello, world");
        expect(rows[0]?.value).toBe("42");
    });

    it("handles empty field values", async () => {
        const csv = "a,b\n,filled\nfilled,";
        const rows = await parseCsvString<{ a: string; b: string }>(csv);

        expect(rows).toHaveLength(2);
        expect(rows[0]?.a).toBe("");
        expect(rows[0]?.b).toBe("filled");
        expect(rows[1]?.a).toBe("filled");
        expect(rows[1]?.b).toBe("");
    });
});
