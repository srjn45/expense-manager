import { type ReactNode } from 'react'
import { Pressable, Text } from 'react-native'

export type FABProps = {
  onPress: () => void
  /** Custom icon element. Defaults to a "+" glyph. */
  icon?: ReactNode
  /** Optional text — renders an extended (pill) FAB alongside the icon. */
  label?: string
  /** Required for screen readers (icon-only button). */
  accessibilityLabel: string
  className?: string
  testID?: string
}

/**
 * Floating action button, pinned bottom-right and thumb-reachable (§7.7). The ledger's
 * one-tap "add expense" affordance. Extended form shows a label next to the icon.
 */
export function FAB({
  onPress,
  icon,
  label,
  accessibilityLabel,
  className = '',
  testID,
}: FABProps) {
  const extended = label != null
  return (
    <Pressable
      onPress={onPress}
      accessibilityRole="button"
      accessibilityLabel={accessibilityLabel}
      testID={testID}
      style={({ pressed }) => ({
        position: 'absolute',
        right: 16,
        bottom: 24,
        minHeight: 56,
        minWidth: 56,
        opacity: pressed ? 0.9 : 1,
        transform: [{ scale: pressed ? 0.96 : 1 }],
      })}
      className={`flex-row items-center justify-center gap-2 rounded-full bg-primary px-4 shadow-lg shadow-black/25 ${className}`}
    >
      {icon ?? <Text className="text-2xl leading-none text-primary-fg">+</Text>}
      {extended ? <Text className="text-base font-semibold text-primary-fg">{label}</Text> : null}
    </Pressable>
  )
}
