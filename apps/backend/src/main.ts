import { VersioningType } from "@nestjs/common";
import { NestFactory } from "@nestjs/core";
import { NestExpressApplication } from "@nestjs/platform-express";
import { DocumentBuilder, SwaggerModule } from "@nestjs/swagger";

import { AppModule } from "src/app.module";
import { SWAGGER_JSON_PATH, SWAGGER_PATH } from "src/constants/api";
import {
    SWAGGER_DESCRIPTION,
    SWAGGER_TITLE,
    SWAGGER_VERSION,
} from "src/constants/swagger.const";

async function bootstrap() {
    const app = await NestFactory.create<NestExpressApplication>(AppModule, {
        bufferLogs: true,
    });

    app.set("query parser", "extended");
    app.enableCors();

    app.enableVersioning({
        type: VersioningType.URI,
        prefix: "v",
    });

    const swaggerDocumentBuilder = new DocumentBuilder()
        .setTitle(SWAGGER_TITLE)
        .setDescription(SWAGGER_DESCRIPTION)
        .setVersion(SWAGGER_VERSION)
        .build();

    SwaggerModule.setup(
        SWAGGER_PATH,
        app,
        SwaggerModule.createDocument(app, swaggerDocumentBuilder),
        {
            jsonDocumentUrl: SWAGGER_JSON_PATH,
            customSiteTitle: SWAGGER_TITLE,
        },
    );

    await app.listen(process.env.PORT ?? 3001);
}
bootstrap();
