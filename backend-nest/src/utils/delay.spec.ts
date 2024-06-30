import { getDelayInSeconds } from "./delay";

describe("getDelayInSeconds", () => {
    it("should return 0 when delay is undefined", () => {
        expect(getDelayInSeconds(undefined)).toBe(0);
    });

    it("should return 0 when delay is null", () => {
        expect(getDelayInSeconds(null)).toBe(0);
    });

    it("should return seconds when delay contains seconds only", () => {
        const delay = { seconds: 30 };
        expect(getDelayInSeconds(delay)).toBe(30);
    });

    it("should return minutes converted to seconds when delay contains minutes only", () => {
        const delay = { minutes: 2 };
        expect(getDelayInSeconds(delay)).toBe(120); // 2 minutes = 120 seconds
    });

    it("should return combined seconds and minutes when both are present in delay", () => {
        const delay = { seconds: 45, minutes: 1 };
        expect(getDelayInSeconds(delay)).toBe(105); // 1 minute + 45 seconds = 60 + 45 = 105 seconds
    });

    it("should return 0 when delay is an empty object", () => {
        const delay = {};
        expect(getDelayInSeconds(delay)).toBe(0);
    });

    it("should return 0 when delay seconds and minutes are not numbers", () => {
        const delay = { seconds: "invalid", minutes: "invalid" };
        expect(getDelayInSeconds(delay)).toBe(0);
    });

    it("should handle negative seconds correctly", () => {
        const delay = { seconds: -15 };
        expect(getDelayInSeconds(delay)).toBe(-15); // Negative seconds should be returned as negative
    });

    it("should handle negative minutes correctly", () => {
        const delay = { minutes: -1 };
        expect(getDelayInSeconds(delay)).toBe(-60); // Negative minutes should convert to negative seconds
    });

    it("should handle combined negative values correctly", () => {
        const delay = { seconds: -30, minutes: -1 };
        expect(getDelayInSeconds(delay)).toBe(-90); // Combined negative values should sum as negative seconds
    });

    it("should handle negative seconds and positive minutes correctly", () => {
        const delay = { seconds: -30, minutes: 2 };
        expect(getDelayInSeconds(delay)).toBe(90); // 2 minutes should override negative seconds
    });
});
