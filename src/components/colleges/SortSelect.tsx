"use client";

import { DEFAULT_SORT, SORT_OPTIONS, type SortOption } from "@/lib/query/college-filters";
import { useFilterNavigation } from "@/lib/hooks/use-filter-navigation";

/**
 * Sort control.
 *
 * A native <select> rather than a custom dropdown. Custom dropdowns need
 * keyboard handling, focus trapping, type-ahead and ARIA roles to match what
 * the browser already does correctly — and on mobile the native control opens
 * the platform picker, which is genuinely better than anything we would build.
 * The styling gap is not worth the accessibility risk.
 */

const SORT_LABELS: Record<SortOption, string> = {
  rating: "Highest rated",
  "fee-low": "Fees: low to high",
  "fee-high": "Fees: high to low",
  nirf: "NIRF ranking",
  name: "Name (A–Z)",
};

export function SortSelect() {
  const { getParam, setParams } = useFilterNavigation();

  // Fall back to the default when the URL carries no sort, so the control
  // always shows what the server is actually doing rather than a blank option.
  const current = (getParam("sort") || DEFAULT_SORT) as SortOption;

  return (
    <div className="flex items-center gap-2">
      <label htmlFor="sort" className="shrink-0 text-sm text-text-secondary">
        Sort by
      </label>
      <select
        id="sort"
        value={current}
        onChange={(event) => {
          const value = event.target.value as SortOption;
          // Omit the parameter entirely when it matches the default, so the
          // canonical URL for an unsorted view stays clean.
          setParams({ sort: value === DEFAULT_SORT ? null : value });
        }}
        className="rounded-lg border border-border-subtle bg-surface-raised px-3 py-2 text-sm outline-none focus:border-brand-500"
      >
        {SORT_OPTIONS.map((option) => (
          <option key={option} value={option}>
            {SORT_LABELS[option]}
          </option>
        ))}
      </select>
    </div>
  );
}
