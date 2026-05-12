import { GtfsFeedId } from "@metro-now/database";

export const ClassifiedVehicleType = {
    BUS: "BUS",
    FERRY: "FERRY",
    FUNICULAR: "FUNICULAR",
    SUBWAY: "SUBWAY",
    TRAIN: "TRAIN",
    TRAM: "TRAM",
    TROLLEYBUS: "TROLLEYBUS",
} as const;

export type ClassifiedVehicleType =
    (typeof ClassifiedVehicleType)[keyof typeof ClassifiedVehicleType];

export type RouteClassification = {
    vehicleType: ClassifiedVehicleType | null;
    isNight: boolean | null;
    isSubstitute: boolean;
};

const PID_METRO_LINES = new Set(["A", "B", "C", "D"]);
const PID_TROLLEYBUS_NUMBERS = new Set([52, 58, 59]);
const PID_BUS_PREFIXES = ["AE", "K", "BB", "MHD ", "ŠKOLNÍ "];
const PID_TRAIN_PREFIXES = [
    "L",
    "R",
    "S",
    "T",
    "U",
    "V",
    "OS",
    "REX",
    "RR",
    "EX",
    "EC",
    "EN",
    "RJX",
    "RJ",
    "IC",
    "SC",
    "LE",
];
const LIBEREC_TRAM_NUMBERS = new Set([2, 3, 5, 11]);

const normalizeRouteName = (
    routeShortName: string | null | undefined,
): string => routeShortName?.trim().toUpperCase() ?? "";

const stripLeadingSubstitutePrefix = (routeName: string): string =>
    routeName.startsWith("X") ? routeName.slice(1) : routeName;

const parseNumericRoute = (routeName: string): number | null => {
    if (!/^\d+$/.test(routeName)) {
        return null;
    }

    return Number.parseInt(routeName, 10);
};

export const getVehicleTypeFromGtfsRouteType = (
    routeType: string | null | undefined,
): ClassifiedVehicleType | null => {
    if (!routeType) {
        return null;
    }

    const numericRouteType = Number(routeType);

    if (!Number.isInteger(numericRouteType)) {
        return null;
    }

    if (
        numericRouteType === 0 ||
        (numericRouteType >= 900 && numericRouteType < 1000)
    ) {
        return ClassifiedVehicleType.TRAM;
    }

    if (numericRouteType === 1) {
        return ClassifiedVehicleType.SUBWAY;
    }

    if (
        numericRouteType === 2 ||
        (numericRouteType >= 100 && numericRouteType < 200)
    ) {
        return ClassifiedVehicleType.TRAIN;
    }

    if (numericRouteType === 11) {
        return ClassifiedVehicleType.TROLLEYBUS;
    }

    if (
        numericRouteType === 3 ||
        (numericRouteType >= 200 && numericRouteType < 800)
    ) {
        return ClassifiedVehicleType.BUS;
    }

    if (
        numericRouteType === 4 ||
        (numericRouteType >= 1000 && numericRouteType < 1100)
    ) {
        return ClassifiedVehicleType.FERRY;
    }

    if (numericRouteType === 7 || numericRouteType === 1400) {
        return ClassifiedVehicleType.FUNICULAR;
    }

    return null;
};

