import { unstable_cache } from "next/cache";
import { prisma } from "@/lib/prisma";
import type { CollegeFilters, SortOption } from "@/lib/query/college-filters";
import type { Prisma } from "@/generated/prisma/client";

/**
 * Turns validated filters into database queries.
 *
 * This module sits between the filter parser and Prisma. Keeping it separate
 * means the listing page (a Server Component) and the REST endpoint call the
 * exact same function, so the page can never drift from the documented API
 * behaviour. It also means the SQL-shaped reasoning lives in one file instead
 * of being scattered through route handlers.
 *
 * Nothing here re-validates its input: by the time filters arrive they have
 * already passed the Zod schema. Validating twice invites the two checks to
 * disagree, and the type signature is what guarantees the parser ran.
 */

// ---------------------------------------------------------------------------
// Shape of what we return
// ---------------------------------------------------------------------------

/**
 * The columns a college card actually needs.
 *
 * Explicitly selected rather than returning whole rows. `description` is a
 * long text column that no card renders, so fetching it for every result
 * would pull kilobytes per row across the network to be thrown away. Select
 * what the UI renders, nothing more.
 */
export const COLLEGE_CARD_SELECT = {
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
  imageUrl: true,
} satisfies Prisma.CollegeSelect;

export type CollegeCard = Prisma.CollegeGetPayload<{ select: typeof COLLEGE_CARD_SELECT }>;

export type PageInfo = {
  page: number;
  pageSize: number;
  totalItems: number;
  totalPages: number;
  hasNextPage: boolean;
  hasPreviousPage: boolean;
};

export type CollegeListResult = {
  items: CollegeCard[];
  pageInfo: PageInfo;
};

// ---------------------------------------------------------------------------
// Search term expansion
// ---------------------------------------------------------------------------

/**
 * Indian cities that are commonly known by two names.
 *
 * Several cities were officially renamed but the former names remain in
 * everyday use, and crucially they remain in institution names: the college
 * is "IIT Bombay" while the city column says "Mumbai". Without this, a search
 * for "bangalore" returned only the two colleges with Bangalore in their name
 * and silently missed every college actually located in Bengaluru — the worst
 * kind of search failure, because it looks like a confident answer.
 *
 * Kept as an explicit bidirectional map rather than a fuzzy-match library:
 * the set is small, closed, and each pair is one a person can verify. Fuzzy
 * matching would also make "Mangaluru" match "Bengaluru", which is wrong.
 */
const CITY_ALIASES: Record<string, string> = {
  bangalore: "Bengaluru",
  bengaluru: "Bangalore",
  bombay: "Mumbai",
  mumbai: "Bombay",
  madras: "Chennai",
  chennai: "Madras",
  calcutta: "Kolkata",
  kolkata: "Calcutta",
  poona: "Pune",
  baroda: "Vadodara",
  trichy: "Tiruchirappalli",
  tiruchirappalli: "Trichy",
  mysore: "Mysuru",
  mysuru: "Mysore",
  gurgaon: "Gurugram",
  gurugram: "Gurgaon",
  allahabad: "Prayagraj",
  prayagraj: "Allahabad",
  mangalore: "Mangaluru",
  mangaluru: "Mangalore",
  calicut: "Kozhikode",
  kozhikode: "Calicut",
  pondicherry: "Puducherry",
  puducherry: "Pondicherry",
};

/**
 * The search term plus any alternate name for the same city.
 *
 * Returns the original term first so behaviour is unchanged for the common
 * case, and de-duplicates so a term that is its own alias cannot produce two
 * identical OR branches.
 */
function expandSearchTerms(query: string): string[] {
  const alias = CITY_ALIASES[query.trim().toLowerCase()];
  return alias ? [query, alias] : [query];
}

// ---------------------------------------------------------------------------
// WHERE
// ---------------------------------------------------------------------------

/**
 * Build the Prisma `where` clause.
 *
 * Exported separately from the list query because the facet counts and the
 * compare page need the identical predicate. Building it twice by hand is how
 * a result count ends up disagreeing with the results.
 */
