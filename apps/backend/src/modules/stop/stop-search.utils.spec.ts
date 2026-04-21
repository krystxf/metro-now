import {
    compareStopSearchMatchQuality,
    compareStopSearchMatchScores,
    createSearchableStopTerm,
    getStopSearchMatchScore,
    normalizeStopSearchValue,
    squaredGeoDistance,
    tokenizeStopSearchValue,
} from "src/modules/stop/stop-search.utils";
import type { SearchableStopRow } from "src/modules/stop/stop-search.utils";

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
