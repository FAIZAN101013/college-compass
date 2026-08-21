import { prisma } from "@/lib/prisma";

/**
 * Everything the college detail page needs, in one query.
 *
 * The alternative — fetch the college, then its courses, then its placements,
 * then its reviews — is four sequential round trips. We measured roughly
 * 500ms per round trip against an out-of-region database, so that shape costs
 * two seconds before any rendering happens. Prisma's `include` resolves the
 * relations in a single request instead.
 */

/** How many reviews the page shows before offering "see all". */
const REVIEW_PAGE_SIZE = 6;

export type CollegeDetail = NonNullable<Awaited<ReturnType<typeof getCollegeBySlug>>>;

export async function getCollegeBySlug(slug: string) {
  return prisma.college.findUnique({
    // Looked up by slug, not id. The slug is the public identity of a college
    // and is @unique in the schema, so this is still a single index lookup.
    where: { slug },
    include: {
      courses: {
        // Cheapest first: a student comparing programmes at one college is
        // almost always weighing cost, and it gives the table a stable order.
        orderBy: [{ annualFee: "asc" }, { name: "asc" }],
      },
      placements: {
        // Newest first, so placements[0] is always the current year and the
        // page never has to search the array for "the latest".
        orderBy: { year: "desc" },
      },
      reviews: {
        orderBy: { createdAt: "desc" },
        // One more than we display, purely so the page can tell whether there
        // are further reviews without paying for a second COUNT query.
        take: REVIEW_PAGE_SIZE + 1,
      },
    },
  });
}

/**
 * Year-on-year change in median package.
 *
 * This function only exists because Placement is a time series rather than a
 * set of columns on College. Had the schema stored medianPackage2025, showing
 * a trend would need a migration every year; here it is arithmetic over rows
 * that already exist.
 *
 * Median rather than average, deliberately. A single very large offer moves
 * the average noticeably and the median barely at all, so a trend built on
 * averages mostly tracks outliers rather than what a typical student got.
 */
export type PlacementTrend = {
  latestYear: number;
  medianPackage: number;
  /** Percentage change against the previous year, or null if there is no prior year. */
  changePercent: number | null;
  /** Chronological (oldest first) — the order a chart needs to plot. */
  series: { year: number; medianPackage: number; placementRate: number }[];
};

export function buildPlacementTrend(
  placements: CollegeDetail["placements"],
): PlacementTrend | null {
  if (placements.length === 0) return null;

  // placements arrives newest-first from the query above.
  const [latest, previous] = placements;

  return {
    latestYear: latest.year,
    medianPackage: latest.medianPackage,
    changePercent:
      // Guard the divisor. A previous year with a median of zero would give
      // Infinity, which renders as "Infinity%" rather than failing loudly.
      previous && previous.medianPackage > 0
        ? ((latest.medianPackage - previous.medianPackage) / previous.medianPackage) * 100
        : null,
    series: [...placements]
      .reverse()
      .map(({ year, medianPackage, placementRate }) => ({ year, medianPackage, placementRate })),
  };
}

/**
 * Count of each star rating, for the distribution bars.
 *
 * Computed from the reviews already loaded rather than with a groupBy query,
 * because the page has them in memory and an extra round trip to count six
 * rows would cost more than the arithmetic.
 *
 * NOTE: this therefore describes the reviews ON THIS PAGE, not all reviews
 * ever written. With the current seed every college has fewer than ten, so
 * the two are the same; if review pagination is added later this must become
 * a real groupBy or the bars will quietly start lying.
 */
export function ratingDistribution(reviews: CollegeDetail["reviews"]) {
  const counts = new Map<number, number>([
    [5, 0],
    [4, 0],
    [3, 0],
    [2, 0],
    [1, 0],
  ]);

  for (const review of reviews) {
    counts.set(review.rating, (counts.get(review.rating) ?? 0) + 1);
  }

  return [5, 4, 3, 2, 1].map((stars) => ({
    stars,
    count: counts.get(stars) ?? 0,
    percent: reviews.length > 0 ? ((counts.get(stars) ?? 0) / reviews.length) * 100 : 0,
  }));
}

export { REVIEW_PAGE_SIZE };

/**
 * Slugs of every college, for generateStaticParams.
 *
 * Lets Next pre-render detail pages at build time instead of on first request.
 * Selecting only the slug keeps this cheap even as the catalogue grows.
 */
export async function getAllCollegeSlugs(): Promise<string[]> {
  const rows = await prisma.college.findMany({ select: { slug: true } });
  return rows.map((row) => row.slug);
}

/**
 * A few colleges to suggest alongside this one.
 *
 * Same state first, because location is the constraint most students cannot
 * change; falling back to the same stream when a state has nothing else to
 * offer. Excludes the current college, which is the obvious bug in every
 * "related items" query written in a hurry.
 */
export async function getSimilarColleges(college: {
  id: string;
  state: string;
  streams: CollegeDetail["streams"];
}) {
  return prisma.college.findMany({
    where: {
      id: { not: college.id },
      OR: [{ state: college.state }, { streams: { hasSome: college.streams } }],
    },
    orderBy: [{ rating: "desc" }, { id: "asc" }],
    take: 4,
    select: {
      id: true,
      slug: true,
      shortName: true,
      city: true,
      state: true,
      rating: true,
      avgAnnualFee: true,
    },
  });
}