export function buildCollegeWhere(filters: CollegeFilters): Prisma.CollegeWhereInput {
  const where: Prisma.CollegeWhereInput = {};
  const and: Prisma.CollegeWhereInput[] = [];

  // --- Free text ------------------------------------------------------------
  // Matches the full name, the short name, or the city, so "bangalore" finds
  // both colleges named after the city and colleges located in it.
  //
  // `contains` compiles to SQL LIKE '%term%'. The leading wildcard means no
  // B-tree index can be used, so this is a sequential scan. That is an
  // accepted tradeoff at this dataset size; the note below records what the
  // real fix would be rather than pretending the problem does not exist.
  //
  // At a scale where it mattered, the answer is Postgres full-text search
  // (a tsvector column with a GIN index) or a trigram index via pg_trgm.
  // Both are a migration away and neither changes this module's interface.
  if (filters.q) {
    and.push({
      OR: expandSearchTerms(filters.q).flatMap((term) => [
        { name: { contains: term, mode: "insensitive" } },
        { shortName: { contains: term, mode: "insensitive" } },
        { city: { contains: term, mode: "insensitive" } },
      ]),
    });
  }

  // --- Location -------------------------------------------------------------
  // `equals` with insensitive mode rather than `contains`: a state filter is
  // chosen from a fixed list, so a substring match would let "Bengal" select
  // "West Bengal" from a UI that never offered that choice.
  if (filters.state) {
    and.push({ state: { equals: filters.state, mode: "insensitive" } });
  }
  if (filters.city) {
    and.push({ city: { equals: filters.city, mode: "insensitive" } });
  }

  // --- Multi-select facets --------------------------------------------------
  // `in` is OR within a facet: picking PRIVATE and DEEMED widens the results.
  // Separate facets are AND-ed, so PRIVATE + Karnataka narrows them. That
  // asymmetry is what every faceted search does, and it is what users expect
  // even though they never articulate it.
  if (filters.type?.length) {
    and.push({ type: { in: filters.type } });
  }

  // `streams` is an enum ARRAY column, so this is `hasSome`, not `in`.
  // `in` asks "is the column one of these values"; `hasSome` asks "does the
  // column's array overlap this set" — which is the actual question here.
  if (filters.stream?.length) {
    and.push({ streams: { hasSome: filters.stream } });
  }

  // --- Exam: a filter on a RELATION, not a column ---------------------------
  // Colleges do not accept exams; their courses do. `some` compiles to an
  // EXISTS subquery: keep the college if at least one of its courses lists
  // this exam. Doing it any other way would mean loading courses into the
  // application and filtering there, which cannot be paginated correctly.
  if (filters.exam) {
    and.push({ courses: { some: { examsAccepted: { has: filters.exam } } } });
  }

  // --- Ranges ---------------------------------------------------------------
  // Built as one object so a min and a max combine into BETWEEN rather than
  // the second overwriting the first.
  if (filters.minFee !== undefined || filters.maxFee !== undefined) {
    and.push({
      avgAnnualFee: {
        ...(filters.minFee !== undefined ? { gte: filters.minFee } : {}),
        ...(filters.maxFee !== undefined ? { lte: filters.maxFee } : {}),
      },
    });
  }

  if (filters.minRating !== undefined) {
    and.push({ rating: { gte: filters.minRating } });
  }

  if (and.length > 0) where.AND = and;
  return where;
}

// ---------------------------------------------------------------------------
// ORDER BY
// ---------------------------------------------------------------------------

/**
 * Translate a sort option into an ORDER BY.
 *
 * Two things every entry here must satisfy:
 *
 * 1. IT MUST END IN A UNIQUE COLUMN. Sorting 143 colleges by rating leaves
 *    dozens tied at 4.3, and SQL guarantees NO particular order among ties.
 *    Postgres may legitimately return tied rows in a different order for each
 *    query, which with OFFSET pagination means a row can appear on page 1 and
 *    again on page 2 while another is never shown at all. Appending `id` makes
 *    the ordering total, so paging through the list is stable.
 *
 * 2. NULLS MUST BE PLACED DELIBERATELY. nirfRank is null for unranked
 *    colleges. Postgres sorts NULLs FIRST for ascending order, so a naive
 *    "best ranked first" sort would put every unranked college above IIT
 *    Madras. `nulls: "last"` says what we actually mean.
 */
function buildCollegeOrderBy(sort: SortOption): Prisma.CollegeOrderByWithRelationInput[] {
  switch (sort) {
    case "fee-low":
      return [{ avgAnnualFee: "asc" }, { id: "asc" }];

    case "fee-high":
      return [{ avgAnnualFee: "desc" }, { id: "asc" }];

    case "nirf":
      // Ranked colleges ascending (rank 1 is best), unranked at the end.
      return [{ nirfRank: { sort: "asc", nulls: "last" } }, { id: "asc" }];

    case "name":
      return [{ name: "asc" }, { id: "asc" }];

    case "rating":
    default:
      // Rating first, then review count: between two colleges rated 4.5, the
      // one with 40 reviews is a more trustworthy 4.5 than the one with 2.
      return [{ rating: "desc" }, { reviewCount: "desc" }, { id: "asc" }];
  }
}

// ---------------------------------------------------------------------------
// The list query
// ---------------------------------------------------------------------------

