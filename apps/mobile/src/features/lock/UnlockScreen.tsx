import { useCallback, useEffect, useRef, useState } from 'react'
import { Text, View } from 'react-native'

import { Button, Input, Screen } from '@/components'
import { authenticateWithBiometrics } from '@/lib/biometrics'
import { PIN_MAX_LENGTH } from '@/lib/pinHash'
import { verifyPin } from '@/lib/pinStorage'

import { useLockStore } from './lockStore'

export type UnlockScreenProps = {
  /** Navigate to the forgot-PIN flow. */
  onForgot: () => void
}

/**
 * Unlock flow (§7.1 / §8): enter the correct PIN, or use biometrics if enabled (with PIN
 * always available as fallback). Shown by {@link LockGate} whenever the app is locked.
 */
export function UnlockScreen({ onForgot }: UnlockScreenProps) {
  const unlock = useLockStore((s) => s.unlock)
  const biometricsEnabled = useLockStore((s) => s.biometricsEnabled)

  const [pin, setPin] = useState('')
  const [error, setError] = useState<string | undefined>()
  const [busy, setBusy] = useState(false)
  const biometricTried = useRef(false)

  const tryBiometric = useCallback(async () => {
    setBusy(true)
    try {
      const ok = await authenticateWithBiometrics('Unlock Expense Manager')
      if (ok) unlock()
    } finally {
      setBusy(false)
    }
  }, [unlock])

  // Offer biometrics automatically on first mount when enabled; PIN stays available.
  useEffect(() => {
    if (biometricsEnabled && !biometricTried.current) {
      biometricTried.current = true
      void tryBiometric()
    }
  }, [biometricsEnabled, tryBiometric])

  async function submitPin() {
    setBusy(true)
    try {
      if (await verifyPin(pin)) {
        unlock()
      } else {
        setError('Incorrect PIN. Try again.')
        setPin('')
      }
    } finally {
      setBusy(false)
    }
  }

  return (
    <Screen contentClassName="justify-center gap-6">
      <View className="gap-2">
        <Text className="text-2xl font-semibold text-fg">Welcome back</Text>
        <Text className="text-sm text-muted">Enter your PIN to unlock.</Text>
      </View>

      <Input
        label="PIN"
        value={pin}
        onChangeText={(t) => {
          setPin(t.replace(/\D/g, ''))
          if (error) setError(undefined)
        }}
        keyboardType="number-pad"
        secureTextEntry
        maxLength={PIN_MAX_LENGTH}
        autoFocus
        editable={!busy}
        error={error}
        onSubmitEditing={submitPin}
        accessibilityLabel="Enter PIN"
        testID="unlock-pin-input"
      />

      <View className="gap-3">
        <Button
          label="Unlock"
          onPress={submitPin}
          loading={busy}
          disabled={busy || pin.length === 0}
          fullWidth
          testID="unlock-submit"
        />
        {biometricsEnabled ? (
          <Button
            label="Use biometrics"
            variant="secondary"
            onPress={tryBiometric}
            disabled={busy}
            fullWidth
            testID="unlock-biometrics"
          />
        ) : null}
        <Button
          label="Forgot PIN?"
          variant="ghost"
          onPress={onForgot}
          disabled={busy}
          fullWidth
          testID="unlock-forgot"
        />
      </View>
    </Screen>
  )
}
