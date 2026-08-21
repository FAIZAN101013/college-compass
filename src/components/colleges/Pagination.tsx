import Link from "next/link";
import type { PageInfo } from "@/lib/queries/colleges";

/**
 * Page navigation.
 *
 * A Server Component built from <Link>, not buttons with onClick. That choice
 * has three consequences worth stating:
 *
 *   - Each page is a real URL, so it can be bookmarked, shared and indexed.
 *   - Middle-click and ctrl-click open a page in a new tab, because these are
 *     genuine links. A button intercepting clicks silently breaks that.
 *   - Zero JavaScript is shipped for it.
 *
 * Links also scroll to the top on navigation, which is the right behaviour
 * here — the opposite of a filter change, which should leave you in place.
 */

/**
 * Which page numbers to render.
 *
 * Always the first and last page, plus a window around the current one, with
 * gaps collapsed to an ellipsis. Rendering all twelve pages works today and
 * breaks the moment the catalogue reaches a hundred, so the windowing is here
 * from the start rather than as a later fix.
 */
function pageWindow(current: number, total: number): (number | "gap")[] {
  if (total <= 7) {
    return Array.from({ length: total }, (_, i) => i + 1);
  }

  const pages = new Set<number>([1, total, current]);
  if (current - 1 > 1) pages.add(current - 1);
  if (current + 1 < total) pages.add(current + 1);

  // Keep the row a constant width near the ends, so the control does not
  // visibly resize as you page through.
  if (current <= 3) [2, 3, 4].forEach((p) => p < total && pages.add(p));
  if (current >= total - 2) [total - 1, total - 2, total - 3].forEach((p) => p > 1 && pages.add(p));

  const sorted = [...pages].sort((a, b) => a - b);
  const result: (number | "gap")[] = [];

  for (let i = 0; i < sorted.length; i++) {
    if (i > 0 && sorted[i] - sorted[i - 1] > 1) result.push("gap");
    result.push(sorted[i]);
  }

  return result;
}

export function Pagination({
  pageInfo,
  searchParams,
}: {
  pageInfo: PageInfo;
  /** The current query string, so page links preserve every active filter. */
  searchParams: URLSearchParams;
}) {
  const { page, totalPages } = pageInfo;

  // A single page needs no navigation. Rendering a disabled control would be
  // noise on a screen that already says how many results there are.
  if (totalPages <= 1) return null;

  const hrefFor = (target: number) => {
    const params = new URLSearchParams(searchParams);
    // Page 1 is the canonical URL, so it carries no page parameter at all.
    // Two URLs for the same content is bad for sharing and worse for search
    // engines, which treat them as duplicates.
    if (target === 1) params.delete("page");
    else params.set("page", String(target));

    const query = params.toString();
    return query ? `/colleges?${query}` : "/colleges";
  };

  const arrowClass =
    "inline-flex h-9 items-center rounded-lg border border-border-subtle bg-surface-raised px-3 text-sm font-medium transition-colors hover:border-border-strong";
  const disabledClass =
    "inline-flex h-9 items-center rounded-lg border border-border-subtle px-3 text-sm font-medium text-text-muted opacity-50";

  return (
    // aria-label because a page can hold several <nav> landmarks, and a screen
    // reader user cycling through them needs to know which is which.
    <nav aria-label="Pagination" className="flex flex-wrap items-center justify-center gap-1.5">
      {pageInfo.hasPreviousPage ? (
        <Link href={hrefFor(page - 1)} rel="prev" className={arrowClass}>
          ← Prev
        </Link>
      ) : (
        // A <span>, not a disabled <a>. There is no such thing as a disabled
        // link in HTML, and a link to nowhere is still focusable and clickable.
        <span className={disabledClass} aria-hidden="true">
          ← Prev
        </span>
      )}

      {pageWindow(page, totalPages).map((entry, index) =>
        entry === "gap" ? (
          <span key={`gap-${index}`} className="px-1 text-text-muted" aria-hidden="true">
            …
          </span>
        ) : (
          <Link
            key={entry}
            href={hrefFor(entry)}
            // aria-current tells assistive technology which page you are on.
            // Colour alone conveys that to sighted users only.
            aria-current={entry === page ? "page" : undefined}
            className={`inline-flex h-9 min-w-9 items-center justify-center rounded-lg border px-2 text-sm font-medium tabular-nums transition-colors ${
              entry === page
                ? "border-brand-600 bg-brand-600 text-white"
                : "border-border-subtle bg-surface-raised hover:border-border-strong"
            }`}
          >
            {entry}
          </Link>
        ),
      )}

      {pageInfo.hasNextPage ? (
        <Link href={hrefFor(page + 1)} rel="next" className={arrowClass}>
          Next →
        </Link>
      ) : (
        <span className={disabledClass} aria-hidden="true">
          Next →
        </span>
      )}
    </nav>
  );
}
