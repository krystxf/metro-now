module.exports = {
    parser: "@typescript-eslint/parser",
    parserOptions: {
        project: "tsconfig.json",
        tsconfigRootDir: __dirname,
        sourceType: "module",
    },
    plugins: [],
    extends: [
        "plugin:@typescript-eslint/recommended",
        "plugin:prettier/recommended",
        "plugin:import/recommended",
        "plugin:import/typescript",
    ],
    root: true,
    env: {
        node: true,
        jest: true,
    },
    ignorePatterns: [".eslintrc.js"],
    settings: {
        "import/resolver": {
            typescript: {
                alwaysTryTypes: true,
                project: "backend-nest/tsconfig.json",
            },
            node: { moduleDirectory: ["node_modules", "src/"] },
        },
    },
    rules: {
        "@typescript-eslint/interface-name-prefix": "off",
        "@typescript-eslint/explicit-function-return-type": "off",
        "@typescript-eslint/explicit-module-boundary-types": "off",
        "@typescript-eslint/no-explicit-any": "off",
        "no-restricted-imports": [
            "error",
            {
                patterns: [
                    {
                        group: [".*"],
                        message:
                            "Relative imports are not allowed, use absolute import instead.",
                    },
                ],
            },
        ],
        "sort-imports": [
            "error",
            {
                ignoreCase: true,
                ignoreDeclarationSort: true,
            },
        ],
        "import/order": [
            "error",
            {
                alphabetize: {
                    order: "asc",
                    caseInsensitive: true,
                },
                "newlines-between": "always",
            },
        ],
        "import/newline-after-import": ["error", { count: 1 }],
    },
};
