import { z } from "zod";

/**
 * Comparison selection: parsing, limits and ranking helpers.
 *
 * ── Why this is a separate file from lib/queries/compare.ts ───────────────
 * Everything here is pure — no Prisma import, no database, no Node APIs — so
 * it is safe to import from a Client Component.
 *
 * That is not a stylistic preference. ComparePicker is a Client Component and
 * needs MAX_COMPARE. When that constant lived alongside the database queries,
 * importing it pulled @/lib/prisma and the Postgres driver into the browser
 * bundle, and the build failed with an unrelated-looking ENOENT about a
 * missing build manifest.
 *
 * The convention this project follows:
 *   src/lib/query/*    pure — parsing, validation, helpers. Client-safe.
 *   src/lib/queries/*  database access. Server only.
 */

/**
 * Two or three colleges, per the brief.
 *
 * The cap is not arbitrary: each college is a table column, and a fourth makes
 * the row labels unreadable on anything narrower than a laptop. A comparison
 * you cannot read is worse than one you cannot make.
 */
export const MAX_COMPARE = 3;

export const compareParamsSchema = z.object({
  ids: z
    .string()
    .optional()
    .transform((value) =>
      (value ?? "")
        .split(",")
        .map((slug) => slug.trim().toLowerCase())
        .filter(Boolean),
    )
    // De-duplicate BEFORE applying the cap, so ?ids=a,a,b keeps two distinct
    // colleges rather than spending a slot on the repeat and dropping b.
    .transform((slugs) => [...new Set(slugs)].slice(0, MAX_COMPARE)),
});

export type CompareSelection = z.infer<typeof compareParamsSchema>["ids"];

/**
 * Which direction counts as "better" for a metric.
 *
 * Declared as data rather than decided at each call site, because it is not
 * uniform: a LOWER fee is better, a HIGHER rating is better, and a LOWER NIRF
 * rank is better because rank 1 is the top. Assuming "biggest number wins"
 * would silently crown the most expensive and worst-ranked college.
 */
export type Direction = "higher-is-better" | "lower-is-better";

/**
 * Index of the best value in a row, or null when there is no clear winner.
 *
 * Returns null on a tie and when fewer than two values are comparable.
 * Highlighting two "winners" tells the reader nothing, and highlighting one of
 * two identical values implies a difference that does not exist.
 */
export function bestIndex(values: (number | null)[], direction: Direction): number | null {
  const comparable = values
    .map((value, index) => ({ value, index }))
    .filter((entry): entry is { value: number; index: number } => entry.value !== null);

  // One comparable value has nothing to be better than.
  if (comparable.length < 2) return null;

  const best = comparable.reduce((winner, entry) =>
    direction === "higher-is-better"
      ? entry.value > winner.value
        ? entry
        : winner
      : entry.value < winner.value
        ? entry
        : winner,
  );

  const tied = comparable.filter((entry) => entry.value === best.value).length > 1;
  return tied ? null : best.index;
}

/** Add a slug to a selection, respecting the cap and rejecting duplicates. */
export function withCollege(current: CompareSelection, slug: string): CompareSelection {
  if (current.includes(slug) || current.length >= MAX_COMPARE) return current;
  return [...current, slug];
}

/** Remove a slug from a selection. */
export function withoutCollege(current: CompareSelection, slug: string): CompareSelection {
  return current.filter((existing) => existing !== slug);
}

/** Build the canonical compare URL for a selection. */
export function compareHref(slugs: CompareSelection): string {
  return slugs.length > 0 ? `/compare?ids=${slugs.join(",")}` : "/compare";
}
