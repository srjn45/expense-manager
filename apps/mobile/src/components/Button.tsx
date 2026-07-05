import { type ReactNode } from 'react'
import { ActivityIndicator, Pressable, Text, View } from 'react-native'

import { minTouchTarget } from '../theme/theme'
import { useThemeColors } from '../theme/useThemeColors'

export type ButtonVariant = 'primary' | 'secondary' | 'ghost' | 'danger'
export type ButtonSize = 'sm' | 'md' | 'lg'

export type ButtonProps = {
  label: string
  onPress?: () => void
  variant?: ButtonVariant
  size?: ButtonSize
  disabled?: boolean
  loading?: boolean
  /** Optional leading element (icon). */
  leftIcon?: ReactNode
  /** Stretch to fill the parent width. */
  fullWidth?: boolean
  accessibilityLabel?: string
  className?: string
  testID?: string
}

const CONTAINER: Record<ButtonVariant, string> = {
  primary: 'bg-primary',
  secondary: 'bg-surface-alt border border-border',
  ghost: 'bg-transparent',
  danger: 'bg-danger',
}

const LABEL: Record<ButtonVariant, string> = {
  primary: 'text-primary-fg',
  secondary: 'text-fg',
  ghost: 'text-primary',
  danger: 'text-white',
}

const SIZE: Record<ButtonSize, { container: string; label: string }> = {
  sm: { container: 'px-3 py-2 rounded-button', label: 'text-sm' },
  md: { container: 'px-4 py-3 rounded-button', label: 'text-base' },
  lg: { container: 'px-5 py-4 rounded-button', label: 'text-lg' },
}

/**
 * Primary tappable action. One "primary" per screen (§7.7). Meets the 44pt minimum
 * touch target. Shows a spinner and blocks presses while `loading`.
 */
export function Button({
  label,
  onPress,
  variant = 'primary',
  size = 'md',
  disabled = false,
  loading = false,
  leftIcon,
  fullWidth = false,
  accessibilityLabel,
  className = '',
  testID,
}: ButtonProps) {
  const colors = useThemeColors()
  const isDisabled = disabled || loading
  const spinnerColor = variant === 'primary' || variant === 'danger' ? colors.primaryFg : colors.fg

  return (
    <Pressable
      onPress={onPress}
      disabled={isDisabled}
      accessibilityRole="button"
      accessibilityLabel={accessibilityLabel ?? label}
      accessibilityState={{ disabled: isDisabled, busy: loading }}
      testID={testID}
      style={({ pressed }) => ({
        minHeight: minTouchTarget,
        opacity: isDisabled ? 0.5 : pressed ? 0.85 : 1,
      })}
      className={`flex-row items-center justify-center gap-2 ${CONTAINER[variant]} ${
        SIZE[size].container
      } ${fullWidth ? 'w-full' : 'self-start'} ${className}`}
    >
      {loading ? (
        <ActivityIndicator color={spinnerColor} />
      ) : (
        <>
          {leftIcon ? <View>{leftIcon}</View> : null}
          <Text className={`font-semibold ${LABEL[variant]} ${SIZE[size].label}`}>{label}</Text>
        </>
      )}
    </Pressable>
  )
}
