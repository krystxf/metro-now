import { removeDiacritics } from "./remove-diacritics";

describe("removeDiacritics", () => {
    it("should remove diacritics from a string", () => {
        const input = "áéíóúüñãç";
        const expected = "aeiouunac";
        expect(removeDiacritics(input)).toBe(expected);
    });

    it("should handle empty string", () => {
        const input = "";
        const expected = "";
        expect(removeDiacritics(input)).toBe(expected);
    });

    it("should handle string without diacritics", () => {
        const input = "abcdef";
        const expected = "abcdef";
        expect(removeDiacritics(input)).toBe(expected);
    });

    it("should handle mixed string with and without diacritics", () => {
        const input = "áéí123óú456üñ789ãç";
        const expected = "aei123ou456un789ac";
        expect(removeDiacritics(input)).toBe(expected);
    });

    it("should handle string with multiple occurrences of the same diacritic", () => {
        const input = "ááááá";
        const expected = "aaaaa";
        expect(removeDiacritics(input)).toBe(expected);
    });
});
