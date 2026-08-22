import type { Metadata } from "next";
import Link from "next/link";
import { CompareTable } from "@/components/compare/CompareTable";
import { ComparePicker } from "@/components/compare/ComparePicker";
import { getCollegesForCompare, getCompareCandidates } from "@/lib/queries/compare";
import { SaveComparisonButton } from "@/components/compare/SaveComparisonButton";
import { compareParamsSchema, MAX_COMPARE } from "@/lib/query/compare-params";
import { getSession } from "@/lib/auth/session";

export const metadata: Metadata = {
  title: "Compare colleges",
  description: "Put two or three colleges side by side on fees, placements, ranking and rating.",
};

/**
 * Side-by-side comparison.
 *
 * The selection lives entirely in ?ids=slug-a,slug-b, which is what makes a
 * comparison shareable. "Here are the three I am deciding between" is the
 * most useful thing a student can send a parent or a senior, and it only
 * works if the whole selection travels in the link.
 *
 * A Server Component: it reads the URL, loads the colleges and renders the
 * finished table. The only client code on this page is the picker.
 */
export default async function ComparePage({
  searchParams,
}: {
  searchParams: Promise<{ ids?: string | string[] }>;
}) {
  const raw = await searchParams;

  // A repeated ?ids=a&ids=b arrives as an array. Normalise to the comma form
  // the schema expects rather than making the schema understand both.
  const idsParam = Array.isArray(raw.ids) ? raw.ids.join(",") : raw.ids;

  // The schema de-duplicates, lowercases and caps at MAX_COMPARE. It cannot
  // fail — a malformed value yields an empty selection, which renders the
  // empty state rather than an error page.
  const { ids } = compareParamsSchema.parse({ ids: idsParam });

  const session = await getSession();
  const colleges = await getCollegesForCompare(ids);
  const candidates = await getCompareCandidates(ids);

  /**
   * Rebuild the ids parameter from the colleges we ACTUALLY loaded, not from
   * the requested ids.
   *
   * If a link contains a slug that no longer exists, the requested list and
   * the loaded list differ. Building "remove" links from the requested list
   * would keep resurrecting the dead slug in every subsequent URL.
   */
  const loadedSlugs = colleges.map((college) => college.slug);

  const removeHref = (slug: string) => {
    const remaining = loadedSlugs.filter((existing) => existing !== slug);
    return remaining.length > 0 ? `/compare?ids=${remaining.join(",")}` : "/compare";
  };

  return (
    <div className="mx-auto max-w-6xl px-4 py-6">
      <header className="mb-5">
        <h1 className="text-2xl font-bold tracking-tight">Compare colleges</h1>
        <p className="mt-1 text-sm text-text-secondary">
          Put up to {MAX_COMPARE} colleges side by side. The comparison lives in the URL, so you
          can share this page as a link.
        </p>
      </header>

      <div className="mb-6 max-w-md">
        <ComparePicker candidates={candidates} selected={loadedSlugs} />
      </div>

      {colleges.length === 0 && <EmptyState />}

      {colleges.length === 1 && (
        <div className="rounded-[var(--radius-card)] border border-dashed border-border-strong bg-surface-raised px-6 py-10 text-center">
          <p className="font-semibold">
            {colleges[0].shortName} is selected — add one more to compare
          </p>
          <p className="mt-1 text-sm text-text-secondary">
            A comparison needs at least two colleges. Use the box above to add another.
          </p>
        </div>
      )}

      {colleges.length >= 2 && (
        <>
          <div className="mb-4">
            <SaveComparisonButton
              slugs={loadedSlugs}
              suggestedName={colleges.map((c) => c.shortName).join(" vs ")}
              isAuthenticated={Boolean(session)}
            />
          </div>

          <CompareTable colleges={colleges} onRemoveHref={removeHref} />

          {/*
            Stated plainly, because a green "best here" tick invites more trust
            than the data deserves. Every highlight is a single-metric fact, and
            a college can win on fees while being the wrong choice overall.
          */}
          <p className="mt-4 text-xs text-text-muted">
            “Best here” marks the strongest value in that row only. It is not an overall
            recommendation — the right college depends on which of these rows matters to you.
            Fees and placement figures are representative sample data.
          </p>
        </>
      )}
    </div>
  );
}

function EmptyState() {
  return (
    <div className="rounded-[var(--radius-card)] border border-dashed border-border-strong bg-surface-raised px-6 py-14 text-center">
      <p className="text-lg font-semibold">Nothing to compare yet</p>
      <p className="mx-auto mt-2 max-w-md text-sm text-text-secondary">
        Search for a college above, or pick some while browsing — every college page has an “Add
        to compare” button.
      </p>
      <Link
        href="/colleges"
        className="mt-5 inline-flex rounded-lg bg-brand-600 px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-brand-700"
      >
        Browse colleges
      </Link>
    </div>
  );
}
