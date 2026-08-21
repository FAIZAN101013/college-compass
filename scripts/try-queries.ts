/**
 * Manual harness for the college query builder.
 *
 *   npx tsx scripts/try-queries.ts
 *
 * Runs real queries against the real database and prints what comes back.
 * The last check is the important one: it pages through the entire result
 * set and proves no college is duplicated or skipped.
 */
import "dotenv/config";
import { collegeFiltersSchema } from "../src/lib/query/college-filters";
import { findColleges, getFilterOptions } from "../src/lib/queries/colleges";
import { prisma } from "../src/lib/prisma";

const inr = (n: number) =>
  new Intl.NumberFormat("en-IN", { style: "currency", currency: "INR", maximumFractionDigits: 0 }).format(n);

/** Build a full filter object from a partial one, applying schema defaults. */
const filters = (partial: Record<string, unknown> = {}) => collegeFiltersSchema.parse(partial);

async function show(label: string, partial: Record<string, unknown> = {}, limit = 4) {
  const result = await findColleges(filters(partial));
  const { pageInfo } = result;

  console.log("─".repeat(76));
  console.log(label);
  console.log(
    `  ${pageInfo.totalItems} matches, page ${pageInfo.page}/${pageInfo.totalPages}` +
      `  next=${pageInfo.hasNextPage} prev=${pageInfo.hasPreviousPage}`,
  );

  for (const c of result.items.slice(0, limit)) {
    const rank = c.nirfRank === null ? "unranked" : `NIRF ${c.nirfRank}`;
    console.log(
      `    ${c.shortName.padEnd(28)} ${c.city.padEnd(14)} ${String(c.rating).padStart(4)}★  ` +
        `${inr(c.avgAnnualFee).padStart(12)}  ${rank}`,
    );
  }
  if (result.items.length > limit) console.log(`    ... and ${result.items.length - limit} more on this page`);
}

async function main() {
  try {
    await show("DEFAULT — sort by rating, then review count, then id", {});
    await show('SEARCH q="bangalore" — city alias expands to Bengaluru', { q: "bangalore" }, 6);
    await show('SEARCH q="bombay" — alias expands to Mumbai', { q: "bombay" }, 6);
    await show("FACETS — Karnataka + (PRIVATE or DEEMED)", {
      state: "Karnataka",
      type: ["PRIVATE", "DEEMED"],
    });
    await show('RELATION FILTER — exam="JEE Advanced" (lives on Course, not College)', {
      exam: "JEE Advanced",
    });
    await show("RANGE — fee between 1L and 3L, sorted cheapest first", {
      minFee: 100_000,
      maxFee: 300_000,
      sort: "fee-low",
    });
    await show("ARRAY OVERLAP — streams hasSome [MEDICAL]", { stream: ["MEDICAL"] });
    await show("EMPTY RESULT — nothing matches", { q: "zzzzzznotacollege" });

    // --- NULLS LAST -------------------------------------------------------
    console.log("─".repeat(76));
    console.log("NULLS LAST — sort=nirf. Unranked colleges must sit at the END.");
    const byNirf = await findColleges(filters({ sort: "nirf", pageSize: 48 }));
    const firstThree = byNirf.items.slice(0, 3).map((c) => `${c.shortName}(${c.nirfRank})`);
    const lastPage = await findColleges(
      filters({ sort: "nirf", pageSize: 48, page: byNirf.pageInfo.totalPages }),
    );
    const lastThree = lastPage.items.slice(-3).map((c) => `${c.shortName}(${c.nirfRank})`);
    console.log(`  first: ${firstThree.join(", ")}`);
    console.log(`  last : ${lastThree.join(", ")}`);
    console.log(
      lastPage.items.at(-1)?.nirfRank === null
        ? "  PASS — nulls sorted last"
        : "  FAIL — an unranked college is not at the end",
    );

    // --- PAGINATION STABILITY --------------------------------------------
    // The real test of the id tie-breaker: walk every page of a sort with
    // many ties and check that the union of all pages is exactly the full
    // result set, with nothing seen twice.
    console.log("─".repeat(76));
    console.log("PAGINATION STABILITY — walking every page of sort=rating");
    const pageSize = 12;
    const first = await findColleges(filters({ sort: "rating", pageSize }));
    const seen = new Set<string>();
    const duplicates: string[] = [];

    for (let page = 1; page <= first.pageInfo.totalPages; page++) {
      const result = await findColleges(filters({ sort: "rating", pageSize, page }));
      for (const college of result.items) {
        if (seen.has(college.id)) duplicates.push(college.shortName);
        seen.add(college.id);
      }
    }

    console.log(`  pages walked   ${first.pageInfo.totalPages}`);
    console.log(`  distinct seen  ${seen.size}`);
    console.log(`  total expected ${first.pageInfo.totalItems}`);
    console.log(`  duplicates     ${duplicates.length}`);
    console.log(
      seen.size === first.pageInfo.totalItems && duplicates.length === 0
        ? "  PASS — every college appeared exactly once"
        : `  FAIL — ${duplicates.slice(0, 5).join(", ")}`,
    );

    // --- FILTER OPTIONS ---------------------------------------------------
    console.log("─".repeat(76));
    const options = await getFilterOptions();
    console.log("FILTER OPTIONS (read from the database, not hardcoded)");
    console.log(`  states ${options.states.length}: ${options.states.slice(0, 6).join(", ")}, ...`);
    console.log(`  cities ${options.cities.length}: ${options.cities.slice(0, 6).join(", ")}, ...`);
    console.log(`  exams  ${options.exams.length}: ${options.exams.join(", ")}`);
    console.log("─".repeat(76));
  } finally {
    await prisma.$disconnect();
  }
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
