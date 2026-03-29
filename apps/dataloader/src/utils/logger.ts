export type LogLevel = "info" | "warn" | "error";
export type LogContext = Record<string, unknown>;

export type LogEntry = {
    createdAt: Date;
    level: LogLevel;
    message: string;
    context: LogContext | null;
};

export type LogTransport = {
    write(entry: LogEntry): Promise<void>;
    flush?(): Promise<void>;
};

let logTransport: LogTransport | null = null;

const logTransportFailure = (error: unknown): void => {
    const message = error instanceof Error ? error.message : String(error);

    console.error(
        `[${new Date().toISOString()}] [ERROR] Failed to persist dataloader log`,
        {
            error: message,
        },
    );
};

const writeLog = (
    level: LogLevel,
    message: string,
    context?: LogContext,
): void => {
    const entry: LogEntry = {
        createdAt: new Date(),
        level,
        message,
        context: context ?? null,
    };
    const prefix = `[${entry.createdAt.toISOString()}] [${level.toUpperCase()}]`;

    if (context) {
        console[level](prefix, message, context);
    } else {
        console[level](prefix, message);
    }

    if (logTransport) {
        void logTransport.write(entry).catch(logTransportFailure);
    }
};

export const logger = {
    info(message: string, context?: LogContext) {
        writeLog("info", message, context);
    },
    warn(message: string, context?: LogContext) {
        writeLog("warn", message, context);
    },
    error(message: string, context?: LogContext) {
        writeLog("error", message, context);
    },
    setTransport(transport: LogTransport | null) {
        logTransport = transport;
    },
    async flush(): Promise<void> {
        await logTransport?.flush?.();
    },
};
