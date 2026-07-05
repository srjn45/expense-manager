import { useState } from 'react'
import { ScrollView, Text, View } from 'react-native'

import { Button, Card, EmptyState, FAB } from '@/components'
import { createCategory, deactivateCategory, updateCategory, type AppDatabase } from '@/data'
import type { CategoryInput } from '@/domain'
import type { Category } from '@/db/schema'

import { CategoryEditor } from './CategoryEditor'

export type CategoriesManagerProps = {
  /** Injected DB (production `getDatabase()`, tests inject in-memory better-sqlite3). */
  db: AppDatabase
  /** Live list of ACTIVE categories (from `useLiveQuery(activeCategoriesQuery)`). */
  categories: Category[]
  /**
   * Called after any successful mutation. The real screen relies on `useLiveQuery` to
   * refresh and can ignore this; tests use it to re-read the DB (mimicking live reactivity).
   */
  onChanged?: () => void
}

type EditorView = { mode: 'list' } | { mode: 'add' } | { mode: 'edit'; category: Category }

/**
 * Categories management (§7.4 / §8 Phase 3): a live list of ACTIVE categories with add,
 * edit, and deactivate (soft delete). Pure and DB-injected — it imports NO expo-sqlite (the
 * route wrapper owns `getDatabase` + `useLiveQuery`), so it runs under Jest against an
 * in-memory database.
 *
 * Deactivate uses an inline two-tap confirm (§7.7: a simple confirm, not a heavy modal) —
 * deliberately NOT `Alert.alert`, which react-native-web does not render.
 */
export function CategoriesManager({ db, categories, onChanged }: CategoriesManagerProps) {
  const [view, setView] = useState<EditorView>({ mode: 'list' })
  const [busy, setBusy] = useState(false)
  const [submitError, setSubmitError] = useState<string | undefined>()
  /** id of the category currently showing its "confirm deactivate" prompt inline. */
  const [confirmingId, setConfirmingId] = useState<string | null>(null)

  function backToList() {
    setView({ mode: 'list' })
    setSubmitError(undefined)
  }

  async function handleSubmit(input: CategoryInput) {
    setBusy(true)
    setSubmitError(undefined)
    try {
      if (view.mode === 'add') {
        createCategory(db, input)
      } else if (view.mode === 'edit') {
        updateCategory(db, view.category.id, input)
      }
      onChanged?.()
      backToList()
    } catch (e) {
      // e.g. case-insensitive duplicate name (§6.4). Surface it under the field.
      setSubmitError(e instanceof Error ? e.message : 'Could not save the category.')
    } finally {
      setBusy(false)
    }
  }

  function handleDeactivate(id: string) {
    deactivateCategory(db, id)
    setConfirmingId(null)
    onChanged?.()
  }

  if (view.mode !== 'list') {
    return (
      <ScrollView className="flex-1" keyboardShouldPersistTaps="handled">
        <CategoryEditor
          mode={view.mode}
          initial={
            view.mode === 'edit'
              ? { name: view.category.name, color: view.category.color }
              : undefined
          }
          onSubmit={handleSubmit}
          onCancel={backToList}
          busy={busy}
          submitError={submitError}
        />
      </ScrollView>
    )
  }

  return (
    <View className="flex-1">
      <ScrollView className="flex-1" contentContainerClassName="gap-4 pb-24">
        <View className="gap-1">
          <Text className="text-2xl font-semibold text-fg">Categories</Text>
          <Text className="text-sm text-muted">
            {categories.length} active · organise your expenses
          </Text>
        </View>

        {categories.length === 0 ? (
          <EmptyState
            title="No active categories"
            description="Every expense needs a category. Add one to get started — your data stays on your device."
            actionLabel="Add a category"
            onAction={() => setView({ mode: 'add' })}
            testID="categories-empty"
          />
        ) : (
          <View className="gap-2">
            {categories.map((category) => (
              <CategoryRow
                key={category.id}
                category={category}
                confirming={confirmingId === category.id}
                onEdit={() => setView({ mode: 'edit', category })}
                onAskDeactivate={() => setConfirmingId(category.id)}
                onCancelDeactivate={() => setConfirmingId(null)}
                onConfirmDeactivate={() => handleDeactivate(category.id)}
              />
            ))}
          </View>
        )}
      </ScrollView>

      <FAB
        accessibilityLabel="Add category"
        onPress={() => setView({ mode: 'add' })}
        testID="categories-add-fab"
      />
    </View>
  )
}

type CategoryRowProps = {
  category: Category
  confirming: boolean
  onEdit: () => void
  onAskDeactivate: () => void
  onCancelDeactivate: () => void
  onConfirmDeactivate: () => void
}

/** One category row: color dot + name, with Edit / Deactivate actions and inline confirm. */
function CategoryRow({
  category,
  confirming,
  onEdit,
  onAskDeactivate,
  onCancelDeactivate,
  onConfirmDeactivate,
}: CategoryRowProps) {
  return (
    <Card className="gap-3" testID={`category-row-${category.id}`}>
      <View className="flex-row items-center gap-3">
        <View
          style={{ backgroundColor: category.color ?? 'transparent' }}
          className={`h-4 w-4 rounded-full ${category.color ? '' : 'border border-border'}`}
        />
        <Text className="flex-1 text-base font-medium text-fg" numberOfLines={1}>
          {category.name}
        </Text>
      </View>

      {confirming ? (
        <View className="gap-2">
          <Text className="text-sm text-muted">
            Deactivate “{category.name}”? It disappears from pickers; past entries keep it.
          </Text>
          <View className="flex-row gap-2">
            <Button
              label="Deactivate"
              variant="danger"
              size="sm"
              onPress={onConfirmDeactivate}
              testID={`category-confirm-deactivate-${category.id}`}
            />
            <Button label="Cancel" variant="ghost" size="sm" onPress={onCancelDeactivate} />
          </View>
        </View>
      ) : (
        <View className="flex-row gap-2">
          <Button
            label="Edit"
            variant="secondary"
            size="sm"
            onPress={onEdit}
            testID={`category-edit-${category.id}`}
          />
          <Button
            label="Deactivate"
            variant="ghost"
            size="sm"
            onPress={onAskDeactivate}
            testID={`category-deactivate-${category.id}`}
          />
        </View>
      )}
    </Card>
  )
}
