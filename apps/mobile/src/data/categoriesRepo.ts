/**
 * Categories repository (§6.4).
 *
 * Framework-agnostic: every function takes an injected {@link AppDatabase} so the exact
 * same code runs against production `expo-sqlite` and in-memory `better-sqlite3` in tests.
 *
 * Rules enforced here (not in the DB schema):
 *  - Name uniqueness is CASE-INSENSITIVE (`Travel` == `travel`).
 *  - Creating a category whose name matches an INACTIVE one REACTIVATES that row (same id,
 *    preserving historical entry links) instead of inserting a duplicate.
 *  - "Delete" is a SOFT delete (`active = 0`); historical entries still resolve the name.
 */
import { and, eq, ne, sql } from 'drizzle-orm'

import { categoryInputSchema, type CategoryInput } from '@/domain'
import { now } from '@/domain/dates'
import { newId } from '@/lib/id'
import { categories, type Category } from '@/db/schema'
import type { AppDatabase } from '@/db/types'

/** Case-insensitive name match SQL fragment. */
function nameEqualsCI(name: string) {
  return sql`lower(${categories.name}) = lower(${name})`
}

export type ListCategoriesOptions = {
  /** Include soft-deleted (inactive) categories. Default false. */
  includeInactive?: boolean
}

/** List categories ordered by name. Active-only by default (what pickers show). */
export function listCategories(db: AppDatabase, options: ListCategoriesOptions = {}): Category[] {
  const query = db.select().from(categories)
  const rows = options.includeInactive ? query.all() : query.where(eq(categories.active, 1)).all()
  return rows.sort((a, b) => a.name.localeCompare(b.name))
}

/**
 * The live-query builder for the categories LIST screen: ACTIVE categories only, ordered
 * case-insensitively by name. Returned WITHOUT `.all()` so it can be handed to Drizzle's
 * `useLiveQuery` for reactive, auto-re-rendering reads (§8 Phase 3) — screens never poll.
 * Deactivated categories are excluded here (and thus from every picker); their names still
 * resolve on old entries via {@link getCategoryById}, which ignores `active`.
 */
export function activeCategoriesQuery(db: AppDatabase) {
  return db
    .select()
    .from(categories)
    .where(eq(categories.active, 1))
    .orderBy(sql`lower(${categories.name})`)
}

/** Fetch one category by id (regardless of active state), or undefined. */
export function getCategoryById(db: AppDatabase, id: string): Category | undefined {
  return db.select().from(categories).where(eq(categories.id, id)).get()
}

/** Find a category by case-insensitive name (any active state), or undefined. */
export function findCategoryByName(db: AppDatabase, name: string): Category | undefined {
  return db.select().from(categories).where(nameEqualsCI(name)).get()
}

/**
 * Create a category (§6.4). If an ACTIVE category with the same (case-insensitive) name
 * exists → throws. If an INACTIVE one exists → REACTIVATES it (same id) with the new
 * name/color/icon. Otherwise inserts a new user category (`is_preloaded = 0`).
 */
export function createCategory(db: AppDatabase, input: CategoryInput): Category {
  const data = categoryInputSchema.parse(input)
  return db.transaction((tx) => {
    const existing = tx.select().from(categories).where(nameEqualsCI(data.name)).get()
    if (existing) {
      if (existing.active === 1) {
        throw new Error(`A category named “${existing.name}” already exists.`)
      }
      // Reactivate the inactive row, preserving its id and historical links (§6.4).
      return tx
        .update(categories)
        .set({
          name: data.name,
          color: data.color ?? null,
          icon: data.icon ?? null,
          active: 1,
        })
        .where(eq(categories.id, existing.id))
        .returning()
        .get()
    }
    return tx
      .insert(categories)
      .values({
        id: newId(),
        name: data.name,
        color: data.color ?? null,
        icon: data.icon ?? null,
        isPreloaded: 0,
        active: 1,
        createdAt: now(),
      })
      .returning()
      .get()
  })
}

/**
 * Update a category's name/color/icon. Enforces case-insensitive name uniqueness against
 * OTHER categories. Returns the updated row; throws if the id does not exist.
 */
export function updateCategory(
  db: AppDatabase,
  id: string,
  patch: Partial<CategoryInput>
): Category {
  const data = categoryInputSchema.partial().parse(patch)
  return db.transaction((tx) => {
    const current = tx.select().from(categories).where(eq(categories.id, id)).get()
    if (!current) throw new Error(`Category ${id} not found.`)

    if (data.name !== undefined) {
      const clash = tx
        .select()
        .from(categories)
        .where(and(nameEqualsCI(data.name), ne(categories.id, id)))
        .get()
      if (clash) throw new Error(`A category named “${clash.name}” already exists.`)
    }

    return tx
      .update(categories)
      .set({
        ...(data.name !== undefined ? { name: data.name } : {}),
        ...(data.color !== undefined ? { color: data.color ?? null } : {}),
        ...(data.icon !== undefined ? { icon: data.icon ?? null } : {}),
      })
      .where(eq(categories.id, id))
      .returning()
      .get()
  })
}

/** Soft-delete a category (§6.4): `active = 0`. Historical entries still resolve its name. */
export function deactivateCategory(db: AppDatabase, id: string): void {
  db.update(categories).set({ active: 0 }).where(eq(categories.id, id)).run()
}

/** Reactivate a soft-deleted category by id: `active = 1`. */
export function reactivateCategory(db: AppDatabase, id: string): void {
  db.update(categories).set({ active: 1 }).where(eq(categories.id, id)).run()
}

/** Grouped export mirroring the master-plan's `categoriesRepo` name. */
export const categoriesRepo = {
  list: listCategories,
  activeQuery: activeCategoriesQuery,
  getById: getCategoryById,
  findByName: findCategoryByName,
  create: createCategory,
  update: updateCategory,
  deactivate: deactivateCategory,
  reactivate: reactivateCategory,
}
