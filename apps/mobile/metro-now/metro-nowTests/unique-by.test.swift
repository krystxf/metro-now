// metro-now
// https://github.com/krystxf/metro-now

@testable import metro_now
import Testing

@Suite(.tags(.utils))
struct UniqueByTests {
    @Test("removes duplicates by key selector")
    func removesDuplicatesByKey() {
        let result = uniqueBy(array: [1, 2, 2, 3, 1], by: { $0 })
        #expect(result == [1, 2, 3])
    }

    @Test("preserves first occurrence when duplicates exist")
    func preservesFirstOccurrence() {
        struct Item: Equatable {
            let id: Int
            let value: String
        }

        let items = [
            Item(id: 1, value: "first"),
            Item(id: 1, value: "second"),
            Item(id: 2, value: "third"),
        ]

        let result = uniqueBy(array: items, by: { $0.id })
        #expect(result.count == 2)
        #expect(result[0].value == "first")
        #expect(result[1].value == "third")
    }

    @Test("returns empty array for empty input")
    func emptyInput() {
        let result = uniqueBy(array: [Int](), by: { $0 })
        #expect(result.isEmpty)
    }

    @Test("returns all elements when no duplicates")
    func noDuplicates() {
        let result = uniqueBy(array: [1, 2, 3], by: { $0 })
        #expect(result == [1, 2, 3])
    }

    @Test("deduplicates by derived key")
    func deduplicatesByDerivedKey() {
        let result = uniqueBy(array: ["Hello", "HELLO", "world"], by: { $0.lowercased() })
        #expect(result.count == 2)
        #expect(result[0] == "Hello")
        #expect(result[1] == "world")
    }
}
