import {
    type ApolloServerPlugin,
    type BaseContext,
    type GraphQLRequestContext,
    type GraphQLRequestListener,
} from "@apollo/server";
import { Plugin } from "@nestjs/apollo";
import { Injectable } from "@nestjs/common";
import type { GraphQLError } from "graphql";

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
                logService.logGraphQLRequest({
                    durationMs: Date.now() - startedAt,
                    errors: encounteredErrors,
                    requestContext,
                });
            },
        };
    }
}
