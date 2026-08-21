import { z } from "zod";

/**
 * Server-side environment configuration.
 *
 * Why this file exists at all: `process.env.ANYTHING` is typed as
 * `string | undefined` in TypeScript, so every use site either needs a
 * non-null assertion (`!`) that lies to the compiler, or a runtime check
 * that nobody remembers to write. Both fail the same way — the app boots
 * fine, then explodes on the first request that touches the missing value.
 *
 * Instead we validate once, at module load, and export a fully-typed object.
 * A missing or malformed variable now fails loudly at startup (and at build
 * time on Vercel) rather than silently at runtime in front of a user.
 *
 * This module is SERVER-ONLY. Importing it from a Client Component would
 * fail, because Next.js does not ship non-NEXT_PUBLIC_ variables to the
 * browser — which is exactly the protection we want.
 */
const envSchema = z.object({
  /**
   * Postgres connection string. We check the scheme rather than using a
   * generic URL validator, because "is a valid URL" would happily accept
   * `https://google.com` and let the app fail much later and much less
   * comprehensibly.
   */
  DATABASE_URL: z
    .string()
    .regex(
      /^postgres(ql)?:\/\//,
      "DATABASE_URL must be a PostgreSQL connection string (postgresql://...)",
    ),

  /**
   * Signing key for session JWTs.
   *
   * The 32-character minimum is not arbitrary: we sign with HS256, whose
   * security depends entirely on this secret being long enough that it
   * cannot be brute-forced. A short secret means anyone can forge a session
   * cookie for any user, which is a total authentication bypass.
   */
  JWT_SECRET: z
    .string()
    .min(32, "JWT_SECRET must be at least 32 characters. Generate one with: openssl rand -base64 32"),

  NODE_ENV: z.enum(["development", "production", "test"]).default("development"),
});

const parsed = envSchema.safeParse(process.env);

if (!parsed.success) {
  // Print every problem at once. Reporting them one at a time turns a
  // 30-second fix into three rounds of restart-and-retry.
  const problems = parsed.error.issues
    .map((issue) => `  - ${issue.path.join(".") || "(root)"}: ${issue.message}`)
    .join("\n");

  throw new Error(
    `Invalid environment configuration:\n${problems}\n\n` +
      `Copy .env.example to .env and fill in the values.`,
  );
}

export const env = parsed.data;
