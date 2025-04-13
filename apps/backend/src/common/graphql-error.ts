import {
    GraphQLFormattedError,
    GraphQLError as OriginalGraphQLError,
} from "graphql";

type Params = {
    message: string;
    code: "BAD_USER_INPUT";
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
