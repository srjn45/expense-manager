/**
 * App-lock feature barrel (§8 Phase 2). The route guard {@link LockGate} is the only piece
 * app/_layout needs; the rest are exported for tests and future Settings screens.
 */
export { LockGate } from './LockGate'
export { CreatePinScreen } from './CreatePinScreen'
export { UnlockScreen } from './UnlockScreen'
export { ForgotPinScreen } from './ForgotPinScreen'
export { PinCreateForm } from './PinCreateForm'
export {
  useLockStore,
  resolveLockView,
  shouldLock,
  GRACE_PERIOD_MS,
  type LockView,
  type LockState,
} from './lockStore'
export { completePinSetup, setNewPin, setBiometricsEnabled, wipeAndStartOver } from './lockActions'
