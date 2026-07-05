import { act, render } from '@testing-library/react-native'
import { Text } from 'react-native'

import { resolveLockView, useLockStore } from '@/features/lock/lockStore'

/**
 * A stand-in for LockGate's routing decision: it subscribes to the store and renders which
 * view LockGate would show. This verifies locked→unlocked (and setup) routing is driven
 * reactively by the Zustand store — without importing LockGate itself (which pulls in
 * expo-sqlite, unavailable under Jest, §3).
 */
function LockRouter() {
  const ready = useLockStore((s) => s.ready)
  const hasPin = useLockStore((s) => s.hasPin)
  const locked = useLockStore((s) => s.locked)
  return <Text testID="view">{resolveLockView(ready, hasPin, locked)}</Text>
}

describe('lock routing via the store', () => {
  beforeEach(() => {
    useLockStore.setState({
      ready: false,
      hasPin: false,
      locked: false,
      biometricsEnabled: false,
      backgroundedAt: null,
    })
  })

  it('renders loading → setup → unlocked as the store advances (fresh install)', () => {
    const { getByTestId } = render(<LockRouter />)
    expect(getByTestId('view')).toHaveTextContent('loading')

    act(() => useLockStore.getState().initialize({ hasPin: false, biometricsEnabled: false }))
    expect(getByTestId('view')).toHaveTextContent('setup')

    // Finishing PIN creation sets hasPin and unlocks.
    act(() => {
      useLockStore.getState().setHasPin(true)
      useLockStore.getState().unlock()
    })
    expect(getByTestId('view')).toHaveTextContent('unlocked')
  })

  it('a returning user boots locked, then unlocks on correct PIN', () => {
    const { getByTestId } = render(<LockRouter />)

    act(() => useLockStore.getState().initialize({ hasPin: true, biometricsEnabled: false }))
    expect(getByTestId('view')).toHaveTextContent('locked')

    act(() => useLockStore.getState().unlock())
    expect(getByTestId('view')).toHaveTextContent('unlocked')

    // Auto-lock returns it to locked.
    act(() => useLockStore.getState().lock())
    expect(getByTestId('view')).toHaveTextContent('locked')
  })
})
