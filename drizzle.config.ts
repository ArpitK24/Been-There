import { defineConfig } from 'drizzle-kit';
import fs from 'fs';

if (fs.existsSync('.env.local')) {
  process.loadEnvFile('.env.local');
}

const databaseUrl = process.env.DATABASE_URL;
if (!databaseUrl) {
  throw new Error(
    'DATABASE_URL is not configured. Add it to .env.local before running Drizzle migrations.'
  );
}

export default defineConfig({
  schema: './src/lib/db/schema.ts',
  out: './drizzle/migrations',
  dialect: 'postgresql',
  dbCredentials: {
    url: databaseUrl,
  },
  verbose: true,
  strict: true,
});
