import 'dotenv/config';
import { NestFactory } from '@nestjs/core';
import { Logger } from '@nestjs/common';
import { DocumentBuilder, SwaggerModule } from '@nestjs/swagger';
import { AppModule } from './app.module';
import { envs } from './config/envs';
import { HttpLoggingInterceptor } from './common/interceptors/http-logging.interceptor';
import { configureApp } from './app.setup';

async function bootstrap() {
  const logger = new Logger('Bootstrap');

  const app = await NestFactory.create(AppModule);
  app.enableShutdownHooks();

  // CORS
  app.enableCors({
    origin: [envs.frontendStoreUrl, envs.frontendPortalUrl],
    methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE'],
    credentials: true,
  });

  configureApp(app);

  app.useGlobalInterceptors(new HttpLoggingInterceptor());

  const swaggerConfig = new DocumentBuilder()
    .setTitle("FRANCO'S ERP API")
    .setDescription("API del sistema ERP de FRANCO'S Snacks Naturales")
    .setVersion('1.0')
    .addBearerAuth()
    .build();

  const document = SwaggerModule.createDocument(app, swaggerConfig);
  SwaggerModule.setup('api/docs', app, document);

  await app.listen(envs.port);
  logger.log(`Application running on port ${envs.port}`);
  logger.log(
    `Swagger docs available at http://localhost:${envs.port}/api/docs`,
  );
}
void bootstrap();