export async function findColleges(filters: CollegeFilters): Promise<CollegeListResult> {
  const where = buildCollegeWhere(filters);
  const orderBy = buildCollegeOrderBy(filters.sort);

  // OFFSET pagination, chosen over cursor pagination on purpose.
  //
  // Cursor pagination is faster on very large tables — OFFSET 10000 makes
  // Postgres walk and discard 10,000 rows — and it is immune to rows shifting
  // between requests. But it cannot answer "jump to page 7" or "of 12 pages",
  // because a cursor only knows the row after the last one you saw.
  //
  // A college directory needs numbered pages and a total count. At this scale
  // the OFFSET cost is irrelevant, so the tradeoff runs the other way.
  const skip = (filters.page - 1) * filters.pageSize;

  // Two sequential queries, deliberately NOT wrapped in a transaction and
  // deliberately not run through Promise.all. Measured over 25 rounds against
  // Neon's pooled endpoint (scripts/_diagnose-pool.ts, since removed):
  //
  //   $transaction([findMany, count])   25/25 ok   median 981ms
  //   Promise.all, no transaction       24/25 ok   median 250ms
  //   sequential, no transaction        25/25 ok   median 481ms
  //
  // Neon's pooler hands out connections per transaction, so a Prisma
  // transaction holds one for its whole duration and contends with the pool;
  // it also timed out outright under load while seeding. Promise.all is the
  // fastest but asks for two connections at once and failed 4% of the time,
  // which is far too often for the main listing route.
  //
  // What the transaction would have bought is a consistent snapshot between
  // the rows and the count. The worst case without it is that a college
  // inserted between the two queries makes the header read "showing 1-12 of
  // 143" when the true total is 144, for a single render of a browse page.
  // That is not worth doubling the latency of the most-visited route.
  const items = await prisma.college.findMany({
    where,
    orderBy,
    skip,
    take: filters.pageSize,
    select: COLLEGE_CARD_SELECT,
  });
  const totalItems = await prisma.college.count({ where });

  const totalPages = Math.max(1, Math.ceil(totalItems / filters.pageSize));

  return {
    items,
    pageInfo: {
      page: filters.page,
      pageSize: filters.pageSize,
      totalItems,
      totalPages,
      // Derived from the count rather than from `items.length === pageSize`.
      // That shortcut is wrong exactly when the total is an even multiple of
      // the page size: a full last page would advertise a next page that is
      // empty.
      hasNextPage: filters.page < totalPages,
      hasPreviousPage: filters.page > 1,
    },
  };
}

// ---------------------------------------------------------------------------
// Filter options for the UI
// ---------------------------------------------------------------------------

export type FilterOptions = {
  states: string[];
  cities: string[];
  exams: string[];
};

/**
 * The values the filter sidebar offers.
 *
 * Read from the database rather than hardcoded, so adding a college in a new
 * state makes that state selectable without a code change. A hardcoded list
 * is a second source of truth that silently goes stale.
 *
 * Exams need a manual distinct pass because they live in a String[] column,
 * and SQL DISTINCT over an array column compares whole arrays, not elements.
 */
async function loadFilterOptions(): Promise<FilterOptions> {
  // groupBy returns DISTINCT (state, city) pairs, which gives both lists from
  // a single round trip with Postgres doing the de-duplication.
  //
  // The obvious alternatives are each worse in a different way: two separate
  // `distinct` queries cost two round trips, and selecting every row to
  // de-duplicate in JavaScript transfers the whole table and stops scaling the
  // moment the catalogue is large. This does the work in the database and
  // returns a result bounded by the number of distinct cities.
  const locations = await prisma.college.groupBy({
    by: ["state", "city"],
    orderBy: [{ state: "asc" }, { city: "asc" }],
  });

  // Exams need de-duplicating in application code because they live in a
  // String[] column, and SQL DISTINCT over an array column compares whole
  // arrays rather than their elements.
  const courseExams = await prisma.course.findMany({ select: { examsAccepted: true } });

  return {
    states: [...new Set(locations.map((row) => row.state))],
    cities: [...new Set(locations.map((row) => row.city))],
    exams: [...new Set(courseExams.flatMap((course) => course.examsAccepted))].sort(),
  };
}

/**
 * Cached across requests for an hour.
 *
 * These options change only when the catalogue gains a genuinely new state,
 * city or entrance exam — which is close to never — yet without caching every
 * page view paid for both queries. Against a database in another region that
 * was most of the page's response time.
 *
 * The "colleges" tag means a future admin write can call revalidateTag
 * ("colleges") to refresh this immediately rather than waiting out the hour.
 */
export const getFilterOptions = unstable_cache(loadFilterOptions, ["filter-options"], {
  revalidate: 3600,
  tags: ["colleges"],
});
