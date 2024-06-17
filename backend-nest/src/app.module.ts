import { Module } from '@nestjs/common';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { MetroController } from './metro/metro.controller';
import { ConfigModule } from '@nestjs/config';
@Module({
  imports: [ConfigModule.forRoot()],
  controllers: [AppController, MetroController],
  providers: [AppService],
})
export class AppModule {}
