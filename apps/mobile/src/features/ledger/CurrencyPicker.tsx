import { useMemo } from 'react'
import { Text, View } from 'react-native'

import { Chip } from '@/components'
import { COMMON_CURRENCIES, normalizeCurrency } from '@/domain'

export type CurrencyPickerProps = {
  /** Currently selected ISO 4217 code. */
  value: string
  onChange: (currency: string) => void
  label?: string
  error?: string
  testID?: string
}

/**
 * Per-transaction currency picker (§7.3): a wrapping row of chips built from the curated
 * `COMMON_CURRENCIES` shortlist, plus the entry's own currency appended if it isn't one of
 * those (mirrors `CategoryPicker`'s "always show the current selection" behavior).
 */
export function CurrencyPicker({
  value,
  onChange,
  label = 'Currency',
  error,
  testID,
}: CurrencyPickerProps) {
  const normalized = normalizeCurrency(value)
  const codes = useMemo(() => {
    const base: string[] = COMMON_CURRENCIES.map((c) => c.code)
    if (normalized.length === 0 || base.includes(normalized)) return base
    return [normalized, ...base]
  }, [normalized])

  return (
    <View className="gap-1" testID={testID}>
      <Text className="text-sm font-medium text-fg">{label}</Text>
      <View className="flex-row flex-wrap gap-2">
        {codes.map((code) => (
          <Chip
            key={code}
            label={code}
            selected={code === normalized}
            onPress={() => onChange(code)}
            accessibilityLabel={`Currency ${code}`}
            testID={`currency-pick-${code}`}
          />
        ))}
      </View>
      {error ? <Text className="text-xs text-danger">{error}</Text> : null}
    </View>
  )
}
