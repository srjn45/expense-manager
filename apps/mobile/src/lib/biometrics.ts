/**
 * Biometric authentication wrapper (§8 Phase 2) over `expo-local-authentication`.
 *
 * Biometrics are always OPTIONAL and there is always a PIN fallback. On web (no secure
 * enclave, no local-auth) these resolve to "unavailable" / "failed" so callers degrade to
 * PIN. All calls are defensive — a thrown native error becomes a boolean, never a crash.
 */
import * as LocalAuthentication from 'expo-local-authentication'
import { Platform } from 'react-native'

/**
 * Whether biometrics can be offered: hardware present AND the user has enrolled a
 * face/fingerprint. Check this BEFORE offering to enable biometrics (§8 requirement).
 */
export async function isBiometricAvailable(): Promise<boolean> {
  if (Platform.OS === 'web') return false
  try {
    const [hasHardware, isEnrolled] = await Promise.all([
      LocalAuthentication.hasHardwareAsync(),
      LocalAuthentication.isEnrolledAsync(),
    ])
    return hasHardware && isEnrolled
  } catch {
    return false
  }
}

/**
 * Prompt for a biometric check. Returns true only on a successful match. Any failure,
 * cancellation, or missing hardware returns false so the caller falls back to the PIN.
 */
export async function authenticateWithBiometrics(promptMessage: string): Promise<boolean> {
  if (Platform.OS === 'web') return false
  try {
    const result = await LocalAuthentication.authenticateAsync({
      promptMessage,
      // Keep the PIN fallback ours (this screen), not the OS device-passcode sheet.
      disableDeviceFallback: true,
    })
    return result.success
  } catch {
    return false
  }
}
