import 'dotenv/config';

import { afterAll, beforeEach } from 'vitest';

function ensureTestEnv() {
  process.env.NODE_ENV = 'test';
  process.env.JWT_ACCESS_SECRET ??= 'test_access_secret_please_change_me_32_chars_min';
  process.env.JWT_REFRESH_SECRET ??= 'test_refresh_secret_please_change_me_32_chars_min';
  process.env.CORS_ORIGINS ??= 'http://localhost:5173';

  const raw = process.env.DATABASE_URL;
  if (!raw) return;

  try {
    const u = new URL(raw);
    u.searchParams.set('schema', 'test');
    process.env.DATABASE_URL = u.toString();
  } catch {
    // ignore
  }
}

ensureTestEnv();

let prisma: (typeof import('../db'))['prisma'] | null = null;

beforeEach(async () => {
  if (!prisma) {
    ({ prisma } = await import('../db'));
  }
  const { resetDb } = await import('./resetDb');
  await resetDb(prisma);
});

afterAll(async () => {
  if (prisma) await prisma.$disconnect();
});

