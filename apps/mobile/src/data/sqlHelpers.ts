/**
 * Small SQL helpers shared by the repositories.
 */

/**
 * Escape the LIKE wildcards (`%`, `_`) and the escape char itself in a user-supplied
 * search string, so a literal `%` typed by the user matches a `%` rather than "anything".
 * Pair with `ESCAPE '\'` in the query (Drizzle's `like(col, \`%${escaped}%\` , ...)`).
 */
export function escapeLike(input: string): string {
  return input.replace(/[\\%_]/g, (ch) => `\\${ch}`)
}
