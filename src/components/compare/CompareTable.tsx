import Link from "next/link";
import { Badge } from "@/components/ui/Badge";
import { StarRating } from "@/components/ui/StarRating";
import { bestIndex, type Direction } from "@/lib/query/compare-params";
import type { CompareCollege } from "@/lib/queries/compare";
import {
  formatNumber,
  formatPackage,
  formatPercent,
  formatRating,
  formatRupees,
  titleCaseEnum,
} from "@/lib/format";

/**
 * The side-by-side comparison grid.
 *
 * Every row is declared as data below rather than written out as JSX. Two
 * reasons that matters:
 *
 *   1. Adding a comparison metric becomes one entry in an array instead of
 *      edits in three places that must be kept in step.
 *   2. Each row carries its own `direction`, so the "best value" highlight is
 *      derived from a property of the metric rather than an assumption. A
 *      lower fee wins, a higher rating wins, and a lower NIRF rank wins
 *      because rank 1 is the top. Hardcoding "biggest number wins" would
 *      cheerfully crown the most expensive, worst-ranked college.
 */

type Row = {
  label: string;
  /** Optional clarification shown under the label. */
  hint?: string;
  /** The comparable number, or null when this college has no value. */
  value: (college: CompareCollege) => number | null;
  /** How to display it. Separate from `value` so we compare numbers, not strings. */
  render: (college: CompareCollege) => React.ReactNode;
  /** Omit to disable highlighting for rows where "better" is meaningless. */
  direction?: Direction;
};

/** Lowest course fee at a college, or null when it lists no courses. */
function cheapestCourseFee(college: CompareCollege): number | null {
  if (college.courses.length === 0) return null;
  return Math.min(...college.courses.map((course) => course.annualFee));
}

const ROWS: Row[] = [
  {
    label: "Location",
    value: () => null, // not comparable
    render: (c) => (
      <span>
        {c.city}
        <span className="block text-xs text-text-muted">{c.state}</span>
      </span>
    ),
  },
  {
    label: "Institution type",
    value: () => null,
    render: (c) => <Badge tone="brand">{titleCaseEnum(c.type)}</Badge>,
  },
  {
    label: "Established",
    // Deliberately not comparable. An older college is not automatically a
    // better one, and highlighting the oldest would assert something we do
    // not believe.
    value: () => null,
    render: (c) => <span className="tabular-nums">{c.establishedYear}</span>,
  },
  {
    label: "NIRF rank",
    hint: "Lower is better",
    direction: "lower-is-better",
    value: (c) => c.nirfRank,
    render: (c) =>
      c.nirfRank === null ? (
        <span className="text-text-muted">Unranked</span>
      ) : (
        <span className="tabular-nums">#{c.nirfRank}</span>
      ),
  },
  {
    label: "Student rating",
    direction: "higher-is-better",
    value: (c) => c.rating,
    render: (c) => <StarRating rating={c.rating} />,
  },
  {
    label: "Reviews",
    hint: "More reviews, more reliable",
    direction: "higher-is-better",
    value: (c) => c.reviewCount,
    render: (c) => <span className="tabular-nums">{formatNumber(c.reviewCount)}</span>,
  },
  {
    label: "Average annual fee",
    hint: "Lower is better",
    direction: "lower-is-better",
    value: (c) => c.avgAnnualFee,
    render: (c) => <span className="font-medium tabular-nums">{formatRupees(c.avgAnnualFee)}</span>,
  },
  {
    label: "Cheapest course",
    direction: "lower-is-better",
    value: cheapestCourseFee,
    render: (c) => {
      const fee = cheapestCourseFee(c);
      return fee === null ? (
        <span className="text-text-muted">—</span>
      ) : (
        <span className="tabular-nums">{formatRupees(fee)}</span>
      );
    },
  },
  {
    label: "Courses offered",
    direction: "higher-is-better",
    value: (c) => c.courses.length,
    render: (c) => <span className="tabular-nums">{c.courses.length}</span>,
  },
  {
    label: "Streams",
    value: () => null,
    render: (c) => (
      <span className="flex flex-wrap gap-1">
        {c.streams.map((stream) => (
          <Badge key={stream} tone="neutral">
            {titleCaseEnum(stream)}
          </Badge>
        ))}
      </span>
    ),
  },
  {
    label: "Median package",
    hint: "Harder to game than average",
    direction: "higher-is-better",
    value: (c) => c.placements[0]?.medianPackage ?? null,
    render: (c) => {
      const placement = c.placements[0];
      return placement ? (
        <span className="font-medium tabular-nums">
          {formatPackage(placement.medianPackage)}
          <span className="block text-xs font-normal text-text-muted">{placement.year}</span>
        </span>
      ) : (
        <span className="text-text-muted">Not reported</span>
      );
    },
  },
  {
    label: "Highest package",
    hint: "One offer — not typical",
    direction: "higher-is-better",
    value: (c) => c.placements[0]?.highestPackage ?? null,
    render: (c) =>
      c.placements[0] ? (
        <span className="tabular-nums">{formatPackage(c.placements[0].highestPackage)}</span>
      ) : (
        <span className="text-text-muted">—</span>
      ),
  },
  {
    label: "Students placed",
    direction: "higher-is-better",
    value: (c) => c.placements[0]?.placementRate ?? null,
    render: (c) =>
      c.placements[0] ? (
        <span className="tabular-nums">{formatPercent(c.placements[0].placementRate)}</span>
      ) : (
        <span className="text-text-muted">—</span>
      ),
  },
  {
    label: "Approvals",
    value: () => null,
    render: (c) => (
      <span className="flex flex-wrap gap-1">
        {c.approvedBy.map((body) => (
          <Badge key={body} tone="positive">
            {body}
          </Badge>
        ))}
      </span>
    ),
  },
];

