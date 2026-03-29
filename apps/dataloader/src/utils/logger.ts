type LogLevel = "info" | "warn" | "error";

const writeLog = (
    level: LogLevel,
    message: string,
    context?: Record<string, unknown>,
): void => {
    const prefix = `[${new Date().toISOString()}] [${level.toUpperCase()}]`;

    if (context) {
        console[level](prefix, message, context);
        return;
    }

    console[level](prefix, message);
};

export const logger = {
    info(message: string, context?: Record<string, unknown>) {
        writeLog("info", message, context);
    },
    warn(message: string, context?: Record<string, unknown>) {
        writeLog("warn", message, context);
    },
    error(message: string, context?: Record<string, unknown>) {
        writeLog("error", message, context);
    },
};
