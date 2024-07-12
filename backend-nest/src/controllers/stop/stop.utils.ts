import type { Prisma } from "@prisma/client";

export const stopSelect = {
    id: true,
    latitude: true,
    longitude: true,
    name: true,
    routes: {
        select: {
            route: {
                select: {
                    id: true,
                    name: true,
                },
            },
        },
    },
} satisfies Prisma.StopSelect;
