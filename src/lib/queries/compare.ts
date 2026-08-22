import { prisma } from "@/lib/prisma";
import type { CompareSelection } from "@/lib/query/compare-params";

/**
 * Database access for the comparison feature.
 *
 * SERVER ONLY — this module imports Prisma. Anything a Client Component needs
 * (the cap, the URL schema, the ranking helpers) lives in
 * src/lib/query/compare-params.ts instead, which is pure and safe to bundle
 * for the browser. See the note at the top of that file for what happens when
 * the two get mixed.
 */

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
 * the query plan produced — usually physical table order, which has nothing to
 * do with the order in the URL. Rendering that directly makes the comparison
 * columns appear to shuffle themselves between requests, and the bug hides in
 * testing whenever the two orders happen to coincide.
 *
 * Unknown slugs are skipped rather than raising an error: one dead slug in a
 * link someone shared should not blank out the entire comparison.
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
        // Newest first with take: 1, so placements[0] is the current year and
        // nothing downstream has to search the array for "the latest".
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

  // Restore the requested order through a lookup map rather than sorting with
  // indexOf inside a comparator, which would be O(n^2).
  const bySlug = new Map(colleges.map((college) => [college.slug, college]));

  return slugs
    .map((slug) => bySlug.get(slug))
    .filter((college): college is NonNullable<typeof college> => college !== undefined);
}

/**
 * Candidates for the "add a college" picker.
 *
 * Excludes what is already selected — offering a college the user cannot add
 * is a dead option that produces a confusing no-op when clicked.
 */
export async function getCompareCandidates(exclude: CompareSelection) {
  return prisma.college.findMany({
    where: { slug: { notIn: exclude } },
    orderBy: [{ rating: "desc" }, { id: "asc" }],
    take: 200,
    select: { slug: true, shortName: true, city: true, state: true },
  });
}
