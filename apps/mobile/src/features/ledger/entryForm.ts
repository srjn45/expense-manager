/**
 * Entry-form value shape + the mapping to the canonical repo input (§6.1, §7.3).
 *
 * The FORM collects a POSITIVE amount string plus a Debit/Credit toggle; the signed
 * `amount_minor` the repo stores is derived here via the domain money helpers
 * (`parseAmountInput` + `applySign`). Keeping this in one pure, tested function is what
 * guarantees a UI bug can never store the wrong sign. No RN imports.
 */
import { z } from 'zod'

import {
  applySign,
  currencySchema,
  isValidISODate,
  MAX_TAGS_PER_ENTRY,
  parseAmountInput,
  todayISO,
  toMajorUnits,
  type EntryInput,
  type EntryType,
} from '@/domain'
import type { EntryWithTags } from '@/data'

/** The raw values the entry form binds to (amount is a string; sign is a separate toggle). */
export type EntryFormValues = {
  title: string
  /** Positive major-unit amount as typed, e.g. "12.50". Sign comes from `type`. */
  amountText: string
  type: EntryType
  currency: string
  categoryId: string
  /** `YYYY-MM-DD` local calendar date (§6.6). */
  occurredOn: string
  tags: string[]
  description: string
}

/**
 * Zod schema for the form fields. Amount is validated in a superRefine because its validity
 * is currency-aware (parse to minor units, reject zero/blank). The repo re-validates the
 * canonical `entryInputSchema` on write, so this is the friendly first line, not the only one.
 */
export const entryFormSchema = z
  .object({
    title: z.string().trim().min(1, 'Title is required.').max(120, 'Title is too long.'),
    amountText: z.string(),
    type: z.enum(['debit', 'credit']),
    currency: currencySchema,
    categoryId: z.string().min(1, 'Pick a category.'),
    occurredOn: z.string().refine(isValidISODate, { message: 'Enter a valid date (YYYY-MM-DD).' }),
    tags: z.array(z.string()).max(MAX_TAGS_PER_ENTRY, `At most ${MAX_TAGS_PER_ENTRY} tags.`),
    description: z.string().max(2000, 'Description is too long.'),
  })
  .superRefine((values, ctx) => {
    const minor = parseAmountInput(values.amountText, values.currency)
    if (minor === null || minor === 0) {
      ctx.addIssue({
        path: ['amountText'],
        code: z.ZodIssueCode.custom,
        message: 'Enter an amount greater than zero.',
      })
    }
  })

/** Fresh form values for a new entry: today's date, debit, the default currency. */
export function emptyFormValues(defaultCurrency: string): EntryFormValues {
  return {
    title: '',
    amountText: '',
    type: 'debit',
    currency: defaultCurrency,
    categoryId: '',
    occurredOn: todayISO(),
    tags: [],
    description: '',
  }
}

/** Pre-fill the form from an existing entry (edit mode) — the amount is shown UNSIGNED. */
export function entryToFormValues(entry: EntryWithTags): EntryFormValues {
  const magnitudeMajor = Math.abs(toMajorUnits(entry.amountMinor, entry.currency))
  return {
    title: entry.title,
    amountText: String(magnitudeMajor),
    type: entry.amountMinor < 0 ? 'debit' : 'credit',
    currency: entry.currency,
    categoryId: entry.categoryId,
    occurredOn: entry.occurredOn,
    tags: [...entry.tags],
    description: entry.description ?? '',
  }
}

/**
 * Map validated form values to the canonical {@link EntryInput} the repo stores. This is
 * where the Debit/Credit toggle becomes the SIGN of `amount_minor` (§6.1) — the single place
 * sign derivation happens. Throws if the amount does not parse (callers validate first).
 */
export function formToEntryInput(values: EntryFormValues): EntryInput {
  const magnitude = parseAmountInput(values.amountText, values.currency)
  if (magnitude === null || magnitude === 0) {
    throw new Error('Enter an amount greater than zero.')
  }
  const description = values.description.trim()
  return {
    title: values.title.trim(),
    description: description.length > 0 ? description : null,
    categoryId: values.categoryId,
    amountMinor: applySign(magnitude, values.type),
    currency: values.currency,
    occurredOn: values.occurredOn,
    tags: values.tags,
  }
}

/**
 * Build the input for DUPLICATING an entry (§8 Phase 4): the same fields with TODAY's date.
 * Implemented as create-a-new-entry-from-existing-fields (not a DB clone of soft-delete
 * state) so a recurring daily expense is a 2-tap record.
 */
export function duplicateEntryInput(entry: EntryWithTags, today: string = todayISO()): EntryInput {
  return {
    title: entry.title,
    description: entry.description ?? null,
    categoryId: entry.categoryId,
    amountMinor: entry.amountMinor,
    currency: entry.currency,
    occurredOn: today,
    tags: [...entry.tags],
  }
}
