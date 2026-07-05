import {
  GRACE_PERIOD_MS,
  resolveLockView,
  shouldLock,
  useLockStore,
} from '@/features/lock/lockStore'

/** Reset the Zustand store to a known base before each test. */
function resetStore() {
  useLockStore.setState({
    ready: false,
    hasPin: false,
    locked: false,
    biometricsEnabled: false,
    backgroundedAt: null,
  })
}

describe('resolveLockView', () => {
  it('maps state → the correct top-level view', () => {
    expect(resolveLockView(false, false, false)).toBe('loading')
    expect(resolveLockView(false, true, true)).toBe('loading')
    expect(resolveLockView(true, false, false)).toBe('setup')
    expect(resolveLockView(true, true, true)).toBe('locked')
    expect(resolveLockView(true, true, false)).toBe('unlocked')
  })
})

describe('shouldLock (grace window, pure)', () => {
  it('never locks when we never backgrounded', () => {
    expect(shouldLock(null, 1_000_000)).toBe(false)
  })
  it('does not lock inside the grace window', () => {
    expect(shouldLock(1000, 1000 + GRACE_PERIOD_MS - 1)).toBe(false)
  })
  it('locks exactly at and beyond the grace window', () => {
    expect(shouldLock(1000, 1000 + GRACE_PERIOD_MS)).toBe(true)
    expect(shouldLock(1000, 1000 + GRACE_PERIOD_MS + 5000)).toBe(true)
  })
  it('honours a custom grace period', () => {
    expect(shouldLock(0, 4000, 5000)).toBe(false)
    expect(shouldLock(0, 5000, 5000)).toBe(true)
  })
})

describe('lockStore transitions', () => {
  beforeEach(resetStore)

  it('initialize with a PIN boots locked; without a PIN boots into setup', () => {
    useLockStore.getState().initialize({ hasPin: true, biometricsEnabled: true })
    expect(useLockStore.getState()).toMatchObject({ ready: true, hasPin: true, locked: true })

    resetStore()
    useLockStore.getState().initialize({ hasPin: false, biometricsEnabled: false })
    expect(useLockStore.getState()).toMatchObject({ ready: true, hasPin: false, locked: false })
  })

  it('unlock clears locked + the grace anchor; lock re-locks', () => {
    useLockStore.getState().initialize({ hasPin: true, biometricsEnabled: false })
    useLockStore.getState().unlock()
    expect(useLockStore.getState().locked).toBe(false)
    useLockStore.getState().lock()
    expect(useLockStore.getState().locked).toBe(true)
  })

  it('setHasPin(false) drops back to setup and disables biometrics', () => {
    useLockStore.getState().initialize({ hasPin: true, biometricsEnabled: true })
    useLockStore.getState().setHasPin(false)
    expect(useLockStore.getState()).toMatchObject({
      hasPin: false,
      locked: false,
      biometricsEnabled: false,
    })
  })
})

describe('lockStore auto-lock via AppState timing (fake timers)', () => {
  beforeEach(() => {
    jest.useFakeTimers()
    resetStore()
    useLockStore.getState().initialize({ hasPin: true, biometricsEnabled: false })
    useLockStore.getState().unlock() // start unlocked, as after a successful entry
  })
  afterEach(() => {
    jest.useRealTimers()
  })

  it('a quick app-switch within the grace window does NOT re-lock', () => {
    jest.setSystemTime(0)
    useLockStore.getState().onBackground(Date.now())
    jest.setSystemTime(GRACE_PERIOD_MS - 1000) // returned 1s early
    useLockStore.getState().onForeground(Date.now())
    expect(useLockStore.getState().locked).toBe(false)
    expect(useLockStore.getState().backgroundedAt).toBeNull()
  })

  it('backgrounding past the grace window re-locks on foreground', () => {
    jest.setSystemTime(0)
    useLockStore.getState().onBackground(Date.now())
    jest.setSystemTime(GRACE_PERIOD_MS + 1000)
    useLockStore.getState().onForeground(Date.now())
    expect(useLockStore.getState().locked).toBe(true)
  })

  it('re-backgrounding within the window keeps the ORIGINAL anchor (still locks on time)', () => {
    jest.setSystemTime(0)
    useLockStore.getState().onBackground(Date.now()) // anchor at t=0
    jest.setSystemTime(10_000)
    useLockStore.getState().onBackground(Date.now()) // ignored — anchor stays t=0
    expect(useLockStore.getState().backgroundedAt).toBe(0)
    jest.setSystemTime(GRACE_PERIOD_MS) // 30s from the ORIGINAL anchor
    useLockStore.getState().onForeground(Date.now())
    expect(useLockStore.getState().locked).toBe(true)
  })

  it('never auto-locks when no PIN is set', () => {
    resetStore()
    useLockStore.getState().initialize({ hasPin: false, biometricsEnabled: false })
    jest.setSystemTime(0)
    useLockStore.getState().onBackground(Date.now())
    jest.setSystemTime(GRACE_PERIOD_MS * 10)
    useLockStore.getState().onForeground(Date.now())
    expect(useLockStore.getState().locked).toBe(false)
  })
})
