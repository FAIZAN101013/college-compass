import type { Metadata } from "next";
import { CollegeCard } from "@/components/colleges/CollegeCard";
import { FilterPanel } from "@/components/colleges/FilterPanel";
import { Pagination } from "@/components/colleges/Pagination";
import { SearchBar } from "@/components/colleges/SearchBar";
import { SortSelect } from "@/components/colleges/SortSelect";
import { hasActiveFilters, parseCollegeFiltersSafe } from "@/lib/query/college-filters";
import { findColleges, getFilterOptions } from "@/lib/queries/colleges";
import { formatNumber } from "@/lib/format";
import { getSession } from "@/lib/auth/session";
import { getSavedCollegeIds } from "@/lib/queries/saved";

export const metadata: Metadata = {
  title: "Browse colleges",
  description: "Search and filter Indian colleges by fees, ranking, stream, location and rating.",
};

/**
 * The college listing.
 *
 * A Server Component. It calls findColleges() directly rather than fetching
 * its own /api/colleges endpoint — an HTTP round trip from the server back to
 * itself would add latency and a failure mode for no benefit. The REST API
 * still exists as the public contract; it just is not how this page gets its
 * data.
 *
 * Because the data is fetched during render, the browser receives finished
 * HTML. There is no loading spinner to coordinate, no useEffect, and no
 * empty first paint.
 */

/**
 * In Next 15+ searchParams is a Promise, and its values are string or
 * string[] depending on whether a key was repeated. URLSearchParams is the
 * shape the filter parser already understands, so normalise once here rather
 * than teaching the parser about two input formats.
 */
function toSearchParams(input: Record<string, string | string[] | undefined>): URLSearchParams {
  const params = new URLSearchParams();

  for (const [key, value] of Object.entries(input)) {
    if (Array.isArray(value)) {
      for (const item of value) params.append(key, item);
    } else if (value !== undefined) {
      params.set(key, value);
    }
  }

  return params;
}

export default async function CollegesPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const params = toSearchParams(await searchParams);

  // The lenient parser. A hand-edited or truncated URL renders the default
  // listing instead of an error page; the API is the strict one.
  const filters = parseCollegeFiltersSafe(params);

  // Sequential, not Promise.all — Neon's pooled endpoint failed roughly 4% of
  // concurrent query pairs under measurement, and a flaky listing page is a
  // far worse trade than a few hundred milliseconds.
  const result = await findColleges(filters);
  const options = await getFilterOptions();

  // Which of these results the signed-in user has already saved, so the
  // bookmark icons render in the right state on first paint rather than
  // popping after a client-side fetch. Signed-out visitors skip the query
  // entirely.
  const session = await getSession();
  const savedIds = session ? await getSavedCollegeIds(session.id) : new Set<string>();

  const filtersApplied = hasActiveFilters(filters);
  const { pageInfo } = result;
  const firstOnPage = (pageInfo.page - 1) * pageInfo.pageSize + 1;
  const lastOnPage = Math.min(pageInfo.page * pageInfo.pageSize, pageInfo.totalItems);

  return (
    <div className="mx-auto max-w-7xl px-4 py-6">
      <div className="mb-6">
        <h1 className="text-2xl font-bold tracking-tight">Browse colleges</h1>
        <p className="mt-1 text-sm text-text-secondary">
          {formatNumber(options.states.length)} states · {formatNumber(options.exams.length)}{" "}
          entrance exams · compare fees, placements and ratings
        </p>
      </div>

      <div className="mb-5">
        <SearchBar />
      </div>

      <div className="grid gap-6 lg:grid-cols-[260px_minmax(0,1fr)]">
        <FilterPanel
          states={options.states}
          exams={options.exams}
          resultCount={pageInfo.totalItems}
        />

        <div>
          <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
            {/*
              aria-live announces the new count to a screen reader when results
              change. Without it, filtering is silent for anyone not watching
              the screen — they get no confirmation the action did anything.
            */}
            <p className="text-sm text-text-secondary" aria-live="polite">
              {pageInfo.totalItems === 0
                ? "No matching colleges"
                : `Showing ${formatNumber(firstOnPage)}–${formatNumber(lastOnPage)} of ${formatNumber(pageInfo.totalItems)}`}
            </p>
            <SortSelect />
          </div>

          {pageInfo.totalItems === 0 ? (
            <EmptyState filtersApplied={filtersApplied} query={filters.q} />
          ) : (
            <>
              <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
                {result.items.map((college) => (
                  <CollegeCard
                    key={college.id}
                    college={college}
                    isSaved={savedIds.has(college.id)}
                    isAuthenticated={Boolean(session)}
                  />
                ))}
              </div>

              <div className="mt-8">
                <Pagination pageInfo={pageInfo} searchParams={params} />
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
}

/**
 * Shown when nothing matches.
 *
 * An empty state should explain what happened and offer a way out. "No
 * results" alone leaves the user unsure whether they broke something, whether
 * the site is broken, or whether their filters are simply too narrow.
 */
function EmptyState({ filtersApplied, query }: { filtersApplied: boolean; query?: string }) {
  return (
    <div className="rounded-[var(--radius-card)] border border-dashed border-border-strong bg-surface-raised px-6 py-16 text-center">
      <p className="text-lg font-semibold">No colleges match your filters</p>

      <p className="mx-auto mt-2 max-w-md text-sm text-text-secondary">
        {query ? (
          <>
            Nothing matched <span className="font-medium text-text-primary">“{query}”</span>. Try a
            shorter search term, or widen the filters on the left.
          </>
        ) : (
          "Try removing a filter or two — the combination you picked is quite narrow."
        )}
      </p>

      {filtersApplied && (
        // A plain link rather than a client component: it needs no state, and
        // navigating to the bare route is exactly "clear every filter".
        <a
          href="/colleges"
          className="mt-5 inline-flex rounded-lg bg-brand-600 px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-brand-700"
        >
          Clear all filters
        </a>
      )}
    </div>
  );
}
