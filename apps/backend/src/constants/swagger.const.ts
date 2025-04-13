import {
    GRAPHQL_PATH,
    SOURCE_CODE_URL,
    SWAGGER_JSON_PATH,
} from "src/constants/api";

export const SWAGGER_TITLE = "Metro Now API";
export const SWAGGER_VERSION = "1.0";
export const SWAGGER_DESCRIPTION = `
# ⚠️ REST API is deprecated, use GraphQL instead ⚠️

### Links
- [GraphQL Playground](${GRAPHQL_PATH})
- [Swagger JSON file](${SWAGGER_JSON_PATH})
- [Source code](${SOURCE_CODE_URL})
`;
