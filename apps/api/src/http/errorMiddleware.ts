import type { ErrorRequestHandler } from 'express';
import { ZodError } from 'zod';

import { env } from '../env';
import { logger } from '../logger';

import { HttpError } from './httpError';

export const errorMiddleware: ErrorRequestHandler = (err, _req, res, _next) => {
  if (err instanceof ZodError) {
    return res.status(400).json({
      error: {
        code: 'VALIDATION_ERROR',
        message: '请求参数不合法',
        details: err.flatten(),
      },
    });
  }

  if (err instanceof HttpError) {
    return res.status(err.status).json({
      error: {
        code: err.code,
        message: err.message,
        details: err.details,
      },
    });
  }

  logger.error({ err }, 'Unhandled error');
  return res.status(500).json({
    error: {
      code: 'INTERNAL_SERVER_ERROR',
      message: '服务器内部错误',
      details:
        env.NODE_ENV === 'production'
          ? undefined
          : {
              message: (err as { message?: string } | null)?.message,
              stack: (err as { stack?: string } | null)?.stack,
            },
    },
  });
};

