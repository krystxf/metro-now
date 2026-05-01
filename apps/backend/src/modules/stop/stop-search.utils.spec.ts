import {
    buildSearchableStops,
    compareStopSearchMatchQuality,
    compareStopSearchMatchScores,
    compareStopSearchResults,
    createSearchableStopTerm,
    getStopSearchMatchScore,
    normalizeStopSearchValue,
    squaredGeoDistance,
    tokenizeStopSearchValue,
} from "src/modules/stop/stop-search.utils";
import type {
    SearchableStopRow,
    StopSearchMatchScore,
} from "src/modules/stop/stop-search.utils";

const searchableStop: SearchableStopRow = {
    id: "U1",
    name: "Náměstí Míru",
    avgLatitude: 50.0755,
    avgLongitude: 14.4378,
    feed: "PID" as never,
    hasMetro: true,
    normalizedStopName: "namestimiru",
    searchTerms: [
        createSearchableStopTerm({
            sourceRank: 0,
            value: "Náměstí Míru",
        }),
        createSearchableStopTerm({
            sourceRank: 1,
            value: "Míru",
        }),
    ],
};

describe("stop-search.utils", () => {
    it("tokenizes and normalizes stop search values", () => {
        expect(tokenizeStopSearchValue("Nám. Míru")).toEqual(["nam", "miru"]);
        expect(normalizeStopSearchValue("Nám. Míru")).toBe("nammiru");
    });

    it("calculates squared geographic distance", () => {
        expect(squaredGeoDistance(50, 14, 50, 14)).toBe(0);
        expect(squaredGeoDistance(50, 14, 50.1, 14.1)).toBeGreaterThan(0);
    });

    it("prefers better search scores using source rank only as a final tie-breaker", () => {
        expect(
            compareStopSearchMatchScores(
                {
                    candidateLength: 4,
                    distance: 0,
                    lengthDelta: 0,
                    matchRank: 0,
                    position: 0,
                    sourceRank: 0,
                },
                {
                    candidateLength: 4,
                    distance: 0,
                    lengthDelta: 0,
                    matchRank: 0,
                    position: 0,
                    sourceRank: 1,
                },
            ),
        ).toBeLessThan(0);

        expect(
            compareStopSearchMatchQuality(
                {
                    candidateLength: 4,
                    distance: 0,
                    lengthDelta: 0,
                    matchRank: 1,
                    position: 0,
                    sourceRank: 1,
                },
                {
                    candidateLength: 4,
                    distance: 1,
                    lengthDelta: 0,
                    matchRank: 1,
                    position: 0,
                    sourceRank: 0,
                },
            ),
        ).toBeLessThan(0);
    });

    it("returns exact, prefix, and fuzzy search matches", () => {
        expect(
            getStopSearchMatchScore({
                normalizedQuery: "namestimiru",
                searchableStop,
            }),
        ).toMatchObject({
            matchRank: 0,
            distance: 0,
        });

        expect(
            getStopSearchMatchScore({
                normalizedQuery: "nam",
                searchableStop,
            }),
        ).toMatchObject({
            matchRank: 1,
            position: 0,
        });

        expect(
            getStopSearchMatchScore({
                normalizedQuery: "miru",
                searchableStop,
            }),
        ).toMatchObject({
            matchRank: 0,
            sourceRank: 0,
        });

        expect(
            getStopSearchMatchScore({
                normalizedQuery: "namestimirx",
                searchableStop,
            }),
        ).toMatchObject({
            matchRank: 3,
            distance: 1,
        });
    });

    it("returns null when the query is too far from every term", () => {
        expect(
            getStopSearchMatchScore({
                normalizedQuery: "zzzzzzzzzz",
                searchableStop,
            }),
        ).toBeNull();
    });
});

const makeStop = (
    id: string,
    name: string,
    lat = 50.0,
    lon = 14.0,
): Parameters<typeof buildSearchableStops>[0][number] => ({
    id,
    name,
    avgLatitude: lat,
    avgLongitude: lon,
    feed: "PID" as never,
});

