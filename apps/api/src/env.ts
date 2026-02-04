import { z } from 'zod';

const envSchema = z.object({
  NODE_ENV: z.enum(['development', 'test', 'production']).default('development'),
  PORT: z.coerce.number().int().positive().default(3000),
  DATABASE_URL: z
    .string()
    .min(1)
    .default('postgresql://postgres:postgres@localhost:5432/apartment_manager?schema=public'),
  REDIS_URL: z.string().min(1).default('redis://localhost:6379'),
  JWT_ACCESS_SECRET: z.string().min(16).default('dev_access_secret_please_change_me_32_chars_min'),
  JWT_REFRESH_SECRET: z.string().min(16).default('dev_refresh_secret_please_change_me_32_chars_min'),
  ACCESS_TOKEN_TTL: z.string().min(1).default('15m'),
  REFRESH_TOKEN_TTL: z.string().min(1).default('30d'),
  REFRESH_COOKIE_NAME: z.string().min(1).default('refresh_token'),
  CORS_ORIGINS: z.string().optional().default('http://localhost:5173'),
});

export const env = envSchema.parse(process.env);

