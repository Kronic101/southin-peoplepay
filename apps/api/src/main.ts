import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';

function parseOrigins(value?: string) {
  if (!value) return true;

  return value
    .split(',')
    .map((item) => item.trim())
    .filter(Boolean);
}

async function bootstrap() {
  const app = await NestFactory.create(AppModule);

  app.setGlobalPrefix('api');

  app.enableCors({
    origin: parseOrigins(process.env.CORS_ORIGIN || process.env.APP_URL),
    credentials: true,
  });

  const port = Number(process.env.PORT || 4000);

  await app.listen(port, '0.0.0.0');

  console.log(`Southin PeoplePay API running on port ${port}`);
}

bootstrap();