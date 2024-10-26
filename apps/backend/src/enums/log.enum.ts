export { LogLevel } from "@prisma/client";

export enum StopSyncTrigger {
    CRON = "CRON",
    INIT = "INIT",
    TEST = "TEST", // import is triggered by e2e tests
}

export enum LogMessage {
    IMPORT_STOPS = "Import stops",
    REST = "REST",
    GRAPHQL = "GraphQL",
}

export enum RestLogStatus {
    SUCCESS = "SUCCESS",
    INVALID_REQUEST = "INVALID_REQUEST",
}
