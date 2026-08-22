import { ok, withErrorHandling } from "@/lib/api/response";
import { destroySession } from "@/lib/auth/session";

/**
 * POST /api/auth/logout
 *
 * Clears the session cookie.
 *
 * POST rather than GET, deliberately. A GET that changes state can be
 * triggered by anything that loads a URL — an <img src="/api/auth/logout">
 * on any page, or a link prefetcher — which would sign people out at random.
 * Changing state belongs behind a non-idempotent method.
 *
 * Always returns 200, even with no session. Logout is idempotent: "make sure
 * I am signed out" has succeeded either way, and erroring on an already-empty
 * session would make the UI handle a failure that is not one.
 */
export const POST = withErrorHandling(async () => {
  await destroySession();
  return ok({ signedOut: true });
});
