import "dotenv/config";
import bcrypt from "bcryptjs";
import { PrismaPg } from "@prisma/adapter-pg";
import { PrismaClient } from "../src/generated/prisma/client";
import { COLLEGE_SEED } from "./data/colleges";
import {
  generateApprovals,
  generateCourses,
  generateDescription,
  generateFacilities,
  generateImageUrl,
  generatePlacements,
  generateReviews,
  makeRng,
  slugify,
  type GeneratedCourse,
  type GeneratedPlacement,
  type GeneratedReview,
} from "./data/generate";

/**
 * Database seed script.  Run with:  npm run db:seed
 *
 * This script builds its own PrismaClient rather than importing the app's
 * shared one from src/lib/prisma.ts. That is deliberate: a standalone script
 * should not depend on application internals, and it wants different logging
 * and a guaranteed clean disconnect at the end.
 */

const DEMO_USER = {
  email: "demo@collegecompass.in",
  name: "Demo Student",
  // Seeded so a reviewer can log in immediately without signing up.
  // Documented in the README. Never do this in a real production system.
  password: "demo12345",
};

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

/**
 * Split an array into fixed-size chunks.
 *
 * Why this is necessary: Postgres accepts at most 65,535 bind parameters in a
 * single statement. A createMany of 700 reviews x 8 columns is 5,600 — fine
 * today, but this dataset is meant to grow, and the failure mode when you
 * cross that line is a confusing driver-level error, not a clear message.
 * Chunking keeps every statement comfortably inside the limit.
 */
function chunk<T>(items: T[], size: number): T[][] {
  const out: T[][] = [];
  for (let i = 0; i < items.length; i += size) {
    out.push(items.slice(i, i + size));
  }
  return out;
}

const BATCH_SIZE = 500;

/** Average of a numeric list, rounded. Returns 0 for an empty list. */
function averageOf(values: number[], decimals = 0): number {
  if (values.length === 0) return 0;
  const mean = values.reduce((sum, v) => sum + v, 0) / values.length;
  const factor = 10 ** decimals;
  return Math.round(mean * factor) / factor;
}

/** Formats large rupee amounts the Indian way, for the console summary only. */
function formatINR(amount: number): string {
  return new Intl.NumberFormat("en-IN", {
    style: "currency",
    currency: "INR",
    maximumFractionDigits: 0,
  }).format(amount);
}

// ---------------------------------------------------------------------------
// Step 1 — build everything in memory
// ---------------------------------------------------------------------------

type PreparedCollege = {
  slug: string;
  name: string;
  shortName: string;
  city: string;
  state: string;
  type: (typeof COLLEGE_SEED)[number]["type"];
  streams: (typeof COLLEGE_SEED)[number]["streams"];
  establishedYear: number;
  nirfRank: number | null;
  rating: number;
  reviewCount: number;
  avgAnnualFee: number;
  description: string;
  imageUrl: string;
  website: string;
  approvedBy: string[];
  facilities: string[];
  courses: GeneratedCourse[];
  placements: GeneratedPlacement[];
  reviews: GeneratedReview[];
};

/**
 * Generate the full dataset before touching the database at all.
 *
 * Doing every computation first means a bug in generation fails BEFORE we
 * delete the existing data. If we interleaved generate-and-insert, a crash
 * halfway through would leave the database wiped and only partly refilled —
 * the worst possible state to debug from.
 */
function prepareAll(): PreparedCollege[] {
  const seenSlugs = new Map<string, string>();

  return COLLEGE_SEED.map((college) => {
    const slug = slugify(college.name);

    // `slug` is @unique in the schema, so a collision would crash mid-insert
    // with an opaque constraint-violation error. Catching it here instead
    // names both offending colleges, which is the difference between a
    // ten-second fix and a twenty-minute hunt.
    const existing = seenSlugs.get(slug);
    if (existing) {
      throw new Error(
        `Duplicate slug "${slug}" produced by two colleges:\n` +
          `  1. ${existing}\n  2. ${college.name}\n` +
          `Disambiguate one of the names in prisma/data/colleges.ts.`,
      );
    }
    seenSlugs.set(slug, college.name);

    // One RNG per college, seeded from its slug. Every generator below draws
    // from this same stream, so the whole college is reproducible as a unit.
    const rng = makeRng(slug);

    const courses = generateCourses(college, rng);
    const placements = generatePlacements(college, rng);
    const reviews = generateReviews(college, courses, rng);

    return {
      slug,
      name: college.name,
      shortName: college.shortName,
      city: college.city,
      state: college.state,
      type: college.type,
      streams: college.streams,
      establishedYear: college.established,
      nirfRank: college.nirfRank,

      // --- Denormalised aggregates, COMPUTED from the rows above ----------
      // This is the important part. These three fields are copies of data
      // that lives in Course and Review. If they were hardcoded, the listing
      // page and the detail page would disagree with each other, and the
      // denormalisation would be a lie rather than a cache.
      rating: averageOf(reviews.map((r) => r.rating), 1),
      reviewCount: reviews.length,
      avgAnnualFee: averageOf(courses.map((c) => c.annualFee)),
      // --------------------------------------------------------------------

      description: generateDescription(college),
      imageUrl: generateImageUrl(rng),
      website: `https://www.${slug.slice(0, 30)}.ac.in`,
      approvedBy: generateApprovals(college, rng),
      facilities: generateFacilities(rng),
      courses,
      placements,
      reviews,
    };
  });
}

