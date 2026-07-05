import { Pressable, Text, View } from 'react-native'

export type ChipProps = {
  label: string
  /** Selected/active styling (e.g. an active filter). */
  selected?: boolean
  onPress?: () => void
  /** When provided, renders a trailing "×" that calls this (e.g. remove a tag). */
  onRemove?: () => void
  /** Decorative accent dot color (e.g. a category color). Not the amount color. */
  color?: string
  size?: 'sm' | 'md'
  accessibilityLabel?: string
  className?: string
  testID?: string
}

/**
 * Compact pill for tags, categories, and filters (§7.7). Decorative `color` shows as a
 * small dot; selection uses fill + text weight (never color alone).
 */
export function Chip({
  label,
  selected = false,
  onPress,
  onRemove,
  color,
  size = 'md',
  accessibilityLabel,
  className = '',
  testID,
}: ChipProps) {
  const sizeClass = size === 'sm' ? 'px-2 py-1 gap-1' : 'px-3 py-1.5 gap-1.5'
  const fill = selected ? 'bg-primary border-primary' : 'bg-surface-alt border-border'
  const textClass = selected ? 'text-primary-fg font-semibold' : 'text-fg'
  const textSize = size === 'sm' ? 'text-xs' : 'text-sm'

  const content = (
    <>
      {color ? (
        <View style={{ width: 8, height: 8, borderRadius: 9999, backgroundColor: color }} />
      ) : null}
      <Text className={`${textClass} ${textSize}`}>{label}</Text>
      {onRemove ? (
        <Pressable
          onPress={onRemove}
          hitSlop={8}
          accessibilityRole="button"
          accessibilityLabel={`Remove ${label}`}
        >
          <Text className={`${textClass} ${textSize}`}>×</Text>
        </Pressable>
      ) : null}
    </>
  )

  const containerClass = `flex-row items-center self-start rounded-chip border ${sizeClass} ${fill} ${className}`

  if (onPress) {
    return (
      <Pressable
        onPress={onPress}
        accessibilityRole="button"
        accessibilityLabel={accessibilityLabel ?? label}
        accessibilityState={{ selected }}
        testID={testID}
        style={({ pressed }) => ({ opacity: pressed ? 0.85 : 1 })}
        className={containerClass}
      >
        {content}
      </Pressable>
    )
  }

  return (
    <View testID={testID} className={containerClass}>
      {content}
    </View>
  )
}
