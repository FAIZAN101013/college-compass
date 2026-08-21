import { z } from "zod";

/**
 * The single source of truth for what a college search URL may contain.
 *
 * Both the listing page (a Server Component) and the REST endpoint at
 * /api/colleges parse their input through this module. That is deliberate:
 * if each had its own parser they could drift, and "maxFee=abc" would mean
 * one thing to the page and another to the API. One parser, used twice.
 *
 * Everything here treats query parameters as HOSTILE input. They are the most
 * exposed surface in the application — anybody can type anything into the
 * address bar, and crawlers routinely request nonsense like ?page=-1.
 */

// ---------------------------------------------------------------------------
// Closed sets
// ---------------------------------------------------------------------------

/**
 * Mirrors the CollegeType enum in schema.prisma.
 *
 * Restating them rather than importing the generated Prisma enum keeps this
 * module usable in the browser: the generated client is server-only, and the
 * filter UI needs this list to render its checkboxes. The cost is that the two
 * could drift — which is why the query builder assigns these values straight
 * into a Prisma `where`, so TypeScript fails the build if they ever disagree.
 */
export const COLLEGE_TYPES = ["GOVERNMENT", "PRIVATE", "DEEMED", "AUTONOMOUS"] as const;
export type CollegeTypeValue = (typeof COLLEGE_TYPES)[number];

export const STREAMS = [
  "ENGINEERING",
  "MANAGEMENT",
  "MEDICAL",
  "LAW",
  "SCIENCE",
  "COMMERCE",
  "ARTS",
  "DESIGN",
] as const;
export type StreamValue = (typeof STREAMS)[number];

/**
 * Sort options are an enum, not a free-text column name.
 *
 * If this accepted arbitrary strings and passed them to `orderBy`, a request
 * could reference any column in the table — including ones we never meant to
 * expose ordering on. A closed set means the only reachable sorts are the five
 * we designed for.
 *
 * There is deliberately no "relevance" option. We have no ranking function, so
 * offering one would be a label with nothing behind it.
 */
export const SORT_OPTIONS = ["rating", "fee-low", "fee-high", "nirf", "name"] as const;
export type SortOption = (typeof SORT_OPTIONS)[number];

// ---------------------------------------------------------------------------
// Defaults and limits
// ---------------------------------------------------------------------------

export const DEFAULT_SORT: SortOption = "rating";
export const DEFAULT_PAGE_SIZE = 12;

/**
 * Hard ceiling on page size.
 *
 * Without it, `?pageSize=100000` is a free denial-of-service: one request that
 * makes Postgres serialise the entire table and Next.js render it. The client
 * chooses the page size, so the server must bound it.
 */
export const MAX_PAGE_SIZE = 48;

/** Sanity ceiling on money filters — ~1 crore per year in whole rupees. */
const MAX_FEE = 10_000_000;

// ---------------------------------------------------------------------------
// Schema
// ---------------------------------------------------------------------------

/** Trimmed, length-capped free text that becomes `undefined` when empty. */
function textField(maxLength: number) {
  return z
    .string()
    .trim()
    .max(maxLength)
    .transform((value) => (value.length === 0 ? undefined : value))
    .optional();
}

export const collegeFiltersSchema = z
  .object({
    /** Free-text search across college name, short name and city. */
    q: textField(100),

    state: textField(60),
    city: textField(60),

    /** Multi-select: ?type=PRIVATE&type=DEEMED narrows to either. */
    type: z.array(z.enum(COLLEGE_TYPES)).optional(),
    stream: z.array(z.enum(STREAMS)).optional(),

    /** Entrance exam a college's courses accept, e.g. "JEE Advanced". */
    exam: textField(40),

    // Money arrives as a string and must become a bounded integer.
    // .int() is what rejects "3.5" and, together with coercion, "abc" (which
    // coerces to NaN and fails every numeric check).
    minFee: z.coerce.number().int().min(0).max(MAX_FEE).optional(),
    maxFee: z.coerce.number().int().min(0).max(MAX_FEE).optional(),

    minRating: z.coerce.number().min(0).max(5).optional(),

    sort: z.enum(SORT_OPTIONS).default(DEFAULT_SORT),

    // A negative or zero page would produce a negative OFFSET, which Postgres
    // rejects outright. Bounding it here means that error can never reach the
    // database.
    page: z.coerce.number().int().min(1).max(10_000).default(1),
    pageSize: z.coerce.number().int().min(1).max(MAX_PAGE_SIZE).default(DEFAULT_PAGE_SIZE),
  })
  /**
   * Cross-field rule. Zod validates fields independently, so minFee and maxFee
   * are each individually valid in `?minFee=500000&maxFee=100000` — but taken
   * together they describe an empty range, and the user would get zero results
   * with no explanation. Catching it here produces a message that says what is
   * actually wrong.
   */
  .refine((filters) => filters.minFee === undefined || filters.maxFee === undefined || filters.minFee <= filters.maxFee, {
    message: "minFee cannot be greater than maxFee",
    path: ["minFee"],
  });

export type CollegeFilters = z.infer<typeof collegeFiltersSchema>;

// ---------------------------------------------------------------------------
// Reading URL parameters
// ---------------------------------------------------------------------------

/** Parameters that may legitimately appear more than once in a URL. */
const MULTI_VALUE_KEYS = new Set(["type", "stream"]);

