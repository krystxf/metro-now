export const removeDiacritics = (str: string): string => {
    return str.normalize("NFD").replace(/\p{Diacritic}/gu, "");
};
