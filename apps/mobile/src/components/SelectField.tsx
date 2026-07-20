import { useState } from 'react'
import { Modal, Pressable, ScrollView, Text, View } from 'react-native'

import { minTouchTarget } from '../theme/theme'

export type SelectOption = {
  value: string
  label: string
  /** Secondary text shown to the right of the label (e.g. a currency's full name). */
  hint?: string
}

export type SelectFieldProps = {
  label?: string
  value: string
  options: SelectOption[]
  onChange: (value: string) => void
  placeholder?: string
  error?: string
  hint?: string
  editable?: boolean
  testID?: string
}

/**
 * A labeled dropdown: a bordered trigger (styled like `Input`) that opens a modal list of
 * options, single-select. Built from RN core `Modal` + this design system's primitives, same
 * pattern as `CalendarModal`/`DatePickerField` — no native picker dependency, so it behaves
 * identically on web, Android and iOS.
 */
export function SelectField({
  label,
  value,
  options,
  onChange,
  placeholder = 'Select…',
  error,
  hint,
  editable = true,
  testID,
}: SelectFieldProps) {
  const [open, setOpen] = useState(false)
  const selected = options.find((o) => o.value === value)
  const borderClass = error ? 'border-danger' : 'border-border'

  return (
    <View className="gap-1">
      {label ? <Text className="text-sm font-medium text-fg">{label}</Text> : null}
      <Pressable
        onPress={() => setOpen(true)}
        disabled={!editable}
        accessibilityRole="button"
        accessibilityLabel={label ?? placeholder}
        style={{ minHeight: minTouchTarget, opacity: editable ? 1 : 0.6 }}
        className={`flex-row items-center justify-between rounded-button border bg-surface px-3 ${borderClass}`}
        testID={testID}
      >
        <Text className={`text-base ${selected ? 'text-fg' : 'text-muted'}`}>
          {selected ? selected.label : placeholder}
        </Text>
        <Text className="text-base text-muted">⌄</Text>
      </Pressable>
      {error ? (
        <Text className="text-xs text-danger">{error}</Text>
      ) : hint ? (
        <Text className="text-xs text-muted">{hint}</Text>
      ) : null}

      <Modal visible={open} transparent animationType="fade" onRequestClose={() => setOpen(false)}>
        <Pressable
          className="flex-1 items-center justify-center bg-black/40 px-6"
          onPress={() => setOpen(false)}
          accessibilityLabel={`Close ${label ?? 'picker'}`}
          testID={testID ? `${testID}-modal` : undefined}
        >
          <Pressable
            className="w-full max-w-sm gap-1 rounded-card border border-border/60 bg-surface p-2 shadow-sm shadow-black/5"
            style={{ maxHeight: 420 }}
            onPress={(e) => e.stopPropagation()}
          >
            <ScrollView keyboardShouldPersistTaps="handled">
              {options.map((option) => {
                const isSelected = option.value === value
                return (
                  <Pressable
                    key={option.value}
                    onPress={() => {
                      onChange(option.value)
                      setOpen(false)
                    }}
                    style={{ minHeight: minTouchTarget }}
                    className={`flex-row items-center justify-between rounded-button px-3 ${
                      isSelected ? 'bg-primary/10' : ''
                    }`}
                    accessibilityRole="button"
                    accessibilityState={{ selected: isSelected }}
                    testID={testID ? `${testID}-option-${option.value}` : undefined}
                  >
                    <View className="flex-row items-center gap-2">
                      <Text
                        className={`text-base ${isSelected ? 'font-semibold text-primary' : 'text-fg'}`}
                      >
                        {option.label}
                      </Text>
                      {option.hint ? (
                        <Text className="text-xs text-muted">{option.hint}</Text>
                      ) : null}
                    </View>
                    {isSelected ? <Text className="text-base text-primary">✓</Text> : null}
                  </Pressable>
                )
              })}
            </ScrollView>
          </Pressable>
        </Pressable>
      </Modal>
    </View>
  )
}
