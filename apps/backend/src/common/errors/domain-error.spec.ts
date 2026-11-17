import {
    DomainError,
    MissingDataError,
    NotFoundError,
    UpstreamError,
    ValidationError,
} from "src/common/errors";

describe("DomainError", () => {
    it("UpstreamError carries kind, message, optional code, and preserves cause", () => {
        const cause = new Error("network down");
        const err = new UpstreamError("Golemio is down", {
            code: "golemio",
            cause,
        });

        expect(err).toBeInstanceOf(Error);
        expect(err).toBeInstanceOf(DomainError);
        expect(err.kind).toBe("upstream");
        expect(err.name).toBe("UpstreamError");
        expect(err.message).toBe("Golemio is down");
        expect(err.options.code).toBe("golemio");
        expect((err as Error & { cause?: unknown }).cause).toBe(cause);
    });

    it("MissingDataError is distinguishable from UpstreamError at the type level", () => {
        const err = new MissingDataError("File missing", {
            code: "leo-gtfs-missing-file",
        });

        expect(err.kind).toBe("missing-data");
        expect(err).toBeInstanceOf(MissingDataError);
        expect(err).not.toBeInstanceOf(UpstreamError);
    });

    it("ValidationError and NotFoundError have stable kind values", () => {
        expect(new ValidationError("bad").kind).toBe("validation");
        expect(new NotFoundError("missing").kind).toBe("not-found");
    });

    it("each subclass sets name to its class name", () => {
        expect(new UpstreamError("x").name).toBe("UpstreamError");
        expect(new MissingDataError("x").name).toBe("MissingDataError");
        expect(new ValidationError("x").name).toBe("ValidationError");
        expect(new NotFoundError("x").name).toBe("NotFoundError");
    });
});
