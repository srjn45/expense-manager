/**
 * Design tokens (§7.7 of the master plan).
 *
 * This module is the imperative mirror of the class-based tokens in tailwind.config.js
 * + global.css. Use NativeWind classes (`bg-surface`, `text-fg`, `text-danger`, …) in
 * components wherever possible; reach for these constants only when a value is needed in
 * JS (e.g. a color passed to a native prop, shadow config, or animation).
 *
 * Keep light/dark values here in sync with the CSS variables in global.css.
 */

export const palette = {
  light: {
    bg: '#F7F8FA',
    surface: '#FFFFFF',
    surfaceAlt: '#F1F3F5',
    border: '#E5E7EB',
    fg: '#111827',
    muted: '#6B7280',
    primary: '#4F46E5',
    primaryFg: '#FFFFFF',
    danger: '#DC2626', // debit — money out
    success: '#16A34A', // credit — money in
  },
  dark: {
    bg: '#0B0F14',
    surface: '#151A21',
    surfaceAlt: '#1E252E',
    border: '#2A323C',
    fg: '#F3F4F6',
    muted: '#9BA3AF',
    primary: '#818CF8',
    primaryFg: '#0B0F14',
    danger: '#F87171',
    success: '#4ADE80',
  },
} as const

export type ColorScheme = keyof typeof palette
export type ThemeColors = (typeof palette)[ColorScheme]

/** 4-pt spacing scale (§7.7). */
export const spacing = {
  xs: 4,
  sm: 8,
  md: 12,
  lg: 16, // default screen padding
  xl: 24,
  xxl: 32,
} as const

/** One type scale: 12 / 14 / 16 / 20 / 28 (§7.7). */
export const fontSize = {
  xs: 12,
  sm: 14,
  base: 16,
  lg: 20,
  xl: 28,
} as const

export const radius = {
  chip: 9999,
  button: 12,
  card: 16,
} as const

/** Minimum touch target per §7.7 / platform HIG. */
export const minTouchTarget = 44

/**
 * Resolve the active palette for a color scheme. `null`/`undefined` (system
 * unknown) falls back to light.
 */
export function colorsFor(scheme: string | null | undefined): ThemeColors {
  return scheme === 'dark' ? palette.dark : palette.light
}
