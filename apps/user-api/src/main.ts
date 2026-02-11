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
    .setTitle('FastMotion User API - Customer App')
    .setDescription('FastMotion Delivery Service API for customers')
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
  const port = configService.get('USER_API_PORT') || 3029;
  console.log('====== FastMotion User API (Customer) Listening on PORT ' + port + ' =======');

  // Subscribe to your service's shutdown event, run app.close() when emitted
  power.prepareToShutdown(async () => await app.close());

  await app.listen(port);
}
bootstrap();
