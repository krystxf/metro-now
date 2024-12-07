type TwClass = string | undefined | null;

export const twMerge = (base: TwClass, ...classes: TwClass[]): string => {
    return [base, ...classes].filter(Boolean).join(" ");
};
