import { Text } from 'react-native'

export type AmountTextProps = {
  /** Signed integer minor units (negative = debit, positive = credit). See §6.1. */
  amountMinor: number
  /** ISO 4217 currency code (e.g. INR, USD, JPY). */
  currency: string
  size?: 'sm' | 'base' | 'lg' | 'xl'
  /** Show the leading +/− sign. Default true. */
  showSign?: boolean
  /** Apply debit/credit color. Default true. Pass false for neutral (muted) rendering. */
  colored?: boolean
  className?: string
  testID?: string
}

const SIZE_CLASS: Record<NonNullable<AmountTextProps['size']>, string> = {
  sm: 'text-sm',
  base: 'text-base',
  lg: 'text-lg',
  xl: 'text-xl',
}

/** Fraction digits for a currency, currency-aware (INR/USD=2, JPY=0, KWD=3). */
function fractionDigits(currency: string): number {
  try {
    return (
      new Intl.NumberFormat('en', { style: 'currency', currency }).resolvedOptions()
        .maximumFractionDigits ?? 2
    )
  } catch {
    return 2
  }
}

/** Format absolute minor units into a currency string (no sign). */
function formatAbsolute(amountMinor: number, currency: string): string {
  const digits = fractionDigits(currency)
  const major = Math.abs(amountMinor) / 10 ** digits
  try {
    return new Intl.NumberFormat('en', {
      style: 'currency',
      currency,
      minimumFractionDigits: digits,
      maximumFractionDigits: digits,
    }).format(major)
  } catch {
    return `${major.toFixed(digits)} ${currency}`
  }
}

/**
 * Renders a signed money amount with tabular numerals so columns align (§7.7).
 * Debit (negative) is danger-colored with a "−"; credit (positive) is success-colored
 * with a "+". Meaning is never color-only — the sign is always present. This is the
 * display primitive; full money math lives in the Phase 1 domain money helpers.
 */
export function AmountText({
  amountMinor,
  currency,
  size = 'base',
  showSign = true,
  colored = true,
  className = '',
  testID,
}: AmountTextProps) {
  const isDebit = amountMinor < 0
  const isCredit = amountMinor > 0
  const sign = showSign ? (isDebit ? '−' : isCredit ? '+' : '') : ''
  const colorClass = !colored
    ? 'text-fg'
    : isDebit
      ? 'text-danger'
      : isCredit
        ? 'text-success'
        : 'text-muted'

  return (
    <Text
      testID={testID}
      accessibilityLabel={`${isDebit ? 'debit' : isCredit ? 'credit' : ''} ${formatAbsolute(amountMinor, currency)}`}
      style={{ fontVariant: ['tabular-nums'] }}
      className={`font-semibold ${colorClass} ${SIZE_CLASS[size]} ${className}`}
    >
      {sign}
      {formatAbsolute(amountMinor, currency)}
    </Text>
  )
}
