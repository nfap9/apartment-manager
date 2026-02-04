import jwt, { type SignOptions } from 'jsonwebtoken';
import { z } from 'zod';

import { env } from '../../env';

const accessPayloadSchema = z.object({
  sub: z.string().min(1),
  tv: z.number().int().nonnegative(),
  type: z.literal('access'),
});

const refreshPayloadSchema = z.object({
  sub: z.string().min(1),
  tv: z.number().int().nonnegative(),
  type: z.literal('refresh'),
});

export type AccessTokenPayload = z.infer<typeof accessPayloadSchema>;
export type RefreshTokenPayload = z.infer<typeof refreshPayloadSchema>;

export function signAccessToken(input: { userId: string; tokenVersion: number }) {
  return jwt.sign(
    { sub: input.userId, tv: input.tokenVersion, type: 'access' },
    env.JWT_ACCESS_SECRET,
    { expiresIn: env.ACCESS_TOKEN_TTL as SignOptions['expiresIn'] },
  );
}

export function signRefreshToken(input: { userId: string; tokenVersion: number }) {
  return jwt.sign(
    { sub: input.userId, tv: input.tokenVersion, type: 'refresh' },
    env.JWT_REFRESH_SECRET,
    { expiresIn: env.REFRESH_TOKEN_TTL as SignOptions['expiresIn'] },
  );
}

export function verifyAccessToken(token: string): AccessTokenPayload {
  const decoded = jwt.verify(token, env.JWT_ACCESS_SECRET);
  return accessPayloadSchema.parse(decoded);
}

export function verifyRefreshToken(token: string): RefreshTokenPayload {
  const decoded = jwt.verify(token, env.JWT_REFRESH_SECRET);
  return refreshPayloadSchema.parse(decoded);
}

