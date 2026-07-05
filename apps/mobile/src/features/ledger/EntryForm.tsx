import { zodResolver } from '@hookform/resolvers/zod'
import { useState } from 'react'
import { Controller, useForm, useWatch } from 'react-hook-form'
import { Pressable, Text, View } from 'react-native'

import { AmountText, Button, Input, SegmentedControl } from '@/components'
import { parseAmountInput, todayISO } from '@/domain'
import type { Category } from '@/db/schema'
import type { AppDatabase } from '@/data'

import { CategoryPicker } from './CategoryPicker'
import { TagInput } from './TagInput'
import { entryFormSchema, type EntryFormValues } from './entryForm'

export type EntryFormProps = {
  mode: 'add' | 'edit'
  /** Injected DB (tag suggestions). */
  db: AppDatabase
  /** Selectable categories (active + the entry's current one when editing). */
  categories: Category[]
  /** Initial values (new-entry defaults, or a pre-filled entry for edit). */
  initial: EntryFormValues
  onSubmit: (values: EntryFormValues) => void | Promise<void>
  onCancel: () => void
  /** Edit-mode only: soft-delete this entry (parent shows the Undo snackbar). */
  onDelete?: () => void
  busy?: boolean
  /** Repo-side error surfaced at the top of the form. */
  submitError?: string
}

/**
 * Add / edit entry form (§7.3). React Hook Form + Zod (`entryFormSchema`); inline validation
 * only after submit (RHF `onSubmit` mode), never mid-typing. Progressive disclosure (§7.7):
 * title / amount / Debit-Credit / category / date are the primary path; tags + description
 * live under a collapsed "More" section. The Debit/Credit segmented control recolors the live
 * amount preview; the sign itself is applied when the parent maps values via `formToEntryInput`.
 */
