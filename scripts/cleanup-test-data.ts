/**
 * Remove accounts and saved items created while testing, keeping only the
 * seeded demo account.
 *
 *   npx tsx scripts/cleanup-test-data.ts
 *
 * Kept in the repo because manual API testing creates real rows, and shipping
 * a demo with half a dozen "Test" accounts in it looks careless.
 */
import "dotenv/config";
import { PrismaPg } from "@prisma/adapter-pg";
import { PrismaClient } from "../src/generated/prisma/client";

const KEEP_EMAIL = "demo@collegecompass.in";

async function main() {
  const prisma = new PrismaClient({
    adapter: new PrismaPg({ connectionString: process.env.DATABASE_URL! }),
    log: ["error"],
  });

  try {
    // SavedCollege and SavedComparison cascade from User, so deleting the
    // users is enough to take their saved items with them.
    const users = await prisma.user.deleteMany({ where: { email: { not: KEEP_EMAIL } } });
    console.log(`removed ${users.count} test account(s)`);

    const demo = await prisma.user.findUnique({ where: { email: KEEP_EMAIL }, select: { id: true } });

    if (demo) {
      // Comparisons the demo account accumulated during testing, keeping the
      // one the seed script creates.
      const comparisons = await prisma.savedComparison.deleteMany({
        where: { userId: demo.id, name: { not: "Top engineering picks" } },
      });
      console.log(`removed ${comparisons.count} test comparison(s)`);
    }

    console.log(`users remaining:       ${await prisma.user.count()}`);
    console.log(`saved colleges:        ${await prisma.savedCollege.count()}`);
    console.log(`saved comparisons:     ${await prisma.savedComparison.count()}`);
  } finally {
    await prisma.$disconnect();
  }
}

main().catch((error) => {
  console.error(error instanceof Error ? error.message : error);
  process.exit(1);
});
