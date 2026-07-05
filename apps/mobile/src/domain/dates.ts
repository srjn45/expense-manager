/**
 * Date helpers for the `occurred_on` convention (§6.6).
 *
 * `occurred_on` is a LOCAL CALENDAR DATE stored as `YYYY-MM-DD` TEXT — never epoch ms.
 * This deliberately avoids all timezone math: an expense entered on July 4 stays July 4
 * regardless of device timezone. Because the format is zero-padded and fixed-width, it
 * sorts lexicographically == chronologically.
 *
 * `created_at` / `updated_at` / `deleted_at` are separate — those are real instants stored
 * as epoch ms (see `now()`), not calendar dates.
 *
 * Pure TypeScript, no React/RN imports.
 */

/** Matches a syntactically well-formed `YYYY-MM-DD` string. */
const ISO_DATE_RE = /^\d{4}-\d{2}-\d{2}$/

/** Zero-pad a number to a fixed width. */
function pad(n: number, width = 2): string {
  return String(n).padStart(width, '0')
}

/** Format a JS `Date` as a `YYYY-MM-DD` string using its LOCAL calendar fields. */
export function toISODate(date: Date): string {
  return `${pad(date.getFullYear(), 4)}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}`
}

/** Today's local calendar date as `YYYY-MM-DD`. The default for a new entry. */
export function todayISO(now: Date = new Date()): string {
  return toISODate(now)
}

/**
 * True if `value` is a real `YYYY-MM-DD` calendar date (correct shape AND a date that
 * actually exists — rejects `2026-02-30`, `2026-13-01`, etc.).
 */
export function isValidISODate(value: string): boolean {
  if (!ISO_DATE_RE.test(value)) return false
  const [y, m, d] = value.split('-').map(Number)
  if (m < 1 || m > 12 || d < 1 || d > 31) return false
  // Round-trip through a UTC Date to reject impossible day-of-month values.
  const dt = new Date(Date.UTC(y, m - 1, d))
  return dt.getUTCFullYear() === y && dt.getUTCMonth() === m - 1 && dt.getUTCDate() === d
}

/** The `YYYY-MM` month bucket of an ISO date, for stats grouping (§6.6). */
export function monthOf(isoDate: string): string {
  return isoDate.slice(0, 7)
}

/** Current instant as epoch ms — for `created_at`/`updated_at`/`deleted_at`. */
export function now(): number {
  return Date.now()
}
