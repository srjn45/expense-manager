/**
 * Lock state machine (§8 Phase 2). A small Zustand store holding ONLY lock state — no IO.
 * Screens do the IO (hash/verify/settings/wipe via the lib + data layers) and then drive
 * the store. This keeps the routing logic pure and unit-testable without pulling in
 * `expo-sqlite` (which cannot run under Jest, §3).
 */
import { create } from 'zustand'

/**
 * Auto-lock grace window (§8): after backgrounding, the app stays unlocked for this long so
 * a quick app-switch doesn't force PIN re-entry. Re-crossing into background within the
 * window does NOT restart the clock (we anchor to the FIRST background).
 */
export const GRACE_PERIOD_MS = 30_000

/** Which top-level view the gate should render for a given state. Pure — easy to test. */
export type LockView = 'loading' | 'setup' | 'locked' | 'unlocked'

export function resolveLockView(ready: boolean, hasPin: boolean, locked: boolean): LockView {
  if (!ready) return 'loading'
  if (!hasPin) return 'setup'
  return locked ? 'locked' : 'unlocked'
}

/**
 * Should we lock on the current foreground, given when we went to background? Pure timing
 * logic so it can be tested with explicit timestamps / fake timers (no real sleeps).
 */
export function shouldLock(
  backgroundedAt: number | null,
  now: number,
  graceMs: number = GRACE_PERIOD_MS
): boolean {
  if (backgroundedAt === null) return false
  return now - backgroundedAt >= graceMs
}

export type LockState = {
  /** True once we've checked storage for an existing PIN (initial async probe done). */
  ready: boolean
  /** Whether a PIN is set on this device. false ⇒ first-run "create PIN" flow. */
  hasPin: boolean
  /** Whether the app is currently locked (gated). */
  locked: boolean
  /** Whether biometric unlock is enabled (mirrors app_settings.biometrics_enabled). */
  biometricsEnabled: boolean
  /** Epoch ms of the FIRST background transition since last foreground, else null. */
  backgroundedAt: number | null

  /** Seed the store from persisted state (storage + settings). */
  initialize: (args: { hasPin: boolean; biometricsEnabled: boolean }) => void
  /** Unlock (correct PIN / biometric / finished setup). */
  unlock: () => void
  /** Force-lock immediately. */
  lock: () => void
  setHasPin: (hasPin: boolean) => void
  setBiometricsEnabled: (enabled: boolean) => void
  /** App went to background at `now` (anchors the grace window). */
  onBackground: (now: number) => void
  /** App came to foreground at `now`; locks if the grace window elapsed. */
  onForeground: (now: number, graceMs?: number) => void
}

export const useLockStore = create<LockState>((set, get) => ({
  ready: false,
  hasPin: false,
  locked: false,
  biometricsEnabled: false,
  backgroundedAt: null,

  initialize: ({ hasPin, biometricsEnabled }) =>
    // If a PIN exists, the app boots LOCKED (relaunch requires unlock, §8 DoD). If none,
    // we're in first-run setup (not "locked", the setup screen shows instead).
    set({ ready: true, hasPin, biometricsEnabled, locked: hasPin, backgroundedAt: null }),

  unlock: () => set({ locked: false, backgroundedAt: null }),

  lock: () => set({ locked: true }),

  setHasPin: (hasPin) =>
    // Losing the PIN (wipe & start over) drops us back to setup, which is not "locked".
    set(hasPin ? { hasPin } : { hasPin, locked: false, biometricsEnabled: false }),

  setBiometricsEnabled: (enabled) => set({ biometricsEnabled: enabled }),

  onBackground: (now) => {
    // Anchor to the first background only; ignore repeats until a foreground clears it.
    if (get().backgroundedAt === null) set({ backgroundedAt: now })
  },

  onForeground: (now, graceMs = GRACE_PERIOD_MS) => {
    const { backgroundedAt, hasPin } = get()
    const lock = hasPin && shouldLock(backgroundedAt, now, graceMs)
    set({ backgroundedAt: null, ...(lock ? { locked: true } : {}) })
  },
}))
