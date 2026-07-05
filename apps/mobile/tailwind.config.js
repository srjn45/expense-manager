/** @type {import('tailwindcss').Config} */
// Semantic color tokens resolve to CSS variables defined in global.css, which switch
// automatically between light and dark via `prefers-color-scheme` (NativeWind applies
// these on native too). Keep the design tokens here in sync with src/theme/theme.ts.
module.exports = {
  content: ['./app/**/*.{js,jsx,ts,tsx}', './src/**/*.{js,jsx,ts,tsx}'],
  presets: [require('nativewind/preset')],
  theme: {
    extend: {
      colors: {
        // App surfaces
        bg: 'rgb(var(--color-bg) / <alpha-value>)',
        surface: 'rgb(var(--color-surface) / <alpha-value>)',
        'surface-alt': 'rgb(var(--color-surface-alt) / <alpha-value>)',
        border: 'rgb(var(--color-border) / <alpha-value>)',
        // Text
        fg: 'rgb(var(--color-fg) / <alpha-value>)',
        muted: 'rgb(var(--color-muted) / <alpha-value>)',
        // Brand / actions
        primary: 'rgb(var(--color-primary) / <alpha-value>)',
        'primary-fg': 'rgb(var(--color-primary-fg) / <alpha-value>)',
        // Semantic money colors (never rely on color alone — also use sign/label)
        danger: 'rgb(var(--color-danger) / <alpha-value>)', // debit (money out)
        success: 'rgb(var(--color-success) / <alpha-value>)', // credit (money in)
      },
      fontSize: {
        // One type scale: 12 / 14 / 16 / 20 / 28
        xs: ['12px', { lineHeight: '16px' }],
        sm: ['14px', { lineHeight: '20px' }],
        base: ['16px', { lineHeight: '24px' }],
        lg: ['20px', { lineHeight: '28px' }],
        xl: ['28px', { lineHeight: '34px' }],
      },
      borderRadius: {
        chip: '9999px',
        button: '12px',
        card: '16px',
      },
    },
  },
  plugins: [],
}
