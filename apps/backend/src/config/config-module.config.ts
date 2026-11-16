import type { ConfigModuleOptions } from "@nestjs/config";
import { Schema } from "effect";

import { envSchema } from "src/schema/env.schema";

export const configModuleConfig: ConfigModuleOptions = {
    envFilePath: [".env.local", ".env"],
    validate: Schema.decodeUnknownSync(envSchema),
};
