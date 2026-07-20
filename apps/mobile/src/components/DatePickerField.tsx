import { useState } from 'react'
import { Pressable, Text } from 'react-native'

import { isValidISODate, todayISO } from '@/domain'

import { CalendarModal } from './CalendarModal'
import { Input } from './Input'
import { minTouchTarget } from '../theme/theme'

export type DatePickerFieldProps = {
  label?: string
  /** `YYYY-MM-DD`, or a possibly-incomplete string while the user is typing it. */
  value: string
  onChange: (value: string) => void
  onBlur?: () => void
  error?: string
  hint?: string
  editable?: boolean
  testID?: string
}

/**
 * Date field (§7.3): a plain typed `Input` (kept for fast manual entry, e.g. "today's date is
 * already right") PLUS a calendar button that opens a {@link CalendarModal} widget — either
 * path writes back the same `YYYY-MM-DD` value.
 */
export function DatePickerField({
  label = 'Date',
  value,
  onChange,
  onBlur,
  error,
  hint,
  editable = true,
  testID,
}: DatePickerFieldProps) {
  const [open, setOpen] = useState(false)

  return (
    <>
      <Input
        label={label}
        value={value}
        onChangeText={onChange}
        onBlur={onBlur}
        placeholder="YYYY-MM-DD"
        autoCapitalize="none"
        autoCorrect={false}
        editable={editable}
        error={error}
        hint={hint}
        accessibilityLabel={label}
        rightAdornment={
          <Pressable
            onPress={() => setOpen(true)}
            disabled={!editable}
            hitSlop={8}
            style={{ minWidth: minTouchTarget, minHeight: minTouchTarget }}
            className="items-center justify-center"
            accessibilityRole="button"
            accessibilityLabel="Open calendar"
            testID={testID ? `${testID}-open` : undefined}
          >
            <Text className="text-lg">📅</Text>
          </Pressable>
        }
        testID={testID}
      />
      <CalendarModal
        visible={open}
        value={isValidISODate(value) ? value : todayISO()}
        onSelect={(iso) => {
          onChange(iso)
          setOpen(false)
        }}
        onClose={() => setOpen(false)}
        testID={testID ? `${testID}-calendar` : undefined}
      />
    </>
  )
}
