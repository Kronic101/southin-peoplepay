import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';

function parseOrigins(value?: string) {
  if (!value) return [];

  return value
    .split(',')
    .map((item) => item.trim())
    .filter(Boolean);
}

function isLocalOrLanOrigin(origin: string) {
  return (
    origin.startsWith('http://localhost:') ||
    origin.startsWith('http://127.0.0.1:') ||
    origin.startsWith('http://192.168.') ||
    origin.startsWith('http://10.') ||
    origin.startsWith('http://172.')
  );
}

async function bootstrap() {
  const app = await NestFactory.create(AppModule);

  app.setGlobalPrefix('api');

  const configuredOrigins = parseOrigins(
    process.env.CORS_ORIGINS || process.env.FRONTEND_ORIGINS,
  );

  const allowedOrigins = [
    'http://localhost:3000',
    'http://localhost:8081',
    'http://127.0.0.1:3000',
    'http://127.0.0.1:8081',
    'http://172.29.41.23:3000',
    'http://172.29.41.23:8081',
    'https://southinweb-production.up.railway.app',
    ...configuredOrigins,
  ];

  app.enableCors({
    origin(origin, callback) {
      if (!origin) {
        callback(null, true);
        return;
      }

      if (allowedOrigins.includes(origin)) {
        callback(null, true);
        return;
      }

      if (process.env.NODE_ENV !== 'production' && isLocalOrLanOrigin(origin)) {
        callback(null, true);
        return;
      }

      callback(new Error(`CORS blocked origin: ${origin}`), false);
    },
    methods: ['GET', 'POST', 'PATCH', 'PUT', 'DELETE', 'OPTIONS'],
    allowedHeaders: [
      'Content-Type',
      'Authorization',
      'Accept',
      'Origin',
      'X-Requested-With',

      // Local RBAC / role headers used by the web app before Microsoft 365 auth is completed
      'x-user-role',
      'x-user-email',
      'x-user-name',
      'x-user-id',
      'x-employee-id',
      'x-employee-number',

      // Same headers in capitalized form for safety
      'X-User-Role',
      'X-User-Email',
      'X-User-Name',
      'X-User-Id',
      'X-Employee-Id',
      'X-Employee-Number',
    ],
    exposedHeaders: ['Content-Length', 'Content-Type'],
    credentials: true,
    optionsSuccessStatus: 204,
  });

  const port = Number(process.env.PORT || 4000);

  await app.listen(port, '0.0.0.0');

  console.log(`Southin PeoplePay API running on port ${port}`);
}

bootstrap();