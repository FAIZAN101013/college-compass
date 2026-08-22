import Link from "next/link";
import { Badge } from "@/components/ui/Badge";
import { StarRating } from "@/components/ui/StarRating";
import { SaveButton } from "@/components/saved/SaveButton";
import { formatAnnualFee, formatNirf, formatReviewCount, titleCaseEnum } from "@/lib/format";
import type { CollegeCard as CollegeCardData } from "@/lib/queries/colleges";

/**
 * One result in the listing grid.
 *
 * A Server Component: it renders from props and has no interactivity, so none
 * of this code is sent to the browser. Twelve cards per page therefore cost
 * zero client JavaScript — which is the whole reason to keep "use client" at
 * the leaves of the tree rather than the top.
 *
 * The card shows exactly the four facts the assignment asks a listing to
 * carry — name, location, fees, rating — plus the ranking, because for Indian
 * colleges NIRF is usually the second thing a student looks at.
 */

/**
 * A deterministic gradient derived from the college name.
 *
 * Used instead of a photograph. We do not have a licensed image of each of
 * these institutions, and showing a stock photo of the wrong campus is worse
 * than showing no campus at all — it implies a claim about the place. This is
 * stable per college (same name, same gradient), so the grid stays visually
 * varied without being random on every render.
 */
function gradientFor(name: string): string {
  let hash = 0;
  for (let i = 0; i < name.length; i++) hash = (hash * 31 + name.charCodeAt(i)) >>> 0;
  const hue = hash % 360;
  return `linear-gradient(135deg, hsl(${hue} 55% 45%), hsl(${(hue + 40) % 360} 60% 32%))`;
}

/** Initials for the tile: "IIT Bombay" -> "IB", capped at three characters. */
function initialsOf(shortName: string): string {
  return shortName
    .split(/\s+/)
    .filter((word) => /^[A-Za-z]/.test(word))
    .slice(0, 3)
    .map((word) => word[0]!.toUpperCase())
    .join("");
}

export function CollegeCard({
  college,
  isSaved = false,
  isAuthenticated = false,
}: {
  college: CollegeCardData;
  isSaved?: boolean;
  isAuthenticated?: boolean;
}) {
  return (
    <article className="group relative flex flex-col overflow-hidden rounded-[var(--radius-card)] border border-border-subtle bg-surface-raised transition-shadow hover:shadow-lg focus-within:shadow-lg">
      <div className="flex items-start gap-3 p-4">
        <div
          className="flex size-12 shrink-0 items-center justify-center rounded-lg text-sm font-bold text-white"
          style={{ background: gradientFor(college.name) }}
          aria-hidden="true"
        >
          {initialsOf(college.shortName)}
        </div>

        <div className="min-w-0 flex-1">
          {/*
            The whole card is clickable via this stretched link rather than by
            wrapping the <article> in an <a>. Nesting interactive elements
            inside a link is invalid HTML and breaks keyboard navigation, and
            we will add a "compare" checkbox to this card later. This pattern
            keeps one accessible link as the card's primary action while
            leaving room for other controls on top of it.
          */}
          <h3 className="text-base leading-snug font-semibold">
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
        </div>

        {/*
          The save button sits ON TOP of the card's stretched link, which is
          why it carries relative + z-10 and stops click propagation. This is
          the cost of the stretched-link pattern: anything interactive on the
          card has to be lifted above the overlay deliberately.
        */}
        <SaveButton
          collegeId={college.id}
          initialSaved={isSaved}
          isAuthenticated={isAuthenticated}
        />
      </div>

      <div className="flex flex-wrap items-center gap-1.5 px-4">
        <Badge tone="brand">{titleCaseEnum(college.type)}</Badge>
        {college.nirfRank !== null && <Badge tone="neutral">{formatNirf(college.nirfRank)}</Badge>}
        <Badge tone="neutral">Est. {college.establishedYear}</Badge>
      </div>

      <div className="px-4 pt-3">
        <div className="flex flex-wrap gap-1">
          {/*
            Cap the visible streams so a college teaching six subjects does not
            make its card twice the height of its neighbours and break the grid
            alignment. The remainder is shown as a count.
          */}
          {college.streams.slice(0, 3).map((stream) => (
            <span key={stream} className="text-xs text-text-muted">
              {titleCaseEnum(stream)}
            </span>
          ))}
          {college.streams.length > 3 && (
            <span className="text-xs text-text-muted">+{college.streams.length - 3} more</span>
          )}
        </div>
      </div>

      {/* mt-auto pins this row to the bottom, so fees line up across a row of
          cards whose content above is different heights. */}
      <div className="mt-auto flex items-end justify-between gap-3 p-4 pt-3">
        <div>
          <p className="text-xs text-text-muted">Average annual fee</p>
          <p className="text-lg font-semibold tabular-nums">
            {formatAnnualFee(college.avgAnnualFee)}
          </p>
        </div>

        <div className="text-right">
          <StarRating rating={college.rating} />
          <p className="mt-0.5 text-xs text-text-muted">{formatReviewCount(college.reviewCount)}</p>
        </div>
      </div>
    </article>
  );
}

/**
 * Placeholder shown while results load.
 *
 * Deliberately built to the same dimensions as a real card. A skeleton that is
 * the wrong height causes the page to jump when data arrives, which is a worse
 * experience than no skeleton at all.
 */
export function CollegeCardSkeleton() {
  return (
    <div className="flex flex-col rounded-[var(--radius-card)] border border-border-subtle bg-surface-raised p-4">
      <div className="flex items-start gap-3">
        <div className="size-12 shrink-0 animate-pulse rounded-lg bg-surface-sunken" />
        <div className="flex-1 space-y-2">
          <div className="h-4 w-2/3 animate-pulse rounded bg-surface-sunken" />
          <div className="h-3 w-1/2 animate-pulse rounded bg-surface-sunken" />
        </div>
      </div>
      <div className="mt-4 flex gap-1.5">
        <div className="h-5 w-20 animate-pulse rounded bg-surface-sunken" />
        <div className="h-5 w-16 animate-pulse rounded bg-surface-sunken" />
      </div>
      <div className="mt-6 flex items-end justify-between">
        <div className="space-y-1.5">
          <div className="h-3 w-24 animate-pulse rounded bg-surface-sunken" />
          <div className="h-5 w-20 animate-pulse rounded bg-surface-sunken" />
        </div>
        <div className="h-5 w-24 animate-pulse rounded bg-surface-sunken" />
      </div>
    </div>
  );
}
