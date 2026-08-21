"use client";

import { useState } from "react";
import { COLLEGE_TYPES, STREAMS } from "@/lib/query/college-filters";
import { useFilterNavigation } from "@/lib/hooks/use-filter-navigation";
import { titleCaseEnum } from "@/lib/format";

/**
 * The filter sidebar.
 *
 * Reads its current state from the URL and writes changes back to the URL.
 * It holds no filter state of its own, which means the sidebar, the results,
 * the page header and the address bar physically cannot disagree — there is
 * only one copy of the truth.
 *
 * The only local state here is whether the panel is expanded on mobile, which
 * is presentation, not data.
 */

/**
 * Fee filters are preset bands rather than two number inputs.
 *
 * Nobody knows whether they want a maximum of 275,000 or 300,000; they know
 * they want "under three lakh". Bands also sidestep a real problem with paired
 * numeric inputs — a half-typed "5" in a maximum field is a valid number that
 * filters everything away while the user is still typing.
 *
 * The API still accepts arbitrary minFee/maxFee. This is a UI simplification,
 * not a restriction of the contract.
 */
const FEE_BANDS = [
  { label: "Under ₹1 L", min: undefined, max: 100_000 },
  { label: "₹1 L – ₹3 L", min: 100_000, max: 300_000 },
  { label: "₹3 L – ₹5 L", min: 300_000, max: 500_000 },
  { label: "₹5 L – ₹10 L", min: 500_000, max: 1_000_000 },
  { label: "Above ₹10 L", min: 1_000_000, max: undefined },
] as const;

const RATING_BANDS = [
  { label: "4.5★ & up", value: 4.5 },
  { label: "4★ & up", value: 4 },
  { label: "3★ & up", value: 3 },
] as const;

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <fieldset className="border-t border-border-subtle py-4 first:border-t-0 first:pt-0">
      <legend className="mb-2.5 text-xs font-semibold tracking-wide text-text-muted uppercase">
        {title}
      </legend>
      {children}
    </fieldset>
  );
}

function CheckboxRow({
  label,
  checked,
  onChange,
}: {
  label: string;
  checked: boolean;
  onChange: () => void;
}) {
  return (
    // The whole row is a <label>, so clicking the text toggles the box. A bare
    // checkbox gives a ~16px target; this gives the full row, which matters a
    // lot on touch screens.
    <label className="flex cursor-pointer items-center gap-2.5 py-1 text-sm select-none">
      <input
        type="checkbox"
        checked={checked}
        onChange={onChange}
        className="size-4 shrink-0 rounded border-border-strong accent-brand-600"
      />
      <span>{label}</span>
    </label>
  );
}

/** A filter rendered as a button rather than a checkbox: picking one clears the others. */
function PillButton({
  label,
  active,
  onClick,
}: {
  label: string;
  active: boolean;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      // aria-pressed tells a screen reader this is a toggle and what state it
      // is in. Without it the control just announces as "button", giving no
      // indication that a filter is currently applied.
      aria-pressed={active}
      className={`rounded-full border px-3 py-1.5 text-xs font-medium transition-colors ${
        active
          ? "border-brand-600 bg-brand-600 text-white"
          : "border-border-subtle bg-surface-raised text-text-secondary hover:border-border-strong"
      }`}
    >
      {label}
    </button>
  );
}

