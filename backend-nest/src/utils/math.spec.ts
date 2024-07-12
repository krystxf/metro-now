import { min, max, minMax } from "./math";

describe("min", () => {
    it("should support single value", () => {
        expect(min(1)).toBe(1);
    });

    it("should support multiple values", () => {
        expect(min(1, 2, 3)).toBe(1);
    });

    it("should support nested arrays", () => {
        expect(min([1, 2], [3, 4])).toBe(1);
    });

    it("should support single array", () => {
        expect(min([1, 2, 3])).toBe(1);
    });

    it("should support negative values", () => {
        expect(min(-1)).toBe(-1);
    });

    it("should support mixed values", () => {
        expect(min(-1, 0, 1)).toBe(-1);
    });

    it("should support mixed nested values", () => {
        expect(min([-1, 0], [1, 2])).toBe(-1);
    });

    it("should support mixed array values", () => {
        expect(min([-1, 0, 1])).toBe(-1);
    });
});

describe("max", () => {
    it("should support single value", () => {
        expect(max(1)).toBe(1);
    });

    it("should support multiple values", () => {
        expect(max(1, 2, 3)).toBe(3);
    });

    it("should support nested arrays", () => {
        expect(max([1, 2], [3, 4])).toBe(4);
    });

    it("should support single array", () => {
        expect(max([1, 2, 3])).toBe(3);
    });

    it("should support negative values", () => {
        expect(max(-1)).toBe(-1);
    });

    it("should support mixed values", () => {
        expect(max(-1, 0, 1)).toBe(1);
    });

    it("should support mixed nested values", () => {
        expect(max([-1, 0], [1, 2])).toBe(2);
    });

    it("should support mixed array values", () => {
        expect(max([-1, 0, 1])).toBe(1);
    });
});

describe("minMax", () => {
    it("should support single value", () => {
        expect(minMax(1)).toEqual({ min: 1, max: 1 });
    });

    it("should support multiple values", () => {
        expect(minMax(1, 2, 3)).toEqual({ min: 1, max: 3 });
    });

    it("should support nested arrays", () => {
        expect(minMax([1, 2], [3, 4])).toEqual({ min: 1, max: 4 });
    });

    it("should support single array", () => {
        expect(minMax([1, 2, 3])).toEqual({ min: 1, max: 3 });
    });

    it("should support negative values", () => {
        expect(minMax(-1)).toEqual({ min: -1, max: -1 });
    });

    it("should support mixed values", () => {
        expect(minMax(-1, 0)).toEqual({ min: -1, max: 0 });
    });

    it("should support mixed nested values", () => {
        expect(minMax([-1, 0], [1, 2])).toEqual({ min: -1, max: 2 });
    });

    it("should support mixed array values", () => {
        expect(minMax([-1, 0, 1])).toEqual({ min: -1, max: 1 });
    });
});
