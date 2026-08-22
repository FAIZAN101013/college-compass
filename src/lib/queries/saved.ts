import "server-only";

import { prisma } from "@/lib/prisma";

/**
 * Saved colleges and saved comparisons.
 *
 * Every function here takes a userId as its FIRST argument and scopes its
 * query by it. That is the ownership rule of this module: there is no function
 * that can read or modify a row without naming whose row it is. The alternative
 * — fetching by id and checking ownership afterwards in the route — works right
 * up until someone forgets the check on one endpoint.
 */

// ---------------------------------------------------------------------------
// Saved colleges
// ---------------------------------------------------------------------------

/**
 * Save a college. Safe to call repeatedly.
 *
 * This is the payoff of `@@unique([userId, collegeId])` in the schema. The
 * obvious implementation is "look for an existing row, insert if absent", but
 * that has a race: two rapid clicks can both read "absent" before either
 * writes, and you end up with duplicates.
 *
 *   Request A: exists? no
 *   Request B: exists? no      <- both checked before either wrote
 *   Request A: INSERT          -> row
 *   Request B: INSERT          -> duplicate
 *
 * upsert is a single atomic statement against the unique constraint, so there
 * is no window between the check and the write. The `update: {}` is
 * deliberate — there is nothing to change on a repeat save, we simply want the
 * insert not to fail.
 */
export async function saveCollege(userId: string, collegeId: string) {
  return prisma.savedCollege.upsert({
    where: { userId_collegeId: { userId, collegeId } },
    create: { userId, collegeId },
    update: {},
    select: { id: true, collegeId: true, createdAt: true },
  });
}

/**
 * Remove a saved college.
 *
 * deleteMany rather than delete, for two reasons. It is scoped by userId, so
 * one user cannot delete another user's saved row even by guessing an id. And
 * it does not throw when the row is absent — unsaving something already
 * unsaved has achieved the intended state, so treating it as an error would
 * force the UI to handle a failure that is not one.
 */
export async function unsaveCollege(userId: string, collegeId: string) {
  const result = await prisma.savedCollege.deleteMany({ where: { userId, collegeId } });
  return { removed: result.count > 0 };
}

/** Every college this user has saved, most recently saved first. */
export async function listSavedColleges(userId: string) {
  const rows = await prisma.savedCollege.findMany({
    where: { userId },
    orderBy: { createdAt: "desc" },
    select: {
      createdAt: true,
      college: {
        select: {
          id: true,
          slug: true,
          shortName: true,
          name: true,
          city: true,
          state: true,
          type: true,
          rating: true,
          reviewCount: true,
          avgAnnualFee: true,
          nirfRank: true,
        },
      },
    },
  });

  // Flatten the join row away — callers want colleges, not SavedCollege
  // records that happen to contain colleges.
  return rows.map((row) => ({ ...row.college, savedAt: row.createdAt }));
}

/**
 * Just the ids, for deciding which save buttons render as already-saved.
 *
 * A Set because the listing page checks membership once per card. Array
 * .includes() across twelve cards is fine, but this is the shape the call
 * site actually wants and it stays correct if the page size grows.
 */
export async function getSavedCollegeIds(userId: string): Promise<Set<string>> {
  const rows = await prisma.savedCollege.findMany({
    where: { userId },
    select: { collegeId: true },
  });

  return new Set(rows.map((row) => row.collegeId));
}

// ---------------------------------------------------------------------------
// Saved comparisons
// ---------------------------------------------------------------------------

/**
 * Save a comparison.
 *
 * Unlike saveCollege this is a plain create, because there is no uniqueness
 * rule to respect: saving the same three colleges twice under different names
 * ("Safe options", "What dad thinks") is legitimate, not a duplicate.
 */
export async function saveComparison(userId: string, name: string, collegeIds: string[]) {
  return prisma.savedComparison.create({
    data: { userId, name, collegeIds },
    select: { id: true, name: true, collegeIds: true, createdAt: true },
  });
}

/**
 * A user's saved comparisons, with the colleges resolved.
 *
 * collegeIds is a String[] rather than a join table, so the colleges are
 * fetched separately and matched up here. One extra query for the whole page,
 * not one per comparison — building it in a loop would be N+1.
 */
export async function listSavedComparisons(userId: string) {
  const comparisons = await prisma.savedComparison.findMany({
    where: { userId },
    orderBy: { createdAt: "desc" },
    select: { id: true, name: true, collegeIds: true, createdAt: true },
  });

  if (comparisons.length === 0) return [];

  const allIds = [...new Set(comparisons.flatMap((comparison) => comparison.collegeIds))];

  const colleges = await prisma.college.findMany({
    where: { id: { in: allIds } },
    select: { id: true, slug: true, shortName: true, city: true, avgAnnualFee: true, rating: true },
  });

  const byId = new Map(colleges.map((college) => [college.id, college]));

  return comparisons.map((comparison) => ({
    ...comparison,
    // Map through the stored order, then drop anything missing. Preserving the
    // saved order is the whole reason this is an ordered array rather than a
    // join table, and filtering keeps a deleted college from rendering as a
    // hole in the middle of a comparison.
    colleges: comparison.collegeIds
      .map((id) => byId.get(id))
      .filter((college): college is NonNullable<typeof college> => college !== undefined),
  }));
}

/**
 * Delete a saved comparison.
 *
 * Scoped by userId in the WHERE clause, not checked afterwards. An endpoint
 * that fetches by id and then compares owners has a window where someone
 * forgets to compare; putting the ownership into the query makes deleting
 * another user's comparison impossible rather than merely guarded against.
 */
export async function deleteComparison(userId: string, id: string) {
  const result = await prisma.savedComparison.deleteMany({ where: { id, userId } });
  return { removed: result.count > 0 };
}
