// Babel config for the Expo app.
// - babel-preset-expo with `jsxImportSource: 'nativewind'` enables className styling.
// - `nativewind/babel` preset compiles Tailwind classes for native + web.
// - `babel-plugin-inline-import` inlines Drizzle's generated `.sql` migration files
//   so `useMigrations()` can bundle them (see metro.config.js `sourceExts`).
// The react-native-worklets/reanimated Babel plugin is added automatically by
// babel-preset-expo when reanimated is installed — do NOT add it here (double
// registration throws at build time).
module.exports = function (api) {
  api.cache(true)
  return {
    presets: [['babel-preset-expo', { jsxImportSource: 'nativewind' }], 'nativewind/babel'],
    plugins: [['babel-plugin-inline-import', { extensions: ['.sql'] }]],
  }
}
