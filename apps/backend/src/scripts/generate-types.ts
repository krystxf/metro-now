import { join } from "path";

import { GraphQLDefinitionsFactory } from "@nestjs/graphql";

const definitionsFactory = new GraphQLDefinitionsFactory();

definitionsFactory.generate({
    typePaths: ["./**/*.graphql"],
    path: join(process.cwd(), "src/types/graphql.generated.ts"),
    outputAs: "interface",
    skipResolverArgs: true,
    watch: false,
    customScalarTypeMapping: {
        ISODateTime: "string",
    },
});
