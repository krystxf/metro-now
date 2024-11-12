import { ConsoleLogger, Injectable, Scope } from "@nestjs/common";
import { Prisma } from "@prisma/client";

import { Environment } from "src/enums/environment.enum";
import { LogLevel, LogMessage, RestLogStatus } from "src/enums/log.enum";
import { PrismaService } from "src/modules/prisma/prisma.service";

@Injectable({ scope: Scope.TRANSIENT })
export class LoggerService extends ConsoleLogger {
    private readonly prisma = new PrismaService();

    async error(message: string, trace: string): Promise<void> {
        await this.createLogHandler(LogLevel.error, message, trace);

        super.error(message, trace);
    }

    async createLog(
        type: LogLevel,
        message: LogMessage,
        trace:
            | Prisma.NullableJsonNullValueInput
            | Prisma.InputJsonValue = Prisma.JsonNull,
    ): Promise<void> {
        return this.createLogHandler(type, message, trace);
    }

    async createRestLog(
        endpoint: string,
        duration: number,
        querySearch: Record<string, string | string[]> | null = null,
    ): Promise<void> {
        return this.createRestLogHandler(endpoint, true, duration, querySearch);
    }

    async createRestErrorLog(
        endpoint,
        querySearch: Record<string, string | string[]> | null = null,
    ): Promise<void> {
        return this.createRestLogHandler(endpoint, false, null, querySearch);
    }

    private async createLogHandler(
        level: LogLevel,
        message: string,
        trace:
            | Prisma.NullableJsonNullValueInput
            | Prisma.InputJsonValue = Prisma.JsonNull,
    ) {
        if (process.env.NODE_ENV === Environment.TEST) return;
        if (process.env.LOGS !== "true") return;

        await this.prisma.log
            .create({
                data: {
                    level,
                    message,
                    trace,
                },
            })
            .catch((error) => {
                super.error("Failed to log error", error);
            });
    }

    private async createRestLogHandler(
        endpoint: string,
        success: boolean,
        duration: number | null,
        querySearch: Record<string, string | string[]> | null = null,
    ): Promise<void> {
        const status = success
            ? RestLogStatus.SUCCESS
            : RestLogStatus.INVALID_REQUEST;
        const durationObject = duration ? { duration } : {};

        return this.createLog(LogLevel.log, LogMessage.REST, {
            endpoint,
            status,
            ...durationObject,
            querySearch,
        });
    }
}