const classifyPidRoute = ({
    routeName,
    gtfsVehicleType,
    isSubstitute,
}: {
    routeName: string;
    gtfsVehicleType: ClassifiedVehicleType | null;
    isSubstitute: boolean;
}): RouteClassification => {
    const baseRouteName = stripLeadingSubstitutePrefix(routeName);
    const numericRoute = parseNumericRoute(baseRouteName);
    const isNight =
        numericRoute !== null
            ? (numericRoute >= 90 && numericRoute < 100) ||
              (numericRoute >= 900 && numericRoute < 1000)
            : false;

    if (PID_METRO_LINES.has(baseRouteName)) {
        return {
            vehicleType: ClassifiedVehicleType.SUBWAY,
            isNight,
            isSubstitute,
        };
    }

    if (baseRouteName.startsWith("LD")) {
        return {
            vehicleType: ClassifiedVehicleType.FUNICULAR,
            isNight,
            isSubstitute,
        };
    }

    if (/^P\d*$/.test(baseRouteName)) {
        return {
            vehicleType: ClassifiedVehicleType.FERRY,
            isNight,
            isSubstitute,
        };
    }

    if (PID_TRAIN_PREFIXES.some((prefix) => baseRouteName.startsWith(prefix))) {
        return {
            vehicleType: ClassifiedVehicleType.TRAIN,
            isNight,
            isSubstitute,
        };
    }

    if (PID_BUS_PREFIXES.some((prefix) => baseRouteName.startsWith(prefix))) {
        return {
            vehicleType: ClassifiedVehicleType.BUS,
            isNight,
            isSubstitute,
        };
    }

    if (gtfsVehicleType) {
        return {
            vehicleType: gtfsVehicleType,
            isNight,
            isSubstitute,
        };
    }

    if (numericRoute !== null) {
        if (PID_TROLLEYBUS_NUMBERS.has(numericRoute)) {
            return {
                vehicleType: ClassifiedVehicleType.TROLLEYBUS,
                isNight,
                isSubstitute,
            };
        }

        if (numericRoute < 100) {
            return {
                vehicleType: ClassifiedVehicleType.TRAM,
                isNight,
                isSubstitute,
            };
        }

        return {
            vehicleType: ClassifiedVehicleType.BUS,
            isNight,
            isSubstitute,
        };
    }

    return {
        vehicleType: gtfsVehicleType ?? ClassifiedVehicleType.BUS,
        isNight,
        isSubstitute,
    };
};

const classifyBrnoRoute = ({
    routeName,
    gtfsVehicleType,
    isSubstitute,
}: {
    routeName: string;
    gtfsVehicleType: ClassifiedVehicleType | null;
    isSubstitute: boolean;
}): RouteClassification => {
    const baseRouteName = stripLeadingSubstitutePrefix(routeName);
    const numericRoute = parseNumericRoute(baseRouteName);
    const isNight = /^N(8[9]|9\d)$/.test(baseRouteName);

    if (/^[SR]\d+$/.test(baseRouteName)) {
        return {
            vehicleType: ClassifiedVehicleType.TRAIN,
            isNight: false,
            isSubstitute,
        };
    }

    if (isNight) {
        return {
            vehicleType: ClassifiedVehicleType.BUS,
            isNight: true,
            isSubstitute,
        };
    }

    if (numericRoute !== null) {
        if (numericRoute >= 1 && numericRoute <= 12) {
            return {
                vehicleType: ClassifiedVehicleType.TRAM,
                isNight: false,
                isSubstitute,
            };
        }

        if (numericRoute >= 25 && numericRoute <= 40) {
            return {
                vehicleType: ClassifiedVehicleType.TROLLEYBUS,
                isNight: false,
                isSubstitute,
            };
        }

        return {
            vehicleType: ClassifiedVehicleType.BUS,
            isNight: false,
            isSubstitute,
        };
    }

    return {
        vehicleType: gtfsVehicleType,
        isNight: null,
        isSubstitute,
    };
};

const classifyBratislavaRoute = ({
    routeName,
    gtfsVehicleType,
    isSubstitute,
}: {
    routeName: string;
    gtfsVehicleType: ClassifiedVehicleType | null;
    isSubstitute: boolean;
}): RouteClassification => {
    const baseRouteName = stripLeadingSubstitutePrefix(routeName);
    const numericRoute = parseNumericRoute(baseRouteName);
    const isNight = /^N(2[1-9]|[3-9]\d)$/.test(baseRouteName);

    if (isNight) {
        return {
            vehicleType: ClassifiedVehicleType.BUS,
            isNight: true,
            isSubstitute,
        };
    }

    if (numericRoute !== null && numericRoute >= 1 && numericRoute <= 9) {
        return {
            vehicleType: ClassifiedVehicleType.TRAM,
            isNight: false,
            isSubstitute,
        };
    }

    if (numericRoute !== null && numericRoute >= 20 && numericRoute <= 212) {
        return {
            vehicleType: gtfsVehicleType ?? ClassifiedVehicleType.BUS,
            isNight: false,
            isSubstitute,
        };
    }

    return {
        vehicleType: gtfsVehicleType,
        isNight: null,
        isSubstitute,
    };
};

