import {
    generateCombinations,
    generatePermutations,
} from "src/utils/combination.utils";

describe("generatePermutations", () => {
    it("should work with 0 params", () => {
        expect(generatePermutations([])).toStrictEqual([[]]);
    });

    it("should work with 1 params", () => {
        expect(generatePermutations(["a"])).toStrictEqual([["a"]]);
    });

    it("should work with 2 params", () => {
        expect(generatePermutations(["a", "b"])).toStrictEqual([
            ["b", "a"],
            ["a", "b"],
        ]);
    });

    it("should work with 3 params", () => {
        expect(generatePermutations(["a", "b", "c"])).toStrictEqual([
            ["c", "b", "a"],
            ["a", "c", "b"],
            ["c", "a", "b"],
            ["b", "c", "a"],
            ["a", "b", "c"],
            ["b", "a", "c"],
        ]);
    });
});

describe("generateCombinations", () => {
    it("should work with 0 params", () => {
        expect(generateCombinations([])).toStrictEqual([[]]);
    });

    it("should work with 1 params", () => {
        expect(generateCombinations([["a"]])).toStrictEqual([["a"]]);
    });

    it("should work with 2 params", () => {
        expect(generateCombinations([["a"], ["b"]])).toStrictEqual([
            ["a", "b"],
        ]);
    });

    it("should work with 3 params", () => {
        expect(
            generateCombinations([
                [1, 2, 3],
                [4, 5, 6],
                [7, 8, 9],
            ]),
        ).toStrictEqual([
            [1, 4, 7],
            [1, 4, 8],
            [1, 4, 9],
            [1, 5, 7],
            [1, 5, 8],
            [1, 5, 9],
            [1, 6, 7],
            [1, 6, 8],
            [1, 6, 9],
            [2, 4, 7],
            [2, 4, 8],
            [2, 4, 9],
            [2, 5, 7],
            [2, 5, 8],
            [2, 5, 9],
            [2, 6, 7],
            [2, 6, 8],
            [2, 6, 9],
            [3, 4, 7],
            [3, 4, 8],
            [3, 4, 9],
            [3, 5, 7],
            [3, 5, 8],
            [3, 5, 9],
            [3, 6, 7],
            [3, 6, 8],
            [3, 6, 9],
        ]);
    });
});
