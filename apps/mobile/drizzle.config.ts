import { defineConfig } from 'drizzle-kit'

// Drizzle Kit config for the Expo SQLite database.
// `driver: 'expo'` makes `generate` emit a migrations bundle (migrations.js + .sql)
// that `useMigrations()` applies on boot. Run: `npm run db:generate`.
export default defineConfig({
  dialect: 'sqlite',
  driver: 'expo',
  schema: './src/db/schema.ts',
  out: './src/db/migrations',
})
