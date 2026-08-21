import { Badge } from "@/components/ui/Badge";
import { formatPackage, formatPercent } from "@/lib/format";
import type { CollegeDetail, PlacementTrend } from "@/lib/queries/college-detail";

/**
 * Placement statistics, including a three-year trend.
 *
 * This section is the schema decision paying off. Because Placement is one
 * row per college per year rather than a set of columns, the trend below is
 * arithmetic over data we already have. Had the schema stored
 * medianPackage2024 and medianPackage2025, adding 2026 would mean a migration,
 * a Prisma regeneration and edits to every component that touched it.
 *
 * The chart is plain CSS-sized divs, not a charting library. Three bars do not
 * justify shipping ~50KB of JavaScript to a page that is otherwise entirely
 * server-rendered, and a div with a percentage height cannot fail to hydrate.
 */
export function PlacementsPanel({
  placements,
  trend,
}: {
  placements: CollegeDetail["placements"];
  trend: PlacementTrend | null;
}) {
  if (!trend || placements.length === 0) {
    return <p className="text-sm text-text-secondary">No placement data reported yet.</p>;
  }

  const latest = placements[0];

  // Scale bars against the largest value so the tallest always fills the
  // chart. Scaling against a fixed maximum would leave every bar for a
  // modest college as an unreadable sliver.
  const peak = Math.max(...trend.series.map((point) => point.medianPackage));

  return (
    <div className="space-y-6">
      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        <Stat
          label={`Median package (${latest.year})`}
          value={formatPackage(latest.medianPackage)}
          hint="Half of placed students earned at least this"
          emphasis
        />
        <Stat label="Average package" value={formatPackage(latest.averagePackage)} />
        <Stat
          label="Highest package"
          value={formatPackage(latest.highestPackage)}
          hint="A single offer — not typical"
        />
        <Stat label="Students placed" value={formatPercent(latest.placementRate)} />
      </div>

      {/*
        The median leads and is emphasised, with the highest package explicitly
        captioned as atypical. College marketing leads with the highest offer
        because it is the largest number; presenting it that way here would
        repeat a distortion this product exists to cut through.
      */}
      <div>
        <div className="mb-3 flex flex-wrap items-center gap-2">
          <h3 className="text-sm font-semibold">Median package trend</h3>
          {trend.changePercent !== null && (
            <Badge tone={trend.changePercent >= 0 ? "positive" : "warning"}>
              {trend.changePercent >= 0 ? "▲" : "▼"} {Math.abs(trend.changePercent).toFixed(1)}% vs{" "}
              {trend.latestYear - 1}
            </Badge>
          )}
        </div>

        <div className="flex items-end gap-4 rounded-[var(--radius-card)] border border-border-subtle bg-surface-sunken p-4">
          {trend.series.map((point) => (
            <div key={point.year} className="flex flex-1 flex-col items-center gap-2">
              <span className="text-xs font-medium tabular-nums">
                {formatPackage(point.medianPackage)}
              </span>
              <div
                className="w-full rounded-t bg-brand-500"
                // Floor the height so a genuinely small value still renders a
                // visible bar instead of vanishing into the axis.
                style={{ height: `${Math.max(8, (point.medianPackage / peak) * 120)}px` }}
                // The figures are printed above and below the bar, so the bar
                // itself carries no information a screen reader needs.
                aria-hidden="true"
              />
              <span className="text-xs text-text-muted tabular-nums">{point.year}</span>
            </div>
          ))}
        </div>
      </div>

      {latest.topRecruiters.length > 0 && (
        <div>
          <h3 className="mb-2 text-sm font-semibold">Top recruiters ({latest.year})</h3>
          <div className="flex flex-wrap gap-1.5">
            {latest.topRecruiters.map((recruiter) => (
              <Badge key={recruiter} tone="neutral">
                {recruiter}
              </Badge>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

function Stat({
  label,
  value,
  hint,
  emphasis = false,
}: {
  label: string;
  value: string;
  hint?: string;
  emphasis?: boolean;
}) {
  return (
    <div
      className={`rounded-[var(--radius-card)] border p-3 ${
        emphasis
          ? "border-brand-200 bg-brand-50 dark:border-brand-800 dark:bg-brand-900/30"
          : "border-border-subtle bg-surface-raised"
      }`}
    >
      <p className="text-xs text-text-muted">{label}</p>
      <p className="mt-1 text-xl font-semibold tabular-nums">{value}</p>
      {hint && <p className="mt-1 text-xs text-text-muted">{hint}</p>}
    </div>
  );
}
