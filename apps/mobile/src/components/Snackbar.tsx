import { Pressable, Text, View } from 'react-native'

export type SnackbarProps = {
  /** Whether the snackbar is shown. */
  visible: boolean
  /** The message (e.g. "Entry deleted"). */
  message: string
  /** Optional action label (e.g. "Undo"); renders a trailing button when paired with onAction. */
  actionLabel?: string
  onAction?: () => void
  className?: string
  testID?: string
}

/**
 * Bottom snackbar/toast for immediate mutation feedback with an optional action (§7.7).
 * The ledger uses it for delete + Undo. Visibility and auto-dismiss timing are owned by the
 * caller; this primitive is purely presentational so it works identically on web and native
 * (no Alert.alert, which react-native-web does not render).
 */
export function Snackbar({
  visible,
  message,
  actionLabel,
  onAction,
  className = '',
  testID,
}: SnackbarProps) {
  if (!visible) return null
  return (
    <View
      testID={testID}
      accessibilityRole="alert"
      accessibilityLiveRegion="polite"
      style={{ position: 'absolute', left: 16, right: 16, bottom: 24 }}
      className={`flex-row items-center justify-between gap-3 rounded-card bg-fg px-4 py-3 shadow-lg shadow-black/25 ${className}`}
    >
      <Text className="flex-1 text-sm text-bg" numberOfLines={2}>
        {message}
      </Text>
      {actionLabel && onAction ? (
        <Pressable
          onPress={onAction}
          accessibilityRole="button"
          accessibilityLabel={actionLabel}
          hitSlop={8}
          testID={testID ? `${testID}-action` : undefined}
        >
          <Text className="text-sm font-semibold text-primary">{actionLabel}</Text>
        </Pressable>
      ) : null}
    </View>
  )
}
