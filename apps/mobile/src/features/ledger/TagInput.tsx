import { useMemo, useState } from 'react'
import { Pressable, View } from 'react-native'

import { Chip, Input } from '@/components'
import { searchTagSuggestions, type AppDatabase } from '@/data'
import { MAX_TAGS_PER_ENTRY, validateTag } from '@/domain'

export type TagInputProps = {
  /** Injected DB for type-ahead suggestions (`tag_suggestions`, §6.2). */
  db: AppDatabase
  /** Current tags on the entry (normalised). */
  value: string[]
  onChange: (tags: string[]) => void
  label?: string
  testID?: string
}

/**
 * Tag entry (§6.2 / §7.7): chips with an inline "×", type-ahead suggestions from
 * `tag_suggestions`, and a gentle inline hint when a space is typed (spaces are BLOCKED for
 * MVP clarity, not silently converted). Adding a tag on submit or by tapping a suggestion.
 */
export function TagInput({ db, value, onChange, label = 'Tags', testID }: TagInputProps) {
  const [text, setText] = useState('')
  const [hint, setHint] = useState<string | undefined>()

  const atLimit = value.length >= MAX_TAGS_PER_ENTRY

  // Suggestions matching the current text, excluding already-selected tags.
  const suggestions = useMemo(() => {
    if (atLimit) return []
    const selected = new Set(value)
    return searchTagSuggestions(db, text, { mode: 'prefix', limit: 8 }).filter(
      (t) => !selected.has(t)
    )
  }, [db, text, value, atLimit])

  function addTag(raw: string) {
    const result = validateTag(raw)
    if (!result.ok) {
      setHint(result.error.message)
      return
    }
    if (value.includes(result.tag)) {
      setText('')
      setHint(undefined)
      return
    }
    if (value.length >= MAX_TAGS_PER_ENTRY) {
      setHint(`At most ${MAX_TAGS_PER_ENTRY} tags.`)
      return
    }
    onChange([...value, result.tag])
    setText('')
    setHint(undefined)
  }

  function handleChangeText(next: string) {
    // Block spaces inline with a gentle hint rather than silently rewriting them (§6.2).
    if (/\s/.test(next)) {
      setHint('Tags cannot contain spaces — use a dash instead.')
      setText(next.replace(/\s/g, ''))
      return
    }
    setHint(undefined)
    setText(next)
  }

  function removeTag(tag: string) {
    onChange(value.filter((t) => t !== tag))
  }

  return (
    <View className="gap-2" testID={testID}>
      {value.length > 0 ? (
        <View className="flex-row flex-wrap gap-2">
          {value.map((tag) => (
            <Chip
              key={tag}
              label={tag}
              onRemove={() => removeTag(tag)}
              testID={`tag-chip-${tag}`}
            />
          ))}
        </View>
      ) : null}

      <Input
        label={label}
        value={text}
        onChangeText={handleChangeText}
        onSubmitEditing={() => addTag(text)}
        placeholder={atLimit ? 'Tag limit reached' : 'Add a tag and press enter'}
        editable={!atLimit}
        autoCapitalize="none"
        autoCorrect={false}
        returnKeyType="done"
        blurOnSubmit={false}
        error={hint}
        hint={atLimit ? undefined : 'No spaces. Tags help you filter later.'}
        accessibilityLabel="Add tag"
        testID="tag-text-input"
      />

      {suggestions.length > 0 ? (
        <View className="flex-row flex-wrap gap-2" testID="tag-suggestions">
          {suggestions.map((tag) => (
            <Pressable
              key={tag}
              onPress={() => addTag(tag)}
              accessibilityRole="button"
              accessibilityLabel={`Add tag ${tag}`}
              testID={`tag-suggestion-${tag}`}
            >
              <Chip label={`+ ${tag}`} size="sm" />
            </Pressable>
          ))}
        </View>
      ) : null}
    </View>
  )
}
