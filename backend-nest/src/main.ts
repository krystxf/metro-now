import { NestFactory } from "@nestjs/core";
import { AppModule } from "./app.module";
import { WinstonModule } from "nest-winston";
import { format, transports } from "winston";
import "winston-daily-rotate-file";

async function bootstrap() {
    const app = await NestFactory.create(AppModule, {
        logger: WinstonModule.createLogger({
            format: format.json({}),
            transports: ["info", "http", "warn", "error"].map((level) => {
                return new transports.DailyRotateFile({
                    handleExceptions: level === "error",
                    filename: `logs/%DATE%-${level}.log`,
                    level,
                    format: format.combine(format.timestamp()),
                });
            }),
        }),
    });
    await app.listen(3001);
}
bootstrap();
