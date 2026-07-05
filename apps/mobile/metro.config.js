// Metro config: NativeWind + expo-sqlite(web WASM) + Drizzle(.sql migrations).
const { getDefaultConfig } = require('expo/metro-config')
const { withNativeWind } = require('nativewind/metro')

const config = getDefaultConfig(__dirname)

// Drizzle: allow importing generated `.sql` migration files as modules
// (paired with babel-plugin-inline-import in babel.config.js).
config.resolver.sourceExts.push('sql')

// expo-sqlite on web ships a wa-sqlite WASM binary that must be bundled as an asset.
config.resolver.assetExts.push('wasm')

// expo-sqlite's web build uses OPFS + SharedArrayBuffer, which browsers only expose
// to cross-origin-isolated pages. Send the required COOP/COEP headers from the dev
// server. (For `expo export` / production, the same headers are declared for the
// expo-router plugin in app.json so the static host applies them.)
config.server = {
  ...config.server,
  enhanceMiddleware: (middleware) => (req, res, next) => {
    res.setHeader('Cross-Origin-Opener-Policy', 'same-origin')
    res.setHeader('Cross-Origin-Embedder-Policy', 'credentialless')
    return middleware(req, res, next)
  },
}

module.exports = withNativeWind(config, { input: './global.css' })
