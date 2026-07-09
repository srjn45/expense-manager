import { type ReactNode } from 'react'
import { Pressable, View } from 'react-native'

export type CardProps = {
  children: ReactNode
  /** Makes the whole card tappable. */
  onPress?: () => void
  /** Long-press handler (e.g. reveal row actions). Only active alongside `onPress`. */
  onLongPress?: () => void
  /** Apply standard inner padding (16pt). Default true. */
  padded?: boolean
  accessibilityLabel?: string
  accessibilityHint?: string
  className?: string
  testID?: string
}

/**
 * Content surface: rounded, subtle elevation, no heavy borders (§7.7 "calm surfaces").
 * Avoid nesting cards. Pass `onPress` to make it an actionable row/card.
 */
export function Card({
  children,
  onPress,
  onLongPress,
  padded = true,
  accessibilityLabel,
  accessibilityHint,
  className = '',
  testID,
}: CardProps) {
  const base = `bg-surface rounded-card border border-border/60 ${padded ? 'p-4' : ''}`
  // Soft, single-level elevation (§7.7).
  const shadow = 'shadow-sm shadow-black/5'

  if (onPress) {
    return (
      <Pressable
        onPress={onPress}
        onLongPress={onLongPress}
        accessibilityRole="button"
        accessibilityLabel={accessibilityLabel}
        accessibilityHint={accessibilityHint}
        testID={testID}
        style={({ pressed }) => ({ opacity: pressed ? 0.9 : 1 })}
        className={`${base} ${shadow} ${className}`}
      >
        {children}
      </Pressable>
    )
  }

  return (
    <View testID={testID} className={`${base} ${shadow} ${className}`}>
      {children}
    </View>
  )
}
