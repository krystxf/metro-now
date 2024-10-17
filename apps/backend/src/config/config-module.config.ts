import type { ConfigModuleOptions } from "@nestjs/config";

import { envSchema } from "src/schema/env.schema";

export const configModuleConfig: ConfigModuleOptions = {
    envFilePath: ".env.local",
    validate: envSchema.parse,
};
