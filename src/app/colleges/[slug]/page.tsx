import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { Badge } from "@/components/ui/Badge";
import { StarRating } from "@/components/ui/StarRating";
import { CoursesTable } from "@/components/colleges/CoursesTable";
import { PlacementsPanel } from "@/components/colleges/PlacementsPanel";
import { ReviewsPanel } from "@/components/colleges/ReviewsPanel";
import {
  buildPlacementTrend,
  getCollegeBySlug,
  getSimilarColleges,
} from "@/lib/queries/college-detail";
import {
  formatAnnualFee,
  formatNirf,
  formatNumber,
  formatPackage,
  formatRupees,
  titleCaseEnum,
} from "@/lib/format";

type Params = { params: Promise<{ slug: string }> };

/**
 * Per-college page metadata.
 *
 * Without this every college would share the site-wide title, so a link
 * shared in WhatsApp would preview as "College Compass" regardless of which
 * college it pointed at — and search engines would see 143 pages that all
 * look like the same page.
 *
 * Next.js de-duplicates the fetch: getCollegeBySlug is called here and again
 * in the page component, but within one request React caches it so the
 * database is hit once.
 */
export async function generateMetadata({ params }: Params): Promise<Metadata> {
  const { slug } = await params;
  const college = await getCollegeBySlug(slug);

  if (!college) return { title: "College not found" };

  return {
    title: `${college.shortName} — fees, placements and reviews`,
    description:
      `${college.name}, ${college.city}. Average annual fee ` +
      `${formatAnnualFee(college.avgAnnualFee)}, rated ${college.rating} from ` +
      `${college.reviewCount} student reviews.`,
    // Canonical URL, so ?ref=whatsapp style tracking parameters do not create
    // what a search engine reads as duplicate pages.
    alternates: { canonical: `/colleges/${college.slug}` },
  };
}

export default async function CollegeDetailPage({ params }: Params) {
  const { slug } = await params;
  const college = await getCollegeBySlug(slug);

  /**
   * A real 404, not a page that says "not found" with status 200.
   *
   * The second is a "soft 404": the browser and any crawler are told the
   * request succeeded, so search engines index the error page as real
   * content and monitoring never sees the failure. notFound() renders
   * not-found.tsx AND sets the status code.
   */
  if (!college) notFound();

  const trend = buildPlacementTrend(college.placements);
  const similar = await getSimilarColleges(college);

  const cheapestCourse = college.courses[0]; // the query orders by fee ascending

  return (
    <div className="mx-auto max-w-5xl px-4 py-6">
      {/* Breadcrumb: shows where you are and gives a one-click way back to the
          filtered list. aria-label because a page can hold several navs. */}
      <nav aria-label="Breadcrumb" className="mb-4 text-sm text-text-secondary">
        <Link href="/colleges" className="hover:text-text-primary hover:underline">
          Colleges
        </Link>
        <span className="mx-1.5" aria-hidden="true">
          /
        </span>
        <span className="text-text-primary">{college.shortName}</span>
      </nav>

      <header className="rounded-[var(--radius-card)] border border-border-subtle bg-surface-raised p-5">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div className="min-w-0">
            <h1 className="text-2xl font-bold tracking-tight">{college.name}</h1>
            <p className="mt-1 text-text-secondary">
              {college.city}, {college.state}
            </p>

            <div className="mt-3 flex flex-wrap items-center gap-1.5">
              <Badge tone="brand">{titleCaseEnum(college.type)}</Badge>
              {college.nirfRank !== null && (
                <Badge tone="neutral">{formatNirf(college.nirfRank)}</Badge>
              )}
              <Badge tone="neutral">Established {college.establishedYear}</Badge>
              {college.approvedBy.map((body) => (
                <Badge key={body} tone="positive">
                  {body}
                </Badge>
              ))}
            </div>
          </div>

          <div className="shrink-0 text-right">
            <StarRating rating={college.rating} size="md" />
            <p className="mt-1 text-xs text-text-muted">
              {formatNumber(college.reviewCount)} reviews
            </p>
            <Link
              href={`/compare?ids=${college.slug}`}
              className="mt-3 inline-flex rounded-lg border border-brand-600 px-3 py-1.5 text-sm font-medium text-brand-600 transition-colors hover:bg-brand-50 dark:hover:bg-brand-900/30"
            >
              Add to compare
            </Link>
          </div>
        </div>
      </header>

      <div className="mt-4 grid gap-3 sm:grid-cols-3">
        <KeyFact label="Average annual fee" value={formatAnnualFee(college.avgAnnualFee)} />
        <KeyFact
          label="Lowest course fee"
          value={cheapestCourse ? formatRupees(cheapestCourse.annualFee) : "—"}
          hint={cheapestCourse?.name}
        />
        <KeyFact
          label={trend ? `Median package (${trend.latestYear})` : "Median package"}
          value={trend ? formatPackage(trend.medianPackage) : "Not reported"}
        />
      </div>

      <Section title="Overview">
        <p className="leading-relaxed text-text-secondary">{college.description}</p>

        {college.facilities.length > 0 && (
          <div className="mt-4">
            <h3 className="mb-2 text-sm font-semibold">Facilities</h3>
            <div className="flex flex-wrap gap-1.5">
              {college.facilities.map((facility) => (
                <Badge key={facility} tone="neutral">
                  {facility}
                </Badge>
              ))}
            </div>
          </div>
        )}
      </Section>

      <Section title={`Courses (${college.courses.length})`}>
        <CoursesTable courses={college.courses} />
      </Section>

      <Section title="Placements">
        <PlacementsPanel placements={college.placements} trend={trend} />
      </Section>

      <Section title="Student reviews">
        <ReviewsPanel
          reviews={college.reviews}
          rating={college.rating}
          reviewCount={college.reviewCount}
        />
      </Section>

      {similar.length > 0 && (
        <Section title="Similar colleges">
          <div className="grid gap-3 sm:grid-cols-2">
            {similar.map((other) => (
              <Link
                key={other.id}
                href={`/colleges/${other.slug}`}
                className="flex items-center justify-between gap-3 rounded-[var(--radius-card)] border border-border-subtle bg-surface-raised p-3 transition-colors hover:border-border-strong"
              >
                <div className="min-w-0">
                  <p className="truncate font-medium">{other.shortName}</p>
                  <p className="truncate text-xs text-text-secondary">
                    {other.city}, {other.state}
                  </p>
                </div>
                <div className="shrink-0 text-right">
                  <StarRating rating={other.rating} />
                  <p className="mt-0.5 text-xs text-text-muted tabular-nums">
                    {formatAnnualFee(other.avgAnnualFee)}
                  </p>
                </div>
              </Link>
            ))}
          </div>
        </Section>
      )}
    </div>
  );
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section className="mt-8">
      <h2 className="mb-3 text-lg font-semibold tracking-tight">{title}</h2>
      {children}
    </section>
  );
}

function KeyFact({ label, value, hint }: { label: string; value: string; hint?: string }) {
  return (
    <div className="rounded-[var(--radius-card)] border border-border-subtle bg-surface-raised p-3">
      <p className="text-xs text-text-muted">{label}</p>
      <p className="mt-1 text-lg font-semibold tabular-nums">{value}</p>
      {hint && <p className="mt-0.5 truncate text-xs text-text-muted">{hint}</p>}
    </div>
  );
}
