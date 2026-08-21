import { PrismaPg } from "@prisma/adapter-pg";
import { PrismaClient } from "@/generated/prisma/client";
import { env } from "./env";

/**
 * The single shared PrismaClient for the whole application.
 *
 * ── Why a driver adapter ──────────────────────────────────────────────────
 * Prisma 7 requires one. Previously Prisma shipped a Rust query engine binary
 * that opened its own connections; now the actual TCP work is delegated to a
 * standard Node driver (node-postgres here). That matters for us because it
 * removes the ~15MB engine binary from the serverless bundle and lets the
 * connection behave like any other pg client on Vercel.
 *
 * ── Why a global singleton ────────────────────────────────────────────────
 * In development, Next.js hot-reloads by re-evaluating changed modules. A
 * plain `new PrismaClient()` at module scope would therefore construct a NEW
 * client — and a new connection pool — on every file save. After a dozen
 * edits you hit Postgres's connection limit and the app starts throwing
 * "too many clients already", which looks like a database problem but is
 * really a module-lifecycle problem.
 *
 * Stashing the instance on `globalThis` works because `globalThis` is NOT
 * reset by hot reload. In production the module is evaluated exactly once,
 * so we deliberately skip the global assignment rather than leaking an
 * application object into global scope for no reason.
 */
const globalForPrisma = globalThis as unknown as {
  prisma: PrismaClient | undefined;
};

function createPrismaClient() {
  const adapter = new PrismaPg({ connectionString: env.DATABASE_URL });

  return new PrismaClient({
    adapter,
    // Errors and warnings always. Query logging is intentionally off even in
    // development: the listing endpoint fires several queries per keystroke
    // and the noise buries the logs that actually matter. Flip this on
    // deliberately when profiling a specific slow query.
    log: env.NODE_ENV === "development" ? ["warn", "error"] : ["error"],
  });
}

export const prisma = globalForPrisma.prisma ?? createPrismaClient();

if (env.NODE_ENV !== "production") {
  globalForPrisma.prisma = prisma;
}
