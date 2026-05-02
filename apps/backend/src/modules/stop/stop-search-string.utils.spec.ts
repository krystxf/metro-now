import {
    compareStopSearchMatchQuality,
    compareStopSearchMatchScores,
    getStopSearchMatchScoreForValue,
    normalizeStopSearchValue,
    squaredGeoDistance,
    tokenizeStopSearchValue,
} from "src/modules/stop/stop-search-string.utils";

describe("tokenizeStopSearchValue", () => {
    it("splits on whitespace and lowercases", () => {
        expect(tokenizeStopSearchValue("Náměstí Míru")).toEqual([
            "namesti",
            "miru",
        ]);
    });

    it("strips diacritics", () => {
        expect(tokenizeStopSearchValue("Křížovnická")).toEqual(["krizovnicka"]);
    });

    it("replaces dots with spaces before splitting", () => {
        expect(tokenizeStopSearchValue("nám.Míru")).toEqual(["nam", "miru"]);
    });

    it("filters empty parts from multiple spaces", () => {
        expect(tokenizeStopSearchValue("A  B")).toEqual(["a", "b"]);
    });

    it("returns empty array for whitespace-only input", () => {
        expect(tokenizeStopSearchValue("   ")).toEqual([]);
    });
});

describe("normalizeStopSearchValue", () => {
    it("joins tokens without separator", () => {
        expect(normalizeStopSearchValue("Náměstí Míru")).toBe("namestimiru");
    });

    it("returns empty string for whitespace input", () => {
        expect(normalizeStopSearchValue("   ")).toBe("");
    });

    it("handles single word with diacritics", () => {
        expect(normalizeStopSearchValue("Čechův")).toBe("cechuv");
    });
});

describe("squaredGeoDistance", () => {
    it("returns 0 for identical points", () => {
        expect(squaredGeoDistance(50, 14, 50, 14)).toBe(0);
    });

    it("returns a positive value for different points", () => {
        expect(squaredGeoDistance(50, 14, 51, 15)).toBeGreaterThan(0);
    });

    it("applies longitude correction by cos of mean latitude", () => {
        const latOnly = squaredGeoDistance(50, 14, 51, 14);
        const lonOnly = squaredGeoDistance(50, 14, 50, 15);

        expect(latOnly).toBeGreaterThan(lonOnly);
    });
});

describe("compareStopSearchMatchScores", () => {
    const base = {
        matchRank: 0,
        distance: 0,
        position: 0,
        lengthDelta: 0,
        sourceRank: 0,
        candidateLength: 5,
    };

    it("prioritises lower matchRank", () => {
        expect(
            compareStopSearchMatchScores(
                { ...base, matchRank: 0 },
                { ...base, matchRank: 1 },
            ),
        ).toBeLessThan(0);
    });

    it("then lower distance", () => {
        expect(
            compareStopSearchMatchScores(
                { ...base, distance: 1 },
                { ...base, distance: 2 },
            ),
        ).toBeLessThan(0);
    });

    it("then lower position", () => {
        expect(
            compareStopSearchMatchScores(
                { ...base, position: 0 },
                { ...base, position: 3 },
            ),
        ).toBeLessThan(0);
    });

    it("then lower lengthDelta", () => {
        expect(
            compareStopSearchMatchScores(
                { ...base, lengthDelta: 1 },
                { ...base, lengthDelta: 3 },
            ),
        ).toBeLessThan(0);
    });

    it("then lower sourceRank", () => {
        expect(
            compareStopSearchMatchScores(
                { ...base, sourceRank: 0 },
                { ...base, sourceRank: 1 },
            ),
        ).toBeLessThan(0);
    });

    it("then shorter candidateLength", () => {
        expect(
            compareStopSearchMatchScores(
                { ...base, candidateLength: 4 },
                { ...base, candidateLength: 6 },
            ),
        ).toBeLessThan(0);
    });

    it("returns 0 for equal scores", () => {
        expect(compareStopSearchMatchScores(base, base)).toBe(0);
    });
});

describe("compareStopSearchMatchQuality", () => {
    const base = {
        matchRank: 0,
        distance: 0,
        position: 0,
        lengthDelta: 0,
        sourceRank: 0,
        candidateLength: 5,
    };

    it("returns 0 when only sourceRank differs (quality ignores sourceRank)", () => {
        expect(
            compareStopSearchMatchQuality(
                { ...base, sourceRank: 0 },
                { ...base, sourceRank: 1 },
            ),
        ).toBe(0);
    });

    it("still distinguishes by matchRank", () => {
        expect(
            compareStopSearchMatchQuality(
                { ...base, matchRank: 0 },
                { ...base, matchRank: 1 },
            ),
        ).toBeLessThan(0);
    });
});

describe("getStopSearchMatchScoreForValue", () => {
    it("returns null for empty candidate", () => {
        expect(
            getStopSearchMatchScoreForValue({
                normalizedCandidate: "",
                normalizedQuery: "stop",
                sourceRank: 0,
            }),
        ).toBeNull();
    });

    it("returns matchRank=0 for exact match", () => {
        const score = getStopSearchMatchScoreForValue({
            normalizedCandidate: "mustek",
            normalizedQuery: "mustek",
            sourceRank: 0,
        });

        expect(score?.matchRank).toBe(0);
        expect(score?.distance).toBe(0);
        expect(score?.position).toBe(0);
        expect(score?.lengthDelta).toBe(0);
    });

    it("returns matchRank=1 for prefix match", () => {
        const score = getStopSearchMatchScoreForValue({
            normalizedCandidate: "musteksk",
            normalizedQuery: "mustek",
            sourceRank: 0,
        });

        expect(score?.matchRank).toBe(1);
        expect(score?.position).toBe(0);
        expect(score?.lengthDelta).toBe(2);
    });

    it("returns matchRank=2 for substring at non-zero position", () => {
        const score = getStopSearchMatchScoreForValue({
            normalizedCandidate: "novymustek",
            normalizedQuery: "mustek",
            sourceRank: 0,
        });

        expect(score?.matchRank).toBe(2);
        expect(score?.position).toBe(4);
    });

    it("returns matchRank=3 for fuzzy match within threshold", () => {
        const score = getStopSearchMatchScoreForValue({
            normalizedCandidate: "mustek",
            normalizedQuery: `${"mustek".slice(0, -1)}a`,
            sourceRank: 0,
        });

        expect(score?.matchRank).toBe(3);
        expect(score?.distance).toBe(1);
    });

    it("returns null when length delta exceeds fuzzy threshold", () => {
        expect(
            getStopSearchMatchScoreForValue({
                normalizedCandidate: "ab",
                normalizedQuery: "abcde",
                sourceRank: 0,
            }),
        ).toBeNull();
    });

    it("returns null when edit distance exceeds fuzzy threshold", () => {
        expect(
            getStopSearchMatchScoreForValue({
                normalizedCandidate: "abcd",
                normalizedQuery: "efgh",
                sourceRank: 0,
            }),
        ).toBeNull();
    });

    it("passes sourceRank through to the score", () => {
        const score = getStopSearchMatchScoreForValue({
            normalizedCandidate: "mustek",
            normalizedQuery: "mustek",
            sourceRank: 2,
        });

        expect(score?.sourceRank).toBe(2);
    });
});
