import { forwardRef, type ReactNode, useState } from 'react'
import { Text, TextInput, type TextInputProps, View } from 'react-native'

import { useThemeColors } from '../theme/useThemeColors'

export type InputProps = Omit<TextInputProps, 'className' | 'style'> & {
  label?: string
  /** Validation error — shown below in danger color (§7.7: validate after blur/submit). */
  error?: string
  /** Helper text shown below when there is no error. */
  hint?: string
  leftAdornment?: ReactNode
  rightAdornment?: ReactNode
  containerClassName?: string
  /** Classes applied to the TextInput itself. */
  className?: string
}

/**
 * Labeled text field. Big, obvious input with inline validation shown below (§7.7).
 * Forwards its ref to the underlying TextInput so forms can focus/blur it.
 */
export const Input = forwardRef<TextInput, InputProps>(function Input(
  {
    label,
    error,
    hint,
    leftAdornment,
    rightAdornment,
    containerClassName = '',
    className = '',
    onFocus,
    onBlur,
    ...rest
  },
  ref
) {
  const colors = useThemeColors()
  const [focused, setFocused] = useState(false)
  const borderClass = error ? 'border-danger' : focused ? 'border-primary' : 'border-border'

  return (
    <View className={`gap-1 ${containerClassName}`}>
      {label ? <Text className="text-sm font-medium text-fg">{label}</Text> : null}
      <View
        className={`flex-row items-center gap-2 rounded-button border bg-surface px-3 ${borderClass}`}
      >
        {leftAdornment}
        <TextInput
          ref={ref}
          placeholderTextColor={colors.muted}
          onFocus={(e) => {
            setFocused(true)
            onFocus?.(e)
          }}
          onBlur={(e) => {
            setFocused(false)
            onBlur?.(e)
          }}
          className={`flex-1 py-3 text-base text-fg ${className}`}
          {...rest}
        />
        {rightAdornment}
      </View>
      {error ? (
        <Text className="text-xs text-danger">{error}</Text>
      ) : hint ? (
        <Text className="text-xs text-muted">{hint}</Text>
      ) : null}
    </View>
  )
})
