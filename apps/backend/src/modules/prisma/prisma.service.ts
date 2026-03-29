import { Injectable, OnModuleDestroy, OnModuleInit } from "@nestjs/common";
import { PrismaClient } from "@metro-now/database";
import { createPrismaClientOptions } from "@metro-now/shared";

@Injectable()
export class PrismaService
    extends PrismaClient
    implements OnModuleInit, OnModuleDestroy
{
    constructor() {
        super(
            createPrismaClientOptions({
                env: process.env,
                log: ["info", "warn", "error"],
            }),
        );
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
