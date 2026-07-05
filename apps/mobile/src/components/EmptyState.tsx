import { type ReactNode } from 'react'
import { Text, View } from 'react-native'

import { Button } from './Button'

export type EmptyStateProps = {
  title: string
  description?: string
  /** Illustrated-lite icon/emoji element shown above the title. */
  icon?: ReactNode
  /** Primary CTA label — renders a Button when paired with onAction. */
  actionLabel?: string
  onAction?: () => void
  className?: string
  testID?: string
}

/**
 * Friendly empty / first-run state with a single clear CTA (§7.7). Carries reassurance
 * copy (e.g. "your data stays on your device") via `description`.
 */
export function EmptyState({
  title,
  description,
  icon,
  actionLabel,
  onAction,
  className = '',
  testID,
}: EmptyStateProps) {
  return (
    <View testID={testID} className={`flex-1 items-center justify-center gap-3 px-6 ${className}`}>
      {icon ? <View className="mb-1">{icon}</View> : null}
      <Text className="text-center text-lg font-semibold text-fg">{title}</Text>
      {description ? <Text className="text-center text-sm text-muted">{description}</Text> : null}
      {actionLabel && onAction ? (
        <View className="mt-2">
          <Button label={actionLabel} onPress={onAction} />
        </View>
      ) : null}
    </View>
  )
}
