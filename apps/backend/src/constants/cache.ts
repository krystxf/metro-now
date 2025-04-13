export const CACHE_KEYS = {
    infotexts: {
        getAll: "infotexts.getAll",
    },
    golemio: {
        getGolemioData: (url: string) => `golemio.getGolemioData.${url}`,
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