export function EntryForm({
  mode,
  db,
  categories,
  initial,
  onSubmit,
  onCancel,
  onDelete,
  busy = false,
  submitError,
}: EntryFormProps) {
  const [showMore, setShowMore] = useState(
    initial.tags.length > 0 || initial.description.trim().length > 0
  )
  const {
    control,
    handleSubmit,
    setValue,
    formState: { errors },
  } = useForm<EntryFormValues>({
    resolver: zodResolver(entryFormSchema),
    defaultValues: initial,
    mode: 'onSubmit',
  })

  // useWatch (not watch()) so the React Compiler can memoize this component safely.
  const amountText = useWatch({ control, name: 'amountText' })
  const type = useWatch({ control, name: 'type' })
  const currency = useWatch({ control, name: 'currency' })
  const previewMinor = (() => {
    const magnitude = parseAmountInput(amountText, currency)
    if (magnitude === null || magnitude === 0) return null
    return type === 'debit' ? -magnitude : magnitude
  })()

  return (
    <View className="gap-6" testID="entry-form">
      <View className="gap-1">
        <Text className="text-2xl font-semibold text-fg">
          {mode === 'add' ? 'New expense' : 'Edit expense'}
        </Text>
        <Text className="text-sm text-muted">
          Debit is money out, credit is money in. Only title, amount and category are required.
        </Text>
      </View>

      {submitError ? <Text className="text-sm text-danger">{submitError}</Text> : null}

      <Controller
        control={control}
        name="title"
        render={({ field }) => (
          <Input
            label="Title"
            value={field.value}
            onChangeText={field.onChange}
            onBlur={field.onBlur}
            placeholder="e.g. Lunch, Groceries"
            autoFocus={mode === 'add'}
            editable={!busy}
            maxLength={120}
            error={errors.title?.message}
            accessibilityLabel="Entry title"
            testID="entry-title-input"
          />
        )}
      />

      <View className="gap-2">
        <Controller
          control={control}
          name="type"
          render={({ field }) => (
            <SegmentedControl
              label="Type"
              value={field.value}
              onChange={field.onChange}
              segments={[
                {
                  value: 'debit',
                  label: 'Debit (out)',
                  tone: 'danger',
                  testID: 'entry-type-debit',
                },
                {
                  value: 'credit',
                  label: 'Credit (in)',
                  tone: 'success',
                  testID: 'entry-type-credit',
                },
              ]}
              disabled={busy}
              testID="entry-type"
            />
          )}
        />

        <Controller
          control={control}
          name="amountText"
          render={({ field }) => (
            <Input
              label="Amount"
              value={field.value}
              onChangeText={field.onChange}
              onBlur={field.onBlur}
              placeholder="0.00"
              keyboardType="decimal-pad"
              inputMode="decimal"
              editable={!busy}
              error={errors.amountText?.message}
              rightAdornment={<Text className="text-sm text-muted">{currency}</Text>}
              accessibilityLabel="Amount"
              testID="entry-amount-input"
            />
          )}
        />

        {/* Live, color-coded preview so the sign is unmistakable before saving (§7.7). */}
        {previewMinor !== null ? (
          <View className="flex-row items-center justify-between">
            <Text className="text-sm text-muted">Preview</Text>
            <AmountText
              amountMinor={previewMinor}
              currency={currency}
              testID="entry-amount-preview"
            />
          </View>
        ) : null}
      </View>

      <Controller
        control={control}
        name="categoryId"
        render={({ field }) => (
          <CategoryPicker
            categories={categories}
            value={field.value}
            onChange={field.onChange}
            error={errors.categoryId?.message}
            testID="entry-category"
          />
        )}
      />

      <Controller
        control={control}
        name="occurredOn"
        render={({ field }) => (
          <View className="gap-2">
            <Input
              label="Date"
              value={field.value}
              onChangeText={field.onChange}
              onBlur={field.onBlur}
              placeholder="YYYY-MM-DD"
              autoCapitalize="none"
              autoCorrect={false}
              editable={!busy}
              error={errors.occurredOn?.message}
              hint="Local calendar date. Defaults to today."
              accessibilityLabel="Date"
              testID="entry-date-input"
            />
            <Button
              label="Today"
              variant="ghost"
              size="sm"
              onPress={() => setValue('occurredOn', todayISO(), { shouldValidate: true })}
              disabled={busy}
              testID="entry-date-today"
            />
          </View>
        )}
      />

      {/* Progressive disclosure: tags + description tucked under "More" (§7.7). */}
      <View className="gap-3">
        <Pressable
          onPress={() => setShowMore((s) => !s)}
          accessibilityRole="button"
          accessibilityLabel={showMore ? 'Hide more options' : 'Show more options'}
          accessibilityState={{ expanded: showMore }}
          hitSlop={8}
          className="self-start"
          testID="entry-more-toggle"
        >
          <Text className="text-base font-medium text-primary">
            {showMore ? '− Less' : '+ More (tags, note)'}
          </Text>
        </Pressable>

        {showMore ? (
          <View className="gap-6">
            <Controller
              control={control}
              name="tags"
              render={({ field }) => (
                <TagInput
                  db={db}
                  value={field.value}
                  onChange={field.onChange}
                  testID="entry-tags"
                />
              )}
            />
            <Controller
              control={control}
              name="description"
              render={({ field }) => (
                <Input
                  label="Note (optional)"
                  value={field.value}
                  onChangeText={field.onChange}
                  onBlur={field.onBlur}
                  placeholder="Anything worth remembering"
                  multiline
                  numberOfLines={3}
                  editable={!busy}
                  error={errors.description?.message}
                  accessibilityLabel="Description"
                  testID="entry-description-input"
                />
              )}
            />
          </View>
        ) : null}
      </View>

      <View className="gap-3">
        <Button
          label={mode === 'add' ? 'Save expense' : 'Save changes'}
          onPress={handleSubmit((values) => void onSubmit(values))}
          loading={busy}
          disabled={busy}
          fullWidth
          testID="entry-save"
        />
        <Button
          label="Cancel"
          variant="ghost"
          onPress={onCancel}
          disabled={busy}
          fullWidth
          testID="entry-cancel"
        />
        {mode === 'edit' && onDelete ? (
          <Button
            label="Delete expense"
            variant="danger"
            onPress={onDelete}
            disabled={busy}
            fullWidth
            testID="entry-delete"
          />
        ) : null}
      </View>
    </View>
  )
}
