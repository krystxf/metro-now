import { Injectable, OnModuleDestroy, OnModuleInit } from "@nestjs/common";
import { PrismaClient } from "@prisma/client";

@Injectable()
export class PrismaService
    extends PrismaClient
    implements OnModuleInit, OnModuleDestroy
{
    constructor() {
        super({
            datasourceUrl: `postgresql://${process.env.POSTGRES_USER}:${process.env.POSTGRES_PASSWORD}@${process.env.DB_HOST}:${process.env.DB_PORT}/${process.env.POSTGRES_DB}?schema=${process.env.DB_SCHEMA}`,
            log: ["info", "warn", "error"],
        });
    }
    async onModuleInit() {
        await this.$connect();
    }

    async onModuleDestroy() {
        await this.$disconnect();
    }

    async getExtensions(): Promise<
        {
            oid: string | number;
            extname: string;
        }[]
    > {
        return await this.$queryRaw`SELECT * FROM pg_extension`;
    }

    async getExtensionNames(): Promise<string[]> {
        const extensions = await this.getExtensions();

        return extensions.map((ext) => ext.extname);
    }
}
