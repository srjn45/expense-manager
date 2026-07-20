import { useMemo } from 'react'

import { SelectField, type SelectOption } from '@/components'
import { COMMON_CURRENCIES, normalizeCurrency } from '@/domain'

export type CurrencyPickerProps = {
  /** Currently selected ISO 4217 code. */
  value: string
  onChange: (currency: string) => void
  label?: string
  error?: string
  editable?: boolean
  testID?: string
}

/**
 * Per-transaction currency picker (§7.3): a dropdown built from the curated
 * `COMMON_CURRENCIES` shortlist, plus the entry's own currency appended if it isn't one of
 * those (mirrors `CategoryPicker`'s "always show the current selection" behavior).
 */
export function CurrencyPicker({
  value,
  onChange,
  label = 'Currency',
  error,
  editable = true,
  testID,
}: CurrencyPickerProps) {
  const normalized = normalizeCurrency(value)
  const options = useMemo<SelectOption[]>(() => {
    const base = COMMON_CURRENCIES.map((c) => ({ value: c.code, label: c.code, hint: c.name }))
    if (normalized.length === 0 || base.some((o) => o.value === normalized)) return base
    return [{ value: normalized, label: normalized }, ...base]
  }, [normalized])

  return (
    <SelectField
      label={label}
      value={normalized}
      options={options}
      onChange={onChange}
      error={error}
      editable={editable}
      testID={testID}
    />
  )
}
