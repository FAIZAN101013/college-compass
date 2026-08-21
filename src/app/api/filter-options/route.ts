import { CACHE, ok, withErrorHandling } from "@/lib/api/response";
import { getFilterOptions } from "@/lib/queries/colleges";
import { COLLEGE_TYPES, SORT_OPTIONS, STREAMS } from "@/lib/query/college-filters";

/**
 * GET /api/filter-options
 *
 * Everything the filter sidebar needs to render itself: which states, cities
 * and exams actually exist, plus the fixed enum sets.
 *
 * States, cities and exams are read from the database rather than hardcoded,
 * so adding a college in a new state makes that state selectable with no code
 * change. A hardcoded list is a second source of truth that goes stale
 * silently — the filter would simply never offer the new state, and nobody
 * would get an error telling them why.
 *
 * The enum sets are returned alongside them so the client has one request to
 * make instead of importing server constants into the browser bundle.
 */
export const GET = withErrorHandling(async () => {
  const options = await getFilterOptions();

  return ok(
    {
      ...options,
      types: COLLEGE_TYPES,
      streams: STREAMS,
      sorts: SORT_OPTIONS,
    },
    // Cached harder than the listing: this changes only when the catalogue
    // gains a genuinely new state or exam, which is close to never.
    { cache: CACHE.PUBLIC_DETAIL },
  );
});
