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

async function bootstrap() {
    const app = await NestFactory.create(AppModule);

    if (process.env.GOLEMIO_API_KEY === undefined) {
        throw new Error("GOLEMIO_API_KEY is not set");
    }

    const config = new DocumentBuilder()
        .setTitle(SWAGGER_TITLE)
        .setDescription(SWAGGER_DESCRIPTION)
        .setVersion(SWAGGER_VERSION)
        .build();
    const document = SwaggerModule.createDocument(app, config);
    SwaggerModule.setup(SWAGGER_API_ROOT, app, document, {
        jsonDocumentUrl: SWAGGER_JSON_URL,
        customSiteTitle: SWAGGER_TITLE,
    });

    await app.listen(3001);
}
bootstrap();
