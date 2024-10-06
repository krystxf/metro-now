import { Request } from "express";

import { GRAPHQL_API_ROOT } from "src/constants/graphql.const";

export const isGraphqlRequest = (req: Request): boolean => {
    return req.originalUrl === GRAPHQL_API_ROOT;
};

export const isIntrospectionQuery = (req: Request): boolean => {
    const query = req.body?.query;
    if (typeof query !== "string") return false;
    return query.trim().toLowerCase().startsWith("query introspectionquery");
};
