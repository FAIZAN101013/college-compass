import type { NextRequest } from "next/server";
import { z } from "zod";
import { CACHE, fail, ok, withErrorHandling } from "@/lib/api/response";
import { getSession } from "@/lib/auth/session";
import { listSavedColleges, saveCollege, unsaveCollege } from "@/lib/queries/saved";
import { prisma } from "@/lib/prisma";

/**
 * /api/saved/colleges
 *
 *   GET     list the signed-in user's saved colleges
 *   POST    { collegeId } — save one (idempotent)
 *   DELETE  { collegeId } — unsave one (idempotent)
 *
 * Every method requires a session. The userId always comes from the verified
 * session cookie and NEVER from the request body — accepting a userId from
 * the client would let anyone read or modify anyone else's saved list by
 * changing one field.
 */

const bodySchema = z.object({
  collegeId: z.string().min(1, "collegeId is required").max(40),
});

export const GET = withErrorHandling(async () => {
  const session = await getSession();
  if (!session) return fail("UNAUTHORIZED", "Sign in to see your saved colleges.");

  const colleges = await listSavedColleges(session.id);

  // CACHE.PRIVATE is "private, no-store". This response is specific to one
  // user, so it must never be held by a shared CDN cache — that is how one
  // person ends up served another person's saved list.
  return ok({ colleges }, { cache: CACHE.PRIVATE });
});

export const POST = withErrorHandling(async (request: NextRequest) => {
  const session = await getSession();
  if (!session) return fail("UNAUTHORIZED", "Sign in to save colleges.");

  const body = await request.json().catch(() => null);
  const parsed = bodySchema.safeParse(body);

  if (!parsed.success) {
    return fail("INVALID_BODY", "A valid collegeId is required.");
  }

  // Confirm the college exists before saving. Without this, a bad id would
  // surface as a foreign-key violation — a 500 with a database error message,
  // rather than a 404 that says what is actually wrong.
  const college = await prisma.college.findUnique({
    where: { id: parsed.data.collegeId },
    select: { id: true },
  });

  if (!college) return fail("NOT_FOUND", "That college does not exist.");

  const saved = await saveCollege(session.id, college.id);

  // 200, not 201. The upsert makes this idempotent, so a repeat save is not
  // "created" — and the client should not have to distinguish first save from
  // fifth in order to render a filled bookmark icon.
  return ok({ saved }, { cache: CACHE.PRIVATE });
});

export const DELETE = withErrorHandling(async (request: NextRequest) => {
  const session = await getSession();
  if (!session) return fail("UNAUTHORIZED", "Sign in to manage saved colleges.");

  const body = await request.json().catch(() => null);
  const parsed = bodySchema.safeParse(body);

  if (!parsed.success) {
    return fail("INVALID_BODY", "A valid collegeId is required.");
  }

  // Scoped by session.id inside the query, so this cannot touch another
  // user's row even with a valid collegeId.
  const result = await unsaveCollege(session.id, parsed.data.collegeId);

  // 200 whether or not a row existed. "Make sure this is not saved" has
  // succeeded either way.
  return ok(result, { cache: CACHE.PRIVATE });
});
