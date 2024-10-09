import type { DelaySchema } from "src/schema/delay.schema";
import { getDelayInSeconds } from "src/utils/delay";

describe("getDelayInSeconds", () => {
    it("should return 0 for invalid delay", () => {
        const invalidDelay = { invalid: "data" } as unknown as DelaySchema;
        const result = getDelayInSeconds(invalidDelay);
        expect(result).toBe(0);
    });

    it("should return 0 if delay is not available", () => {
        const delay: DelaySchema = {
            is_available: false,
            seconds: null,
            minutes: null,
        };
        const result = getDelayInSeconds(delay);
        expect(result).toBe(0);
    });

    it("should return 0 if delay is not available", () => {
        const delay: DelaySchema = {
            is_available: true,
            seconds: null,
            minutes: null,
        };
        const result = getDelayInSeconds(delay);
        expect(result).toBe(0);
    });

    it("should return correct seconds if only seconds are provided", () => {
        const delay: DelaySchema = {
            is_available: true,
            seconds: 45,
            minutes: 0,
        };
        const result = getDelayInSeconds(delay);
        expect(result).toBe(45);
    });

    it("should return correct seconds if only seconds are provided", () => {
        const delay: DelaySchema = {
            is_available: true,
            seconds: 45,
            minutes: null,
        };
        const result = getDelayInSeconds(delay);
        expect(result).toBe(45);
    });

    it("should return correct seconds if only minutes are provided", () => {
        const delay: DelaySchema = {
            is_available: true,
            minutes: 2,
            seconds: 0,
        };
        const result = getDelayInSeconds(delay);
        expect(result).toBe(120);
    });

    it("should return correct seconds if only minutes are provided", () => {
        const delay: DelaySchema = {
            is_available: true,
            minutes: 2,
            seconds: null,
        };
        const result = getDelayInSeconds(delay);
        expect(result).toBe(120);
    });

    it("should return correct seconds if both minutes and seconds are provided", () => {
        const delay: DelaySchema = {
            is_available: true,
            seconds: 30,
            minutes: 1,
        };
        const result = getDelayInSeconds(delay);
        expect(result).toBe(90);
    });
});
