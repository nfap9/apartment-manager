import 'dotenv/config';

import { execFile } from 'node:child_process';
import { createRequire } from 'node:module';
import { promisify } from 'node:util';

import { Pool } from 'pg';

function buildTestDatabaseUrl() {
  const raw = process.env.DATABASE_URL;
  if (!raw) return null;
  const u = new URL(raw);
  u.searchParams.set('schema', 'test');
  return u.toString();
}

function buildAdminConnectionString(databaseUrl: string) {
  const u = new URL(databaseUrl);
  u.searchParams.delete('schema');
  return u.toString();
}

const execFileAsync = promisify(execFile);
const require = createRequire(import.meta.url);

export default async function globalSetup() {
  process.env.NODE_ENV = 'test';
  process.env.JWT_ACCESS_SECRET ??= 'test_access_secret_please_change_me_32_chars_min';
  process.env.JWT_REFRESH_SECRET ??= 'test_refresh_secret_please_change_me_32_chars_min';

  const testDbUrl = buildTestDatabaseUrl();
  if (!testDbUrl) {
    throw new Error('DATABASE_URL is required for integration tests');
  }
  process.env.DATABASE_URL = testDbUrl;

  // Ensure schema exists
  {
    const pool = new Pool({ connectionString: buildAdminConnectionString(testDbUrl) });
    await pool.query('CREATE SCHEMA IF NOT EXISTS "test"');
    await pool.end();
  }

  // Apply migrations to test schema
  const prismaCli = require.resolve('prisma/build/index.js');
  await execFileAsync(process.execPath, [prismaCli, 'migrate', 'deploy'], {
    cwd: process.cwd(),
    env: process.env,
  });
}

