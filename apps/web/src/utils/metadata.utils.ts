export const getTitle = (title?: string | null) => {
    if (!title) {
        return "Metro Now";
    }

    return `${title} | Metro Now`;
};
