import { toLookupRouteId, toPublicRouteId } from "./route-id.utils";

describe("toLookupRouteId", () => {
    it("prefixes a plain numeric ID with L", () => {
        expect(toLookupRouteId("991")).toBe("L991");
    });

    it("leaves an already-prefixed L ID unchanged", () => {
        expect(toLookupRouteId("L991")).toBe("L991");
    });

    it("leaves an ID with colon unchanged", () => {
        expect(toLookupRouteId("BRR:123")).toBe("BRR:123");
    });

    it("leaves LTL: prefixed IDs unchanged", () => {
        expect(toLookupRouteId("LTL:456")).toBe("LTL:456");
    });
});

describe("toPublicRouteId", () => {
    it("strips the L prefix from a lookup ID", () => {
        expect(toPublicRouteId("L991")).toBe("991");
    });

    it("leaves a plain numeric ID unchanged", () => {
        expect(toPublicRouteId("991")).toBe("991");
    });

    it("leaves LTL: prefixed IDs unchanged", () => {
        expect(toPublicRouteId("LTL:456")).toBe("LTL:456");
    });

    it("leaves other colon-containing IDs unchanged", () => {
        expect(toPublicRouteId("BRR:123")).toBe("BRR:123");
    });
});
