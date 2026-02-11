import { NestFactory } from '@nestjs/core';
import { AdminModule } from './admin.module';
import { ValidationPipe } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { DocumentBuilder, SwaggerModule } from '@nestjs/swagger';
import { Logger } from 'nestjs-pino';
import { HttpExceptionFilter } from '@libs/common';

// MockDate.set('2025-08-13T11:55:59');
async function bootstrap() {
  const app = await NestFactory.create(AdminModule);

  app.enableCors({
    origin: ['https://celebratedboy.netlify.app', 'http://localhost:5173', 'http://localhost:5174'],
    credentials: true,
    methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization', 'X-Requested-With'],
  });
  const config = new DocumentBuilder()
    .setTitle('Admin Side')
    .setDescription('Get Away')
    .setVersion('1.0')
    .addBearerAuth()
    .build();
  const document = SwaggerModule.createDocument(app, config);
  app.useGlobalPipes(new ValidationPipe({ whitelist: true, transform: true }));
  app.useGlobalFilters(new HttpExceptionFilter());
  app.useLogger(app.get(Logger));
  // app.use(cookieParser());
  const port = 3013;
  console.log('====== Admin Service Listening on PORT ' + port + ' =======');

  const configService = app.get(ConfigService);
  SwaggerModule.setup('swagger', app, document);
  await app.listen(port);
  // await app.listen(3013);
}
bootstrap();
