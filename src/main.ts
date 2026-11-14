import { NestFactory } from '@nestjs/core';
import { ValidationPipe, Logger } from '@nestjs/common';
import { AppModule } from './app.module';
import { json, urlencoded } from 'express';

async function bootstrap() {
  const logger = new Logger('Bootstrap');
  const app = await NestFactory.create(AppModule);

  // Allow bulk contact imports up to 50MB
  app.use(json({ limit: '50mb' }));
  app.use(urlencoded({ limit: '50mb', extended: true }));

  // Set global API prefix
  app.setGlobalPrefix('api');

  // Enable CORS with preflight caching
  app.enableCors({
    origin: '*',
    methods: 'GET,HEAD,PUT,PATCH,POST,DELETE,OPTIONS',
    allowedHeaders: 'Content-Type,Authorization,X-Organization-Id,Accept,Origin',
    credentials: true,
    maxAge: 86400, // 24-hour cache for OPTIONS preflight requests
  });

  // Enable request payload validation
  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      transform: true,
      forbidNonWhitelisted: false,
    }),
  );

  const port = process.env.PORT || 3000;
  const server = await app.listen(port);
  if (server && typeof server.keepAliveTimeout !== 'undefined') {
    server.keepAliveTimeout = 65000;
    server.headersTimeout = 66000;
  }
  logger.log(`WhatsApp SaaS Backend API is running on http://localhost:${port}/api`);
  logger.log(`Health check: http://localhost:${port}/api/health`);
}
bootstrap();

