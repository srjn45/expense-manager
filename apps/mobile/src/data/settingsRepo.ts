/**
 * App-settings repository (§5.1). The single row (id = 1) holds the default currency and
 * the lock flags. The PIN *hash* lives in `expo-secure-store`, never here — only `pin_set`.
 * Framework-agnostic (injected {@link AppDatabase}).
 */
import { eq } from 'drizzle-orm'

import { currencySchema } from '@/domain'
import { APP_SETTINGS_ID, appSettings, type AppSettings } from '@/db/schema'
import type { AppDatabase } from '@/db/types'

/** Read the settings row. Returns undefined if the seed has not run yet. */
export function getSettings(db: AppDatabase): AppSettings | undefined {
  return db.select().from(appSettings).where(eq(appSettings.id, APP_SETTINGS_ID)).get()
}

export type SettingsPatch = {
  defaultCurrency?: string
  pinSet?: boolean
  biometricsEnabled?: boolean
}

/** Update the settings row. Returns the updated row; throws if the seed has not run. */
export function updateSettings(db: AppDatabase, patch: SettingsPatch): AppSettings {
  const set: Partial<AppSettings> = {}
  if (patch.defaultCurrency !== undefined) {
    set.defaultCurrency = currencySchema.parse(patch.defaultCurrency)
  }
  if (patch.pinSet !== undefined) set.pinSet = patch.pinSet ? 1 : 0
  if (patch.biometricsEnabled !== undefined) set.biometricsEnabled = patch.biometricsEnabled ? 1 : 0

  const updated = db
    .update(appSettings)
    .set(set)
    .where(eq(appSettings.id, APP_SETTINGS_ID))
    .returning()
    .get()
  if (!updated) throw new Error('app_settings row is missing — run seedDatabase first.')
  return updated
}

/** Grouped export mirroring the repo naming used across the data layer. */
export const settingsRepo = {
  get: getSettings,
  update: updateSettings,
}
