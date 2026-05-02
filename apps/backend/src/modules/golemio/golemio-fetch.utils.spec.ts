import {
    getErrorMessage,
    isRetryableFetchError,
} from "src/modules/golemio/golemio-fetch.utils";

describe("getErrorMessage", () => {
    it("returns the message from an Error instance", () => {
        expect(getErrorMessage(new Error("something went wrong"))).toBe(
            "something went wrong",
        );
    });

    it("stringifies a plain string error", () => {
        expect(getErrorMessage("raw string error")).toBe("raw string error");
    });

    it("stringifies a number", () => {
        expect(getErrorMessage(42)).toBe("42");
    });

    it("stringifies null", () => {
        expect(getErrorMessage(null)).toBe("null");
    });

    it("stringifies undefined", () => {
        expect(getErrorMessage(undefined)).toBe("undefined");
    });

    it("stringifies a plain object", () => {
        expect(getErrorMessage({ code: 503 })).toBe("[object Object]");
    });
});

describe("isRetryableFetchError", () => {
    it("returns true for AbortError (request timeout)", () => {
        const abortError = new Error("The operation was aborted");
        abortError.name = "AbortError";
        expect(isRetryableFetchError(abortError)).toBe(true);
    });

    it("returns false for a plain Error without a retryable code", () => {
        expect(isRetryableFetchError(new Error("Not Found"))).toBe(false);
    });

    it("returns false for null", () => {
        expect(isRetryableFetchError(null)).toBe(false);
    });

    it("returns false for a string", () => {
        expect(isRetryableFetchError("network error")).toBe(false);
    });

    it("returns false for a plain object", () => {
        expect(isRetryableFetchError({ message: "fail" })).toBe(false);
    });

    it("returns true for ECONNRESET errno code", () => {
        const err = Object.assign(new Error("read ECONNRESET"), {
            code: "ECONNRESET",
        });
        expect(isRetryableFetchError(err)).toBe(true);
    });

    it("returns true for ETIMEDOUT errno code", () => {
        const err = Object.assign(new Error("connect ETIMEDOUT"), {
            code: "ETIMEDOUT",
        });
        expect(isRetryableFetchError(err)).toBe(true);
    });

    it("returns true for ECONNREFUSED errno code", () => {
        const err = Object.assign(new Error("connect ECONNREFUSED"), {
            code: "ECONNREFUSED",
        });
        expect(isRetryableFetchError(err)).toBe(true);
    });

    it("returns true for EPIPE errno code", () => {
        const err = Object.assign(new Error("write EPIPE"), { code: "EPIPE" });
        expect(isRetryableFetchError(err)).toBe(true);
    });

    it("returns true for ENOTFOUND errno code", () => {
        const err = Object.assign(new Error("getaddrinfo ENOTFOUND"), {
            code: "ENOTFOUND",
        });
        expect(isRetryableFetchError(err)).toBe(true);
    });

    it("returns true for EAI_AGAIN errno code", () => {
        const err = Object.assign(new Error("getaddrinfo EAI_AGAIN"), {
            code: "EAI_AGAIN",
        });
        expect(isRetryableFetchError(err)).toBe(true);
    });

    it("returns false for an unrecognised errno code", () => {
        const err = Object.assign(new Error("EACCES"), { code: "EACCES" });
        expect(isRetryableFetchError(err)).toBe(false);
    });

    it("returns true when a retryable error is nested in error.cause", () => {
        const cause = Object.assign(new Error("read ECONNRESET"), {
            code: "ECONNRESET",
        });
        const wrapper = new Error("fetch failed");

        Object.defineProperty(wrapper, "cause", { value: cause });
        expect(isRetryableFetchError(wrapper)).toBe(true);
    });

    it("returns false when the nested cause is non-retryable", () => {
        const cause = new Error("some other error");
        const wrapper = new Error("fetch failed");

        Object.defineProperty(wrapper, "cause", { value: cause });
        expect(isRetryableFetchError(wrapper)).toBe(false);
    });

    it("handles deeply-nested retryable cause", () => {
        const deepCause = Object.assign(new Error("EAI_AGAIN"), {
            code: "EAI_AGAIN",
        });
        const midCause = new Error("mid");

        Object.defineProperty(midCause, "cause", { value: deepCause });
        const wrapper = new Error("outer");

        Object.defineProperty(wrapper, "cause", { value: midCause });
        expect(isRetryableFetchError(wrapper)).toBe(true);
    });
});
