import type { NextFunction, Request, Response } from 'express';

import { HttpError } from '../http/httpError';
import { verifyAccessToken } from '../modules/auth/auth.jwt';

export function requireAuth(req: Request, _res: Response, next: NextFunction) {
  const header = req.headers.authorization;
  if (!header || !header.startsWith('Bearer ')) {
    return next(new HttpError(401, 'UNAUTHORIZED', '未登录或登录已过期'));
  }

  const token = header.slice('Bearer '.length).trim();
  try {
    const payload = verifyAccessToken(token);
    req.auth = { userId: payload.sub };
    return next();
  } catch (err) {
    return next(new HttpError(401, 'UNAUTHORIZED', '未登录或登录已过期', err));
  }
}

