import { useEffect, useState } from 'react'
import { Platform, Text, View } from 'react-native'

import { Button, Card, Screen } from '@/components'
import { getDatabase } from '@/db/client'
import { authenticateWithBiometrics, isBiometricAvailable } from '@/lib/biometrics'

import { completePinSetup, setBiometricsEnabled } from './lockActions'
import { useLockStore } from './lockStore'
import { PinCreateForm } from './PinCreateForm'

/**
 * First-run flow (§7.1 / §8): create a PIN, then optionally enable biometrics. On finish it
 * flips `pin_set` (and `biometrics_enabled`) and unlocks the app. Shown by {@link LockGate}
 * whenever no PIN is set (fresh install or after "wipe & start over").
 */
export function CreatePinScreen() {
  const setHasPin = useLockStore((s) => s.setHasPin)
  const unlock = useLockStore((s) => s.unlock)
  const setStoreBiometrics = useLockStore((s) => s.setBiometricsEnabled)

  const [busy, setBusy] = useState(false)
  const [canBiometric, setCanBiometric] = useState(false)
  const [step, setStep] = useState<'create' | 'biometric'>('create')

  useEffect(() => {
    let active = true
    void isBiometricAvailable().then((ok) => active && setCanBiometric(ok))
    return () => {
      active = false
    }
  }, [])

  /** Persist the PIN, then either offer biometrics or finish straight away. */
  async function handlePinCreated(newPin: string) {
    setBusy(true)
    try {
      await completePinSetup(getDatabase(), newPin, false)
      if (canBiometric) {
        setStep('biometric')
      } else {
        finish()
      }
    } finally {
      setBusy(false)
    }
  }

  function finish() {
    setHasPin(true)
    unlock()
  }

  async function enableBiometrics() {
    setBusy(true)
    try {
      // Prove the sensor works before turning it on, so the user isn't locked out later.
      const ok = await authenticateWithBiometrics('Confirm to enable biometric unlock')
      if (ok) {
        setBiometricsEnabled(getDatabase(), true)
        setStoreBiometrics(true)
      }
      finish()
    } finally {
      setBusy(false)
    }
  }

  return (
    <Screen contentClassName="justify-center gap-6">
      <View className="gap-2">
        <Text className="text-2xl font-semibold text-fg">
          {step === 'create' ? 'Set up your PIN' : 'Enable biometric unlock?'}
        </Text>
        <Text className="text-sm text-muted">
          {step === 'create'
            ? 'Your PIN locks this app on your device. Your data never leaves it.'
            : 'Unlock faster with Face ID / fingerprint. You can still use your PIN anytime.'}
        </Text>
      </View>

      {step === 'create' ? (
        <PinCreateForm onComplete={handlePinCreated} busy={busy} submitLabel="Set PIN" />
      ) : (
        <View className="gap-3">
          <Button
            label="Enable biometrics"
            onPress={enableBiometrics}
            loading={busy}
            fullWidth
            testID="enable-biometrics"
          />
          <Button
            label="Not now"
            variant="ghost"
            onPress={finish}
            disabled={busy}
            fullWidth
            testID="skip-biometrics"
          />
        </View>
      )}

      {Platform.OS === 'web' ? (
        <Card className="gap-1">
          <Text className="text-xs font-semibold text-fg">Heads up</Text>
          <Text className="text-xs text-muted">
            On the web, the lock is a convenience gate — not a security boundary. For real
            protection, use the Android or iOS app.
          </Text>
        </Card>
      ) : null}
    </Screen>
  )
}
