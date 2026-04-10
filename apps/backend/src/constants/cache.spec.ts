import {
    CACHE_KEYS,
    MAX_CACHE_TTL_MS,
    ttl,
    uniqueSortedStrings,
    uniqueStrings,
} from "./cache";

describe("uniqueStrings", () => {
    it("removes duplicates", () => {
        expect(uniqueStrings(["a", "b", "a", "c", "b"])).toEqual([
            "a",
            "b",
            "c",
        ]);
    });

    it("returns empty array for empty input", () => {
        expect(uniqueStrings([])).toEqual([]);
    });

    it("returns same array when no duplicates", () => {
        expect(uniqueStrings(["x", "y", "z"])).toEqual(["x", "y", "z"]);
    });
});

describe("uniqueSortedStrings", () => {
    it("removes duplicates and sorts", () => {
        expect(uniqueSortedStrings(["c", "a", "b", "a"])).toEqual([
            "a",
            "b",
            "c",
        ]);
    });

    it("returns empty array for empty input", () => {
        expect(uniqueSortedStrings([])).toEqual([]);
    });
});

describe("ttl", () => {
    it("converts hours to milliseconds", () => {
        expect(ttl({ hours: 1 })).toBe(3_600_000);
    });

    it("converts minutes to milliseconds", () => {
        expect(ttl({ minutes: 5 })).toBe(300_000);
    });

    it("converts seconds to milliseconds", () => {
        expect(ttl({ seconds: 30 })).toBe(30_000);
    });

    it("combines hours, minutes, and seconds", () => {
        expect(ttl({ hours: 1, minutes: 30, seconds: 15 })).toBe(5_415_000);
    });

    it("throws when all values are zero", () => {
        expect(() => ttl({})).toThrow("cannot be 0");
    });

    it("throws when ttl exceeds 36 hours", () => {
        expect(() => ttl({ hours: 37 })).toThrow("cannot exceed 36 hours");
    });

    it("accepts exactly 36 hours", () => {
        expect(ttl({ hours: 36 })).toBe(MAX_CACHE_TTL_MS);
    });
});

describe("CACHE_KEYS", () => {
    it("produces deterministic keys regardless of object key order", () => {
        const key1 = CACHE_KEYS.stop.getAll({ metroOnly: true, limit: 10 });
        const key2 = CACHE_KEYS.stop.getAll({ limit: 10, metroOnly: true });

        expect(key1).toBe(key2);
    });

    it("produces different keys for different params", () => {
        const key1 = CACHE_KEYS.stop.getAll({ metroOnly: true });
        const key2 = CACHE_KEYS.stop.getAll({ metroOnly: false });

        expect(key1).not.toBe(key2);
    });

    it("produces a plain prefix for static keys", () => {
        expect(CACHE_KEYS.infotexts.getAll).toBe("infotexts.getAll");
    });

    it("produces string-based keys for ID lookups", () => {
        const key = CACHE_KEYS.route.getOneGraphQL("L991");

        expect(key).toContain("route.getOneGraphQL");
        expect(key).toContain("L991");
    });
});
