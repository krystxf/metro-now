export const toLookupRouteId = (id: string): string =>
    id.includes(":") || id.startsWith("L") ? id : `L${id}`;

export const toPublicRouteId = (id: string): string =>
    id.startsWith("LTL:")
        ? id
        : id.includes(":")
          ? id
          : id.startsWith("L")
            ? id.slice(1)
            : id;
