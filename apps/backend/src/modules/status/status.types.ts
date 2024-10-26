export enum SystemStatusService {
    BACKEND = "backend",
    GEO_FUNCTIONS = "geo-functions",
    DB_DATA = "db-data",
}

export enum SystemStatus {
    OK = "ok",
    ERROR = "error",
}

export type StatusObject = {
    service: SystemStatusService;
    status: SystemStatus;
};
