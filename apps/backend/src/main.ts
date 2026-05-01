import { VersioningType } from "@nestjs/common";
import { NestFactory } from "@nestjs/core";
import type { NestExpressApplication } from "@nestjs/platform-express";
import compression = require("compression");

import { AppModule } from "src/app.module";

async function bootstrap() {
    const app = await NestFactory.create<NestExpressApplication>(AppModule, {
        bufferLogs: true,
    });

    app.use(compression());
    app.set("query parser", "extended");
    app.enableCors();

    app.enableVersioning({
        type: VersioningType.URI,
        prefix: "v",
    });

    await app.listen(process.env.PORT ?? 3001, process.env.HOST ?? "0.0.0.0");
}
bootstrap();
