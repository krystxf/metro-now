import {
    fromLeoPlatformId,
    fromLeoRouteId,
    fromLeoStopId,
    isLeoPlatformId,
    isLeoRouteId,
    isLeoStopId,
    toLeoPlatformId,
    toLeoRouteId,
    toLeoStopId,
} from "./leo-id.utils";

describe("toLeoStopId", () => {
    it("prefixes with TLS:", () => {
        expect(toLeoStopId("123")).toBe("TLS:123");
    });
});

describe("toLeoPlatformId", () => {
    it("prefixes with TLP:", () => {
        expect(toLeoPlatformId("456")).toBe("TLP:456");
    });
});

describe("toLeoRouteId", () => {
    it("prefixes with LTL:", () => {
        expect(toLeoRouteId("789")).toBe("LTL:789");
    });
});

describe("isLeoStopId", () => {
    it("returns true for TLS: prefix", () => {
        expect(isLeoStopId("TLS:123")).toBe(true);
    });

    it("returns false for other prefix", () => {
        expect(isLeoStopId("U1072")).toBe(false);
    });

    it("returns false for TLP: prefix", () => {
        expect(isLeoStopId("TLP:123")).toBe(false);
    });
});

describe("isLeoPlatformId", () => {
    it("returns true for TLP: prefix", () => {
        expect(isLeoPlatformId("TLP:456")).toBe(true);
    });

    it("returns false for other prefix", () => {
        expect(isLeoPlatformId("U1072Z1P")).toBe(false);
    });
});

describe("isLeoRouteId", () => {
    it("returns true for LTL: prefix", () => {
        expect(isLeoRouteId("LTL:789")).toBe(true);
    });

    it("returns false for other prefix", () => {
        expect(isLeoRouteId("L991")).toBe(false);
    });
});

describe("fromLeoStopId", () => {
    it("strips the TLS: prefix", () => {
        expect(fromLeoStopId("TLS:123")).toBe("123");
    });
});

describe("fromLeoPlatformId", () => {
    it("strips the TLP: prefix", () => {
        expect(fromLeoPlatformId("TLP:456")).toBe("456");
    });
});

describe("fromLeoRouteId", () => {
    it("strips the LTL: prefix", () => {
        expect(fromLeoRouteId("LTL:789")).toBe("789");
    });
});

describe("roundtrip", () => {
    it("toLeoStopId and fromLeoStopId are inverses", () => {
        expect(fromLeoStopId(toLeoStopId("abc"))).toBe("abc");
    });

    it("toLeoPlatformId and fromLeoPlatformId are inverses", () => {
        expect(fromLeoPlatformId(toLeoPlatformId("def"))).toBe("def");
    });

    it("toLeoRouteId and fromLeoRouteId are inverses", () => {
        expect(fromLeoRouteId(toLeoRouteId("ghi"))).toBe("ghi");
    });
});
