import { NextResponse } from "next/server";

/**
 * One response envelope for every API route.
 *
 * The point is predictability. If each route invents its own error shape, the
 * client needs bespoke handling per endpoint and can never write a single
 * "did this request fail, and why" helper. Every response from this API is
 * either { data } or { error }, never both, and `error` always has the same
 * three fields.
 */

/**
 * Machine-readable error codes.
 *
 * A closed set, because clients branch on these. Human-readable `message` is
 * for developers and can be reworded freely; `code` is the contract and
 * changing one is a breaking change.
 */
export type ApiErrorCode =
  | "INVALID_QUERY"
  | "INVALID_BODY"
  | "NOT_FOUND"
  | "UNAUTHORIZED"
  | "CONFLICT"
  | "INTERNAL";

export type ApiError = {
  code: ApiErrorCode;
  message: string;
  /** Field-level detail, present only for validation failures. */
  fields?: Record<string, string[]>;
};

export type ApiSuccessBody<T> = { data: T };
export type ApiErrorBody = { error: ApiError };

const STATUS_BY_CODE: Record<ApiErrorCode, number> = {
  INVALID_QUERY: 400,
  INVALID_BODY: 422,
  UNAUTHORIZED: 401,
  NOT_FOUND: 404,
  CONFLICT: 409,
  INTERNAL: 500,
};

/**
 * A successful response.
 *
 * `cache` maps to a Cache-Control header. Vercel's CDN honours s-maxage, so a
 * value here means identical requests are served from the edge instead of
 * reaching Postgres at all. Routes must opt in explicitly — defaulting to
 * cached would be a data leak waiting to happen the first time someone adds
 * a per-user endpoint.
 */
export function ok<T>(
  data: T,
  options: { status?: number; cache?: string } = {},
): NextResponse<ApiSuccessBody<T>> {
  const headers: Record<string, string> = {};
  if (options.cache) headers["Cache-Control"] = options.cache;

  return NextResponse.json({ data }, { status: options.status ?? 200, headers });
}

/** An error response. Status is derived from the code so the two cannot disagree. */
export function fail(
  code: ApiErrorCode,
  message: string,
  fields?: Record<string, string[]>,
): NextResponse<ApiErrorBody> {
  return NextResponse.json(
    { error: { code, message, ...(fields ? { fields } : {}) } },
    {
      status: STATUS_BY_CODE[code],
      // Never let a CDN or browser cache an error. A cached 404 outlives the
      // condition that caused it, and users then see stale failures long after
      // the underlying problem is fixed.
      headers: { "Cache-Control": "no-store" },
    },
  );
}

/**
 * Cache directives used by this API, named rather than repeated inline.
 *
 * stale-while-revalidate is the important half: past the s-maxage window the
 * CDN still serves the stale copy immediately and refreshes in the background,
 * so a cache expiry never turns into a slow request for whoever happens to
 * arrive first.
 */
export const CACHE = {
  /** Public catalogue data. Changes rarely; a minute of staleness is invisible. */
  PUBLIC_LIST: "public, s-maxage=60, stale-while-revalidate=300",
  /** A single college. Changes even less often than the list. */
  PUBLIC_DETAIL: "public, s-maxage=300, stale-while-revalidate=3600",
  /** Anything derived from the session. Must never touch a shared cache. */
  PRIVATE: "private, no-store",
} as const;

/**
 * Wrap a route handler so an unexpected throw becomes a clean 500.
 *
 * Without this, an unhandled error inside a route returns Next.js's default
 * error page — HTML, not JSON — which breaks any client that assumed this API
 * always answers JSON. It also keeps the real error out of the response body:
 * exception messages routinely contain table names, file paths and fragments
 * of queries, none of which belong in a public response.
 */
export function withErrorHandling<Args extends unknown[]>(
  handler: (...args: Args) => Promise<NextResponse>,
) {
  return async (...args: Args): Promise<NextResponse> => {
    try {
      return await handler(...args);
    } catch (error) {
      // Logged in full on the server, where it is useful and not exposed.
      console.error("[api] unhandled error:", error);
      return fail("INTERNAL", "Something went wrong. Please try again.");
    }
  };
}
