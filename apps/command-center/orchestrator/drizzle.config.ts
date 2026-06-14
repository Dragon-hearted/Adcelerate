import { defineConfig } from 'drizzle-kit';

// drizzle-kit `generate` reads the schema + dialect only (no DB connection), so
// it is driver-agnostic. The RUNTIME uses the Drizzle bun-sqlite driver
// (drizzle-orm/bun-sqlite + built-in `bun:sqlite`) — see src/db/client.ts.
export default defineConfig({
  schema: './src/db/schema.ts',
  out: './src/db/migrations',
  dialect: 'sqlite',
  dbCredentials: {
    url: process.env.CC_DB_PATH ?? './command-center.db',
  },
  strict: true,
  verbose: true,
});
