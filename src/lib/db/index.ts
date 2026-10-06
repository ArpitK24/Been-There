import { drizzle } from 'drizzle-orm/postgres-js';
import postgres from 'postgres';
import * as schema from './schema';

function getDatabaseUrl(): string {
  const url = process.env.DATABASE_URL;
  if (!url) {
    throw new Error(
      'DATABASE_URL is not configured. Add it to .env.local before starting the application.'
    );
  }
  return url;
}

declare global {
  var __postgresClient: ReturnType<typeof postgres> | undefined;
}

const client =
  global.__postgresClient ??
  postgres(getDatabaseUrl(), {
    max: process.env.NODE_ENV === 'production' ? 10 : 1,
    idle_timeout: 20,
    connect_timeout: 10,
    prepare: false, // Recommended for Supabase transaction pooler
  });

if (process.env.NODE_ENV !== 'production') {
  global.__postgresClient = client;
}

export const db = drizzle(client, { schema });
export * from './schema';
