// ESLint flat config. Extends Expo's recommended config and disables rules that would
// conflict with Prettier formatting.
const { defineConfig } = require('eslint/config')
const expoConfig = require('eslint-config-expo/flat')
const eslintConfigPrettier = require('eslint-config-prettier/flat')

module.exports = defineConfig([
  expoConfig,
  eslintConfigPrettier,
  {
    ignores: ['dist/*', '.expo/*', 'src/db/migrations/*', 'node_modules/*'],
  },
  {
    // .cjs files (e.g. assets/logo/render.cjs) run under plain Node/CommonJS,
    // not the app's React Native/ESM environment.
    files: ['**/*.cjs'],
    languageOptions: {
      sourceType: 'commonjs',
      globals: {
        __dirname: 'readonly',
        __filename: 'readonly',
        require: 'readonly',
        module: 'readonly',
        exports: 'writable',
        process: 'readonly',
        console: 'readonly',
      },
    },
  },
])
