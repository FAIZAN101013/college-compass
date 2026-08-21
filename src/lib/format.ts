/**
 * Display formatting.
 *
 * Indian number conventions are genuinely different from Western ones, and
 * getting them wrong is the fastest way for this product to look like it was
 * built for the wrong audience.
 *
 * Two differences matter here:
 *
 * 1. DIGIT GROUPING. India groups the last three digits, then in pairs:
 *    1,50,000 — not 150,000. Intl handles this with the "en-IN" locale; doing
 *    it by hand with a regex is a common and unnecessary bug.
 *
 * 2. LAKH AND CRORE. Indian students do not read "₹1,600,000 per year", they
 *    read "₹16 LPA". A salary page that prints raw rupees is technically
 *    correct and practically unreadable.
 */

const INR = new Intl.NumberFormat("en-IN", {
  style: "currency",
  currency: "INR",
  maximumFractionDigits: 0,
});

const PLAIN_IN = new Intl.NumberFormat("en-IN");

const LAKH = 100_000;
const CRORE = 10_000_000;

/** Exact rupees with Indian grouping: 150000 -> "₹1,50,000". */
export function formatRupees(amount: number): string {
  return INR.format(amount);
}

/** Plain Indian-grouped number, no symbol: 150000 -> "1,50,000". */
export function formatNumber(value: number): string {
  return PLAIN_IN.format(value);
}

/**
 * Drop a trailing ".0" so we render "₹5 L" rather than "₹5.0 L", while
 * keeping the decimal where it carries information ("₹1.5 L").
 */
function trimZeroDecimal(value: number): string {
  return value.toFixed(1).replace(/\.0$/, "");
}

/**
 * Compact rupees for dense UI: 150000 -> "₹1.5 L", 16000000 -> "₹1.6 Cr".
 *
 * Used in cards and comparison tables where a full "₹1,50,000" would crowd
 * the layout. Exact figures still appear on the detail page, because a
 * rounded fee is not something anyone should make a decision on.
 */
export function formatCompactRupees(amount: number): string {
  if (amount >= CRORE) return `₹${trimZeroDecimal(amount / CRORE)} Cr`;
  if (amount >= LAKH) return `₹${trimZeroDecimal(amount / LAKH)} L`;
  if (amount >= 1_000) return `₹${trimZeroDecimal(amount / 1_000)} K`;
  return `₹${amount}`;
}

/**
 * Annual salary the way placement reports state it: 1600000 -> "₹16 LPA".
 * LPA is "lakhs per annum" and is the unit every Indian student actually uses.
 */
export function formatPackage(amountPerYear: number): string {
  if (amountPerYear >= CRORE) return `₹${trimZeroDecimal(amountPerYear / CRORE)} Cr PA`;
  return `₹${trimZeroDecimal(amountPerYear / LAKH)} LPA`;
}

/** Annual fee with its unit made explicit, so "₹2.2 L" cannot be read as total. */
export function formatAnnualFee(amount: number): string {
  if (amount <= 0) return "Not disclosed";
  return `${formatCompactRupees(amount)}/yr`;
}

/** Course length in the unit a student thinks in: 48 -> "4 years", 18 -> "1.5 years". */
export function formatDuration(months: number): string {
  if (months < 12) return `${months} month${months === 1 ? "" : "s"}`;
  const years = months / 12;
  const label = trimZeroDecimal(years);
  return `${label} year${label === "1" ? "" : "s"}`;
}

/**
 * Ratings always show one decimal: "4.0", never "4".
 *
 * Mixing "4" and "4.3" down a column makes the numbers hard to scan and reads
 * as sloppy, so the trailing zero is kept here even though it is dropped for
 * currency, where it carries no meaning.
 */
export function formatRating(rating: number): string {
  return rating.toFixed(1);
}

/** "12 reviews" / "1 review" / "No reviews yet" — pluralised properly. */
export function formatReviewCount(count: number): string {
  if (count === 0) return "No reviews yet";
  return `${formatNumber(count)} review${count === 1 ? "" : "s"}`;
}

/** Turn an enum value into something readable: "GOVERNMENT" -> "Government". */
export function titleCaseEnum(value: string): string {
  return value
    .toLowerCase()
    .split("_")
    .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
    .join(" ");
}

/** NIRF rank, or an honest blank. Never renders "Rank 0" for unranked. */
export function formatNirf(rank: number | null): string {
  return rank === null ? "Unranked" : `NIRF #${rank}`;
}

/**
 * Placement rate with one decimal and a percent sign: 88.5 -> "88.5%".
 * Values are already 0-100 in the database, so there is no /100 here — a
 * conversion that gets applied twice is a classic source of silent nonsense.
 */
export function formatPercent(value: number): string {
  return `${trimZeroDecimal(value)}%`;
}
