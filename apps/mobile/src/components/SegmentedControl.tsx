import { Pressable, Text, View } from 'react-native'

import { minTouchTarget } from '../theme/theme'

/** Optional semantic tint applied to the SELECTED segment (never color alone — the fill + weight also change). */
export type SegmentTone = 'primary' | 'danger' | 'success'

export type Segment<T extends string> = {
  value: T
  label: string
  /** Selected-state tint. Default 'primary'. */
  tone?: SegmentTone
  /** Screen-reader label; defaults to `label`. */
  accessibilityLabel?: string
  testID?: string
}

export type SegmentedControlProps<T extends string> = {
  value: T
  onChange: (value: T) => void
  segments: readonly Segment<T>[]
  label?: string
  disabled?: boolean
  className?: string
  testID?: string
}

const SELECTED_CONTAINER: Record<SegmentTone, string> = {
  primary: 'bg-primary',
  danger: 'bg-danger',
  success: 'bg-success',
}
const SELECTED_LABEL: Record<SegmentTone, string> = {
  primary: 'text-primary-fg',
  danger: 'text-white',
  success: 'text-white',
}

/**
 * A clear two-or-more option segmented control (§7.7). Built from primitives; used for the
 * entry form's Debit/Credit toggle. Selection is conveyed by fill + weight (and an optional
 * semantic tone) — never color alone. Meets the 44pt touch target.
 */
export function SegmentedControl<T extends string>({
  value,
  onChange,
  segments,
  label,
  disabled = false,
  className = '',
  testID,
}: SegmentedControlProps<T>) {
  return (
    <View className={`gap-1 ${className}`} testID={testID}>
      {label ? <Text className="text-sm font-medium text-fg">{label}</Text> : null}
      <View
        className="flex-row gap-1 rounded-button border border-border bg-surface-alt p-1"
        accessibilityRole="radiogroup"
      >
        {segments.map((seg) => {
          const selected = seg.value === value
          const tone = seg.tone ?? 'primary'
          const container = selected ? SELECTED_CONTAINER[tone] : 'bg-transparent'
          const text = selected ? `${SELECTED_LABEL[tone]} font-semibold` : 'text-fg'
          return (
            <Pressable
              key={seg.value}
              onPress={() => onChange(seg.value)}
              disabled={disabled}
              accessibilityRole="radio"
              accessibilityLabel={seg.accessibilityLabel ?? seg.label}
              accessibilityState={{ selected, disabled }}
              testID={seg.testID}
              style={({ pressed }) => ({
                flex: 1,
                minHeight: minTouchTarget - 8,
                opacity: disabled ? 0.5 : pressed ? 0.85 : 1,
              })}
              className={`items-center justify-center rounded-button px-3 py-2 ${container}`}
            >
              <Text className={`text-base ${text}`}>{seg.label}</Text>
            </Pressable>
          )
        })}
      </View>
    </View>
  )
}
