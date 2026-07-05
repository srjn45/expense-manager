import { useLiveQuery } from 'drizzle-orm/expo-sqlite'
import { router } from 'expo-router'
import { useReducer } from 'react'
import { Pressable, Text, View } from 'react-native'

import { Screen } from '@/components'
import { activeCategoriesQuery, listCategories } from '@/data'
import { getDatabase } from '@/db/client'

import { CategoriesManager } from './CategoriesManager'

/**
 * Route-level Categories screen (§7.4 / §8 Phase 3). This is the ONLY piece that touches
 * expo-sqlite; it delegates all UI + mutations to the pure, DB-injected {@link
 * CategoriesManager} (which is unit-testable).
 *
 * Reactivity: `useLiveQuery` is the reactive signal — on NATIVE its change-listener fires
 * on every DB change and re-renders us. The web (WASM) build does not emit those change
 * events, so we ALSO bump `refresh` after each in-app mutation (event-driven, not polling).
 * Either signal re-renders this component; we then read the list through the repo (the single
 * source of truth, §4) so the data is always fresh and consistently ordered on both targets.
 */
export function CategoriesScreen() {
  const db = getDatabase()
  // Subscribe for native change events; we read via the repo rather than using its `.data`
  // so web (where the listener is silent) stays correct once `refresh` fires.
  useLiveQuery(activeCategoriesQuery(db))
  const [, refresh] = useReducer((n: number) => n + 1, 0)
  const categories = listCategories(db)

  return (
    <Screen contentClassName="gap-3">
      <Pressable
        onPress={() => router.back()}
        accessibilityRole="button"
        accessibilityLabel="Go back"
        hitSlop={8}
        className="self-start"
      >
        <Text className="text-base text-primary">‹ Back</Text>
      </Pressable>

      <View className="flex-1">
        <CategoriesManager db={db} categories={categories} onChanged={refresh} />
      </View>
    </Screen>
  )
}
