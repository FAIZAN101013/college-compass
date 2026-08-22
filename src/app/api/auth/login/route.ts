import type { NextRequest } from "next/server";
import { fail, ok, withErrorHandling } from "@/lib/api/response";
import { formatAuthErrors, loginSchema } from "@/lib/query/auth-schemas";
import { burnPasswordTime, createSession, verifyPassword } from "@/lib/auth/session";
import { prisma } from "@/lib/prisma";

/**
 * POST /api/auth/login
 *
 * Body: { email, password }
 * Sets an httpOnly session cookie on success.
 */
export const POST = withErrorHandling(async (request: NextRequest) => {
  const body = await request.json().catch(() => null);

  const parsed = loginSchema.safeParse(body);
  if (!parsed.success) {
    return fail("INVALID_BODY", "Please check the highlighted fields.", formatAuthErrors(parsed.error));
  }

  const { email, password } = parsed.data;

  const user = await prisma.user.findUnique({
    where: { email },
    select: { id: true, email: true, name: true, passwordHash: true },
  });

  /**
   * Both failure paths take the same time and return the same message.
   *
   * If the email does not exist we still hash the submitted password against
   * a dummy value, because returning immediately would make "no such account"
   * measurably faster than "wrong password". That timing gap is enough to
   * enumerate which email addresses have accounts here — a genuine privacy
   * leak for a site about where people are applying to study.
   *
   * The message is identical for both cases for the same reason. "No account
   * with that email" is friendlier, and it hands an attacker a free account
   * checker.
   */
  if (!user) {
    await burnPasswordTime(password);
    return fail("UNAUTHORIZED", "Email or password is incorrect.");
  }

  const passwordMatches = await verifyPassword(password, user.passwordHash);

  if (!passwordMatches) {
    return fail("UNAUTHORIZED", "Email or password is incorrect.");
  }

  // Note what is NOT passed to createSession: passwordHash. The session
  // payload is built from an explicit shape, so the hash cannot end up inside
  // a JWT that is handed to the browser.
  await createSession({ id: user.id, email: user.email, name: user.name });

  return ok({ user: { id: user.id, email: user.email, name: user.name } });
});
