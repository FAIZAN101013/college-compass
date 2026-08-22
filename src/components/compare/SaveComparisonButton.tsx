"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

/**
 * Save the current comparison under a name.
 *
 * Reveals a name field on click rather than saving straight away with a
 * generated title. A list of saved comparisons called "Comparison 1",
 * "Comparison 2" is useless a week later — the name IS the value of saving,
 * because it records why these three were grouped.
 */
export function SaveComparisonButton({
  slugs,
  suggestedName,
  isAuthenticated,
}: {
  slugs: string[];
  suggestedName: string;
  isAuthenticated: boolean;
}) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [name, setName] = useState(suggestedName);
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  if (!isAuthenticated) {
    return (
      <a
        href={`/login?next=${encodeURIComponent(`/compare?ids=${slugs.join(",")}`)}`}
        className="inline-flex rounded-lg border border-border-strong px-3.5 py-2 text-sm font-medium transition-colors hover:bg-surface-sunken"
      >
        Sign in to save this comparison
      </a>
    );
  }

  async function save() {
    setBusy(true);
    setError(null);

    try {
      const response = await fetch("/api/saved/comparisons", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        // Slugs, not ids — the URL carries slugs, and the API resolves them.
        // Sending ids would mean this component needed a second source of
        // truth for what is currently being compared.
        body: JSON.stringify({ name: name.trim(), slugs }),
      });

      const result = await response.json().catch(() => null);

      if (!response.ok) {
        setError(result?.error?.fields?.name?.[0] ?? result?.error?.message ?? "Could not save.");
        return;
      }

      setOpen(false);
      setMessage("Saved. Find it under Saved.");
      router.refresh();
    } catch {
      setError("Could not reach the server.");
    } finally {
      setBusy(false);
    }
  }

  if (message) {
    return (
      <p role="status" className="text-sm font-medium text-positive">
        {message}
      </p>
    );
  }

  if (!open) {
    return (
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="inline-flex rounded-lg border border-brand-600 px-3.5 py-2 text-sm font-medium text-brand-600 transition-colors hover:bg-brand-50 dark:hover:bg-brand-900/30"
      >
        Save this comparison
      </button>
    );
  }

  return (
    <div className="flex flex-wrap items-start gap-2">
      <div>
        <label htmlFor="comparison-name" className="sr-only">
          Name this comparison
        </label>
        <input
          id="comparison-name"
          value={name}
          onChange={(event) => setName(event.target.value)}
          maxLength={80}
          autoFocus
          placeholder="e.g. Engineering shortlist"
          className="rounded-lg border border-border-subtle bg-surface-raised px-3 py-2 text-sm outline-none focus:border-brand-500"
        />
        {error && (
          <p role="alert" className="mt-1 text-xs text-red-600 dark:text-red-400">
            {error}
          </p>
        )}
      </div>

      <button
        type="button"
        onClick={save}
        disabled={busy || name.trim().length === 0}
        className="rounded-lg bg-brand-600 px-3.5 py-2 text-sm font-medium text-white transition-colors hover:bg-brand-700 disabled:opacity-60"
      >
        {busy ? "Saving…" : "Save"}
      </button>
      <button
        type="button"
        onClick={() => setOpen(false)}
        className="rounded-lg px-2 py-2 text-sm text-text-secondary hover:text-text-primary"
      >
        Cancel
      </button>
    </div>
  );
}