/**
 * Turn URLSearchParams into a plain object Zod can parse.
 *
 * Two details that are easy to get wrong:
 *
 * 1. Repeated keys. `?type=PRIVATE&type=DEEMED` is the standard way to express
 *    a multi-select, but `params.get("type")` silently returns only the FIRST
 *    value. Multi-value keys must use getAll, or half the user's selection
 *    disappears with no error anywhere.
 *
 * 2. Empty strings. An unfilled input submits `?minFee=`, and `z.coerce.number()`
 *    turns "" into 0 — not NaN. So an empty fee box would silently become a
 *    real "minimum fee of 0" filter instead of no filter at all. Dropping empty
 *    values here means "absent" and "blank" behave identically, which is what
 *    the user intends.
 */
function toRawObject(params: URLSearchParams): Record<string, unknown> {
  const raw: Record<string, unknown> = {};

  for (const key of new Set(params.keys())) {
    if (MULTI_VALUE_KEYS.has(key)) {
      // Also accept the comma form (?type=PRIVATE,DEEMED) so hand-written and
      // shared links work either way.
      const values = params
        .getAll(key)
        .flatMap((value) => value.split(","))
        .map((value) => value.trim())
        .filter((value) => value.length > 0);

      if (values.length > 0) raw[key] = values;
      continue;
    }

    const value = params.get(key);
    if (value !== null && value.trim().length > 0) {
      raw[key] = value;
    }
  }

  return raw;
}

/**
 * Strict parse. Returns Zod's SafeParseResult so the caller decides what an
 * invalid request means.
 *
 * The REST endpoint uses this and answers 400 with field-level detail, because
 * an API that silently ignores a malformed parameter is worse than one that
 * rejects it — the client believes a filter was applied when it was not.
 */
export function parseCollegeFilters(params: URLSearchParams) {
  return collegeFiltersSchema.safeParse(toRawObject(params));
}

/**
 * Lenient parse. Never throws; falls back to defaults if the URL is malformed.
 *
 * The listing PAGE uses this. A person who hand-edits the address bar, or
 * follows a link that was truncated by a chat app, should see the default
 * listing — not a 500 error page. The API is strict, the UI is forgiving, and
 * they share one schema so they can never disagree about what is valid.
 */
export function parseCollegeFiltersSafe(params: URLSearchParams): CollegeFilters {
  let raw = toRawObject(params);

  // Discard only the parameters that are actually invalid, then try again.
  //
  // The obvious implementation — fall back to all defaults on any failure —
  // punishes the user for the wrong thing: in "?q=engineering&page=-5" only
  // the page is broken, yet they would lose their search term as well. Here
  // the bad page is dropped and the search survives.
  //
  // Bounded to a few attempts because each pass removes at least one key, and
  // an unbounded loop over parser output is how you get a hang in production.
  for (let attempt = 0; attempt < 4; attempt++) {
    const result = collegeFiltersSchema.safeParse(raw);
    if (result.success) return result.data;

    const invalidKeys = new Set(
      result.error.issues.map((issue) => String(issue.path[0] ?? "")).filter(Boolean),
    );
    if (invalidKeys.size === 0) break;

    raw = Object.fromEntries(Object.entries(raw).filter(([key]) => !invalidKeys.has(key)));
  }

  // Re-parse an empty set to obtain the schema's own defaults, rather than
  // duplicating them here where they could fall out of sync.
  return collegeFiltersSchema.parse({});
}

/**
 * Flatten Zod issues into `{ field: [messages] }` for an API error body.
 * Written by hand rather than using z.flattenError so the shape stays stable
 * across Zod versions and reads the same in every endpoint.
 */
export function formatFilterErrors(error: z.ZodError): Record<string, string[]> {
  const fields: Record<string, string[]> = {};

  for (const issue of error.issues) {
    const key = issue.path.join(".") || "_";
    (fields[key] ??= []).push(issue.message);
  }

  return fields;
}

// ---------------------------------------------------------------------------
// Writing URL parameters
// ---------------------------------------------------------------------------

/**
 * Serialise filters back into a query string.
 *
 * The filter UI builds links with this instead of assembling strings inline,
 * so parsing and serialising stay symmetrical — a URL this produces is always
 * a URL parseCollegeFilters accepts.
 *
 * Defaults are omitted on purpose: `/colleges` is cleaner than
 * `/colleges?sort=rating&page=1&pageSize=12` and means exactly the same thing.
 */
export function serializeCollegeFilters(filters: Partial<CollegeFilters>): string {
  const params = new URLSearchParams();

  const setIfPresent = (key: string, value: string | number | undefined) => {
    if (value !== undefined && value !== "") params.set(key, String(value));
  };

  setIfPresent("q", filters.q);
  setIfPresent("state", filters.state);
  setIfPresent("city", filters.city);
  setIfPresent("exam", filters.exam);
  setIfPresent("minFee", filters.minFee);
  setIfPresent("maxFee", filters.maxFee);
  setIfPresent("minRating", filters.minRating);

  for (const value of filters.type ?? []) params.append("type", value);
  for (const value of filters.stream ?? []) params.append("stream", value);

  if (filters.sort && filters.sort !== DEFAULT_SORT) params.set("sort", filters.sort);
  if (filters.page && filters.page > 1) params.set("page", String(filters.page));
  if (filters.pageSize && filters.pageSize !== DEFAULT_PAGE_SIZE) {
    params.set("pageSize", String(filters.pageSize));
  }

  return params.toString();
}

/** True when no filter is narrowing the result set — used to show empty states. */
export function hasActiveFilters(filters: CollegeFilters): boolean {
  return Boolean(
    filters.q ||
      filters.state ||
      filters.city ||
      filters.exam ||
      filters.minFee !== undefined ||
      filters.maxFee !== undefined ||
      filters.minRating !== undefined ||
      filters.type?.length ||
      filters.stream?.length,
  );
}
