import { Injectable, NestMiddleware } from "@nestjs/common";
import { LogType } from "@prisma/client";
import { NextFunction, Request, Response } from "express";

import { LogMessage } from "src/enums/log.enum";
import { PrismaService } from "src/modules/prisma/prisma.service";
import {
    isGraphqlRequest,
    isIntrospectionQuery,
} from "src/utils/graphql.utils";
import { isSuccess } from "src/utils/status-code.utils";

@Injectable()
export class LoggerMiddleware implements NestMiddleware {
    constructor(private prisma: PrismaService) {}

    use(req: Request, res: Response, next: NextFunction) {
        const start = Date.now();

        res.on("finish", async () => {
            if (isGraphqlRequest(req)) {
                try {
                    await createGraphqlLog({
                        req,
                        res,
                        duration: Date.now() - start,
                        prisma: this.prisma,
                    });
                } catch (error) {
                    console.error("Failed to create Graphql log", error);
                }
            } else {
                try {
                    await createRestLog({
                        req,
                        res,
                        duration: Date.now() - start,
                        prisma: this.prisma,
                    });
                } catch (error) {
                    console.error("Failed to create REST log", error);
                }
            }
        });

        if (next) {
            next();
        }
    }
}

const createRestLog = async ({
    req,
    res,
    duration,
    prisma,
}: {
    req: Request;
    res: Response;
    duration: number;
    prisma: PrismaService;
}): Promise<void> => {
    prisma.log.create({
        data: {
            type: isSuccess(res.statusCode) ? LogType.INFO : LogType.ERROR,
            message: LogMessage.REST,
            statusCode: res.statusCode,
            host: req.headers.host ?? null,
            path: req.originalUrl,
            duration,
        },
    });
};

const createGraphqlLog = async ({
    req,
    res,
    duration,
    prisma,
}: {
    req: Request;
    res: Response;
    duration: number;
    prisma: PrismaService;
}): Promise<void> => {
    prisma.log.create({
        data: {
            type: isSuccess(res.statusCode) ? LogType.INFO : LogType.ERROR,
            message: isIntrospectionQuery(req)
                ? LogMessage.GRAPHQL_INTROSPECTION
                : LogMessage.GRAPHQL,
            statusCode: res.statusCode,
            host: req.headers.host ?? null,
            duration,
            path: req.originalUrl,
            description: req.body.query,
        },
    });
};