export function FilterPanel({
  states,
  exams,
  resultCount,
}: {
  states: string[];
  exams: string[];
  resultCount: number;
}) {
  const { getParam, getParams, setParams, toggleParam, clearAll } = useFilterNavigation();
  const [openOnMobile, setOpenOnMobile] = useState(false);

  const selectedTypes = getParams("type");
  const selectedStreams = getParams("stream");
  const selectedState = getParam("state");
  const selectedExam = getParam("exam");
  const minFee = getParam("minFee");
  const maxFee = getParam("maxFee");
  const minRating = getParam("minRating");

  // Counted from the URL, so the badge can never drift out of sync with what
  // is actually being filtered.
  const activeCount =
    selectedTypes.length +
    selectedStreams.length +
    (selectedState ? 1 : 0) +
    (selectedExam ? 1 : 0) +
    (minFee || maxFee ? 1 : 0) +
    (minRating ? 1 : 0);

  const isFeeBandActive = (band: (typeof FEE_BANDS)[number]) =>
    String(band.min ?? "") === minFee && String(band.max ?? "") === maxFee;

  return (
    <aside className="lg:sticky lg:top-20">
      {/* Mobile toggle. Hidden from lg upwards, where the panel is always open. */}
      <button
        type="button"
        onClick={() => setOpenOnMobile((open) => !open)}
        aria-expanded={openOnMobile}
        aria-controls="filter-panel"
        className="mb-3 flex w-full items-center justify-between rounded-lg border border-border-subtle bg-surface-raised px-4 py-3 text-sm font-medium lg:hidden"
      >
        <span>
          Filters
          {activeCount > 0 && (
            <span className="ml-2 rounded-full bg-brand-600 px-2 py-0.5 text-xs text-white">
              {activeCount}
            </span>
          )}
        </span>
        <span className="text-text-muted">{openOnMobile ? "Hide" : "Show"}</span>
      </button>

      <div
        id="filter-panel"
        className={`rounded-[var(--radius-card)] border border-border-subtle bg-surface-raised p-4 ${
          openOnMobile ? "block" : "hidden lg:block"
        }`}
      >
        <div className="mb-3 flex items-center justify-between">
          <p className="text-sm font-semibold">
            {resultCount} {resultCount === 1 ? "college" : "colleges"}
          </p>
          {activeCount > 0 && (
            <button
              type="button"
              onClick={clearAll}
              className="text-xs font-medium text-brand-600 hover:underline"
            >
              Clear all
            </button>
          )}
        </div>

        <Section title="Annual fee">
          <div className="flex flex-wrap gap-1.5">
            {FEE_BANDS.map((band) => (
              <PillButton
                key={band.label}
                label={band.label}
                active={isFeeBandActive(band)}
                onClick={() =>
                  // Clicking the active band clears it, so a band acts as a
                  // toggle. Otherwise the only way to remove a fee filter
                  // would be "Clear all", which also discards everything else.
                  setParams(
                    isFeeBandActive(band)
                      ? { minFee: null, maxFee: null }
                      : { minFee: band.min ?? null, maxFee: band.max ?? null },
                  )
                }
              />
            ))}
          </div>
        </Section>

        <Section title="Minimum rating">
          <div className="flex flex-wrap gap-1.5">
            {RATING_BANDS.map((band) => (
              <PillButton
                key={band.value}
                label={band.label}
                active={minRating === String(band.value)}
                onClick={() =>
                  setParams({ minRating: minRating === String(band.value) ? null : band.value })
                }
              />
            ))}
          </div>
        </Section>

        <Section title="Institution type">
          {COLLEGE_TYPES.map((type) => (
            <CheckboxRow
              key={type}
              label={titleCaseEnum(type)}
              checked={selectedTypes.includes(type)}
              onChange={() => toggleParam("type", type)}
            />
          ))}
        </Section>

        <Section title="Stream">
          {STREAMS.map((stream) => (
            <CheckboxRow
              key={stream}
              label={titleCaseEnum(stream)}
              checked={selectedStreams.includes(stream)}
              onChange={() => toggleParam("stream", stream)}
            />
          ))}
        </Section>

        <Section title="State">
          {/*
            Options come from the database via props, not a hardcoded list, so
            adding a college in a new state makes that state selectable with no
            code change.
          */}
          <select
            value={selectedState}
            onChange={(event) => setParams({ state: event.target.value || null })}
            className="w-full rounded-lg border border-border-subtle bg-surface px-3 py-2 text-sm outline-none focus:border-brand-500"
            aria-label="Filter by state"
          >
            <option value="">All states</option>
            {states.map((state) => (
              <option key={state} value={state}>
                {state}
              </option>
            ))}
          </select>
        </Section>

        <Section title="Accepted exam">
          <select
            value={selectedExam}
            onChange={(event) => setParams({ exam: event.target.value || null })}
            className="w-full rounded-lg border border-border-subtle bg-surface px-3 py-2 text-sm outline-none focus:border-brand-500"
            aria-label="Filter by accepted entrance exam"
          >
            <option value="">Any exam</option>
            {exams.map((exam) => (
              <option key={exam} value={exam}>
                {exam}
              </option>
            ))}
          </select>
        </Section>
      </div>
    </aside>
  );
}
