import type { NextFunction, Request, Response } from 'express';

import { HttpError } from '../http/httpError';

export function requirePermission(permissionKey: string) {
  return function (req: Request, _res: Response, next: NextFunction) {
    const keys = req.org?.permissionKeys ?? [];
    if (!keys.includes(permissionKey)) {
      return next(new HttpError(403, 'FORBIDDEN', '无权限'));
    }
    return next();
  };
}

/**
 * 要求用户拥有多个权限中的任意一个
 */
export function requireAnyPermission(permissionKeys: string[]) {
  return function (req: Request, _res: Response, next: NextFunction) {
    const keys = req.org?.permissionKeys ?? [];
    if (!permissionKeys.some((key) => keys.includes(key))) {
      return next(new HttpError(403, 'FORBIDDEN', '无权限'));
    }
    return next();
  };
}
