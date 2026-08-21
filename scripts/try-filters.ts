/**
 * Manual harness for the college filter parser.
 *
 *   npx tsx scripts/try-filters.ts
 *
 * Not a test suite — a way to see, in one screen, how every hostile or
 * awkward query string is actually handled. Kept in the repo because the
 * edge cases it demonstrates are the ones worth discussing in review.
 */
import {
  parseCollegeFilters,
  parseCollegeFiltersSafe,
  formatFilterErrors,
  serializeCollegeFilters,
} from "../src/lib/query/college-filters";

const CASES: Array<[label: string, query: string]> = [
  ["no parameters at all", ""],
  ["normal search", "q=engineering&state=Karnataka&sort=fee-low"],
  ["multi-select, repeated key", "type=PRIVATE&type=DEEMED"],
  ["multi-select, comma form", "stream=ENGINEERING,DESIGN"],
  ["empty fee box submitted", "minFee=&maxFee="],
  ["negative page", "page=-5"],
  ["page size abuse", "pageSize=100000"],
  ["non-numeric fee", "minFee=abc"],
  ["decimal fee", "minFee=3.5"],
  ["impossible fee range", "minFee=500000&maxFee=100000"],
  ["unknown sort column", "sort=passwordHash"],
  ["unknown enum value", "type=NOT_A_TYPE"],
  ["rating out of range", "minRating=99"],
  ["whitespace-only search", "q=%20%20%20"],
  ["overlong search string", `q=${"x".repeat(200)}`],
  ["one bad param among good ones", "q=engineering&state=Kerala&page=-5"],
];

for (const [label, query] of CASES) {
  const params = new URLSearchParams(query);

  const strict = parseCollegeFilters(params);
  const lenient = parseCollegeFiltersSafe(params);

  console.log("─".repeat(72));
  console.log(`${label}`);
  console.log(`  input    ?${query || "(empty)"}`);

  if (strict.success) {
    // Only print what the user actually set, so defaults do not drown the signal.
    const meaningful = Object.fromEntries(
      Object.entries(strict.data).filter(([, v]) => v !== undefined),
    );
    console.log(`  API      200  ${JSON.stringify(meaningful)}`);
  } else {
    console.log(`  API      400  ${JSON.stringify(formatFilterErrors(strict.error))}`);
  }

  console.log(`  page     renders with sort=${lenient.sort} page=${lenient.page} size=${lenient.pageSize}`);
  console.log(`  re-serialised  ?${serializeCollegeFilters(lenient) || "(empty)"}`);
}
console.log("─".repeat(72));
