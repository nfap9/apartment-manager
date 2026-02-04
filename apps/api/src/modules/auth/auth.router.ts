import bcrypt from 'bcryptjs';
import type { Request, Response } from 'express';
import { Router } from 'express';
import { z } from 'zod';

import { prisma } from '../../db';
import { env } from '../../env';
import { HttpError } from '../../http/httpError';
import { requireAuth } from '../../middleware/requireAuth';

import { signAccessToken, signRefreshToken, verifyRefreshToken } from './auth.jwt';

export const authRouter = Router();

function isHttpsRequest(req: Request) {
  const xfProto = req.headers['x-forwarded-proto'];
  const proto = Array.isArray(xfProto) ? xfProto[0] : xfProto;
  return req.secure || proto === 'https';
}

function setRefreshCookie(req: Request, res: Response, refreshToken: string) {
  // 30 days (fallback). Keep it simple for MVP.
  const maxAgeMs = 1000 * 60 * 60 * 24 * 30;
  res.cookie(env.REFRESH_COOKIE_NAME, refreshToken, {
    httpOnly: true,
    secure: isHttpsRequest(req),
    sameSite: 'lax',
    path: '/',
    maxAge: maxAgeMs,
  });
}

function clearRefreshCookie(req: Request, res: Response) {
  res.clearCookie(env.REFRESH_COOKIE_NAME, {
    httpOnly: true,
    secure: isHttpsRequest(req),
    sameSite: 'lax',
    path: '/',
  });
}

authRouter.post('/register', async (req, res) => {
  const body = z
    .object({
      phone: z.string().trim().min(6).max(20).regex(/^[0-9]+$/, '手机号格式不正确'),
      password: z.string().min(8).max(72),
      displayName: z.string().trim().min(1).max(50).optional(),
    })
    .parse(req.body);

  const exists = await prisma.user.findUnique({ where: { phone: body.phone } });
  if (exists) {
    throw new HttpError(409, 'PHONE_EXISTS', '手机号已注册');
  }

  const passwordHash = await bcrypt.hash(body.password, 10);
  const user = await prisma.user.create({
    data: {
      phone: body.phone,
      passwordHash,
      displayName: body.displayName,
    },
    select: { id: true, phone: true, displayName: true, tokenVersion: true },
  });

  const accessToken = signAccessToken({ userId: user.id, tokenVersion: user.tokenVersion });
  const refreshToken = signRefreshToken({ userId: user.id, tokenVersion: user.tokenVersion });

  setRefreshCookie(req, res, refreshToken);
  return res.json({ accessToken, user: { id: user.id, phone: user.phone, displayName: user.displayName } });
});

authRouter.post('/login', async (req, res) => {
  const body = z
    .object({
      phone: z.string().trim().min(6).max(20).regex(/^[0-9]+$/, '手机号格式不正确'),
      password: z.string().min(1).max(72),
    })
    .parse(req.body);

  const user = await prisma.user.findUnique({
    where: { phone: body.phone },
    select: { id: true, phone: true, displayName: true, passwordHash: true, tokenVersion: true },
  });
  if (!user) {
    throw new HttpError(401, 'INVALID_CREDENTIALS', '手机号或密码错误');
  }

  const ok = await bcrypt.compare(body.password, user.passwordHash);
  if (!ok) {
    throw new HttpError(401, 'INVALID_CREDENTIALS', '手机号或密码错误');
  }

  const accessToken = signAccessToken({ userId: user.id, tokenVersion: user.tokenVersion });
  const refreshToken = signRefreshToken({ userId: user.id, tokenVersion: user.tokenVersion });

  setRefreshCookie(req, res, refreshToken);
  return res.json({ accessToken, user: { id: user.id, phone: user.phone, displayName: user.displayName } });
});

authRouter.post('/refresh', async (req, res) => {
  const token = req.cookies?.[env.REFRESH_COOKIE_NAME];
  if (!token) {
    throw new HttpError(401, 'UNAUTHORIZED', '未登录或登录已过期');
  }

  let payload: { sub: string; tv: number };
  try {
    const decoded = verifyRefreshToken(token);
    payload = { sub: decoded.sub, tv: decoded.tv };
  } catch (err) {
    clearRefreshCookie(req, res);
    throw new HttpError(401, 'UNAUTHORIZED', '未登录或登录已过期', err);
  }

  const user = await prisma.user.findUnique({
    where: { id: payload.sub },
    select: { id: true, phone: true, displayName: true, tokenVersion: true },
  });
  if (!user || user.tokenVersion !== payload.tv) {
    clearRefreshCookie(req, res);
    throw new HttpError(401, 'UNAUTHORIZED', '未登录或登录已过期');
  }

  const accessToken = signAccessToken({ userId: user.id, tokenVersion: user.tokenVersion });
  const refreshToken = signRefreshToken({ userId: user.id, tokenVersion: user.tokenVersion });
  setRefreshCookie(req, res, refreshToken);

  return res.json({ accessToken });
});

authRouter.post('/logout', requireAuth, async (req, res) => {
  const userId = req.auth!.userId;

  await prisma.user.update({
    where: { id: userId },
    data: { tokenVersion: { increment: 1 } },
    select: { id: true },
  });

  clearRefreshCookie(req, res);
  return res.json({ ok: true });
});

authRouter.get('/me', requireAuth, async (req, res) => {
  const userId = req.auth!.userId;

  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: {
      id: true,
      phone: true,
      displayName: true,
      memberships: {
        where: { status: 'ACTIVE' },
        select: {
          id: true,
          organization: { select: { id: true, name: true } },
        },
      },
    },
  });

  if (!user) {
    throw new HttpError(401, 'UNAUTHORIZED', '未登录或登录已过期');
  }

  return res.json({
    user: { id: user.id, phone: user.phone, displayName: user.displayName },
    organizations: user.memberships.map((m) => ({
      membershipId: m.id,
      organizationId: m.organization.id,
      organizationName: m.organization.name,
    })),
  });
});

