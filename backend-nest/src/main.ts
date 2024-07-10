import { NestFactory } from "@nestjs/core";
import { AppModule } from "./app.module";
import { WinstonModule } from "nest-winston";
import { format, transports } from "winston";
import "winston-daily-rotate-file";

const config =
    process.env.NODE_ENV === "production"
        ? {
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
          }
        : {};

async function bootstrap() {
    const app = await NestFactory.create(AppModule, config);
    await app.listen(3001);
}
bootstrap();
