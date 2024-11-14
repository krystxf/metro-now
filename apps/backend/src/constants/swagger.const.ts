import {
    GRAPHQL_PATH,
    SOURCE_CODE_URL,
    SWAGGER_JSON_PATH,
} from "@metro-now/constants";

export const SWAGGER_TITLE = "Metro Now API";
export const SWAGGER_VERSION = "1.0";
export const SWAGGER_DESCRIPTION = `
### Hello, fellow developer👋
Thank you for checking out my project.

### Links
- [GraphQL Playground](${GRAPHQL_PATH})
- [Swagger JSON file](${SWAGGER_JSON_PATH})
- [Source code](${SOURCE_CODE_URL})

### ⚠️ Warning
Do __NOT__ use non-versioned endpoints (e.g. \`/stop/all\`). Use versioned endpoints instead (e.g. \`/v1/stop/all\`).

Non-versioned endpoints are deprecated and will be removed in the future.

`;
