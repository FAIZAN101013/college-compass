"use client";

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { MAX_COMPARE } from "@/lib/query/compare-params";

type Candidate = { slug: string; shortName: string; city: string; state: string };

/**
 * Adds a college to the comparison.
 *
 * A Client Component because it filters a list as you type. The candidate
 * list arrives from the server as props rather than being fetched here: it is
 * a few hundred short rows, so shipping it once with the page is cheaper than
 * a request per keystroke, and it means typing filters instantly with no
 * network round trip at all.
 *
 * Selecting a college navigates — the comparison lives in the URL, so adding
 * one is a URL change like every other state change in this app.
 */
export function ComparePicker({
  candidates,
  selected,
}: {
  candidates: Candidate[];
  selected: string[];
}) {
  const router = useRouter();
  const [query, setQuery] = useState("");
  const [open, setOpen] = useState(false);

  const isFull = selected.length >= MAX_COMPARE;

  const matches = useMemo(() => {
    const term = query.trim().toLowerCase();
    if (!term) return candidates.slice(0, 8);

    return candidates
      .filter(
        (candidate) =>
          candidate.shortName.toLowerCase().includes(term) ||
          candidate.city.toLowerCase().includes(term) ||
          candidate.state.toLowerCase().includes(term),
      )
      .slice(0, 8);
  }, [candidates, query]);

  function add(slug: string) {
    // Rebuild the ids parameter rather than appending to a string, so the cap
    // and the ordering stay in one place and cannot be bypassed by a stale UI.
    const next = [...selected, slug].slice(0, MAX_COMPARE);
    setQuery("");
    setOpen(false);
    router.push(`/compare?ids=${next.join(",")}`);
  }

  if (isFull) {
    return (
      <p className="rounded-lg border border-border-subtle bg-surface-sunken px-4 py-3 text-sm text-text-secondary">
        Comparing {MAX_COMPARE} colleges — the maximum. Remove one to add another.
      </p>
    );
  }

  return (
    <div className="relative">
      <label htmlFor="compare-picker" className="sr-only">
        Add a college to compare
      </label>
      <input
        id="compare-picker"
        type="text"
        value={query}
        onChange={(event) => {
          setQuery(event.target.value);
          setOpen(true);
        }}
        onFocus={() => setOpen(true)}
        // A short delay before closing, because a click on an option fires
        // AFTER blur. Closing immediately would unmount the option under the
        // cursor and the click would never land.
        onBlur={() => setTimeout(() => setOpen(false), 150)}
        placeholder={`Add a college to compare (${selected.length}/${MAX_COMPARE})`}
        autoComplete="off"
        className="w-full rounded-lg border border-border-subtle bg-surface-raised px-3 py-2.5 text-sm outline-none focus:border-brand-500"
      />

      {open && matches.length > 0 && (
        <ul className="absolute z-20 mt-1 max-h-72 w-full overflow-y-auto rounded-lg border border-border-subtle bg-surface-raised shadow-lg">
          {matches.map((candidate) => (
            <li key={candidate.slug}>
              <button
                type="button"
                onClick={() => add(candidate.slug)}
                className="flex w-full items-center justify-between gap-3 px-3 py-2 text-left text-sm hover:bg-surface-sunken"
              >
                <span className="font-medium">{candidate.shortName}</span>
                <span className="shrink-0 text-xs text-text-muted">
                  {candidate.city}, {candidate.state}
                </span>
              </button>
            </li>
          ))}
        </ul>
      )}

      {open && query && matches.length === 0 && (
        <p className="absolute z-20 mt-1 w-full rounded-lg border border-border-subtle bg-surface-raised px-3 py-2 text-sm text-text-muted shadow-lg">
          No college matches “{query}”.
        </p>
      )}
    </div>
  );
}