export function CompareTable({
  colleges,
  onRemoveHref,
}: {
  colleges: CompareCollege[];
  /** Link that removes a college from the comparison. */
  onRemoveHref: (slug: string) => string;
}) {
  return (
    <div className="overflow-x-auto rounded-[var(--radius-card)] border border-border-subtle">
      <table className="w-full border-collapse text-sm">
        <caption className="sr-only">
          Side-by-side comparison of {colleges.map((c) => c.shortName).join(", ")}
        </caption>

        <thead>
          <tr>
            {/*
              The label column is sticky so the row name stays visible while
              the college columns scroll sideways on a narrow screen. Without
              it you scroll to a number and can no longer see what it measures.
            */}
            <th
              scope="col"
              className="sticky left-0 z-10 min-w-[150px] bg-surface-sunken px-4 py-3 text-left font-semibold"
            >
              <span className="sr-only">Metric</span>
            </th>

            {colleges.map((college) => (
              <th
                key={college.id}
                scope="col"
                className="min-w-[190px] border-l border-border-subtle bg-surface-sunken px-4 py-3 text-left align-top"
              >
                <Link href={`/colleges/${college.slug}`} className="font-semibold hover:underline">
                  {college.shortName}
                </Link>
                <span className="mt-0.5 block text-xs font-normal text-text-muted">
                  {college.city}
                </span>
                <Link
                  href={onRemoveHref(college.slug)}
                  className="mt-2 inline-block text-xs font-medium text-text-muted hover:text-negative hover:underline"
                >
                  Remove
                </Link>
              </th>
            ))}
          </tr>
        </thead>

        <tbody>
          {ROWS.map((row) => {
            // Highlighting is computed once per row, from the numeric values,
            // never from the rendered strings — "₹1,50,000" does not compare
            // usefully against "₹90,000" as text.
            const winner = row.direction
              ? bestIndex(colleges.map(row.value), row.direction)
              : null;

            return (
              <tr key={row.label} className="border-t border-border-subtle">
                <th
                  scope="row"
                  className="sticky left-0 z-10 bg-surface-raised px-4 py-3 text-left align-top font-medium"
                >
                  {row.label}
                  {row.hint && (
                    <span className="mt-0.5 block text-xs font-normal text-text-muted">
                      {row.hint}
                    </span>
                  )}
                </th>

                {colleges.map((college, index) => (
                  <td
                    key={college.id}
                    className={`border-l border-border-subtle px-4 py-3 align-top ${
                      index === winner
                        ? "bg-emerald-50 dark:bg-emerald-950/40"
                        : "bg-surface-raised"
                    }`}
                  >
                    {row.render(college)}
                    {/*
                      The winning cell is marked with colour AND a text label.
                      Colour alone excludes anyone who cannot distinguish it —
                      colour blindness, a monochrome screen, a screen reader.
                    */}
                    {index === winner && (
                      <span className="mt-1 block text-xs font-medium text-positive">
                        ✓ Best here
                      </span>
                    )}
                  </td>
                ))}
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}
