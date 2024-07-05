import { Controller, Get } from "@nestjs/common";
import { PrismaService } from "../../services/prisma.service";

@Controller("stop")
export class StopController {
    constructor(private prisma: PrismaService) {}

    @Get("all")
    async getAllStops(): Promise<any[]> {
        const stops = await this.prisma.stop.findMany({
            select: {
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
            },
        });

        return stops.map((stop) => ({
            ...stop,
            routes: stop.routes.map(({ route }) => route),
        }));
    }
}
