import type { Request } from 'express';

import { HttpError } from './httpError';

export function getParam(req: Request, key: string) {
  const value = (req.params as Record<string, unknown>)[key];
  if (typeof value !== 'string' || value.length === 0) {
    throw new HttpError(400, 'BAD_REQUEST', `参数 ${key} 不合法`);
  }
  return value;
}

