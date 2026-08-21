import type { NextRequest } from "next/server";
import { CACHE, fail, ok, withErrorHandling } from "@/lib/api/response";
import { formatFilterErrors, parseCollegeFilters } from "@/lib/query/college-filters";
import { findColleges } from "@/lib/queries/colleges";

/**
 * GET /api/colleges
 *
 * Search, filter, sort and paginate the college catalogue.
 *
 * Query parameters (all optional):
 *   q          free text across college name, short name and city
 *   state      exact state name
 *   city       exact city name
 *   type       GOVERNMENT | PRIVATE | DEEMED | AUTONOMOUS  (repeatable)
 *   stream     ENGINEERING | MANAGEMENT | MEDICAL | LAW |
 *              SCIENCE | COMMERCE | ARTS | DESIGN          (repeatable)
 *   exam       entrance exam accepted by at least one of the courses
 *   minFee     minimum average annual fee, whole rupees
 *   maxFee     maximum average annual fee, whole rupees
 *   minRating  0 - 5
 *   sort       rating | fee-low | fee-high | nirf | name   (default: rating)
 *   page       1-based                                     (default: 1)
 *   pageSize   1 - 48                                      (default: 12)
 *
 * Example:
 *   /api/colleges?q=bangalore&type=PRIVATE&type=DEEMED&maxFee=400000&sort=fee-low
 *
 * This handler is deliberately thin. Parsing lives in the filter module and
 * querying lives in the query module, both of which the listing page also
 * uses — so the page and the API can never disagree about what a request
 * means. All this file does is translate between HTTP and those two modules.
 */
export const GET = withErrorHandling(async (request: NextRequest) => {
  // Strict parsing. The API rejects malformed input rather than quietly
  // ignoring it: a client that sent minFee=abc and got 200 back would show
  // unfiltered results as though the filter had been applied, which is a
  // worse failure than an explicit error.
  const parsed = parseCollegeFilters(request.nextUrl.searchParams);

  if (!parsed.success) {
    return fail(
      "INVALID_QUERY",
      "One or more query parameters are invalid.",
      formatFilterErrors(parsed.error),
    );
  }

  const result = await findColleges(parsed.data);

  // Asking for a page past the end is not an error — an empty result set is
  // the correct answer to "show me page 99". Returning 404 here would be
  // wrong: the collection exists, this slice of it is simply empty. The
  // pageInfo tells the client how many pages there actually are.
  return ok(result, { cache: CACHE.PUBLIC_LIST });
});
