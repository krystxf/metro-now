import { existsSync } from "node:fs";
import { resolve } from "node:path";
import { commonServerEnvSchema, validateEnv } from "@metro-now/shared";
import { z } from "zod";

type DataloaderEnv = {
    port: number;
    syncSchedule: string;
    entityBatchSize: number;
    relationBatchSize: number;
    logRetentionDays: number;
    logRetentionSchedule: string;
    tmbAppId: string | undefined;
    tmbAppKey: string | undefined;
};

const optionalNonEmptyString = z.preprocess(
    (val) => (val === "" ? undefined : val),
    z.string().min(1).optional(),
);

const dataloaderEnvSchema = commonServerEnvSchema.extend({
    DATALOADER_PORT: z.coerce.number().int().positive().default(3008),
    SYNC_CRON: z.string().default("0 */7 * * *"),
    DATALOADER_ENTITY_BATCH_SIZE: z.coerce
        .number()
        .int()
        .positive()
        .default(100),
    DATALOADER_RELATION_BATCH_SIZE: z.coerce
        .number()
        .int()
        .positive()
        .default(500),
    LOG_RETENTION_DAYS: z.coerce.number().int().positive().default(30),
    LOG_RETENTION_CRON: z.string().default("0 3 * * *"),
    TMB_APP_ID: optionalNonEmptyString,
    TMB_APP_KEY: optionalNonEmptyString,
});

const ENV_FILES = [
    ".env.local",
    ".env",
    "../backend/.env.local",
    "../backend/.env",
    "../../.env.docker",
] as const;

let envLoaded = false;

export const loadEnvironment = (): void => {
    if (envLoaded) {
        return;
    }

    for (const relativePath of ENV_FILES) {
        const filePath = resolve(process.cwd(), relativePath);

        if (existsSync(filePath)) {
            process.loadEnvFile(filePath);
        }
    }

    envLoaded = true;
};

export const getDataloaderEnv = (): DataloaderEnv => {
    loadEnvironment();
    const env = validateEnv(dataloaderEnvSchema);

    return {
        port: env.DATALOADER_PORT,
        syncSchedule: env.SYNC_CRON,
        entityBatchSize: env.DATALOADER_ENTITY_BATCH_SIZE,
        relationBatchSize: env.DATALOADER_RELATION_BATCH_SIZE,
        logRetentionDays: env.LOG_RETENTION_DAYS,
        logRetentionSchedule: env.LOG_RETENTION_CRON,
        tmbAppId: env.TMB_APP_ID,
        tmbAppKey: env.TMB_APP_KEY,
    };
};
