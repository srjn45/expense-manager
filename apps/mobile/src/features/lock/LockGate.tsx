import { type ReactNode, useEffect, useState } from 'react'
import { ActivityIndicator, AppState, type AppStateStatus, View } from 'react-native'

import { getSettings } from '@/data'
import { getDatabase } from '@/db/client'
import { hasStoredPin } from '@/lib/pinStorage'
import { useThemeColors } from '@/theme/useThemeColors'

import { CreatePinScreen } from './CreatePinScreen'
import { ForgotPinScreen } from './ForgotPinScreen'
import { resolveLockView, useLockStore } from './lockStore'
import { UnlockScreen } from './UnlockScreen'

/**
 * The locked UI: the unlock screen, with a toggle into the forgot-PIN flow. `showForgot`
 * lives here (not in LockGate) so it is scoped to a single lock: this component mounts fresh
 * each time the app re-locks, resetting back to the unlock screen — no cross-lock staleness.
 */
function LockedView() {
  const [showForgot, setShowForgot] = useState(false)
  return showForgot ? (
    <ForgotPinScreen onCancel={() => setShowForgot(false)} />
  ) : (
    <UnlockScreen onForgot={() => setShowForgot(true)} />
  )
}

/**
 * Route guard for the whole app (§8). Renders NOTHING of the app until unlocked:
 *
 *   DB ready (app/_layout gate) → THIS lock gate → the app's routes.
 *
 * LockGate mounts only inside `MigratedApp` (after warm-up + migrations + seed), so the DB
 * is guaranteed ready before any lock/unlock screen renders — the ordering the plan requires.
 *
 * It seeds the lock store from persisted state on mount, and wires React Native `AppState`
 * to the auto-lock grace window (lock on background/relaunch, with a short grace period so a
 * quick app-switch doesn't force re-entry).
 */
export function LockGate({ children }: { children: ReactNode }) {
  const colors = useThemeColors()
  const initialize = useLockStore((s) => s.initialize)
  const onBackground = useLockStore((s) => s.onBackground)
  const onForeground = useLockStore((s) => s.onForeground)
  const ready = useLockStore((s) => s.ready)
  const hasPin = useLockStore((s) => s.hasPin)
  const locked = useLockStore((s) => s.locked)

  // One-time probe: is a PIN already set? Read biometrics flag from settings. The DB is warm
  // by now (we render under MigratedApp), so getSettings() is a safe synchronous read.
  useEffect(() => {
    let active = true
    void (async () => {
      const settings = getSettings(getDatabase())
      const has = await hasStoredPin()
      if (active) {
        initialize({ hasPin: has, biometricsEnabled: !!settings?.biometricsEnabled })
      }
    })()
    return () => {
      active = false
    }
  }, [initialize])

  // Auto-lock: anchor the grace window on background/inactive; re-evaluate on foreground.
  useEffect(() => {
    const handle = (state: AppStateStatus) => {
      if (state === 'active') onForeground(Date.now())
      else if (state === 'background' || state === 'inactive') onBackground(Date.now())
    }
    const sub = AppState.addEventListener('change', handle)
    return () => sub.remove()
  }, [onBackground, onForeground])

  const view = resolveLockView(ready, hasPin, locked)

  if (view === 'loading') {
    return (
      <View className="flex-1 items-center justify-center bg-bg">
        <ActivityIndicator color={colors.primary} />
      </View>
    )
  }
  if (view === 'setup') return <CreatePinScreen />
  if (view === 'locked') return <LockedView />
  return <>{children}</>
}
