import {
    type GraphQLFormattedError,
    GraphQLError as OriginalGraphQLError,
} from "graphql";

export type GraphQLErrorCode =
    | "BAD_USER_INPUT"
    | "NOT_FOUND"
    | "UPSTREAM_FAILED"
    | "MISSING_DATA"
    | "INTERNAL";

type Params = {
    message: string;
    code: GraphQLErrorCode;
};

export const GraphQLError = ({ message, code }: Params) => {
    return new OriginalGraphQLError(message, {
        extensions: {
            code,
            ignoreStackTrace: true,
        },
    });
};

export const formatGraphQLError = (formattedError: GraphQLFormattedError) => {
    if (formattedError.extensions?.ignoreStackTrace !== true) {
        return formattedError;
    }

    return {
        message: formattedError.message,
        extensions: {
            ...formattedError.extensions,
            stacktrace: undefined,
            ignoreStackTrace: undefined,
        },
    };
};
