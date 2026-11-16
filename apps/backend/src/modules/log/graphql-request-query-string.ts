import type {
    BaseContext,
    GraphQLRequestContextWillSendResponse,
} from "@apollo/server";
import { type DocumentNode, print } from "graphql";

export function graphQLQueryStringFromApolloContext(
    requestContext: GraphQLRequestContextWillSendResponse<BaseContext>,
): string | null {
    const { source, request } = requestContext;
    if (typeof source === "string" && source.length > 0) {
        return source;
    }
    const q = request.query;
    if (typeof q === "string" && q.length > 0) {
        return q;
    }
    if (q && typeof q === "object" && "kind" in q) {
        return print(q as DocumentNode);
    }
    return null;
}
