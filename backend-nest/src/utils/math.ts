export const min = (...values: number[] | number[][]): number => {
    return Math.min(...values.flat());
};

export const max = (...values: number[] | number[][]): number => {
    return Math.max(...values.flat());
};

export const minMax = (
    ...values: number[] | number[][]
): { min: number; max: number } => {
    const flatValues = values.flat();

    return {
        min: min(flatValues),
        max: max(flatValues),
    };
};
