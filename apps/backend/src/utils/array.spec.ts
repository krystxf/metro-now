import { toArray } from "src/utils/array.utils";

describe("toArray", () => {
    it("should convert to array", () => {
        expect(toArray("string value")).toStrictEqual(["string value"]);
    });

    it("should leave nested arrays same", () => {
        expect(toArray([["string value"]])).toStrictEqual([["string value"]]);
    });

    it("should not change array", () => {
        expect(
            toArray([
                "string value",
                undefined,
                null,
                1,
                69,
                420,
                -Infinity,
                {
                    key: "value",
                },
            ]),
        ).toStrictEqual([
            "string value",
            undefined,
            null,
            1,
            69,
            420,
            -Infinity,
            {
                key: "value",
            },
        ]);
    });

    it("should work with object", () => {
        expect(toArray({})).toStrictEqual([{}]);
    });
});
