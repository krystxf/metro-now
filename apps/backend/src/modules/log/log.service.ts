import {
    type BaseContext,
    type GraphQLRequestContextWillSendResponse,
} from "@apollo/server";
import { type NewLog } from "@metro-now/database";
import { Injectable, type OnModuleDestroy } from "@nestjs/common";
import type { GraphQLError } from "graphql";

import { DatabaseService } from "src/modules/database/database.service";
import { graphQLQueryStringFromApolloContext } from "src/modules/log/graphql-request-query-string";

const SERVICE_NAME = "backend";

const serializeGraphQLError = (error: GraphQLError) => {
    return {
        message: error.message,
        code:
            typeof error.extensions?.code === "string"
                ? error.extensions.code
                : null,
        path: error.path ?? null,
    };
};

const sanitizeContext = (
    context: Record<string, unknown>,
): Record<string, unknown> => {
    return Object.fromEntries(
        Object.entries(context).filter(([, value]) => value !== undefined),
    );
};

const getResultKeys = (
    body: GraphQLRequestContextWillSendResponse<BaseContext>["response"]["body"],
): string[] | null => {
    const singleResult =
        body.kind === "single" ? body.singleResult : body.initialResult;
    const data = "data" in singleResult ? singleResult.data : undefined;

    if (!data || typeof data !== "object" || Array.isArray(data)) {
        return null;
    }

    return Object.keys(data as Record<string, unknown>);
};

@Injectable()
export class LogService implements OnModuleDestroy {
    private pendingWrite: Promise<void> = Promise.resolve();

    constructor(private readonly database: DatabaseService) {}

    logGraphQLRequest({
        durationMs,
        errors = [],
        requestContext,
    }: {
        durationMs: number;
        errors?: readonly GraphQLError[];
        requestContext: GraphQLRequestContextWillSendResponse<BaseContext>;
    }): void {
        const level = errors.length > 0 ? "error" : "info";
        const statusCode = requestContext.response.http.status ?? 200;
        const logEntry: NewLog = {
            service: SERVICE_NAME,
            level,
            message: "GraphQL request completed",
            context: sanitizeContext({
                operationName:
                    requestContext.operationName ??
                    requestContext.request.operationName ??
                    null,
                operationType: requestContext.operation?.operation ?? null,
                query: graphQLQueryStringFromApolloContext(requestContext),
                variables: requestContext.request.variables ?? null,
                extensions: requestContext.request.extensions ?? null,
                queryHash: requestContext.queryHash ?? null,
                durationMs,
                statusCode,
                requestIsBatched: requestContext.requestIsBatched,
                httpMethod: requestContext.request.http?.method ?? null,
                search: requestContext.request.http?.search ?? null,
                userAgent:
                    requestContext.request.http?.headers.get("user-agent") ??
                    null,
                responseKind: requestContext.response.body.kind,
                resultKeys: getResultKeys(requestContext.response.body),
                hasErrors: errors.length > 0,
                errorCount: errors.length,
                errors: errors.map(serializeGraphQLError),
            }),
            createdAt: new Date(),
        };

        this.pendingWrite = this.pendingWrite
            .then(async () => {
                await this.database.db
                    .insertInto("Log")
                    .values(logEntry)
                    .execute();
            })
            .catch((error) => {
                console.error("Failed to write backend GraphQL log", {
                    error:
                        error instanceof Error ? error.message : String(error),
                });
            });
    }

    async flush(): Promise<void> {
        await this.pendingWrite;
    }

    async onModuleDestroy() {
        await this.flush();
    }
}
