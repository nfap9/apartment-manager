import { URL } from 'node:url';

import { env } from '../env';

export function getBullConnection() {
  const url = new URL(env.REDIS_URL);
  const db = url.pathname?.length ? Number(url.pathname.replace('/', '')) : undefined;

  return {
    host: url.hostname,
    port: url.port ? Number(url.port) : 6379,
    username: url.username || undefined,
    password: url.password || undefined,
    ...(Number.isFinite(db) ? { db } : {}),
  };
}

