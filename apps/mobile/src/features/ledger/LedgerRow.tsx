import { Pressable, Text, View } from 'react-native'

import { AmountText, Button, Card, Chip } from '@/components'
import { formatDayTitle } from './grouping'
import type { EntryWithTags } from '@/data'

const MAX_VISIBLE_TAGS = 4

export type LedgerRowProps = {
  entry: EntryWithTags
  /** Resolved category name (works even if the category was later deactivated). */
  categoryName: string
  categoryColor?: string | null
  /** Whether this row's action bar is currently expanded. */
  expanded: boolean
  onToggleActions: () => void
  onEdit: () => void
  onDuplicate: () => void
  onDelete: () => void
}

/**
 * One ledger row (§7.7): left = title + category chip + tags; right = signed, color-coded,
 * tabular amount + date. Tap to edit; long-press (or the "⋯" button) reveals Edit / Duplicate
 * / Delete. Swipe-to-delete was intentionally replaced by this tap/long-press action bar for
 * web parity + testability (react-native-gesture-handler's Swipeable + reanimated do not
 * render reliably under react-native-web / Jest) — same soft-delete + Undo semantics.
 */
export function LedgerRow({
  entry,
  categoryName,
  categoryColor,
  expanded,
  onToggleActions,
  onEdit,
  onDuplicate,
  onDelete,
}: LedgerRowProps) {
  const visibleTags = entry.tags.slice(0, MAX_VISIBLE_TAGS)
  const overflow = entry.tags.length - visibleTags.length

  return (
    <Card
      onPress={onEdit}
      onLongPress={onToggleActions}
      accessibilityLabel={`${entry.title}, ${categoryName}`}
      accessibilityHint="Opens the entry to edit. Long-press for more actions."
      className="gap-3"
      testID={`ledger-row-${entry.id}`}
    >
      <View className="flex-row items-start gap-3">
        <View className="flex-1 gap-1.5">
          <Text className="text-base font-semibold text-fg" numberOfLines={2}>
            {entry.title}
          </Text>
          <View className="flex-row flex-wrap items-center gap-1.5">
            <Chip label={categoryName} color={categoryColor ?? undefined} size="sm" />
            {visibleTags.map((tag) => (
              <Chip key={tag} label={`#${tag}`} size="sm" />
            ))}
            {overflow > 0 ? <Text className="text-xs text-muted">+{overflow}</Text> : null}
          </View>
        </View>

        <View className="items-end gap-1">
          <AmountText
            amountMinor={entry.amountMinor}
            currency={entry.currency}
            testID={`ledger-amount-${entry.id}`}
          />
          <Text className="text-xs text-muted">{formatDayTitle(entry.occurredOn)}</Text>
          <Pressable
            onPress={onToggleActions}
            accessibilityRole="button"
            accessibilityLabel={expanded ? 'Hide actions' : 'More actions'}
            accessibilityState={{ expanded }}
            hitSlop={8}
            testID={`ledger-actions-toggle-${entry.id}`}
          >
            <Text className="px-2 text-lg leading-none text-muted">⋯</Text>
          </Pressable>
        </View>
      </View>

      {expanded ? (
        <View className="flex-row flex-wrap gap-2 border-t border-border/60 pt-3">
          <Button
            label="Edit"
            variant="secondary"
            size="sm"
            onPress={onEdit}
            testID={`ledger-edit-${entry.id}`}
          />
          <Button
            label="Duplicate to today"
            variant="secondary"
            size="sm"
            onPress={onDuplicate}
            testID={`ledger-duplicate-${entry.id}`}
          />
          <Button
            label="Delete"
            variant="danger"
            size="sm"
            onPress={onDelete}
            testID={`ledger-delete-${entry.id}`}
          />
        </View>
      ) : null}
    </Card>
  )
}
