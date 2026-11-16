import { Injectable, type NestMiddleware } from "@nestjs/common";
import type { NextFunction, Request, Response } from "express";

import {
    getGraphQLQueryForRequestLog,
    graphqlQueryFromHttpRequest,
} from "src/modules/log/graphql-query-for-request-log.store";
import { RequestLogService } from "src/modules/log/request-log.service";

@Injectable()
export class RequestLoggingMiddleware implements NestMiddleware {
    constructor(private readonly requestLogService: RequestLogService) {}

    use(req: Request, res: Response, next: NextFunction): void {
        const startedAt = Date.now();

        res.on("finish", () => {
            const durationMs = Date.now() - startedAt;
            const headers = Object.fromEntries(
                Object.entries(req.headers).filter(
                    ([key]) =>
                        !["authorization", "cookie", "set-cookie"].includes(
                            key,
                        ),
                ),
            );

            this.requestLogService.log({
                method: req.method,
                path: req.originalUrl,
                statusCode: res.statusCode,
                durationMs,
                cached: res.getHeader("x-cache") === "HIT",
                userAgent: req.headers["user-agent"] ?? null,
                appVersion: (req.headers["x-app-version"] as string) ?? null,
                headers,
                graphqlQuery:
                    getGraphQLQueryForRequestLog(req) ??
                    graphqlQueryFromHttpRequest(req) ??
                    null,
            });
        });

        next();
    }
}
