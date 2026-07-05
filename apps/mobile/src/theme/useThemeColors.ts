import { useColorScheme } from 'react-native'

import { colorsFor, type ThemeColors } from './theme'

/**
 * Active palette for the current system color scheme. Use in components that need a
 * color value in JS (native props like ActivityIndicator `color`, shadows). Prefer
 * NativeWind classes (`bg-surface`, `text-fg`, …) for everything expressible in CSS.
 */
export function useThemeColors(): ThemeColors {
  const scheme = useColorScheme()
  return colorsFor(scheme)
}
