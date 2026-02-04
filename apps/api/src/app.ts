import cookieParser from 'cookie-parser';
import cors from 'cors';
import express from 'express';
import helmet from 'helmet';
import pinoHttp from 'pino-http';

import { env } from './env';
import { errorMiddleware } from './http/errorMiddleware';
import { logger } from './logger';
import { router } from './router';

export function createApp() {
  const app = express();

  // Allow reading X-Forwarded-* headers (Nginx/Ingress)
  app.set('trust proxy', 1);

  app.use(pinoHttp({ logger }));
  app.use(helmet());
  app.use(express.json({ limit: '1mb' }));
  app.use(cookieParser());

  const allowedOrigins = env.CORS_ORIGINS?.split(',')
    .map((s: string) => s.trim())
    .filter(Boolean);

  app.use(
    cors({
      origin: allowedOrigins?.length ? allowedOrigins : true,
      credentials: true,
    }),
  );

  // Allow both /xxx and /api/xxx (Docker/Nginx friendly)
  app.use(router);
  app.use('/api', router);

  app.use(errorMiddleware);

  return app;
}

