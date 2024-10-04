import { Injectable } from "@nestjs/common";
import { Prisma } from "@prisma/client";
import { PrismaService } from "src/database/prisma.service";
import { platformSelect } from "../platform/platform.service";

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

    async getAll({ metroOnly }: { metroOnly: boolean }) {
        const stops = await this.prisma.stop.findMany({
            select: getStopsSelect({ metroOnly }),
            where: {
                platforms: {
                    some: {
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
}
