import { z } from "zod";
import { prisma } from "@/lib/prisma";

/**
 * Side-by-side college comparison.
 *
 * The selection lives in the URL as ?ids=slug-a,slug-b,slug-c, so a
 * comparison is a shareable link rather than something trapped in one
 * browser's local state. Sending a friend "here are the three I am weighing
 * up" is the single most useful thing this feature can do, and it only works
 * if the URL carries the whole selection.
 */

/**
 * Two or three colleges, per the brief.
 *
 * The cap is not arbitrary. Each college is a table column, and a fourth
 * makes the row labels unreadable on anything narrower than a laptop. A
 * comparison you cannot read is worse than one you cannot make.
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
    // De-duplicate before the cap, so ?ids=a,a,b keeps two distinct colleges
    // rather than spending a slot on the repeat and dropping b.
    .transform((slugs) => [...new Set(slugs)].slice(0, MAX_COMPARE)),
});

export type CompareSelection = z.infer<typeof compareParamsSchema>["ids"];

const COMPARE_SELECT = {
  id: true,
  slug: true,
  name: true,
  shortName: true,
  city: true,
  state: true,
  type: true,
  streams: true,
  establishedYear: true,
  nirfRank: true,
  rating: true,
  reviewCount: true,
  avgAnnualFee: true,
  approvedBy: true,
  facilities: true,
} as const;

export type CompareCollege = Awaited<ReturnType<typeof getCollegesForCompare>>[number];

/**
 * Load the selected colleges, IN THE ORDER THE USER ASKED FOR.
 *
 * This is the part that is easy to get wrong. `WHERE slug IN (a, b, c)` gives
 * Postgres no instruction about ordering, so rows come back in whatever order
 * the plan produced — typically physical table order, which has nothing to do
 * with the order in the URL. Rendering that directly makes the columns appear
 * to shuffle themselves, and the bug is invisible in testing whenever the two
 * orders happen to coincide.
 *
 * Unknown slugs are silently skipped rather than treated as an error. One
 * dead slug in a link someone shared should not blank out the whole
 * comparison; showing the colleges that do exist is far more useful.
 */
export async function getCollegesForCompare(slugs: CompareSelection) {
  if (slugs.length === 0) return [];

  const colleges = await prisma.college.findMany({
    where: { slug: { in: slugs } },
    select: {
      ...COMPARE_SELECT,
      courses: {
        select: { annualFee: true, examsAccepted: true, totalSeats: true },
      },
      placements: {
        orderBy: { year: "desc" },
        take: 1,
        select: {
          year: true,
          medianPackage: true,
          averagePackage: true,
          highestPackage: true,
          placementRate: true,
          topRecruiters: true,
        },
      },
    },
  });

  // Restore the requested order via a lookup, rather than sorting with
  // indexOf inside the comparator, which would be O(n^2).
  const bySlug = new Map(colleges.map((college) => [college.slug, college]));

  return slugs
    .map((slug) => bySlug.get(slug))
    .filter((college): college is NonNullable<typeof college> => college !== undefined);
}

/**
 * Which direction counts as "better" for a metric.
 *
 * Declared as data rather than decided at each call site, because it is not
 * uniform: a LOWER fee is better, a HIGHER rating is better, and a LOWER NIRF
 * rank is better because rank 1 is the top. Hardcoding "highest wins" would
 * silently mark the most expensive college and the worst-ranked one as the
 * winners of their rows.
 */
export type Direction = "higher-is-better" | "lower-is-better";

/**
 * Index of the best value in a row, or null when there is no clear winner.
 *
 * Returns null on a tie as well as when nothing is comparable. Highlighting
 * two "winners" tells the reader nothing, and highlighting the first of two
 * equal values implies a difference that does not exist.
 */
export function bestIndex(
  values: (number | null)[],
  direction: Direction,
): number | null {
  const comparable = values
    .map((value, index) => ({ value, index }))
    .filter((entry): entry is { value: number; index: number } => entry.value !== null);

  // With one comparable value there is nothing to compare it against, so
  // marking it "best" would be misleading.
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

/**
 * Candidates for the "add a college" picker.
 *
 * Excludes what is already selected — offering a college the user cannot add
 * is a dead option that only produces a confusing no-op when clicked.
 */
export async function getCompareCandidates(exclude: CompareSelection) {
  return prisma.college.findMany({
    where: { slug: { notIn: exclude } },
    orderBy: [{ rating: "desc" }, { id: "asc" }],
    take: 200,
    select: { slug: true, shortName: true, city: true, state: true },
  });
}
