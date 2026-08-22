import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { AuthForm } from "@/components/auth/AuthForm";
import { getSession } from "@/lib/auth/session";
import { safeRedirectPath } from "@/lib/auth/redirect";

export const metadata: Metadata = {
  title: "Sign in",
  description: "Sign in to save colleges and comparisons.",
};

export default async function LoginPage({
  searchParams,
}: {
  searchParams: Promise<{ next?: string }>;
}) {
  const { next } = await searchParams;

  // Validated, never used raw — see lib/auth/redirect.ts for why.
  const redirectTo = safeRedirectPath(next);

  // Already signed in? Do not show a login form. Landing on a sign-in page
  // when you are already signed in is confusing, and submitting it would
  // simply reissue the session you already have.
  if (await getSession()) redirect(redirectTo);

  return (
    <div className="mx-auto max-w-sm px-4 py-14">
      <h1 className="text-2xl font-bold tracking-tight">Sign in</h1>
      <p className="mt-1 mb-6 text-sm text-text-secondary">
        Save colleges and comparisons to come back to.
      </p>

      <AuthForm mode="login" redirectTo={redirectTo} />

      {/*
        A seeded demo account, shown so a reviewer can exercise the
        authenticated features without signing up. This exists because the
        project is a portfolio piece; a real product would never advertise
        working credentials on its login page.
      */}
      <div className="mt-8 rounded-lg border border-border-subtle bg-surface-sunken p-3 text-sm">
        <p className="font-medium">Demo account</p>
        <p className="mt-1 text-text-secondary">
          <code className="rounded bg-surface px-1 py-0.5 text-xs">demo@collegecompass.in</code>
          {" / "}
          <code className="rounded bg-surface px-1 py-0.5 text-xs">demo12345</code>
        </p>
      </div>
    </div>
  );
}
