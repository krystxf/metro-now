// metro-now
// https://github.com/krystxf/metro-now

@testable import metro_now
import Testing

@Suite(.tags(.utils))
struct NormalizeForSearchTests {
    // MARK: - tokenizeForSearch

    @Test("tokenizeForSearch folds diacritics and case")
    func tokenizeForSearchFoldsDiacriticsAndCase() {
        let tokens = tokenizeForSearch("Můstek")

        // "Můstek" must fold to lowercase ASCII so a user typing "mustek"
        // matches the real stop name.
        #expect(tokens == ["mustek"])
    }

    @Test("tokenizeForSearch splits on whitespace and dots")
    func tokenizeForSearchSplitsOnWhitespaceAndDots() {
        // Dots are used in abbreviations like "I.P. Pavlova" — they must be
        // treated as token separators, not joined into one blob.
        let tokens = tokenizeForSearch("I.P. Pavlova")

        #expect(tokens == ["i", "p", "pavlova"])
    }

    @Test("tokenizeForSearch drops empty tokens from repeated separators")
    func tokenizeForSearchDropsEmptyTokens() {
        let tokens = tokenizeForSearch("  A   B  ")

        #expect(tokens == ["a", "b"])
    }

    @Test("tokenizeForSearch returns an empty array for whitespace-only input")
    func tokenizeForSearchEmptyOnWhitespace() {
        #expect(tokenizeForSearch("   ").isEmpty)
    }

    // MARK: - normalizeForSearch

    @Test("normalizeForSearch joins tokens into a single blob")
    func normalizeForSearchJoinsTokens() {
        #expect(normalizeForSearch("Dejvická") == "dejvicka")
        #expect(normalizeForSearch("I.P. Pavlova") == "ippavlova")
    }

    @Test("normalizeForSearch returns empty string for whitespace-only input")
    func normalizeForSearchEmptyOnWhitespace() {
        #expect(normalizeForSearch("   ") == "")
    }

    // MARK: - searchScore(query:stop:)

    private func makeStop(
        id: String = "U1",
        name: String,
        platformNames: [String] = []
    ) -> ApiStop {
        ApiStop(
            id: id,
            name: name,
            avgLatitude: 50.0,
            avgLongitude: 14.0,
            entrances: [],
            platforms: platformNames.enumerated().map { index, name in
                ApiPlatform(
                    id: "\(id)-P\(index)",
                    latitude: 50.0,
                    longitude: 14.0,
                    name: name,
                    code: nil,
                    isMetro: false,
                    routes: []
                )
            }
        )
    }

    @Test("searchScore returns nil for an empty query")
    func searchScoreNilForEmptyQuery() {
        let stop = makeStop(name: "Dejvická")

        #expect(searchScore(query: "", stop: stop) == nil)
        #expect(searchScore(query: "   ", stop: stop) == nil)
    }

    @Test("searchScore returns matchRank 0 for an exact normalized match")
    func searchScoreExactMatchRank() {
        let stop = makeStop(name: "Dejvická")
        let score = searchScore(query: "Dejvicka", stop: stop)

        #expect(score != nil)
        #expect(score?.matchRank == 0)
        #expect(score?.distance == 0)
    }

    @Test("searchScore returns matchRank 1 for a prefix match")
    func searchScorePrefixMatchRank() {
        let stop = makeStop(name: "Dejvická")
        let score = searchScore(query: "Dej", stop: stop)

        #expect(score != nil)
        // A prefix is rank 1: exact matches (rank 0) must still dominate.
        #expect(score?.matchRank == 1)
        #expect(score?.distance == 0)
    }

    @Test("searchScore returns matchRank 2 for a substring match")
    func searchScoreSubstringMatchRank() {
        // "vick" is a substring of "dejvicka" but not a prefix.
        let stop = makeStop(name: "Dejvická")
        let score = searchScore(query: "vick", stop: stop)

        #expect(score != nil)
        #expect(score?.matchRank == 2)
    }

    @Test("searchScore returns matchRank 3 (fuzzy) within the distance budget")
    func searchScoreFuzzyWithinBudget() {
        // Query length 8 → max fuzzy distance 2. "dejvucka" is 1 edit away
        // from "dejvicka", so fuzzy matching must return a rank-3 hit.
        let stop = makeStop(name: "Dejvická")
        let score = searchScore(query: "dejvucka", stop: stop)

        #expect(score != nil)
        #expect(score?.matchRank == 3)
        #expect((score?.distance ?? Int.max) <= 2)
    }

    @Test("searchScore rejects queries beyond the fuzzy distance budget")
    func searchScoreRejectsBeyondBudget() {
        // Short query (length 3 → max distance 1). "xyz" vs "dejvicka" is
        // way beyond that — must return nil rather than ranking it.
        let stop = makeStop(name: "Dejvická")

        #expect(searchScore(query: "xyz", stop: stop) == nil)
    }

    @Test("searchScore falls back to platforms when the stop name misses")
    func searchScoreUsesPlatforms() {
        let stop = makeStop(
            name: "Museum",
            platformNames: ["Muzeum A"]
        )
        let score = searchScore(query: "Muzeum", stop: stop)

        #expect(score != nil)
        // Any non-nil rank is acceptable — the point is that the platform
        // token "Muzeum" is reachable through tokenization.
    }

    @Test("searchScore ranks an exact match higher than a fuzzy match for the same stop")
    func searchScoreOrdering() {
        // SearchMatchScore is Comparable; smaller is better.
        let stop = makeStop(name: "Dejvická")
        let exact = searchScore(query: "Dejvicka", stop: stop)
        let fuzzy = searchScore(query: "Dejvucka", stop: stop)

        #expect(exact != nil)
        #expect(fuzzy != nil)
        if let exact, let fuzzy {
            #expect(exact < fuzzy)
        }
    }
}
