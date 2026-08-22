import type { Metadata } from "next";
import Link from "next/link";
import { SignOutButton } from "@/components/auth/SignOutButton";
import { getSession } from "@/lib/auth/session";
import "./globals.css";

/**
 * Root layout. Wraps every page with the header, footer and document shell.
 *
 * A Server Component, so none of this ships to the browser as JavaScript.
 */

export const metadata: Metadata = {
  // A title template means each page supplies only its own name and the
  // suffix is appended automatically, so the branding cannot be forgotten on
  // one page or duplicated on another.
  title: {
    default: "College Compass — Find and compare colleges in India",
    template: "%s | College Compass",
  },
  description:
    "Search, filter and compare Indian colleges by fees, placements, ranking and reviews.",
};

/**
 * An async Server Component, so it can read the session cookie directly.
 *
 * No client-side auth state, no "loading…" flash, and no possibility of the
 * header disagreeing with what the server will actually let you do — the same
 * getSession() call guards the pages themselves.
 */
async function Header() {
  const session = await getSession();

  return (
    <header className="sticky top-0 z-40 border-b border-border-subtle bg-surface/85 backdrop-blur-sm">
      <div className="mx-auto flex h-16 max-w-7xl items-center justify-between gap-4 px-4">
        <Link href="/" className="flex items-center gap-2 font-semibold">
          <span
            className="flex size-8 items-center justify-center rounded-lg bg-brand-600 text-sm text-white"
            aria-hidden="true"
          >
            CC
          </span>
          <span className="hidden sm:inline">College Compass</span>
        </Link>

        <nav aria-label="Main" className="flex items-center gap-1 text-sm">
          <Link
            href="/colleges"
            className="rounded-lg px-3 py-2 font-medium text-text-secondary transition-colors hover:bg-surface-sunken hover:text-text-primary"
          >
            Colleges
          </Link>
          <Link
            href="/compare"
            className="rounded-lg px-3 py-2 font-medium text-text-secondary transition-colors hover:bg-surface-sunken hover:text-text-primary"
          >
            Compare
          </Link>

          {session ? (
            <>
              <Link
                href="/saved"
                className="rounded-lg px-3 py-2 font-medium text-text-secondary transition-colors hover:bg-surface-sunken hover:text-text-primary"
              >
                Saved
              </Link>
              {/* First name only — a header is not the place for a full name
                  to wrap or push the nav around on a narrow screen. */}
              <span className="ml-1 hidden text-text-muted sm:inline">
                {session.name.split(" ")[0]}
              </span>
              <SignOutButton />
            </>
          ) : (
            <Link
              href="/login"
              className="ml-1 rounded-lg bg-brand-600 px-3.5 py-2 font-medium text-white transition-colors hover:bg-brand-700"
            >
              Sign in
            </Link>
          )}
        </nav>
      </div>
    </header>
  );
}

function Footer() {
  return (
    <footer className="mt-16 border-t border-border-subtle bg-surface">
      <div className="mx-auto max-w-7xl px-4 py-8">
        {/*
          The data disclaimer is deliberately prominent rather than buried.
          Institution names, locations and founding years are real; the money
          is not. Presenting generated figures as researched data would be
          dishonest, and a student could make a genuinely expensive decision
          on the strength of it.
        */}
        <p className="text-sm text-text-secondary">
          <strong className="text-text-primary">About this data:</strong> institution names,
          locations, ownership type and founding years are real. Fees, salary packages, placement
          rates and reviews are <strong>representative sample data</strong> generated for this
          demonstration — they are not researched figures and should not be used to make an
          admissions decision.
        </p>
        <p className="mt-4 text-xs text-text-muted">
          College Compass — a portfolio project. Built with Next.js, Prisma and PostgreSQL.
        </p>
      </div>
    </footer>
  );
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body className="flex min-h-dvh flex-col">
        {/*
          A skip link, visually hidden until focused. It is the first thing a
          keyboard user reaches, and it lets them jump past the header instead
          of tabbing through the whole navigation on every single page.
        */}
        <a
          href="#main"
          className="sr-only focus:not-sr-only focus:absolute focus:top-3 focus:left-3 focus:z-50 focus:rounded-lg focus:bg-brand-600 focus:px-4 focus:py-2 focus:text-white"
        >
          Skip to content
        </a>

        <Header />
        <main id="main" className="flex-1">
          {children}
        </main>
        <Footer />
      </body>
    </html>
  );
}
