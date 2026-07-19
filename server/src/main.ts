import { ValidationPipe } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { NestFactory } from '@nestjs/core';
import cookieParser from 'cookie-parser';
import { Logger } from 'nestjs-pino';
import { AppModule } from './app.module';

async function bootstrap() {
  const app = await NestFactory.create(AppModule, { bufferLogs: true });
  app.useLogger(app.get(Logger));

  const configService = app.get(ConfigService);
  const logger = app.get(Logger);
  const clientUrl =
    configService.get<string>('CLIENT_URL') ?? 'http://localhost:5001';
  const apiVersion = configService.get<string>('API_VERSION') ?? 'v1';

  app.setGlobalPrefix('api/' + apiVersion);
  app.use(cookieParser());
  app.enableCors({
    origin: clientUrl,
    credentials: true,
  });
  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      transform: true,
      forbidNonWhitelisted: true,
    }),
  );

  const port = configService.get<number>('PORT') ?? 3000;
  await app.listen(port);
  logger.log(`Server listening on http://localhost:${port}/api/${apiVersion}`);
}
bootstrap();
