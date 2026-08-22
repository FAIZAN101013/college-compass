import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";
import { Badge } from "@/components/ui/Badge";
import { StarRating } from "@/components/ui/StarRating";
import { SaveButton } from "@/components/saved/SaveButton";
import { DeleteComparisonButton } from "@/components/saved/DeleteComparisonButton";
import { getSession } from "@/lib/auth/session";
import { listSavedColleges, listSavedComparisons } from "@/lib/queries/saved";
import { formatAnnualFee, formatNirf, titleCaseEnum } from "@/lib/format";

export const metadata: Metadata = {
  title: "Saved",
  description: "Colleges and comparisons you have saved.",
};

export default async function SavedPage() {
  const session = await getSession();

  /**
   * The real access control is here, on the server, not in the header.
   *
   * Hiding the "Saved" link from signed-out users is presentation. Anyone can
   * type /saved into the address bar, so the page itself must check. Every
   * protected route in this app re-checks — a nav that only *looks* protected
   * is not protection.
   */
  if (!session) redirect("/login?next=/saved");

  const colleges = await listSavedColleges(session.id);
  const comparisons = await listSavedComparisons(session.id);

  return (
    <div className="mx-auto max-w-5xl px-4 py-6">
      <header className="mb-6">
        <h1 className="text-2xl font-bold tracking-tight">Saved</h1>
        <p className="mt-1 text-sm text-text-secondary">
          Signed in as {session.email}
        </p>
      </header>

      <section className="mb-10">
        <h2 className="mb-3 text-lg font-semibold tracking-tight">
          Colleges {colleges.length > 0 && <span className="text-text-muted">({colleges.length})</span>}
        </h2>

        {colleges.length === 0 ? (
          <EmptyBlock
            title="No saved colleges yet"
            body="Tap the bookmark icon on any college to keep it here."
            href="/colleges"
            cta="Browse colleges"
          />
        ) : (
          <ul className="grid gap-3 sm:grid-cols-2">
            {colleges.map((college) => (
              <li
                key={college.id}
                className="relative flex items-start justify-between gap-3 rounded-[var(--radius-card)] border border-border-subtle bg-surface-raised p-4"
              >
                <div className="min-w-0">
                  <h3 className="font-semibold">
                    <Link
                      href={`/colleges/${college.slug}`}
                      className="after:absolute after:inset-0 after:content-['']"
                    >
                      {college.shortName}
                    </Link>
                  </h3>
                  <p className="mt-0.5 truncate text-sm text-text-secondary">
                    {college.city}, {college.state}
                  </p>

                  <div className="mt-2 flex flex-wrap items-center gap-1.5">
                    <Badge tone="brand">{titleCaseEnum(college.type)}</Badge>
                    {college.nirfRank !== null && (
                      <Badge tone="neutral">{formatNirf(college.nirfRank)}</Badge>
                    )}
                  </div>

                  <div className="mt-2 flex items-center gap-3">
                    <StarRating rating={college.rating} />
                    <span className="text-sm text-text-secondary tabular-nums">
                      {formatAnnualFee(college.avgAnnualFee)}
                    </span>
                  </div>
                </div>

                {/* initialSaved is always true here — everything on this page is
                    saved by definition. Clicking un-saves and the row
                    disappears on the router.refresh() the button triggers. */}
                <SaveButton collegeId={college.id} initialSaved isAuthenticated />
              </li>
            ))}
          </ul>
        )}
      </section>

      <section>
        <h2 className="mb-3 text-lg font-semibold tracking-tight">
          Comparisons{" "}
          {comparisons.length > 0 && <span className="text-text-muted">({comparisons.length})</span>}
        </h2>

        {comparisons.length === 0 ? (
          <EmptyBlock
            title="No saved comparisons yet"
            body="Put two or three colleges side by side, then save the comparison to return to it."
            href="/compare"
            cta="Compare colleges"
          />
        ) : (
          <ul className="space-y-3">
            {comparisons.map((comparison) => (
              <li
                key={comparison.id}
                className="rounded-[var(--radius-card)] border border-border-subtle bg-surface-raised p-4"
              >
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <div className="min-w-0">
                    <h3 className="font-semibold">{comparison.name}</h3>
                    <p className="mt-0.5 text-sm text-text-secondary">
                      {comparison.colleges.map((college) => college.shortName).join("  ·  ")}
                    </p>
                  </div>

                  <div className="flex shrink-0 items-center gap-2">
                    {/*
                      Rebuilds the compare URL from the SAVED ORDER, so
                      reopening a comparison puts the columns exactly where the
                      user left them. This is why collegeIds is an ordered
                      array rather than a join table.
                    */}
                    <Link
                      href={`/compare?ids=${comparison.colleges.map((c) => c.slug).join(",")}`}
                      className="rounded-lg border border-brand-600 px-3 py-1.5 text-sm font-medium text-brand-600 transition-colors hover:bg-brand-50 dark:hover:bg-brand-900/30"
                    >
                      Open
                    </Link>
                    <DeleteComparisonButton id={comparison.id} name={comparison.name} />
                  </div>
                </div>
              </li>
            ))}
          </ul>
        )}
      </section>
    </div>
  );
}

function EmptyBlock({
  title,
  body,
  href,
  cta,
}: {
  title: string;
  body: string;
  href: string;
  cta: string;
}) {
  return (
    <div className="rounded-[var(--radius-card)] border border-dashed border-border-strong bg-surface-raised px-6 py-10 text-center">
      <p className="font-semibold">{title}</p>
      <p className="mx-auto mt-1 max-w-sm text-sm text-text-secondary">{body}</p>
      <Link
        href={href}
        className="mt-4 inline-flex rounded-lg bg-brand-600 px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-brand-700"
      >
        {cta}
      </Link>
    </div>
  );
}
