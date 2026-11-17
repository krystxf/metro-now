import { mkdir, readdir, readFile, writeFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

const currentDir = path.dirname(fileURLToPath(import.meta.url));
const repoRoot = path.resolve(currentDir, "..", "..", "..");
const backendModulesDir = path.join(repoRoot, "apps", "backend", "src", "modules");
const outputPath = path.join(
    repoRoot,
    "apps",
    "mobile",
    "metro-now",
    "metro-now",
    "GraphQL",
    "Schema",
    "MetroNow.graphqls",
);

const schemaHeader = `# This file is generated from backend module SDL files.
# Run \`pnpm --filter @metro-now/mobile graphql:schema:sync\` after backend schema changes.

scalar ISODateTime
`;

const loadBackendSchemaFiles = async () => {
    const moduleNames = (await readdir(backendModulesDir, { withFileTypes: true }))
        .filter((entry) => entry.isDirectory())
        .map((entry) => entry.name)
        .sort((left, right) => left.localeCompare(right));

    const schemaFiles = await Promise.all(
        moduleNames.map(async (moduleName) => {
            const schemaPath = path.join(
                backendModulesDir,
                moduleName,
                "schema.graphql",
            );

            try {
                const contents = await readFile(schemaPath, "utf8");
                return {
                    moduleName,
                    contents: contents.trim(),
                };
            } catch {
                return null;
            }
        }),
    );

    return schemaFiles.filter((file) => file !== null);
};

const mergeSchemaDocuments = (schemaFiles) => {
    let hasQueryDefinition = false;

    return schemaFiles
        .map(({ contents, moduleName }) => {
            if (contents.length === 0) {
                return null;
            }

            const normalizedContents = hasQueryDefinition
                ? contents.replace(/^type Query\b/m, "extend type Query")
                : contents;

            if (normalizedContents.includes("type Query")) {
                hasQueryDefinition = true;
            }

            return `# Source: apps/backend/src/modules/${moduleName}/schema.graphql\n${normalizedContents}`;
        })
        .filter((contents) => contents !== null)
        .join("\n\n");
};

const syncSchema = async () => {
    const schemaFiles = await loadBackendSchemaFiles();
    const mergedSchema = `${schemaHeader}\n${mergeSchemaDocuments(schemaFiles)}\n`;

    await mkdir(path.dirname(outputPath), { recursive: true });
    await writeFile(outputPath, mergedSchema, "utf8");

    process.stdout.write(`Synced mobile GraphQL schema to ${outputPath}\n`);
};

await syncSchema();