// ---------------------------------------------------------------------------
// Step 2 — check the generated data before it reaches the database
// ---------------------------------------------------------------------------

/**
 * Assert the invariants the rest of the application will rely on.
 *
 * The database enforces structure (types, uniqueness, foreign keys) but it
 * cannot enforce meaning — nothing in Postgres knows that an average salary
 * below the median is nonsense. These checks catch a broken generator before
 * bad data ships, and they fail with the college name so the cause is obvious.
 */
function assertInvariants(colleges: PreparedCollege[]): void {
  const problems: string[] = [];

  for (const c of colleges) {
    if (c.courses.length === 0) {
      problems.push(`${c.name}: has no courses`);
    }
    if (c.avgAnnualFee <= 0) {
      problems.push(`${c.name}: avgAnnualFee is ${c.avgAnnualFee}`);
    }
    if (c.rating < 0 || c.rating > 5) {
      problems.push(`${c.name}: rating ${c.rating} is outside 0-5`);
    }
    if (c.reviewCount !== c.reviews.length) {
      problems.push(`${c.name}: reviewCount ${c.reviewCount} != ${c.reviews.length} reviews`);
    }

    for (const p of c.placements) {
      // Salary distributions are right-skewed, so the mean sits above the
      // median. Generating the reverse would be an immediate tell that the
      // data is synthetic.
      if (p.averagePackage < p.medianPackage) {
        problems.push(`${c.name} ${p.year}: average < median`);
      }
      if (p.highestPackage < p.averagePackage) {
        problems.push(`${c.name} ${p.year}: highest < average`);
      }
      if (p.placementRate < 0 || p.placementRate > 100) {
        problems.push(`${c.name} ${p.year}: placementRate ${p.placementRate} outside 0-100`);
      }
    }

    for (const r of c.reviews) {
      if (r.rating < 1 || r.rating > 5 || !Number.isInteger(r.rating)) {
        problems.push(`${c.name}: review rating ${r.rating} is not an integer 1-5`);
      }
    }
  }

  if (problems.length > 0) {
    throw new Error(
      `Generated data failed ${problems.length} invariant check(s):\n` +
        problems.slice(0, 20).map((p) => `  - ${p}`).join("\n") +
        (problems.length > 20 ? `\n  ...and ${problems.length - 20} more` : ""),
    );
  }
}

// ---------------------------------------------------------------------------
// Step 3 — write to the database
// ---------------------------------------------------------------------------

