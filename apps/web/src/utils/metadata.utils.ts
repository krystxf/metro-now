export const getTitle = (title?: string | null) => {
    if (!title) {
        return "Metro Now";
    }

    `${title} | Metro Now`;
};
