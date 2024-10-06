import { CacheInterceptor } from "@nestjs/cache-manager";
import { ExecutionContext, Injectable } from "@nestjs/common";

import { GRAPHQL_API_ROOT } from "src/constants/graphql.const";
import {
    SWAGGER_API_ROOT,
    SWAGGER_JSON_URL,
} from "src/constants/swagger.const";

@Injectable()
export class HttpCacheInterceptor extends CacheInterceptor {
    trackBy(context: ExecutionContext): string | undefined {
        const request = context.switchToHttp().getRequest();
        const { httpAdapter } = this.httpAdapterHost;

        const isGetRequest = httpAdapter.getRequestMethod(request) === "GET";
        const excludePaths: string[] = [
            GRAPHQL_API_ROOT,
            SWAGGER_JSON_URL,
            SWAGGER_API_ROOT,
        ];

        if (!isGetRequest) {
            return undefined;
        }
        if (excludePaths.includes(httpAdapter.getRequestUrl(request))) {
            return undefined;
        }

        return httpAdapter.getRequestUrl(request);
    }
}