describe("buildSearchableStops", () => {
    it("returns an empty array when stops is empty", () => {
        expect(buildSearchableStops([], [])).toEqual([]);
    });

    it("sets hasMetro=false and empty platform search terms when no platform rows given", () => {
        const [result] = buildSearchableStops(
            [makeStop("U1", "Hlavní nádraží")],
            [],
        );

        expect(result?.hasMetro).toBe(false);
        expect(result?.searchTerms).toHaveLength(1);
        expect(result?.searchTerms[0]?.sourceRank).toBe(0);
    });

    it("sets hasMetro=true when a metro platform row matches the stop", () => {
        const [result] = buildSearchableStops(
            [makeStop("U1", "Muzeum")],
            [{ stopId: "U1", name: "Muzeum A", isMetro: true }],
        );

        expect(result?.hasMetro).toBe(true);
    });

    it("skips platform rows with null stopId", () => {
        const [result] = buildSearchableStops(
            [makeStop("U1", "Stop")],
            [{ stopId: null, name: "Ghost", isMetro: true }],
        );

        expect(result?.hasMetro).toBe(false);
        expect(result?.searchTerms).toHaveLength(1);
    });

    it("appends platform names as sourceRank=1 search terms sorted lexicographically", () => {
        const [result] = buildSearchableStops(
            [makeStop("U1", "Náměstí Míru")],
            [
                { stopId: "U1", name: "Náměstí Míru B", isMetro: false },
                { stopId: "U1", name: "Náměstí Míru A", isMetro: false },
            ],
        );

        expect(result?.searchTerms).toHaveLength(3);
        expect(result?.searchTerms[1]?.sourceRank).toBe(1);
        expect(result?.searchTerms[1]?.normalizedValue).toBe("namestimirua");
        expect(result?.searchTerms[2]?.normalizedValue).toBe("namestimirub");
    });

    it("normalizes the stop name stripping diacritics and lowercasing", () => {
        const [result] = buildSearchableStops(
            [makeStop("U1", "Náměstí Míru")],
            [],
        );

        expect(result?.normalizedStopName).toBe("namestimiru");
    });

    it("does not mix platform rows from different stops", () => {
        const [u1, u2] = buildSearchableStops(
            [makeStop("U1", "Stop A"), makeStop("U2", "Stop B")],
            [
                { stopId: "U1", name: "Platform A", isMetro: true },
                { stopId: "U2", name: "Platform B", isMetro: false },
            ],
        );

        expect(u1?.hasMetro).toBe(true);
        expect(u2?.hasMetro).toBe(false);
        expect(u1?.searchTerms).toHaveLength(2);
        expect(u2?.searchTerms).toHaveLength(2);
    });
});

const makeScore = (
    overrides: Partial<StopSearchMatchScore> = {},
): StopSearchMatchScore => ({
    candidateLength: 5,
    distance: 0,
    lengthDelta: 0,
    matchRank: 0,
    position: 0,
    sourceRank: 0,
    ...overrides,
});

const makeResult = (
    id: string,
    scoreOverrides: Partial<StopSearchMatchScore> = {},
    lat = 50.0,
    lon = 14.0,
    hasMetro = false,
) => ({
    score: makeScore(scoreOverrides),
    stop: {
        ...makeStop(id, `Stop ${id}`, lat, lon),
        hasMetro,
        normalizedStopName: `stop${id.toLowerCase()}`,
        searchTerms: [],
    } as SearchableStopRow,
});

describe("compareStopSearchResults", () => {
    it("ranks better matchRank first", () => {
        const a = makeResult("A", { matchRank: 0 });
        const b = makeResult("B", { matchRank: 1 });

        expect(compareStopSearchResults(a, b)).toBeLessThan(0);
        expect(compareStopSearchResults(b, a)).toBeGreaterThan(0);
    });

    it("ranks metro stop before non-metro when match quality is equal", () => {
        const metro = makeResult("M", {}, 50.0, 14.0, true);
        const nonMetro = makeResult("N", {}, 50.0, 14.0, false);

        expect(compareStopSearchResults(metro, nonMetro)).toBeLessThan(0);
        expect(compareStopSearchResults(nonMetro, metro)).toBeGreaterThan(0);
    });

    it("ranks lower edit distance before higher on equal match quality", () => {
        const closer = makeResult("A", { matchRank: 3, distance: 1 });
        const farther = makeResult("B", { matchRank: 3, distance: 2 });

        expect(compareStopSearchResults(closer, farther)).toBeLessThan(0);
    });

    it("ranks alphabetically by normalizedStopName when scores are equal", () => {
        const a = makeResult("A");
        const b = makeResult("B");

        a.stop.normalizedStopName = "aardvark";
        b.stop.normalizedStopName = "zebra";

        expect(compareStopSearchResults(a, b)).toBeLessThan(0);
    });

    it("ranks closer geo distance first when names are equal and origin is provided", () => {
        const near = makeResult("A", {}, 50.0, 14.0);
        const far = makeResult("B", {}, 51.0, 15.0);

        near.stop.normalizedStopName = "same";
        far.stop.normalizedStopName = "same";

        const origin = { latitude: 50.0, longitude: 14.0 };

        expect(compareStopSearchResults(near, far, origin)).toBeLessThan(0);
        expect(compareStopSearchResults(far, near, origin)).toBeGreaterThan(0);
    });

    it("falls back to id comparison when everything else is equal and no origin", () => {
        const a = makeResult("A");
        const b = makeResult("B");

        a.stop.normalizedStopName = "same";
        b.stop.normalizedStopName = "same";

        expect(compareStopSearchResults(a, b)).toBeLessThan(0);
    });

    it("returns 0 for identical results", () => {
        const a = makeResult("A");

        expect(compareStopSearchResults(a, a)).toBe(0);
    });
});
