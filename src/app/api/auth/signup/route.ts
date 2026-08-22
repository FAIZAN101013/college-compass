import type { NextRequest } from "next/server";
import { fail, ok, withErrorHandling } from "@/lib/api/response";
import { formatAuthErrors, signupSchema } from "@/lib/query/auth-schemas";
import { createSession, hashPassword } from "@/lib/auth/session";
import { prisma } from "@/lib/prisma";

/**
 * POST /api/auth/signup
 *
 * Body: { name, email, password }
 * Sets an httpOnly session cookie on success.
 */
export const POST = withErrorHandling(async (request: NextRequest) => {
  // A malformed body throws inside request.json(). Catching it here turns
  // "not JSON at all" into a clean 422 rather than a 500.
  const body = await request.json().catch(() => null);

  const parsed = signupSchema.safeParse(body);
  if (!parsed.success) {
    return fail("INVALID_BODY", "Please check the highlighted fields.", formatAuthErrors(parsed.error));
  }

  const { name, email, password } = parsed.data;

  // Hash BEFORE the uniqueness check, so both the "email taken" and the
  // "email free" paths pay the same ~100ms. Checking first and returning
  // early on a duplicate makes the two responses measurably different in
  // time, which turns this endpoint into a way to test whether an address
  // has an account here.
  const passwordHash = await hashPassword(password);

  const existing = await prisma.user.findUnique({ where: { email }, select: { id: true } });

  if (existing) {
    /**
     * On signup we DO reveal that the email is taken.
     *
     * This is the one place where hiding it is not worth it: a signup form
     * that silently fails, or claims success without creating an account,
     * leaves a real user permanently stuck with no idea why they cannot log
     * in. The information is also obtainable anyway by attempting a password
     * reset. Login, where the tradeoff runs the other way, stays deliberately
     * vague — see that route.
     */
    return fail("CONFLICT", "An account with this email already exists.", {
      email: ["An account with this email already exists. Try signing in instead."],
    });
  }

  const user = await prisma.user.create({
    data: { name, email, passwordHash },
    // Select explicitly. Returning the whole row would put passwordHash in the
    // response body — the kind of leak that happens by omission, not intent.
    select: { id: true, email: true, name: true },
  });

  await createSession(user);

  return ok({ user }, { status: 201 });
});
