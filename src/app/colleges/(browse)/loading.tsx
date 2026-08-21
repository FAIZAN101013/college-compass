import { CollegeCardSkeleton } from "@/components/colleges/CollegeCard";

/**
 * Route-level loading UI.
 *
 * WHY THIS LIVES IN A (browse) ROUTE GROUP — do not move it up a level.
 *
 * A loading.tsx wraps its whole segment, INCLUDING nested dynamic routes. With
 * this file at app/colleges/, its Suspense boundary also covered
 * /colleges/[slug], so Next began streaming that response — headers and status
 * 200 already sent — before the page body ran. When the page then called
 * notFound() for an unknown slug the 404 page rendered correctly but the
 * status stayed 200: a soft 404, which crawlers index as a real page and
 * uptime monitors never flag.
 *
 * Putting the listing in a (browse) group scopes this boundary to the listing
 * alone. Route groups do not appear in the URL, so /colleges is unchanged,
 * and /colleges/[slug] now returns a genuine 404. Verified with curl.
 *
 * Next.js renders this automatically while the page's async work is in
 * flight, wrapping the route in a Suspense boundary for us. It is what the
 * user sees on a cold navigation to /colleges.
 *
 * Filter changes do NOT show this — those go through useTransition, which
 * keeps the previous results on screen instead. That distinction is
 * deliberate: an empty skeleton on every checkbox click would make the page
 * feel like it reloads constantly.
 *
 * The skeleton mirrors the real layout closely, including the sidebar width,
 * so the page does not jump when the data arrives.
 */
export default function CollegesLoading() {
  return (
    <div className="mx-auto max-w-7xl px-4 py-6">
      <div className="mb-6">
        <div className="h-8 w-56 animate-pulse rounded bg-surface-raised" />
        <div className="mt-2 h-4 w-80 animate-pulse rounded bg-surface-raised" />
      </div>

      <div className="mb-5 h-11 animate-pulse rounded-lg bg-surface-raised" />

      <div className="grid gap-6 lg:grid-cols-[260px_minmax(0,1fr)]">
        <div className="hidden h-[560px] animate-pulse rounded-[var(--radius-card)] bg-surface-raised lg:block" />

        <div>
          <div className="mb-4 flex items-center justify-between">
            <div className="h-4 w-40 animate-pulse rounded bg-surface-raised" />
            <div className="h-9 w-44 animate-pulse rounded-lg bg-surface-raised" />
          </div>

          <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
            {/* Exactly one page worth, so the scroll height matches the real
                result and the page does not resize when content lands. */}
            {Array.from({ length: 12 }, (_, i) => (
              <CollegeCardSkeleton key={i} />
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
