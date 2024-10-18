export { LogType } from "@prisma/client";

export enum StopSyncTrigger {
    CRON = "CRON",
    INIT = "INIT",
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
