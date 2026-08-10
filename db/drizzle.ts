import { drizzle } from 'drizzle-orm/postgres-js';
import postgres from 'postgres';
import * as schema from './drizzle-schema';

const connectionString = process.env.DATABASE_URL;

// We wrap the client in a proxy or lazy initialization so that it doesn't crash during Next.js build time
// if the DATABASE_URL environment variable is not yet configured on Vercel.
const createDb = () => {
  if (!connectionString) {
    console.warn('DATABASE_URL environment variable is missing.');
    // Return a dummy db object or crash only when actually called
  }
  const client = postgres(connectionString || "postgres://dummy:dummy@localhost:5432/dummy", { prepare: false });
  return drizzle(client, { schema });
};

export const db = createDb();
