import { GRAPHQL_URL } from "@/constants/api";

type GraphqlResponse<T> = {
    data?: T;
    errors?: { message?: string }[];
};

type GraphqlFetchInit = RequestInit & {
    next?: {
        revalidate?: number | false;
        tags?: string[];
    };
};

export const graphqlFetch = async <T>(
    query: string,
    variables?: Record<string, unknown>,
    init?: GraphqlFetchInit,
): Promise<T> => {
    const response = await fetch(GRAPHQL_URL, {
        method: "POST",
        headers: {
            "Content-Type": "application/json",
            ...init?.headers,
        },
        body: JSON.stringify({ query, variables }),
        ...init,
    });

    const json = (await response.json()) as GraphqlResponse<T>;

    if (!response.ok || json.errors?.length) {
        throw new Error(
            json.errors?.[0]?.message ??
                `GraphQL request failed with ${response.status}`,
        );
    }

    if (!json.data) {
        throw new Error("GraphQL response did not include data");
    }

    return json.data;
};
