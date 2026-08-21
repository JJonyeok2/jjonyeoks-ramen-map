import { drizzle } from 'drizzle-orm/postgres-js';
import postgres from 'postgres';
import * as schema from './drizzle-schema';

// Create a Postgres client. It will use process.env.DATABASE_URL at runtime.
// If it's missing during build time (e.g. Next.js static generation), it will gracefully fall back to a dummy string to avoid crashing the build.
const client = postgres(process.env.DATABASE_URL || "postgres://dummy:dummy@localhost:5432/dummy", { 
  prepare: false, 
  ssl: 'require' 
});

export const db = drizzle(client, { schema });
