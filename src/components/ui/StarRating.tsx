import { formatRating } from "@/lib/format";

/**
 * Star rating with partial fill.
 *
 * Drawn as two overlaid rows of stars — a grey row, and a coloured row
 * clipped to the rating's width — rather than rounding to whole or half
 * stars. A 4.3 that renders as 4 stars is a visible lie about the data we
 * actually hold, and rounding up is worse: it flatters colleges.
 *
 * A Server Component. It has no interactivity, so it ships zero JavaScript.
 */
export function StarRating({
  rating,
  size = "sm",
  showNumber = true,
}: {
  rating: number;
  size?: "sm" | "md";
  showNumber?: boolean;
}) {
  // Clamp so malformed data cannot render a 7-star row or a negative width.
  const clamped = Math.max(0, Math.min(5, rating));
  const percent = (clamped / 5) * 100;

  const starSize = size === "sm" ? "text-sm" : "text-lg";

  return (
    <span className="inline-flex items-center gap-1.5">
      {/*
        aria-hidden on the visual stars, with the real value in the label.
        A screen reader announcing "star star star star star" is noise; it
        should hear "Rated 4.3 out of 5".
      */}
      <span
        className={`relative inline-block ${starSize} leading-none tracking-tight`}
        aria-hidden="true"
      >
        <span className="text-border-strong">★★★★★</span>
        <span
          className="absolute inset-0 overflow-hidden text-amber-400"
          style={{ width: `${percent}%` }}
        >
          ★★★★★
        </span>
      </span>

      {showNumber && (
        <span className="text-sm font-semibold tabular-nums">{formatRating(clamped)}</span>
      )}

      <span className="sr-only">Rated {formatRating(clamped)} out of 5</span>
    </span>
  );
}
