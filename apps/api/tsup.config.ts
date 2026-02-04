import { defineConfig } from 'tsup';

export default defineConfig({
  entry: ['src/server.ts', 'src/worker.ts'],
  format: ['esm'],
  target: 'node22',
  platform: 'node',
  external: ['dotenv', 'dotenv/config'],
  sourcemap: true,
  clean: true,
  dts: false,
});

