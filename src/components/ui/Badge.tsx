import type { ReactNode } from "react";

/**
 * Small status pill.
 *
 * `tone` is a semantic name, not a colour name. A prop called `color="green"`
 * forces every call site to decide what green means, and the day the palette
 * changes you edit forty files. `tone="positive"` says what it means and the
 * mapping lives here, once.
 */
type Tone = "neutral" | "brand" | "positive" | "warning";

const TONE_CLASSES: Record<Tone, string> = {
  neutral: "bg-surface-sunken text-text-secondary border-border-subtle",
  brand: "bg-brand-50 text-brand-700 border-brand-200 dark:bg-brand-900/40 dark:text-brand-200 dark:border-brand-800",
  positive: "bg-emerald-50 text-emerald-700 border-emerald-200 dark:bg-emerald-950/50 dark:text-emerald-300 dark:border-emerald-900",
  warning: "bg-amber-50 text-amber-700 border-amber-200 dark:bg-amber-950/50 dark:text-amber-300 dark:border-amber-900",
};

export function Badge({
  children,
  tone = "neutral",
  className = "",
}: {
  children: ReactNode;
  tone?: Tone;
  className?: string;
}) {
  return (
    <span
      className={`inline-flex items-center gap-1 rounded-md border px-2 py-0.5 text-xs font-medium whitespace-nowrap ${TONE_CLASSES[tone]} ${className}`}
    >
      {children}
    </span>
  );
}