async function main() {
  const connectionString = process.env.DATABASE_URL;
  if (!connectionString) {
    throw new Error("DATABASE_URL is not set. Copy .env.example to .env first.");
  }

  const prisma = new PrismaClient({
    adapter: new PrismaPg({ connectionString }),
    log: ["error"],
  });

  try {
    console.log("Generating dataset...");
    const colleges = prepareAll();
    assertInvariants(colleges);

    const totalCourses = colleges.reduce((n, c) => n + c.courses.length, 0);
    const totalPlacements = colleges.reduce((n, c) => n + c.placements.length, 0);
    const totalReviews = colleges.reduce((n, c) => n + c.reviews.length, 0);
    console.log(
      `  ${colleges.length} colleges, ${totalCourses} courses, ` +
        `${totalPlacements} placements, ${totalReviews} reviews\n`,
    );

    // --- Clear existing data ------------------------------------------------
    // Order matters. Every table below holds a foreign key into a table
    // further down the list, and Postgres refuses to delete a row that
    // something still references. Children first, parents last.
    //
    // (The schema does declare onDelete: Cascade, so deleting College alone
    // would work — but being explicit means this still behaves correctly if
    // someone later changes a cascade rule, and it makes the dependency
    // order visible to anyone reading the script.)
    console.log("Clearing existing data...");
    await prisma.savedComparison.deleteMany();
    await prisma.savedCollege.deleteMany();
    await prisma.review.deleteMany();
    await prisma.placement.deleteMany();
    await prisma.course.deleteMany();
    await prisma.college.deleteMany();
    await prisma.user.deleteMany();

    // --- Insert colleges ----------------------------------------------------
    // createMany sends one INSERT with many rows instead of one INSERT per
    // row. Against a cloud database that is the difference between ~1,500
    // network round trips and a handful — minutes versus seconds.
    console.log("Inserting colleges...");
    for (const batch of chunk(colleges, BATCH_SIZE)) {
      await prisma.college.createMany({
        data: batch.map(({ courses, placements, reviews, ...college }) => college),
      });
    }

    // createMany does not return the inserted rows, so we read back the
    // generated ids and build a slug -> id lookup. One extra query total,
    // which is far cheaper than inserting rows one at a time to get each id.
    const idBySlug = new Map(
      (await prisma.college.findMany({ select: { id: true, slug: true } })).map((c) => [
        c.slug,
        c.id,
      ]),
    );

    // --- Insert children ----------------------------------------------------
    console.log("Inserting courses, placements and reviews...");

    const courseRows = colleges.flatMap((c) =>
      c.courses.map((course) => ({ ...course, collegeId: idBySlug.get(c.slug)! })),
    );
    const placementRows = colleges.flatMap((c) =>
      c.placements.map((p) => ({ ...p, collegeId: idBySlug.get(c.slug)! })),
    );
    const reviewRows = colleges.flatMap((c) =>
      c.reviews.map((r) => ({ ...r, collegeId: idBySlug.get(c.slug)! })),
    );

    for (const batch of chunk(courseRows, BATCH_SIZE)) {
      await prisma.course.createMany({ data: batch });
    }
    for (const batch of chunk(placementRows, BATCH_SIZE)) {
      await prisma.placement.createMany({ data: batch });
    }
    for (const batch of chunk(reviewRows, BATCH_SIZE)) {
      await prisma.review.createMany({ data: batch });
    }

    // --- Demo account -------------------------------------------------------
    // A ready-made account so a reviewer can exercise the authenticated
    // features without signing up first.
    console.log("Creating demo account...");
    const demoUser = await prisma.user.create({
      data: {
        email: DEMO_USER.email,
        name: DEMO_USER.name,
        // Cost factor 10. Higher is more resistant to offline cracking but
        // slower to verify on every login; 10-12 is the usual balance.
        passwordHash: await bcrypt.hash(DEMO_USER.password, 10),
      },
    });

    // Give the demo account some saved items so those screens are not empty
    // the first time anyone opens them.
    const featured = [
      "indian-institute-of-technology-bombay",
      "birla-institute-of-technology-and-science-pilani",
      "indian-institute-of-management-ahmedabad",
    ]
      .map((slug) => idBySlug.get(slug))
      .filter((id): id is string => Boolean(id));

    // Fall back to the three highest-rated colleges if those slugs ever change.
    const savedIds =
      featured.length === 3
        ? featured
        : (
            await prisma.college.findMany({
              select: { id: true },
              orderBy: { rating: "desc" },
              take: 3,
            })
          ).map((c) => c.id);

    await prisma.savedCollege.createMany({
      data: savedIds.map((collegeId) => ({ userId: demoUser.id, collegeId })),
    });

    await prisma.savedComparison.create({
      data: {
        userId: demoUser.id,
        name: "Top engineering picks",
        collegeIds: savedIds,
      },
    });

    // --- Summary ------------------------------------------------------------
    // These run sequentially, not in Promise.all. Firing them concurrently
    // asks the pool for several connections at once immediately after ~1,500
    // rows of inserts, and against Neon's pooled endpoint that intermittently
    // fails with "Can't reach database server". This is only a summary print,
    // so the extra few milliseconds cost nothing and the sequential version
    // never flakes.
    const collegeCount = await prisma.college.count();
    const courseCount = await prisma.course.count();
    const placementCount = await prisma.placement.count();
    const reviewCount = await prisma.review.count();

    const feeStats = await prisma.college.aggregate({
      _min: { avgAnnualFee: true },
      _max: { avgAnnualFee: true },
      _avg: { rating: true },
    });

    console.log("\nSeed complete.");
    console.log(`  colleges   ${collegeCount}`);
    console.log(`  courses    ${courseCount}`);
    console.log(`  placements ${placementCount}`);
    console.log(`  reviews    ${reviewCount}`);
    console.log(
      `  fees       ${formatINR(feeStats._min.avgAnnualFee ?? 0)} - ${formatINR(feeStats._max.avgAnnualFee ?? 0)}`,
    );
    console.log(`  avg rating ${(feeStats._avg.rating ?? 0).toFixed(2)}`);
    console.log(`\n  demo login  ${DEMO_USER.email} / ${DEMO_USER.password}`);
  } finally {
    // Always release the connection, even if something above threw. Without
    // this the script can hang instead of exiting, because the pool keeps an
    // open handle alive.
    await prisma.$disconnect();
  }
}

main().catch((error) => {
  console.error("\nSeed failed:\n", error instanceof Error ? error.message : error);
  process.exit(1);
});
