import { Injectable, Logger, NestMiddleware } from "@nestjs/common";
import { Request, Response, NextFunction } from "express";

@Injectable()
export class RequestLoggerMiddleware implements NestMiddleware {
    private readonly logger = new Logger();

    use(req: Request, res: Response, next: NextFunction) {
        res.on("finish", () => {
            let level: string;
            if (res.statusCode >= 500) {
                level = "error";
            } else if (res.statusCode >= 400) {
                level = "warn";
            } else if (res.statusCode >= 200 && res.statusCode < 300) {
                level = "http";
            }

            this.logger.log(level, {
                method: req.method,
                url: req.url,
                headers: req.headers,
                statusCode: res.statusCode,
            });
        });

        next();
    }
}
