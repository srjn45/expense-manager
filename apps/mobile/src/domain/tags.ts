/**
 * Tag rules (§6.2).
 *
 * Tags are normalised strings WITHOUT spaces, lowercased and trimmed, max length 50,
 * max ~20 tags per entry. Filtering by multiple tags is AND (an entry must have ALL of
 * them) — that logic lives in the entries repo; here we only own normalisation/validation.
 *
 * DESIGN DECISION (§6.2 / open question §12): a space inside a tag is BLOCKED with a
 * clear error rather than silently converted to `-`. This is the explicit "pick block for
 * MVP clarity" choice. Leading/trailing whitespace is still trimmed (that is not an
 * embedded space and is always safe to strip).
 *
 * Pure TypeScript, no React/RN imports.
 */

export const MAX_TAG_LENGTH = 50
export const MAX_TAGS_PER_ENTRY = 20

export type TagValidationError =
  | { code: 'empty'; message: string }
  | { code: 'has-space'; message: string }
  | { code: 'too-long'; message: string }

export type TagValidationResult =
  { ok: true; tag: string } | { ok: false; error: TagValidationError }

/**
 * Normalise a single tag: trim surrounding whitespace and lowercase. Does NOT remove
 * interior spaces — those are a validation failure, not something to silently rewrite.
 */
export function normalizeTag(raw: string): string {
  return raw.trim().toLowerCase()
}

/**
 * Validate + normalise a single tag. Returns the normalised tag on success, or a typed
 * error the UI can turn into an inline hint (§7.7). Interior spaces are BLOCKED.
 */
export function validateTag(raw: string): TagValidationResult {
  const tag = normalizeTag(raw)
  if (tag.length === 0) {
    return { ok: false, error: { code: 'empty', message: 'Tag cannot be empty.' } }
  }
  if (/\s/.test(tag)) {
    return {
      ok: false,
      error: { code: 'has-space', message: 'Tags cannot contain spaces — use a dash instead.' },
    }
  }
  if (tag.length > MAX_TAG_LENGTH) {
    return {
      ok: false,
      error: { code: 'too-long', message: `Tags must be ${MAX_TAG_LENGTH} characters or fewer.` },
    }
  }
  return { ok: true, tag }
}

/**
 * Normalise + validate + de-duplicate a list of tags for an entry. Throws on the first
 * invalid tag (with the typed message) or when the count exceeds {@link MAX_TAGS_PER_ENTRY}.
 * Order is preserved; duplicates (after normalisation) are collapsed to one.
 */
export function normalizeTagList(rawTags: readonly string[]): string[] {
  const seen = new Set<string>()
  const result: string[] = []
  for (const raw of rawTags) {
    // Skip fully-empty entries silently (e.g. a trailing empty chip); only non-empty
    // strings are validated so an accidental blank does not block a save.
    if (normalizeTag(raw).length === 0) continue
    const res = validateTag(raw)
    if (!res.ok) throw new Error(res.error.message)
    if (seen.has(res.tag)) continue
    seen.add(res.tag)
    result.push(res.tag)
  }
  if (result.length > MAX_TAGS_PER_ENTRY) {
    throw new Error(`An entry can have at most ${MAX_TAGS_PER_ENTRY} tags.`)
  }
  return result
}
