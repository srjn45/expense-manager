import { useState } from 'react'
import { Text, View } from 'react-native'

import { Button, Input } from '@/components'
import { isValidPin, PIN_MAX_LENGTH, PIN_MIN_LENGTH } from '@/lib/pinHash'

export type PinCreateFormProps = {
  /** Called with the confirmed PIN once enter + confirm match and validate. */
  onComplete: (pin: string) => void | Promise<void>
  /** Disable inputs / show spinner on the submit button while an async op runs. */
  busy?: boolean
  submitLabel?: string
}

/**
 * Two-step "enter a new PIN, then confirm it" form. Shared by first-run setup and the
 * biometric-verified forgot-PIN reset. Built only from the primitives kit (§7.7). Numeric
 * keypad + masked entry; validation shown after submit, never mid-typing.
 */
export function PinCreateForm({
  onComplete,
  busy = false,
  submitLabel = 'Set PIN',
}: PinCreateFormProps) {
  const [step, setStep] = useState<'enter' | 'confirm'>('enter')
  const [pin, setPin] = useState('')
  const [confirm, setConfirm] = useState('')
  const [error, setError] = useState<string | undefined>()

  const lengthHint = `${PIN_MIN_LENGTH}–${PIN_MAX_LENGTH} digits`

  function handleContinue() {
    if (!isValidPin(pin)) {
      setError(`Enter a ${lengthHint} PIN.`)
      return
    }
    setError(undefined)
    setStep('confirm')
  }

  function handleConfirm() {
    if (confirm !== pin) {
      setError('PINs do not match. Start again.')
      setPin('')
      setConfirm('')
      setStep('enter')
      return
    }
    setError(undefined)
    void onComplete(pin)
  }

  if (step === 'enter') {
    return (
      <View className="gap-4">
        <Input
          label="Create a PIN"
          value={pin}
          onChangeText={(t) => setPin(t.replace(/\D/g, ''))}
          keyboardType="number-pad"
          secureTextEntry
          maxLength={PIN_MAX_LENGTH}
          autoFocus
          editable={!busy}
          hint={lengthHint}
          error={error}
          accessibilityLabel="Create a PIN"
          testID="pin-create-input"
        />
        <Button
          label="Continue"
          onPress={handleContinue}
          disabled={busy || !isValidPin(pin)}
          fullWidth
          testID="pin-create-continue"
        />
      </View>
    )
  }

  return (
    <View className="gap-4">
      <Text className="text-sm text-muted">Re-enter your PIN to confirm.</Text>
      <Input
        label="Confirm PIN"
        value={confirm}
        onChangeText={(t) => setConfirm(t.replace(/\D/g, ''))}
        keyboardType="number-pad"
        secureTextEntry
        maxLength={PIN_MAX_LENGTH}
        autoFocus
        editable={!busy}
        error={error}
        accessibilityLabel="Confirm PIN"
        testID="pin-confirm-input"
      />
      <Button
        label={submitLabel}
        onPress={handleConfirm}
        loading={busy}
        disabled={busy || confirm.length === 0}
        fullWidth
        testID="pin-confirm-submit"
      />
    </View>
  )
}
