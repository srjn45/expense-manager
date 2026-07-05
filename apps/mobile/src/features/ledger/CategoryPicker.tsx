import { Text, View } from 'react-native'

import { Chip } from '@/components'
import type { Category } from '@/db/schema'

export type CategoryPickerProps = {
  /** Selectable categories (active-only, plus the entry's current one when editing). */
  categories: Category[]
  /** Currently selected category id, or '' for none. */
  value: string
  onChange: (categoryId: string) => void
  label?: string
  error?: string
  testID?: string
}

/**
 * Single-select category picker (§7.3) — a wrapping row of chips built from the Chip
 * primitive. Selection uses fill + weight (never color alone); the category's decorative
 * color shows as the chip dot. Active categories come from the repo; an entry whose category
 * was later deactivated still appears here (the manager appends it) so edit shows it selected.
 */
export function CategoryPicker({
  categories,
  value,
  onChange,
  label = 'Category',
  error,
  testID,
}: CategoryPickerProps) {
  return (
    <View className="gap-1" testID={testID}>
      <Text className="text-sm font-medium text-fg">{label}</Text>
      {categories.length === 0 ? (
        <Text className="text-sm text-muted">
          No categories yet — add one from the Categories screen first.
        </Text>
      ) : (
        <View className="flex-row flex-wrap gap-2">
          {categories.map((category) => (
            <Chip
              key={category.id}
              label={category.name}
              color={category.color ?? undefined}
              selected={category.id === value}
              onPress={() => onChange(category.id)}
              accessibilityLabel={`Category ${category.name}`}
              testID={`category-pick-${category.id}`}
            />
          ))}
        </View>
      )}
      {error ? <Text className="text-xs text-danger">{error}</Text> : null}
    </View>
  )
}
