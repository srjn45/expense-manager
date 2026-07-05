/**
 * Zod validation schemas for the domain inputs (categories, entries, tags).
 *
 * These validate the CANONICAL shapes the repositories accept. Notably `amountMinor` is
 * the SIGNED integer that gets stored (§6.1) — the UI's positive-amount + Debit/Credit
 * toggle is converted to this via `applySign` before it reaches the repo. Tag list rules
 * (§6.2) are owned by `tags.ts` / `normalizeTagList`; the schema keeps a light array shape
 * and the repo applies the full normalisation so there is a single source of truth.
 *
 * Pure TypeScript, no React/RN imports.
 */
import { z } from 'zod'

import { normalizeCurrency } from './money'
import { isValidISODate } from './dates'
import { MAX_TAGS_PER_ENTRY, MAX_TAG_LENGTH, normalizeTag } from './tags'

/** ISO 4217 alphabetic code — three letters, normalised to uppercase. */
export const currencySchema = z
  .string()
  .transform(normalizeCurrency)
  .refine((c) => /^[A-Z]{3}$/.test(c), { message: 'Currency must be a 3-letter ISO 4217 code.' })

/** 3- or 6-digit hex color (with leading #). */
export const hexColorSchema = z
  .string()
  .regex(/^#([0-9a-fA-F]{3}|[0-9a-fA-F]{6})$/, 'Color must be a hex value like #4F46E5.')

/** A single normalised tag (§6.2): trimmed, lowercased, no spaces, max length 50. */
export const tagSchema = z
  .string()
  .transform(normalizeTag)
  .refine((t) => t.length > 0, { message: 'Tag cannot be empty.' })
  .refine((t) => !/\s/.test(t), { message: 'Tags cannot contain spaces — use a dash instead.' })
  .refine((t) => t.length <= MAX_TAG_LENGTH, {
    message: `Tags must be ${MAX_TAG_LENGTH} characters or fewer.`,
  })

/** Input for creating/updating a category. Name uniqueness is enforced in the repo (§6.4). */
export const categoryInputSchema = z.object({
  name: z.string().trim().min(1, 'Name is required.').max(60, 'Name is too long.'),
  color: hexColorSchema.nullish(),
  icon: z.string().trim().max(50).nullish(),
})
export type CategoryInput = z.infer<typeof categoryInputSchema>

/**
 * Canonical input for creating an entry (§5.1 / §6.1). `amountMinor` is signed and must be
 * non-zero (zero amount is invalid, §6.1). `tags` are further normalised/deduped/limited by
 * the repo via `normalizeTagList`.
 */
const tagsArraySchema = z
  .array(z.string())
  .max(MAX_TAGS_PER_ENTRY, `At most ${MAX_TAGS_PER_ENTRY} tags.`)

export const entryInputSchema = z.object({
  title: z.string().trim().min(1, 'Title is required.').max(120, 'Title is too long.'),
  description: z.string().trim().max(2000).nullish(),
  categoryId: z.string().min(1, 'Category is required.'),
  amountMinor: z
    .number()
    .int('Amount must be a whole number of minor units.')
    .refine((n) => n !== 0, { message: 'Amount cannot be zero.' }),
  currency: currencySchema,
  occurredOn: z.string().refine(isValidISODate, { message: 'Date must be a valid YYYY-MM-DD.' }),
  tags: tagsArraySchema.default([]),
})
export type EntryInput = z.infer<typeof entryInputSchema>

/**
 * Partial input for editing an entry — every field optional; same rules where present.
 * NOTE: `tags` deliberately has NO `.default([])` here (unlike create). Under `.partial()` a
 * default would fire on an omitted key and silently wipe an entry's tags; leaving it plain-
 * optional means "omitted → leave tags untouched" in `updateEntry`.
 */
export const entryPatchSchema = entryInputSchema.partial().extend({
  tags: tagsArraySchema.optional(),
})
export type EntryPatch = z.infer<typeof entryPatchSchema>