const classifyBarcelonaRoute = ({
    routeName,
    gtfsVehicleType,
    isSubstitute,
}: {
    routeName: string;
    gtfsVehicleType: ClassifiedVehicleType | null;
    isSubstitute: boolean;
}): RouteClassification => {
    const baseRouteName = stripLeadingSubstitutePrefix(routeName);
    const isNight = /^N\d+$/.test(baseRouteName);

    if (isNight) {
        return {
            vehicleType: ClassifiedVehicleType.BUS,
            isNight: true,
            isSubstitute,
        };
    }

    if (/^L\d+/.test(baseRouteName)) {
        return {
            vehicleType: ClassifiedVehicleType.SUBWAY,
            isNight: false,
            isSubstitute,
        };
    }

    if (/^T\d+/.test(baseRouteName)) {
        return {
            vehicleType: ClassifiedVehicleType.TRAM,
            isNight: false,
            isSubstitute,
        };
    }

    if (/^[VH]?\d+/.test(baseRouteName)) {
        return {
            vehicleType: ClassifiedVehicleType.BUS,
            isNight: false,
            isSubstitute,
        };
    }

    return {
        vehicleType: gtfsVehicleType,
        isNight: false,
        isSubstitute,
    };
};

const classifyLiberecRoute = ({
    routeName,
    gtfsVehicleType,
    isSubstitute,
}: {
    routeName: string;
    gtfsVehicleType: ClassifiedVehicleType | null;
    isSubstitute: boolean;
}): RouteClassification => {
    const baseRouteName = stripLeadingSubstitutePrefix(routeName);
    const numericRoute = parseNumericRoute(baseRouteName);
    const isNight =
        numericRoute !== null && numericRoute >= 91 && numericRoute <= 94;

    if (numericRoute !== null && LIBEREC_TRAM_NUMBERS.has(numericRoute)) {
        return {
            vehicleType: ClassifiedVehicleType.TRAM,
            isNight: false,
            isSubstitute,
        };
    }

    if (isNight) {
        return {
            vehicleType: ClassifiedVehicleType.BUS,
            isNight: true,
            isSubstitute,
        };
    }

    if (numericRoute !== null) {
        return {
            vehicleType: ClassifiedVehicleType.BUS,
            isNight: false,
            isSubstitute,
        };
    }

    return {
        vehicleType: gtfsVehicleType,
        isNight: null,
        isSubstitute,
    };
};

const classifyFallbackRoute = ({
    gtfsVehicleType,
    isSubstitute,
}: {
    gtfsVehicleType: ClassifiedVehicleType | null;
    isSubstitute: boolean;
}): RouteClassification => ({
    vehicleType: gtfsVehicleType,
    isNight: null,
    isSubstitute,
});

export const classifyRoute = ({
    feedId,
    routeShortName,
    routeType,
}: {
    feedId: GtfsFeedId | null | undefined;
    routeShortName: string | null | undefined;
    routeType?: string | null | undefined;
}): RouteClassification => {
    const routeName = normalizeRouteName(routeShortName);
    const gtfsVehicleType = getVehicleTypeFromGtfsRouteType(routeType);
    const isSubstitute = routeName.startsWith("X");

    if (!routeName) {
        return {
            vehicleType: gtfsVehicleType,
            isNight: null,
            isSubstitute,
        };
    }

    switch (feedId) {
        case GtfsFeedId.PID:
            return classifyPidRoute({
                routeName,
                gtfsVehicleType,
                isSubstitute,
            });
        case GtfsFeedId.BRNO:
            return classifyBrnoRoute({
                routeName,
                gtfsVehicleType,
                isSubstitute,
            });
        case GtfsFeedId.BRATISLAVA:
            return classifyBratislavaRoute({
                routeName,
                gtfsVehicleType,
                isSubstitute,
            });
        case GtfsFeedId.BARCELONA:
            return classifyBarcelonaRoute({
                routeName,
                gtfsVehicleType,
                isSubstitute,
            });
        case GtfsFeedId.LIBEREC:
            return classifyLiberecRoute({
                routeName,
                gtfsVehicleType,
                isSubstitute,
            });
        case GtfsFeedId.LEO:
        case GtfsFeedId.ZSR:
            return {
                vehicleType: ClassifiedVehicleType.TRAIN,
                isNight: false,
                isSubstitute,
            };
        // PMDP, USTI, and unknown feeds: GTFS-based fallback.
        default:
            return classifyFallbackRoute({
                gtfsVehicleType,
                isSubstitute,
            });
    }
};
