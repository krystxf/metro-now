export { LogType } from "@prisma/client";

export enum StopSyncTrigger {
    CRON = "CRON",
    INIT = "INIT",
}

export enum LogMessage {
    IMPORT_STOPS = "Import stops",
    REST = "REST",
    GRAPHQL = "GraphQL",
    GRAPHQL_INTROSPECTION = "GraphQL - Introspection Query",
}
