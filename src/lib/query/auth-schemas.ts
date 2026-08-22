import { z } from "zod";

/**
 * Signup and login input validation.
 *
 * Pure — no database, no Node APIs — so the login and signup forms (Client
 * Components) import the same schemas the API validates against. One
 * definition means the client cannot allow something the server rejects, and
 * the user gets immediate feedback without a round trip.
 *
 * The client-side check is convenience only. The server ALWAYS revalidates,
 * because anything running in a browser can be bypassed with one devtools
 * request.
 */

export const emailSchema = z
  .string()
  .trim()
  // Lowercased before it reaches the database. Email local-parts are
  // technically case-sensitive, but no real provider treats them that way, and
  // without normalising, Faizan@x.com and faizan@x.com would pass the unique
  // constraint as two separate accounts — then whichever the user typed today
  // decides whether their saved colleges exist.
  .toLowerCase()
  .min(1, "Email is required")
  .max(255, "Email is too long")
  .email("Enter a valid email address");

export const passwordSchema = z
  .string()
  // Length is the requirement, not character classes. Composition rules
  // ("one uppercase, one symbol") push people toward Password1! — predictable
  // patterns that are weak against real cracking software — while a longer
  // passphrase is both stronger and easier to remember. This follows current
  // NIST guidance.
  .min(8, "Password must be at least 8 characters")
  // bcrypt silently TRUNCATES input beyond 72 bytes. Without this cap, two
  // different long passwords could share a prefix and both authenticate, so
  // the limit is a correctness bound rather than a policy choice.
  .max(72, "Password must be 72 characters or fewer");

export const signupSchema = z.object({
  name: z
    .string()
    .trim()
    .min(1, "Name is required")
    .max(80, "Name is too long"),
  email: emailSchema,
  password: passwordSchema,
});

export const loginSchema = z.object({
  email: emailSchema,
  // Login only checks that a password was supplied. Applying the full rules
  // here would reject a legitimate account created before the policy changed,
  // and it would tell an attacker our password rules for free.
  password: z.string().min(1, "Password is required"),
});

export type SignupInput = z.infer<typeof signupSchema>;
export type LoginInput = z.infer<typeof loginSchema>;

/** Flatten Zod issues into { field: [messages] } for an API error body. */
export function formatAuthErrors(error: z.ZodError): Record<string, string[]> {
  const fields: Record<string, string[]> = {};

  for (const issue of error.issues) {
    const key = issue.path.join(".") || "_";
    (fields[key] ??= []).push(issue.message);
  }

  return fields;
}
