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

function logDatabaseConfiguration() {
  const databaseUrl = process.env.DATABASE_URL;

  if (!databaseUrl) {
    console.warn('[DB CONFIG] DATABASE_URL is not configured.');
    return;
  }

  try {
    const parsed = new URL(databaseUrl);

    console.log(
      [
        '[DB CONFIG]',
        `host=${parsed.hostname}`,
        `port=${parsed.port || '5432'}`,
        `database=${parsed.pathname.replace('/', '') || 'postgres'}`,
        `pgbouncer=${parsed.searchParams.get('pgbouncer') || 'false'}`,
        `connection_limit=${
          parsed.searchParams.get('connection_limit') || 'default'
        }`,
        `pool_timeout=${
          parsed.searchParams.get('pool_timeout') || 'default'
        }`,
      ].join(' '),
    );
  } catch {
    console.warn('[DB CONFIG] DATABASE_URL could not be parsed.');
  }
}

async function bootstrap() {
  // Safe runtime diagnostic.
  // Does not expose usernames or passwords.
  logDatabaseConfiguration();

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

    // Railway web
    'https://southinweb-production.up.railway.app',

    // Production Southin Hub
    'https://hub.southincon.com',

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

      if (
        process.env.NODE_ENV !== 'production' &&
        isLocalOrLanOrigin(origin)
      ) {
        callback(null, true);
        return;
      }

      callback(
        new Error(`CORS blocked origin: ${origin}`),
        false,
      );
    },

    methods: [
      'GET',
      'POST',
      'PATCH',
      'PUT',
      'DELETE',
      'OPTIONS',
    ],

    allowedHeaders: [
      'Content-Type',
      'Authorization',
      'Accept',
      'Origin',
      'X-Requested-With',

      'x-user-role',
      'x-user-roles',
      'x-user-email',
      'x-user-name',
      'x-user-id',
      'x-employee-id',
      'x-employee-number',

      'X-User-Role',
      'X-User-Roles',
      'X-User-Email',
      'X-User-Name',
      'X-User-Id',
      'X-Employee-Id',
      'X-Employee-Number',
    ],

    exposedHeaders: [
      'Content-Length',
      'Content-Type',
    ],

    credentials: true,

    optionsSuccessStatus: 204,
  });

  const port = Number(process.env.PORT || 4000);

  await app.listen(port, '0.0.0.0');

  console.log(
    `Southin PeoplePay API running on port ${port}`,
  );
}

bootstrap();