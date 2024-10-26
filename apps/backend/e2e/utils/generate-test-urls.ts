import { toArray } from "src/utils/array.utils";

type SearchParams = [searchParam: string, value: string][];

export const generateTestUrls = (
    path: string,
    urlParams: SearchParams[],
): string[] => {
    return urlParams.map((params) => {
        const searchParams = new URLSearchParams(params);

        return `${path}?${searchParams.toString()}`;
    });
};

export const generateParamsArray = (
    name: string,
    value: boolean | boolean[] | number | number[] | string | string[] = "",
): SearchParams => {
    return toArray(value).map((val) => [name, String(val)]);
};
