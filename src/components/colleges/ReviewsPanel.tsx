import { StarRating } from "@/components/ui/StarRating";
import { formatRating, formatReviewCount } from "@/lib/format";
import { ratingDistribution, REVIEW_PAGE_SIZE, type CollegeDetail } from "@/lib/queries/college-detail";

/**
 * Student reviews, with a rating distribution.
 *
 * The distribution matters more than the average. A 4.0 built from a spread
 * of fives and twos describes a very different place from a 4.0 where every
 * review is a four, and the single averaged number hides that completely.
 */
export function ReviewsPanel({
  reviews,
  rating,
  reviewCount,
}: {
  reviews: CollegeDetail["reviews"];
  rating: number;
  reviewCount: number;
}) {
  if (reviews.length === 0) {
    return (
      <p className="text-sm text-text-secondary">
        No reviews yet. Be the first student to write one.
      </p>
    );
  }

  // The query deliberately fetches one more review than we display, so we can
  // tell whether more exist without paying for a separate COUNT query.
  const hasMore = reviews.length > REVIEW_PAGE_SIZE;
  const visible = reviews.slice(0, REVIEW_PAGE_SIZE);
  const distribution = ratingDistribution(visible);

  return (
    <div className="space-y-6">
      <div className="grid gap-6 rounded-[var(--radius-card)] border border-border-subtle bg-surface-sunken p-4 sm:grid-cols-[auto_minmax(0,1fr)]">
        <div className="text-center sm:text-left">
          <p className="text-4xl font-bold tabular-nums">{formatRating(rating)}</p>
          <StarRating rating={rating} size="md" showNumber={false} />
          <p className="mt-1 text-xs text-text-muted">{formatReviewCount(reviewCount)}</p>
        </div>

        <div className="space-y-1.5">
          {distribution.map((row) => (
            <div key={row.stars} className="flex items-center gap-2 text-xs">
              <span className="w-6 shrink-0 text-right tabular-nums">{row.stars}★</span>
              {/*
                role="presentation" because the numeric count sits right beside
                the bar. Announcing the bar as well would make a screen reader
                read every row twice.
              */}
              <span className="h-2 flex-1 overflow-hidden rounded-full bg-border-subtle" role="presentation">
                <span
                  className="block h-full rounded-full bg-amber-400"
                  style={{ width: `${row.percent}%` }}
                />
              </span>
              <span className="w-6 tabular-nums text-text-muted">{row.count}</span>
            </div>
          ))}
        </div>
      </div>

      <ul className="space-y-4">
        {visible.map((review) => (
          <li
            key={review.id}
            className="rounded-[var(--radius-card)] border border-border-subtle bg-surface-raised p-4"
          >
            <div className="flex flex-wrap items-center justify-between gap-2">
              <StarRating rating={review.rating} />
              {/*
                A <time> element with a machine-readable datetime attribute.
                The visible text is formatted for people; dateTime is what
                assistive technology and search engines parse.

                toISOString().slice(0, 10) rather than toLocaleDateString for
                the display value too, because a server and a browser in
                different locales would otherwise render different text for the
                same date and React would report a hydration mismatch.
              */}
              <time
                dateTime={review.createdAt.toISOString()}
                className="text-xs text-text-muted tabular-nums"
              >
                {review.createdAt.toISOString().slice(0, 10)}
              </time>
            </div>

            <h3 className="mt-2 font-semibold">{review.title}</h3>
            <p className="mt-1 text-sm leading-relaxed text-text-secondary">{review.body}</p>

            <p className="mt-3 text-xs text-text-muted">
              {review.authorName}
              {review.courseName && ` · ${review.courseName}`}
              {review.gradYear && ` · Class of ${review.gradYear}`}
            </p>
          </li>
        ))}
      </ul>

      {hasMore && (
        <p className="text-sm text-text-muted">
          Showing {REVIEW_PAGE_SIZE} of {formatReviewCount(reviewCount).toLowerCase()}.
        </p>
      )}
    </div>
  );
}
