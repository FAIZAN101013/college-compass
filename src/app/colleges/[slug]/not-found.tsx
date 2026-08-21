import Link from "next/link";

/**
 * Rendered when notFound() is called from the detail page.
 *
 * Next.js serves this with a real HTTP 404, which is the part that matters:
 * a "not found" message returned with status 200 is a soft 404, and crawlers
 * and uptime monitors both treat it as a working page.
 *
 * The copy offers a route onward rather than just stating the failure. A dead
 * end with no next step is how people leave a site.
 */
export default function CollegeNotFound() {
  return (
    <div className="mx-auto max-w-lg px-4 py-24 text-center">
      <p className="text-sm font-semibold text-brand-600">404</p>
      <h1 className="mt-2 text-2xl font-bold tracking-tight">We could not find that college</h1>
      <p className="mt-3 text-text-secondary">
        The link may be out of date, or the college may have been removed from the directory.
      </p>

      <div className="mt-6 flex flex-wrap justify-center gap-3">
        <Link
          href="/colleges"
          className="rounded-lg bg-brand-600 px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-brand-700"
        >
          Browse all colleges
        </Link>
        <Link
          href="/compare"
          className="rounded-lg border border-border-strong px-4 py-2 text-sm font-medium transition-colors hover:bg-surface-sunken"
        >
          Compare colleges
        </Link>
      </div>
    </div>
  );
}
