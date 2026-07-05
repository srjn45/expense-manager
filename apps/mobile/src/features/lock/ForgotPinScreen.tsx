import { useEffect, useState } from 'react'
import { Text, View } from 'react-native'

import { Button, Card, Screen } from '@/components'
import { getDatabase } from '@/db/client'
import { authenticateWithBiometrics, isBiometricAvailable } from '@/lib/biometrics'

import { setNewPin, wipeAndStartOver } from './lockActions'
import { useLockStore } from './lockStore'
import { PinCreateForm } from './PinCreateForm'

export type ForgotPinScreenProps = {
  /** Return to the unlock screen. */
  onCancel: () => void
}

/**
 * Forgot-PIN flow (§8, REQUIRED — never a dead end). There is no server/email reset:
 *  - If biometrics are enrolled, re-authenticate to set a BRAND-NEW PIN.
 *  - Otherwise (or as a last resort) "wipe data & start over" behind an explicit,
 *    two-step, hard-to-misclick confirmation that erases the local DB and the stored PIN.
 *
 * The confirmation is in-screen (not a native Alert) so it behaves identically on web,
 * where react-native-web's Alert is unreliable.
 */
export function ForgotPinScreen({ onCancel }: ForgotPinScreenProps) {
  const unlock = useLockStore((s) => s.unlock)
  const setHasPin = useLockStore((s) => s.setHasPin)

  const [canBiometric, setCanBiometric] = useState(false)
  const [verified, setVerified] = useState(false)
  const [busy, setBusy] = useState(false)
  const [confirmingWipe, setConfirmingWipe] = useState(false)

  useEffect(() => {
    let active = true
    void isBiometricAvailable().then((ok) => active && setCanBiometric(ok))
    return () => {
      active = false
    }
  }, [])

  async function verifyIdentity() {
    setBusy(true)
    try {
      if (await authenticateWithBiometrics('Verify your identity to reset your PIN')) {
        setVerified(true)
      }
    } finally {
      setBusy(false)
    }
  }

  async function handleNewPin(pin: string) {
    setBusy(true)
    try {
      await setNewPin(getDatabase(), pin)
      unlock() // identity already proven via biometrics
    } finally {
      setBusy(false)
    }
  }

  async function handleWipe() {
    setBusy(true)
    try {
      await wipeAndStartOver(getDatabase())
      // No PIN + fresh DB ⇒ LockGate shows first-run setup.
      setHasPin(false)
    } finally {
      setBusy(false)
    }
  }

  // After biometric verification, reuse the create form to set a new PIN.
  if (verified) {
    return (
      <Screen contentClassName="justify-center gap-6">
        <View className="gap-2">
          <Text className="text-2xl font-semibold text-fg">Set a new PIN</Text>
          <Text className="text-sm text-muted">Identity confirmed. Choose a new PIN.</Text>
        </View>
        <PinCreateForm onComplete={handleNewPin} busy={busy} submitLabel="Save new PIN" />
      </Screen>
    )
  }

  return (
    <Screen scroll contentClassName="justify-center gap-6">
      <View className="gap-2">
        <Text className="text-2xl font-semibold text-fg">Forgot PIN</Text>
        <Text className="text-sm text-muted">
          There is no account or email — your data lives only on this device, so a PIN cannot be
          emailed to you.
        </Text>
      </View>

      {canBiometric ? (
        <Card className="gap-3">
          <Text className="text-sm font-semibold text-fg">Reset with biometrics</Text>
          <Text className="text-sm text-muted">
            Verify with Face ID / fingerprint to set a new PIN. Your data stays intact.
          </Text>
          <Button
            label="Verify identity"
            onPress={verifyIdentity}
            loading={busy}
            fullWidth
            testID="forgot-verify-biometric"
          />
        </Card>
      ) : null}

      <Card className="gap-3">
        <Text className="text-sm font-semibold text-danger">Wipe data & start over</Text>
        <Text className="text-sm text-muted">
          {canBiometric
            ? "If you can't verify, you can erase everything and set up fresh."
            : 'No biometrics are enrolled, so the only way forward is to erase everything and start fresh.'}{' '}
          This permanently deletes all expenses and categories on this device. It cannot be undone.
        </Text>

        {confirmingWipe ? (
          <View className="gap-2">
            <Text className="text-sm font-semibold text-danger">
              Are you absolutely sure? This erases all your data.
            </Text>
            <Button
              label="Yes, permanently delete everything"
              variant="danger"
              onPress={handleWipe}
              loading={busy}
              fullWidth
              testID="forgot-wipe-confirm"
            />
            <Button
              label="Keep my data"
              variant="ghost"
              onPress={() => setConfirmingWipe(false)}
              disabled={busy}
              fullWidth
              testID="forgot-wipe-cancel"
            />
          </View>
        ) : (
          <Button
            label="Wipe data & start over"
            variant="secondary"
            onPress={() => setConfirmingWipe(true)}
            disabled={busy}
            fullWidth
            testID="forgot-wipe-start"
          />
        )}
      </Card>

      <Button
        label="Back to unlock"
        variant="ghost"
        onPress={onCancel}
        disabled={busy}
        fullWidth
        testID="forgot-cancel"
      />
    </Screen>
  )
}
