"use client";

import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { useCallback, useTransition } from "react";

/**
 * The one place that knows how to change a filter.
 *
 * Every interactive control on the listing page — search box, checkboxes,
 * sort dropdown — works the same way: it rewrites the URL, and the server
 * re-renders from the new URL. There is no client-side store, no fetching in
 * the components, and no cache to invalidate. The URL IS the state.
 *
 * Centralising it here matters because two rules must hold for EVERY control,
 * and duplicating them across components guarantees one eventually gets
 * forgotten.
 */

type ParamValue = string | string[] | number | null | undefined;

export function useFilterNavigation() {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();

  /**
   * useTransition marks the navigation as non-urgent.
   *
   * Without it, pushing a URL blocks: the current list freezes with no
   * feedback until the server responds. With it, React keeps the previous
   * results on screen and interactive, and hands us `isPending`, which the UI
   * uses to dim the list. The user sees "this is updating" rather than "this
   * has hung".
   */
  const [isPending, startTransition] = useTransition();

  const setParams = useCallback(
    (updates: Record<string, ParamValue>) => {
      const next = new URLSearchParams(searchParams.toString());

      for (const [key, value] of Object.entries(updates)) {
        // Delete first so repeated keys (?type=A&type=B) are replaced wholesale
        // rather than appended to. Without this, unticking a box would leave
        // the old value behind and a facet could only ever grow.
        next.delete(key);

        if (Array.isArray(value)) {
          for (const item of value) next.append(key, item);
        } else if (value !== null && value !== undefined && value !== "") {
          next.set(key, String(value));
        }
        // null / undefined / "" mean "remove this filter", which the delete
        // above has already done.
      }

      /**
       * Changing any filter resets to page 1.
       *
       * This is the bug every listing page ships without meaning to: you are
       * on page 5, you tick a filter that leaves 8 results, and the server
       * dutifully returns page 5 of 1 — an empty screen that reads as "the
       * filter is broken". The page number survives only when the caller is
       * explicitly changing the page.
       */
      if (!("page" in updates)) next.delete("page");

      const queryString = next.toString();

      startTransition(() => {
        // scroll: false because changing a filter should leave the user where
        // they are. Pagination is deliberately different — it uses Link and
        // scrolls to the top, which is what you want after clicking "next".
        router.push(queryString ? `${pathname}?${queryString}` : pathname, { scroll: false });
      });
    },
    [pathname, router, searchParams],
  );

  /** Read a single value, for controls that need to reflect current state. */
  const getParam = useCallback((key: string) => searchParams.get(key) ?? "", [searchParams]);

  /** Read a repeated value as an array, e.g. ?type=A&type=B. */
  const getParams = useCallback((key: string) => searchParams.getAll(key), [searchParams]);

  /** Toggle one value of a multi-select facet on or off. */
  const toggleParam = useCallback(
    (key: string, value: string) => {
      const current = searchParams.getAll(key);
      const next = current.includes(value)
        ? current.filter((item) => item !== value)
        : [...current, value];

      setParams({ [key]: next });
    },
    [searchParams, setParams],
  );

  /** Remove every filter, keeping the user on the same route. */
  const clearAll = useCallback(() => {
    startTransition(() => {
      router.push(pathname, { scroll: false });
    });
  }, [pathname, router]);

  return { searchParams, setParams, getParam, getParams, toggleParam, clearAll, isPending };
}
