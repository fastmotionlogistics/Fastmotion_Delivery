import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';
import { Logger } from 'nestjs-pino';
import * as cookieParser from 'cookie-parser';
import { ValidationPipe } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { DocumentBuilder, SwaggerModule } from '@nestjs/swagger';
import { HttpExceptionFilter, ShutdownService } from '@libs/common';
import * as compression from 'compression';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);
  const power = app.get(ShutdownService);

  app.enableCors();

  const config = new DocumentBuilder()
    .setTitle('FastMotion Delivery API - Rider App')
    .setDescription('FastMotion Delivery Service API for delivery riders/partners')
    .setVersion('1.0')
    .addBearerAuth()
    .build();

  const document = SwaggerModule.createDocument(app, config);
  app.useGlobalPipes(new ValidationPipe({ whitelist: true, transform: true }));
  app.useGlobalFilters(new HttpExceptionFilter());
  app.useLogger(app.get(Logger));
  app.use(cookieParser());
  app.use(compression());

  const configService = app.get(ConfigService);
  SwaggerModule.setup('swagger', app, document);

  const port = configService.get('DELIVERY_API_PORT') || 3015;
  console.log('====== FastMotion Delivery API (Rider) Listening on PORT ' + port + ' =======');

  // Subscribe to shutdown event
  power.prepareToShutdown(async () => await app.close());

  await app.listen(port);
}
bootstrap();
