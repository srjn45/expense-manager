import { useState } from 'react'
import { Text, View } from 'react-native'

import { Button, ColorSwatchPicker, Input } from '@/components'
import { categoryInputSchema, type CategoryInput } from '@/domain'

export type CategoryEditorProps = {
  /** Pre-fill for edit mode; omit for add mode. */
  initial?: { name: string; color: string | null }
  /** Called with validated input when the user saves. May throw (e.g. duplicate name). */
  onSubmit: (input: CategoryInput) => void | Promise<void>
  onCancel: () => void
  busy?: boolean
  /** Server/repo-side error (e.g. "already exists") surfaced under the name field. */
  submitError?: string
  /** Distinguishes the heading/CTA. */
  mode: 'add' | 'edit'
}

/**
 * Add / edit a category (§7.4). Built only from the primitives kit (§7.7): a name field
 * (required) and an optional preset color swatch. Validation via the shared Zod schema
 * (`categoryInputSchema`, §6.4) — no duplicated rules; shown after submit, never mid-typing.
 */
export function CategoryEditor({
  initial,
  onSubmit,
  onCancel,
  busy = false,
  submitError,
  mode,
}: CategoryEditorProps) {
  const [name, setName] = useState(initial?.name ?? '')
  const [color, setColor] = useState<string | null>(initial?.color ?? null)
  const [error, setError] = useState<string | undefined>()

  function handleSave() {
    const parsed = categoryInputSchema.safeParse({ name, color })
    if (!parsed.success) {
      setError(parsed.error.issues[0]?.message ?? 'Please check the form.')
      return
    }
    setError(undefined)
    void onSubmit(parsed.data)
  }

  return (
    <View className="gap-6" testID="category-editor">
      <View className="gap-1">
        <Text className="text-2xl font-semibold text-fg">
          {mode === 'add' ? 'New category' : 'Edit category'}
        </Text>
        <Text className="text-sm text-muted">
          Categories organise your expenses. Color is optional.
        </Text>
      </View>

      <Input
        label="Name"
        value={name}
        onChangeText={(t) => {
          setName(t)
          if (error) setError(undefined)
        }}
        placeholder="e.g. Coffee"
        autoFocus
        editable={!busy}
        maxLength={60}
        error={error ?? submitError}
        accessibilityLabel="Category name"
        testID="category-name-input"
      />

      <ColorSwatchPicker
        label="Color (optional)"
        value={color}
        onChange={setColor}
        testID="category-color"
      />

      <View className="gap-3">
        <Button
          label={mode === 'add' ? 'Add category' : 'Save changes'}
          onPress={handleSave}
          loading={busy}
          disabled={busy || name.trim().length === 0}
          fullWidth
          testID="category-save"
        />
        <Button
          label="Cancel"
          variant="ghost"
          onPress={onCancel}
          disabled={busy}
          fullWidth
          testID="category-cancel"
        />
      </View>
    </View>
  )
}
