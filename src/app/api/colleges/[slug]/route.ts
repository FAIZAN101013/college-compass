import { CACHE, fail, ok, withErrorHandling } from "@/lib/api/response";
import { buildPlacementTrend, getCollegeBySlug } from "@/lib/queries/college-detail";

/**
 * GET /api/colleges/[slug]
 *
 * A single college with its courses, placements and recent reviews.
 *
 * Example: /api/colleges/indian-institute-of-technology-bombay
 *
 * Returns 404 with an error body when the slug does not exist. That is the
 * correct code here — unlike the list endpoint, where a page beyond the last
 * is an empty result rather than a missing resource, this really is a request
 * for something that is not there.
 */
export const GET = withErrorHandling(
  async (_request: Request, context: { params: Promise<{ slug: string }> }) => {
    const { slug } = await context.params;

    const college = await getCollegeBySlug(slug);

    if (!college) {
      // The message names the slug so a client debugging a bad link can see
      // what was actually requested, rather than guessing from a bare 404.
      return fail("NOT_FOUND", `No college found with slug "${slug}".`);
    }

    return ok(
      {
        ...college,
        // Computed server-side so every consumer — this API, the page, and any
        // future mobile client — reads the same trend rather than each
        // reimplementing the arithmetic and drifting.
        placementTrend: buildPlacementTrend(college.placements),
      },
      { cache: CACHE.PUBLIC_DETAIL },
    );
  },
);
