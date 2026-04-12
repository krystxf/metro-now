import {
    type ApolloServerPlugin,
    type BaseContext,
    type GraphQLRequestContext,
    type GraphQLRequestListener,
} from "@apollo/server";
import { Plugin } from "@nestjs/apollo";
import { Injectable } from "@nestjs/common";
import type { Request } from "express";
import type { GraphQLError } from "graphql";

import { setGraphQLQueryForRequestLog } from "src/modules/log/graphql-query-for-request-log.store";
import { graphQLQueryStringFromApolloContext } from "src/modules/log/graphql-request-query-string";
import { LogService } from "src/modules/log/log.service";

@Plugin()
@Injectable()
export class GraphQLQueryLoggingPlugin
    implements ApolloServerPlugin<BaseContext>
{
    constructor(private readonly logService: LogService) {}

    async requestDidStart(
        _requestContext: GraphQLRequestContext<BaseContext>,
    ): Promise<GraphQLRequestListener<BaseContext>> {
        const startedAt = Date.now();
        const logService = this.logService;
        let encounteredErrors: readonly GraphQLError[] = [];

        return {
            async didEncounterErrors(requestContext) {
                encounteredErrors = requestContext.errors;
            },
            async willSendResponse(requestContext) {
                const httpReq = requestContext.contextValue as
                    | { req?: Request }
                    | undefined;
                const req = httpReq?.req;
                if (req) {
                    setGraphQLQueryForRequestLog(
                        req,
                        graphQLQueryStringFromApolloContext(requestContext),
                    );
                }
                logService.logGraphQLRequest({
                    durationMs: Date.now() - startedAt,
                    errors: encounteredErrors,
                    requestContext,
                });
            },
        };
    }
}
