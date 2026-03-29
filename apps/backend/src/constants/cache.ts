const stableStringify = (value: unknown): string => {
    if (value === null || typeof value !== "object") {
        return JSON.stringify(value);
    }

    if (Array.isArray(value)) {
        return `[${value.map((item) => stableStringify(item)).join(",")}]`;
    }

    const entries = Object.entries(value as Record<string, unknown>).sort(
        ([left], [right]) => left.localeCompare(right),
    );

    return `{${entries
        .map(
            ([key, nestedValue]) =>
                `${JSON.stringify(key)}:${stableStringify(nestedValue)}`,
        )
        .join(",")}}`;
};

const buildCacheKey = (prefix: string, value?: unknown): string => {
    if (value === undefined) {
        return prefix;
    }

    return `${prefix}.${stableStringify(value)}`;
};

export const uniqueStrings = <Value extends string>(
    values: readonly Value[],
): Value[] => {
    return [...new Set(values)];
};

export const uniqueSortedStrings = <Value extends string>(
    values: readonly Value[],
): Value[] => {
    return uniqueStrings(values).sort((left, right) =>
        left.localeCompare(right),
    );
};

export const CACHE_KEYS = {
    infotexts: {
        getAll: "infotexts.getAll",
    },
    golemio: {
        getGolemioData: (url: string) =>
            buildCacheKey("golemio.getGolemioData", url),
    },
    platform: {
        getAllGraphQL: (params: unknown) =>
            buildCacheKey("platform.getAllGraphQL", params),
        getGraphQLById: (id: string) =>
            buildCacheKey("platform.getGraphQLById", id),
        getOne: (params: unknown) => buildCacheKey("platform.getOne", params),
    },
    route: {
        getManyGraphQL: (params: unknown) =>
            buildCacheKey("route.getManyGraphQL", params),
        getManyGraphQLByPlatformId: (platformId: string) =>
            buildCacheKey("route.getManyGraphQLByPlatformId", platformId),
        getOneGraphQL: (id: string) => buildCacheKey("route.getOneGraphQL", id),
    },
    status: {
        getDbDataStatus: "status.getDbDataStatus",
        getGeoFunctionsStatus: "status.getGeoFunctionsStatus",
    },
    stop: {
        getAllGraphQL: (params: unknown) =>
            buildCacheKey("stop.getAllGraphQL", params),
        getGraphQLById: (id: string) =>
            buildCacheKey("stop.getGraphQLById", id),
        getOne: (params: unknown) => buildCacheKey("stop.getOne", params),
    },
};

export const ttl = ({
    minutes = 0,
    seconds = 0,
}: {
    minutes?: number;
    seconds?: number;
}) => {
    if (seconds + minutes === 0) {
        throw new Error("ttl: cannot be 0");
    }

    return (minutes * 60 + seconds) * 1000;
};
