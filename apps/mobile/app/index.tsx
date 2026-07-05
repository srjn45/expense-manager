import { useCallback, useEffect, useState } from 'react'
import { Text, View } from 'react-native'

import { AmountText, Button, Card, Chip, FAB, Screen } from '@/components'
import { runSmokeTest, type SmokeResult } from '@/db/smoke'

/**
 * Phase 0 placeholder home. Not the real ledger — it exists to satisfy the DoD:
 * a screen built ONLY from the primitives kit (§7.7), rendering in light + dark, and a
 * live proof that SQLite reads/writes work on this platform. Phase 4 replaces it.
 */
export default function HomeScreen() {
  const [result, setResult] = useState<SmokeResult | null>(null)
  const [running, setRunning] = useState(false)

  const run = useCallback(async () => {
    setRunning(true)
    setResult(await runSmokeTest())
    setRunning(false)
  }, [])

  // Run once on mount. setState happens in the async callback (not synchronously in the
  // effect body), and is guarded so it can't fire after unmount.
  useEffect(() => {
    let active = true
    runSmokeTest().then((r) => {
      if (active) setResult(r)
    })
    return () => {
      active = false
    }
  }, [])

  return (
    <Screen scroll contentClassName="gap-4">
      <View className="gap-1">
        <Text className="text-xl font-semibold text-fg">Expense Manager</Text>
        <Text className="text-sm text-muted">Phase 0 · Local-first foundation</Text>
      </View>

      {/* SQLite proof */}
      <Card className="gap-2">
        <Text className="text-sm font-semibold text-fg">SQLite (Drizzle + expo-sqlite)</Text>
        {result == null ? (
          <Text className="text-sm text-muted">Running…</Text>
        ) : result.ok ? (
          <Text className="text-sm text-success">
            ✓ Read/write OK · round-tripped “{result.roundTripped}” · {result.rowCount} row(s)
          </Text>
        ) : (
          <Text className="text-sm text-danger">✗ {result.error}</Text>
        )}
        <Button label="Run again" variant="secondary" size="sm" loading={running} onPress={run} />
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
