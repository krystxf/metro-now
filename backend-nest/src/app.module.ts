import { MiddlewareConsumer, Module } from "@nestjs/common";
import { AppController } from "./app.controller";
import { AppService } from "./app.service";
import { MetroController } from "./metro/metro.controller";
import { ConfigModule } from "@nestjs/config";
import { RequestLoggerMiddleware } from "./middleware/request-logger.middleware";
@Module({
    imports: [ConfigModule.forRoot()],
    controllers: [AppController, MetroController],
    providers: [AppService],
})
export class AppModule {
    configure(consumer: MiddlewareConsumer) {
        consumer.apply(RequestLoggerMiddleware).forRoutes("*");
    }
}
