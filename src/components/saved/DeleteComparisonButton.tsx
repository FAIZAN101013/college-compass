"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

/**
 * Delete a saved comparison.
 *
 * Two-step rather than one click. Deletion here is irreversible — there is no
 * undo and no trash — so a single misplaced click would silently destroy
 * something the user built. The second click is the confirmation, inline,
 * which is less disruptive than a modal for an action this small.
 */
export function DeleteComparisonButton({ id, name }: { id: string; name: string }) {
  const router = useRouter();
  const [confirming, setConfirming] = useState(false);
  const [busy, setBusy] = useState(false);

  async function remove() {
    setBusy(true);

    try {
      const response = await fetch("/api/saved/comparisons", {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id }),
      });

      if (response.ok) {
        // Not optimistic, unlike SaveButton. An unsave is trivially reversible
        // by clicking again, so showing it immediately is safe; a delete is
        // not, so we wait for the server to confirm before the row vanishes.
        router.refresh();
      } else {
        setConfirming(false);
      }
    } finally {
      setBusy(false);
    }
  }

  if (!confirming) {
    return (
      <button
        type="button"
        onClick={() => setConfirming(true)}
        className="rounded-lg border border-border-strong px-3 py-1.5 text-sm font-medium text-text-secondary transition-colors hover:border-negative hover:text-negative"
        aria-label={`Delete comparison ${name}`}
      >
        Delete
      </button>
    );
  }

  return (
    <span className="flex items-center gap-1.5">
      <button
        type="button"
        onClick={remove}
        disabled={busy}
        className="rounded-lg bg-red-600 px-3 py-1.5 text-sm font-medium text-white transition-colors hover:bg-red-700 disabled:opacity-60"
      >
        {busy ? "Deleting…" : "Confirm"}
      </button>
      <button
        type="button"
        onClick={() => setConfirming(false)}
        disabled={busy}
        className="rounded-lg px-2 py-1.5 text-sm text-text-secondary hover:text-text-primary"
      >
        Cancel
      </button>
    </span>
  );
}
