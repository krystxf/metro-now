export const parseQueryParam = (
    param: string | string[] | undefined,
): string[] | null => {
    if (!param) {
        return null;
    }

    if (param instanceof Array) {
        return param.length === 0 ? null : param;
    }

    if (param.startsWith("[") && param.endsWith("]")) {
        try {
            return JSON.parse(param);
        } catch {
            return param.slice(1, -1).split(",");
        }
    }

    return [param];
};
