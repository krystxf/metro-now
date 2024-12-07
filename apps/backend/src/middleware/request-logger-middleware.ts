import { Injectable, NestMiddleware } from "@nestjs/common";
import { NextFunction, Request, Response } from "express";

import { PrismaService } from "src/modules/prisma/prisma.service";

@Injectable()
export class RequestLoggerMiddleware implements NestMiddleware {
    constructor(private readonly prisma: PrismaService) {}

    async use(req: Request, res: Response, next: NextFunction) {
        const start = Date.now();

        // Intercept the response to capture the body
        const originalSend = res.send;
        let responseBody: unknown;

        res.send = (body): Response => {
            responseBody = body; // Capture the response body
            return originalSend.call(res, body); // Call the original `send` method
        };

        // Attach an event listener to log after the response is sent
        res.on("finish", async () => {
            const duration = Date.now() - start;
            const {
                method,
                url: path,
                headers: { "user-agent": userAgent = null },
            } = req;
            const { statusCode } = res;
            const responseString =
                typeof responseBody === "string"
                    ? responseBody
                    : JSON.stringify(responseBody);

            const ignoreResponse = ["/v1/stop/all", "/v1/platform/"].some(
                (item) => path.startsWith(item),
            );

            if (path.startsWith("/status")) {
                return;
            }

            try {
                // Log the request details to the database
                await this.prisma.requestLog.create({
                    data: {
                        method,
                        path,
                        status: statusCode,
                        duration,
                        userAgent,
                        response: ignoreResponse ? null : responseString,
                    },
                });
            } catch (error) {
                console.error("Failed to log request:", error);
            }
        });

        next();
    }
}
