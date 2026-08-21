"use client";

import { useEffect, useRef, useState } from "react";
import { useFilterNavigation } from "@/lib/hooks/use-filter-navigation";

const DEBOUNCE_MS = 300;

/**
 * Free-text search over the college catalogue.
 *
 * One of only three Client Components on this page. It needs the browser
 * because it holds keystrokes; everything it does ends in a URL change, and
 * the server does the actual searching.
 */
export function SearchBar({ placeholder = "Search colleges, cities…" }: { placeholder?: string }) {
  const { getParam, setParams, isPending } = useFilterNavigation();
  const urlValue = getParam("q");

  /**
   * Local state, because the input must respond to typing instantly.
   *
   * Driving the input directly from the URL would mean every character waits
   * for a server round trip before it appears — the field would feel broken
   * on a slow connection. So the input is local and the URL follows behind.
   */
  const [value, setValue] = useState(urlValue);

  /**
   * The last value we ourselves pushed into the URL.
   *
   * This is what makes back-button and "clear all" work without fighting the
   * user. When the URL changes we need to know whether it changed because of
   * our own debounced push (ignore it — the input is already correct and
   * overwriting would move the caret) or because of an external navigation
   * (adopt it). Comparing against this ref answers that; comparing the URL to
   * the input value alone cannot.
   */
  const lastPushed = useRef(urlValue);

  useEffect(() => {
    if (urlValue !== lastPushed.current) {
      lastPushed.current = urlValue;
      setValue(urlValue);
    }
  }, [urlValue]);

  /**
   * Debounce: wait for a pause in typing before navigating.
   *
   * Without this, "engineering" is eleven navigations and eleven database
   * queries, ten of whose results are thrown away before anyone sees them.
   * Worse, they can resolve out of order and briefly show results for "engi"
   * after results for "engineering".
   *
   * The cleanup function is the important half. Each keystroke re-runs this
   * effect, and returning clearTimeout cancels the previous pending push, so
   * only the final one survives.
   */
  useEffect(() => {
    if (value === lastPushed.current) return;

    const timer = setTimeout(() => {
      lastPushed.current = value;
      setParams({ q: value || null });
    }, DEBOUNCE_MS);

    return () => clearTimeout(timer);
  }, [value, setParams]);

  return (
    <div className="relative">
      <label htmlFor="college-search" className="sr-only">
        Search colleges
      </label>

      <svg
        className="pointer-events-none absolute top-1/2 left-3 size-4 -translate-y-1/2 text-text-muted"
        viewBox="0 0 20 20"
        fill="none"
        stroke="currentColor"
        strokeWidth="2"
        aria-hidden="true"
      >
        <circle cx="9" cy="9" r="6" />
        <path d="m14 14 4 4" strokeLinecap="round" />
      </svg>

      <input
        id="college-search"
        type="search"
        value={value}
        onChange={(event) => setValue(event.target.value)}
        placeholder={placeholder}
        // maxLength mirrors the Zod schema's limit. The server is still the
        // authority — this only stops the user typing into a value that would
        // be rejected, rather than letting them discover it after the fact.
        maxLength={100}
        className="w-full rounded-lg border border-border-subtle bg-surface-raised py-2.5 pr-10 pl-9 text-sm outline-none transition-colors placeholder:text-text-muted focus:border-brand-500"
      />

      {/*
        A pending spinner rather than replacing the results with one. The old
        list stays readable while the new one loads, which is far less
        disorienting than the screen emptying on every keystroke.
      */}
      {isPending && (
        <span
          className="absolute top-1/2 right-3 size-4 -translate-y-1/2 animate-spin rounded-full border-2 border-border-strong border-t-brand-600"
          aria-hidden="true"
        />
      )}

      {!isPending && value && (
        <button
          type="button"
          onClick={() => setValue("")}
          className="absolute top-1/2 right-2 -translate-y-1/2 rounded p-1 text-text-muted hover:text-text-primary"
          aria-label="Clear search"
        >
          <svg viewBox="0 0 20 20" className="size-4" fill="none" stroke="currentColor" strokeWidth="2">
            <path d="M5 5l10 10M15 5L5 15" strokeLinecap="round" />
          </svg>
        </button>
      )}
    </div>
  );
}
