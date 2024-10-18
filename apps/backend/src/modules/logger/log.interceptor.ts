import {
    CallHandler,
    ExecutionContext,
    Injectable,
    NestInterceptor,
} from "@nestjs/common";
import { Observable } from "rxjs";
import { tap } from "rxjs/operators";

import { LoggerService } from "src/modules/logger/logger.service";

@Injectable()
export class LogInterceptor implements NestInterceptor {
    constructor(private readonly logger: LoggerService) {}

    intercept(context: ExecutionContext, next: CallHandler): Observable<any> {
        const now = Date.now();
        const request = context.switchToHttp().getRequest();
        const { url, query } = request;
        const endpoint = url.split("?")[0];

        return next.handle().pipe(
            tap(async () => {
                const duration = Date.now() - now;
                await this.logger.createRestLog(endpoint, duration, query);
            }),
        );
    }
}
