import { NestFactory } from "@nestjs/core";
import { DocumentBuilder, SwaggerModule } from "@nestjs/swagger";

import { AppModule } from "src/app.module";
import {
    SWAGGER_API_ROOT,
    SWAGGER_DESCRIPTION,
    SWAGGER_JSON_URL,
    SWAGGER_TITLE,
    SWAGGER_VERSION,
} from "src/constants/swagger.const";
import { LoggerService } from "src/modules/logger/logger.service";

async function bootstrap() {
    const app = await NestFactory.create(AppModule, {
        bufferLogs: true,
    });

    app.useLogger(new LoggerService());
    app.enableCors();

    const swaggerDocumentBuilder = new DocumentBuilder()
        .setTitle(SWAGGER_TITLE)
        .setDescription(SWAGGER_DESCRIPTION)
        .setVersion(SWAGGER_VERSION)
        .build();

    SwaggerModule.setup(
        SWAGGER_API_ROOT,
        app,
        SwaggerModule.createDocument(app, swaggerDocumentBuilder),
        {
            jsonDocumentUrl: SWAGGER_JSON_URL,
            customSiteTitle: SWAGGER_TITLE,
        },
    );

    await app.listen(process.env.PORT ?? 3001);
}
bootstrap();
