import { parseQueryParam } from "./query-params";

describe("parseQueryParam", () => {
    it("should return null if param is undefined", () => {
        expect(parseQueryParam(undefined)).toBeNull();
    });

    it("should return null if param is an empty array", () => {
        expect(parseQueryParam([])).toBeNull();
    });

    it("should return an array if param is an array", () => {
        expect(parseQueryParam(["a", "b"])).toEqual(["a", "b"]);
    });

    it("should return an array if param is a string", () => {
        expect(parseQueryParam("a")).toEqual(["a"]);
    });

    it("should return an array if param is a stringified array", () => {
        expect(parseQueryParam('["a","b"]')).toEqual(["a", "b"]);
    });

    it("should return an array if param is a stringified array with spaces", () => {
        expect(parseQueryParam('[ "a", "b" ]')).toEqual(["a", "b"]);
    });

    it("should return an array if param is a stringified array with no spaces", () => {
        expect(parseQueryParam('["a","b"]')).toEqual(["a", "b"]);
    });

    it("should return an array if param is a stringified array with a single element", () => {
        expect(parseQueryParam('["a"]')).toEqual(["a"]);
    });

    it("should return an array if param is a stringified array with a single element and no spaces", () => {
        expect(parseQueryParam('["a"]')).toEqual(["a"]);
    });

    it("should return an array if param is a stringified array with a single element and spaces", () => {
        expect(parseQueryParam('[ "a" ]')).toEqual(["a"]);
    });

    it("should return an array if param is a stringified array with a single element and no spaces", () => {
        expect(parseQueryParam('["a"]')).toEqual(["a"]);
    });

    it("should return an array if param is a stringified array with a single element and spaces", () => {
        expect(parseQueryParam('[ "a" ]')).toEqual(["a"]);
    });

    it("should return an array if param is a stringified array with a single element and spaces", () => {
        expect(parseQueryParam('[ "a" ]')).toEqual(["a"]);
    });

    it("should return an array if param is a stringified array with a single element and spaces", () => {
        expect(parseQueryParam('[ "a" ]')).toEqual(["a"]);
    });
});
