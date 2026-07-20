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

/** Space or comma — either commits the token typed so far into a tag chip (§6.2). */
const DELIMITER_RE = /[\s,]/

/**
 * Tag entry (§6.2 / §7.7): chips with an inline "×", type-ahead suggestions from
 * `tag_suggestions`, and multi-tag entry — typing a space or comma converts whatever was
 * typed so far into a tag chip and starts a fresh one. Also supports submit-to-add and
 * tapping a suggestion.
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

  /** Commit each non-empty token as a tag (accumulating locally so a multi-token paste,
   * e.g. "a, b, c", doesn't drop tokens to a stale `value` closure). */
  function commitTokens(tokens: string[]) {
    let current = value
    let lastHint: string | undefined
    for (const raw of tokens) {
      const result = validateTag(raw)
      if (!result.ok) {
        lastHint = result.error.message
        continue
      }
      if (current.includes(result.tag)) continue
      if (current.length >= MAX_TAGS_PER_ENTRY) {
        lastHint = `At most ${MAX_TAGS_PER_ENTRY} tags.`
        break
      }
      current = [...current, result.tag]
    }
    if (current !== value) onChange(current)
    setHint(lastHint)
  }

  function handleChangeText(next: string) {
    const endsWithDelimiter = DELIMITER_RE.test(next.slice(-1))
    const tokens = next.split(DELIMITER_RE).filter((t) => t.length > 0)
    if (endsWithDelimiter) {
      if (tokens.length > 0) commitTokens(tokens)
      setText('')
      return
    }
    // The last token is still being typed — commit everything before it, keep it live.
    const pending = tokens.pop() ?? ''
    if (tokens.length > 0) commitTokens(tokens)
    else setHint(undefined)
    setText(pending)
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
        placeholder={atLimit ? 'Tag limit reached' : 'Type a tag, then space or comma'}
        editable={!atLimit}
        autoCapitalize="none"
        autoCorrect={false}
        returnKeyType="done"
        blurOnSubmit={false}
        error={hint}
        hint={atLimit ? undefined : 'Space or comma turns it into a tag.'}
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
