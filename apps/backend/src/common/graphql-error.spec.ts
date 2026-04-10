import { formatGraphQLError, GraphQLError } from "./graphql-error";

describe("GraphQLError", () => {
    it("creates an error with message and code extension", () => {
        const error = GraphQLError({
            message: "Invalid input",
            code: "BAD_USER_INPUT",
        });

        expect(error.message).toBe("Invalid input");
        expect(error.extensions?.code).toBe("BAD_USER_INPUT");
        expect(error.extensions?.ignoreStackTrace).toBe(true);
    });
});

describe("formatGraphQLError", () => {
    it("strips stacktrace for errors with ignoreStackTrace", () => {
        const formatted = formatGraphQLError({
            message: "Bad input",
            extensions: {
                code: "BAD_USER_INPUT",
                ignoreStackTrace: true,
                stacktrace: ["line1", "line2"],
            },
        });

        expect(formatted.message).toBe("Bad input");
        expect(formatted.extensions?.stacktrace).toBeUndefined();
        expect(formatted.extensions?.ignoreStackTrace).toBeUndefined();
    });

    it("preserves the full error when ignoreStackTrace is not set", () => {
        const original = {
            message: "Internal error",
            extensions: {
                code: "INTERNAL_SERVER_ERROR",
                stacktrace: ["line1"],
            },
        };
        const formatted = formatGraphQLError(original);

        expect(formatted).toBe(original);
    });

    it("preserves the full error when ignoreStackTrace is false", () => {
        const original = {
            message: "Error",
            extensions: {
                code: "INTERNAL_SERVER_ERROR",
                ignoreStackTrace: false,
            },
        };
        const formatted = formatGraphQLError(original);

        expect(formatted).toBe(original);
    });
});
