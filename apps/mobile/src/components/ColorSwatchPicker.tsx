import { Pressable, Text, View } from 'react-native'

import { minTouchTarget } from '../theme/theme'

/**
 * A small preset palette of decorative category-accent colors (§7.4: "color pick optional",
 * a simple preset swatch palette — no color-wheel picker). Category colors are accents on
 * chips, never the amount color (§7.7). All are 6-digit hex, so they satisfy `hexColorSchema`.
 */
export const CATEGORY_SWATCHES = [
  '#EF4444', // red
  '#F97316', // orange
  '#F59E0B', // amber
  '#10B981', // emerald
  '#14B8A6', // teal
  '#3B82F6', // blue
  '#6366F1', // indigo
  '#8B5CF6', // violet
  '#EC4899', // pink
  '#64748B', // slate
] as const

export type ColorSwatchPickerProps = {
  /** Currently selected color (hex) or null for "no color". */
  value?: string | null
  /** Called with the picked color, or null when the "None" swatch is chosen. */
  onChange: (color: string | null) => void
  /** Palette to show. Defaults to {@link CATEGORY_SWATCHES}. */
  swatches?: readonly string[]
  label?: string
  className?: string
  testID?: string
}

/**
 * Preset color-swatch picker built from primitives (§7.7). A wrapping row of tappable
 * circles plus a "None" option; the selected swatch shows a ring (selection never relies on
 * color alone — the ring is a shape cue). Meets the 44pt touch target.
 */
export function ColorSwatchPicker({
  value,
  onChange,
  swatches = CATEGORY_SWATCHES,
  label,
  className = '',
  testID,
}: ColorSwatchPickerProps) {
  const noneSelected = value == null
  return (
    <View className={`gap-2 ${className}`} testID={testID}>
      {label ? <Text className="text-sm font-medium text-fg">{label}</Text> : null}
      <View className="flex-row flex-wrap gap-3">
        {/* "None" — a bordered empty circle with a slash-through feel via muted text. */}
        <Pressable
          onPress={() => onChange(null)}
          accessibilityRole="button"
          accessibilityLabel="No color"
          accessibilityState={{ selected: noneSelected }}
          testID={testID ? `${testID}-none` : undefined}
          style={{ minWidth: minTouchTarget, minHeight: minTouchTarget }}
          className="items-center justify-center"
        >
          <View
            className={`h-8 w-8 items-center justify-center rounded-full border bg-surface-alt ${
              noneSelected ? 'border-2 border-primary' : 'border-border'
            }`}
          >
            <Text className="text-xs text-muted">✕</Text>
          </View>
        </Pressable>

        {swatches.map((color) => {
          const selected = value?.toLowerCase() === color.toLowerCase()
          return (
            <Pressable
              key={color}
              onPress={() => onChange(color)}
              accessibilityRole="button"
              accessibilityLabel={`Color ${color}`}
              accessibilityState={{ selected }}
              testID={testID ? `${testID}-${color}` : undefined}
              style={{ minWidth: minTouchTarget, minHeight: minTouchTarget }}
              className="items-center justify-center"
            >
              <View
                style={{ backgroundColor: color }}
                className={`h-8 w-8 items-center justify-center rounded-full ${
                  selected ? 'border-2 border-fg' : ''
                }`}
              >
                {selected ? <Text className="text-xs font-bold text-white">✓</Text> : null}
              </View>
            </Pressable>
          )
        })}
      </View>
    </View>
  )
}
