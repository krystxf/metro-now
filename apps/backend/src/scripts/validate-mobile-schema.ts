import { readFileSync, readdirSync } from "node:fs";
import { join } from "node:path";

import { type GraphQLSchema, buildSchema, parse, validate } from "graphql";

const BACKEND_ROOT = join(__dirname, "..", "..");
const REPO_ROOT = join(BACKEND_ROOT, "..", "..");
const MOBILE_OPERATIONS_DIR = join(
    REPO_ROOT,
    "apps/mobile/metro-now/metro-now/GraphQL/Operations",
);

const SCHEMA_FILES = [
    "src/common/scalars/scalars.graphql",
    "src/modules/stop/schema.graphql",
    "src/modules/platform/schema.graphql",
    "src/modules/route/schema.graphql",
    "src/modules/departure/schema.graphql",
    "src/modules/hello/schema.graphql",
    "src/modules/infotexts/schema.graphql",
];

const loadBackendSchema = (): GraphQLSchema => {
    let seenQuery = false;

    const sdl = SCHEMA_FILES.map((relativePath) => {
        let content = readFileSync(join(BACKEND_ROOT, relativePath), "utf-8");

        if (content.includes("type Query")) {
            if (seenQuery) {
                content = content.replace("type Query", "extend type Query");
            } else {
                seenQuery = true;
            }
        }

        return content;
    }).join("\n");

    return buildSchema(sdl);
};

const main = (): void => {
    const schema = loadBackendSchema();
    const operationFiles = readdirSync(MOBILE_OPERATIONS_DIR)
        .filter((name) => name.endsWith(".graphql"))
        .sort();

    if (operationFiles.length === 0) {
        console.error(
            `No .graphql operation files found in ${MOBILE_OPERATIONS_DIR}`,
        );
        process.exit(1);
    }

    let failureCount = 0;

    for (const fileName of operationFiles) {
        const filePath = join(MOBILE_OPERATIONS_DIR, fileName);
        const source = readFileSync(filePath, "utf-8");

        try {
            const document = parse(source);
            const errors = validate(schema, document);

            if (errors.length === 0) {
                console.log(`OK    ${fileName}`);
                continue;
            }

            failureCount += 1;
            console.error(`FAIL  ${fileName}`);
            for (const error of errors) {
                console.error(`      ${error.message}`);
            }
        } catch (error) {
            failureCount += 1;
            console.error(`FAIL  ${fileName} (parse error)`);
            console.error(
                `      ${error instanceof Error ? error.message : String(error)}`,
            );
        }
    }

    console.log(
        `\nChecked ${operationFiles.length} mobile operation(s) against backend schema.`,
    );

    if (failureCount > 0) {
        console.error(
            `${failureCount} operation(s) failed validation. The mobile GraphQL contract has drifted from the backend schema.`,
        );
        process.exit(1);
    }
};

main();
