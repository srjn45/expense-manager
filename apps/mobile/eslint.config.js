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
])
