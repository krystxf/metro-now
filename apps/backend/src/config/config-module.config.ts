import type { ConfigModuleOptions } from "@nestjs/config";

import { envSchema } from "src/schema/env.schema";

export const configModuleConfig: ConfigModuleOptions = {
    envFilePath: [".env.local", ".env"],
    validate: envSchema.parse,
};
