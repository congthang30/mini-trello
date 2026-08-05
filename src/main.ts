import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';
import { ConfigService } from '@nestjs/config';
import { ValidationPipe } from '@nestjs/common';


async function bootstrap() {
  const app = await NestFactory.create(AppModule);
  app.useGlobalPipes(new ValidationPipe({ whitelist: true, transform: true }));
  const configService = app.get(ConfigService);
  const port = configService.get<number>('app.port') ?? 9001;
  const prefix = configService.get<string>('app.globalPrefix') ?? 'api/v1';
  const corsOrigin =
    configService.get<string>('app.corsOrigin') ?? 'http://localhost:3000';

  app.setGlobalPrefix(prefix);
  app.enableCors({ origin: corsOrigin });
  await app.listen(port);

  console.log(`Server running on http://localhost:${port}/${prefix}`);
}
bootstrap();
