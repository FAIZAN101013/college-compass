"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";

/**
 * Save / unsave a college.
 *
 * Optimistic: the icon flips the instant you click, before the server has
 * confirmed anything. A bookmark that waits ~400ms to fill in feels broken,
 * and the operation almost always succeeds. If it does fail, the state is
 * rolled back and an error is surfaced — optimistic UI without a rollback is
 * just a UI that lies.
 */
export function SaveButton({
  collegeId,
  initialSaved,
  isAuthenticated,
  variant = "icon",
}: {
  collegeId: string;
  initialSaved: boolean;
  isAuthenticated: boolean;
  variant?: "icon" | "full";
}) {
  const router = useRouter();
  const [saved, setSaved] = useState(initialSaved);
  const [error, setError] = useState<string | null>(null);
  const [, startTransition] = useTransition();

  async function toggle(event: React.MouseEvent) {
    // The card wraps this button inside a stretched link to the college page.
    // Without stopping propagation, saving would also navigate away.
    event.preventDefault();
    event.stopPropagation();

    if (!isAuthenticated) {
      // Send them to sign in, and remember where they were so they come back
      // here rather than to a generic landing page.
      router.push(`/login?next=${encodeURIComponent(window.location.pathname + window.location.search)}`);
      return;
    }

    const next = !saved;
    setSaved(next); // optimistic
    setError(null);

    try {
      const response = await fetch("/api/saved/colleges", {
        method: next ? "POST" : "DELETE",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ collegeId }),
      });

      if (!response.ok) {
        setSaved(!next); // roll back
        const result = await response.json().catch(() => null);
        setError(result?.error?.message ?? "Could not save. Try again.");
        return;
      }

      // Refresh so the /saved page and any other server-rendered view of this
      // data reflect the change. Wrapped in a transition so it does not block
      // the button from being clicked again.
      startTransition(() => router.refresh());
    } catch {
      setSaved(!next); // roll back
      setError("Could not reach the server.");
    }
  }

  const label = saved ? "Remove from saved" : "Save this college";

  if (variant === "full") {
    return (
      <div>
        <button
          type="button"
          onClick={toggle}
          aria-pressed={saved}
          className={`inline-flex items-center gap-2 rounded-lg border px-3 py-1.5 text-sm font-medium transition-colors ${
            saved
              ? "border-brand-600 bg-brand-600 text-white"
              : "border-border-strong hover:bg-surface-sunken"
          }`}
        >
          <BookmarkIcon filled={saved} />
          {saved ? "Saved" : "Save"}
        </button>
        {error && (
          <p role="alert" className="mt-1 text-xs text-red-600 dark:text-red-400">
            {error}
          </p>
        )}
      </div>
    );
  }

  return (
    <button
      type="button"
      onClick={toggle}
      // aria-pressed announces this as a toggle and its current state. Without
      // it a screen reader says only "button", with no way to tell whether the
      // college is currently saved.
      aria-pressed={saved}
      aria-label={label}
      title={label}
      // relative + z-10 lift this above the card's stretched link overlay, so
      // the click reaches the button rather than the link underneath.
      className={`relative z-10 rounded-lg p-1.5 transition-colors ${
        saved ? "text-brand-600" : "text-text-muted hover:text-text-primary"
      }`}
    >
      <BookmarkIcon filled={saved} />
    </button>
  );
}

function BookmarkIcon({ filled }: { filled: boolean }) {
  return (
    <svg
      viewBox="0 0 20 20"
      className="size-4"
      fill={filled ? "currentColor" : "none"}
      stroke="currentColor"
      strokeWidth="1.8"
      aria-hidden="true"
    >
      <path d="M5 3.5h10a1 1 0 0 1 1 1V17l-6-3.5L4 17V4.5a1 1 0 0 1 1-1Z" strokeLinejoin="round" />
    </svg>
  );
}
