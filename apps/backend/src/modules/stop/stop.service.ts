import { Injectable } from "@nestjs/common";
import { Prisma } from "@prisma/client";

import { platformSelect } from "src/modules/platform/platform.service";
import { PrismaService } from "src/modules/prisma/prisma.service";

export const getStopsSelect = ({ metroOnly }: { metroOnly: boolean }) => {
    return {
        id: true,
        name: true,
        avgLatitude: true,
        avgLongitude: true,
        platforms: {
            select: platformSelect,
            where: metroOnly ? { isMetro: true } : {},
        },
    } satisfies Prisma.StopSelect;
};

@Injectable()
export class StopService {
    constructor(private prisma: PrismaService) {}

    async getAll({
        metroOnly,
        where,
    }: {
        metroOnly: boolean;
        where?: Prisma.StopWhereInput;
    }) {
        const stops = await this.prisma.stop.findMany({
            select: getStopsSelect({ metroOnly }),
            where: {
                ...where,
                platforms: {
                    ...where?.platforms,
                    some: {
                        ...where?.platforms?.some,
                        isMetro: metroOnly,
                    },
                },
            },
        });

        return stops.map((stop) => ({
            ...stop,
            platforms: stop.platforms.map((platform) => ({
                ...platform,
                routes: platform.routes.map((route) => route.route),
            })),
        }));
    }

    async getOne({ where }: { where?: Prisma.StopWhereInput }) {
        const stop = await this.prisma.stop.findFirst({
            select: getStopsSelect({ metroOnly: false }),
            where: {
                ...where,
            },
        });

        if (!stop) {
            return null;
        }

        return {
            ...stop,
            platforms: (stop.platforms || []).map((platform) => ({
                ...platform,
                routes: platform.routes.map((route) => route.route),
            })),
        };
    }
}
