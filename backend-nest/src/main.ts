import { NestFactory } from "@nestjs/core";
import { AppModule } from "./app.module";
import { SwaggerModule, DocumentBuilder } from "@nestjs/swagger";
import {
    SWAGGER_DESCRIPTION,
    SWAGGER_JSON_URL,
    SWAGGER_TITLE,
    SWAGGER_API_ROOT,
    SWAGGER_VERSION,
} from "./swagger";

async function bootstrap() {
    const app = await NestFactory.create(AppModule);

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
