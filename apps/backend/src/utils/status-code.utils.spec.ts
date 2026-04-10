import { isSuccess } from "./status-code.utils";

describe("isSuccess", () => {
    it("returns true for 200", () => {
        expect(isSuccess(200)).toBe(true);
    });

    it("returns true for 201", () => {
        expect(isSuccess(201)).toBe(true);
    });

    it("returns true for 299", () => {
        expect(isSuccess(299)).toBe(true);
    });

    it("returns false for 199", () => {
        expect(isSuccess(199)).toBe(false);
    });

    it("returns false for 300", () => {
        expect(isSuccess(300)).toBe(false);
    });

    it("returns false for 404", () => {
        expect(isSuccess(404)).toBe(false);
    });

    it("returns false for 500", () => {
        expect(isSuccess(500)).toBe(false);
    });
});
