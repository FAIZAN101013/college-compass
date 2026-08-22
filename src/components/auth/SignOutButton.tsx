"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

/**
 * Sign out.
 *
 * A Client Component because it issues a POST and then has to refresh the
 * server-rendered tree. Note it is a real <button> inside a form-less flow
 * rather than a <Link href="/api/auth/logout"> — a link would be a GET, and a
 * GET that changes state can be fired by anything that loads a URL, including
 * a link prefetcher or an <img> tag on someone else's page.
 */
export function SignOutButton() {
  const router = useRouter();
  const [busy, setBusy] = useState(false);

  async function signOut() {
    setBusy(true);
    try {
      await fetch("/api/auth/logout", { method: "POST" });

      // refresh() re-runs the Server Components now that the cookie is gone,
      // so the header updates. push() alone would navigate while leaving the
      // cached server tree — and its "signed in" header — in place.
      router.refresh();
      router.push("/colleges");
    } finally {
      // Reset even on failure, so a network blip does not leave the button
      // permanently stuck in its loading state.
      setBusy(false);
    }
  }

  return (
    <button
      type="button"
      onClick={signOut}
      disabled={busy}
      className="rounded-lg px-3 py-2 text-sm font-medium text-text-secondary transition-colors hover:bg-surface-sunken hover:text-text-primary disabled:opacity-60"
    >
      {busy ? "Signing out…" : "Sign out"}
    </button>
  );
}
