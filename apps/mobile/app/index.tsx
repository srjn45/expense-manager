import { useState } from 'react'
import { Text, View } from 'react-native'

import { AmountText, Card, Chip, FAB, Screen } from '@/components'
import { listCategories } from '@/data'
import { getDatabase } from '@/db/client'

/**
 * Phase 0/1 placeholder home. Not the real ledger — it exists to satisfy the DoD:
 * a screen built ONLY from the primitives kit (§7.7), rendering in light + dark. It now
 * reads through the Phase 1 data layer (the seeded categories) as a live sanity check.
 * Phase 4 replaces this with the real ledger.
 */
export default function HomeScreen() {
  // The DB is warm + migrated + seeded by the time this screen renders (see app/_layout),
  // so the read is synchronous — done once in a lazy initializer, not an effect.
  const [categoryCount] = useState<number>(() => {
    try {
      return listCategories(getDatabase()).length
    } catch {
      return -1
    }
  })

  return (
    <Screen scroll contentClassName="gap-4">
      <View className="gap-1">
        <Text className="text-xl font-semibold text-fg">Expense Manager</Text>
        <Text className="text-sm text-muted">Phase 1 · Local-first foundation</Text>
      </View>

      {/* Data-layer readiness */}
      <Card className="gap-2">
        <Text className="text-sm font-semibold text-fg">Data layer (Drizzle + expo-sqlite)</Text>
        {categoryCount >= 0 ? (
          <Text className="text-sm text-success">
            ✓ Migrated &amp; seeded · {categoryCount} categories
          </Text>
        ) : (
          <Text className="text-sm text-danger">✗ Could not read categories</Text>
        )}
      </Card>

      {/* Primitives showcase (amount color + sign, chips) */}
      <Card className="gap-3">
        <Text className="text-sm font-semibold text-fg">Primitives</Text>
        <View className="flex-row items-center justify-between">
          <Text className="text-sm text-muted">Debit</Text>
          <AmountText amountMinor={-125000} currency="INR" />
        </View>
        <View className="flex-row items-center justify-between">
          <Text className="text-sm text-muted">Credit</Text>
          <AmountText amountMinor={90000} currency="INR" />
        </View>
        <View className="flex-row flex-wrap gap-2">
          <Chip label="groceries" selected />
          <Chip label="transport" />
          <Chip label="Food" color="#F59E0B" />
        </View>
      </Card>

      <Text className="text-center text-xs text-muted">Your data stays on your device.</Text>

      <FAB accessibilityLabel="Add expense" onPress={() => {}} />
    </Screen>
  )
}
