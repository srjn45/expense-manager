#!/usr/bin/env node
import { execSync } from 'child_process'
import { dirname, join } from 'path'
import { fileURLToPath } from 'url'

const __dirname = dirname(fileURLToPath(import.meta.url))
const root = join(__dirname, '..')
const specUrl = process.env.OPENAPI_SPEC_URL || 'http://localhost:8000'

console.log(`Generating API types from ${specUrl}/openapi.json -> src/api/schema.d.ts`)
execSync(`npx openapi-typescript "${specUrl}/openapi.json" -o src/api/schema.d.ts`, {
  cwd: root,
  stdio: 'inherit',
})
