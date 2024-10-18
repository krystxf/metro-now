import { ConsoleLogger, Injectable, Scope } from "@nestjs/common";
import { Prisma } from "@prisma/client";

import { LogMessage, LogType, RestLogStatus } from "src/enums/log.enum";
import { PrismaService } from "src/modules/prisma/prisma.service";

@Injectable({ scope: Scope.TRANSIENT })
export class LoggerService extends ConsoleLogger {
    private readonly prisma = new PrismaService();

    async error(message: string, trace: string): Promise<void> {
        try {
            await this.prisma.log.create({
                data: {
                    type: LogType.ERROR,
                    message,
                    trace,
                },
            });
        } catch (error) {
            super.error("Failed to log error", error);
        }

        super.error(message, trace);
    }

    async createLog(
        type: LogType,
        message: LogMessage,
        trace:
            | Prisma.NullableJsonNullValueInput
            | Prisma.InputJsonValue = Prisma.JsonNull,
    ): Promise<void> {
        try {
            await this.prisma.log.create({
                data: {
                    type,
                    message,
                    trace,
                },
            });
        } catch (error) {
            super.error("Failed to log error", error);
        }
    }

    async createRestLog(
        endpoint: string,
        duration: number,
        querySearch: Record<string, string | string[]> | null = null,
    ): Promise<void> {
        await this.createLog(LogType.INFO, LogMessage.REST, {
            endpoint,
            duration,
            status: RestLogStatus.SUCCESS,
            querySearch,
        });
    }

    async createRestErrorLog(
        endpoint,
        querySearch: Record<string, string | string[]> | null = null,
    ): Promise<void> {
        await this.createLog(LogType.INFO, LogMessage.REST, {
            endpoint,
            status: RestLogStatus.INVALID_REQUEST,
            querySearch,
        });
    }
}
