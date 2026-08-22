import type { NextRequest } from "next/server";
import { z } from "zod";
import { CACHE, fail, ok, withErrorHandling } from "@/lib/api/response";
import { getSession } from "@/lib/auth/session";
import { deleteComparison, listSavedComparisons, saveComparison } from "@/lib/queries/saved";
import { MAX_COMPARE } from "@/lib/query/compare-params";
import { prisma } from "@/lib/prisma";

/**
 * /api/saved/comparisons
 *
 *   GET     list the signed-in user's saved comparisons
 *   POST    { name, slugs[] } — save one
 *   DELETE  { id } — delete one
 */

const createSchema = z.object({
  name: z.string().trim().min(1, "Give this comparison a name").max(80),
  slugs: z
    .array(z.string().min(1).max(120))
    // A comparison of one college is not a comparison, and the cap matches the
    // UI's. Enforced here too because the API is reachable without the UI.
    .min(2, `Pick at least 2 colleges`)
    .max(MAX_COMPARE, `Pick at most ${MAX_COMPARE} colleges`),
});

const deleteSchema = z.object({ id: z.string().min(1).max(40) });

export const GET = withErrorHandling(async () => {
  const session = await getSession();
  if (!session) return fail("UNAUTHORIZED", "Sign in to see your saved comparisons.");

  const comparisons = await listSavedComparisons(session.id);
  return ok({ comparisons }, { cache: CACHE.PRIVATE });
});

export const POST = withErrorHandling(async (request: NextRequest) => {
  const session = await getSession();
  if (!session) return fail("UNAUTHORIZED", "Sign in to save comparisons.");

  const body = await request.json().catch(() => null);
  const parsed = createSchema.safeParse(body);

  if (!parsed.success) {
    const fields: Record<string, string[]> = {};
    for (const issue of parsed.error.issues) {
      (fields[issue.path.join(".") || "_"] ??= []).push(issue.message);
    }
    return fail("INVALID_BODY", "Please check the highlighted fields.", fields);
  }

  const { name, slugs } = parsed.data;

  // The client sends slugs (what the URL carries); the database stores ids.
  // Resolving here rather than trusting the client also validates existence.
  const colleges = await prisma.college.findMany({
    where: { slug: { in: slugs } },
    select: { id: true, slug: true },
  });

  if (colleges.length < 2) {
    return fail("INVALID_BODY", "At least 2 of those colleges could not be found.");
  }

  // Preserve the order the user chose. findMany returns rows in the database's
  // order, and a saved comparison should reopen with its columns exactly where
  // the user left them — that ordering is the whole reason collegeIds is an
  // ordered array rather than a join table.
  const bySlug = new Map(colleges.map((college) => [college.slug, college.id]));
  const orderedIds = slugs
    .map((slug) => bySlug.get(slug))
    .filter((id): id is string => id !== undefined);

  const comparison = await saveComparison(session.id, name, orderedIds);

  return ok({ comparison }, { status: 201, cache: CACHE.PRIVATE });
});

export const DELETE = withErrorHandling(async (request: NextRequest) => {
  const session = await getSession();
  if (!session) return fail("UNAUTHORIZED", "Sign in to manage saved comparisons.");

  const body = await request.json().catch(() => null);
  const parsed = deleteSchema.safeParse(body);

  if (!parsed.success) return fail("INVALID_BODY", "A valid id is required.");

  // deleteComparison scopes by userId in its WHERE clause, so a valid id
  // belonging to someone else simply matches nothing.
  const result = await deleteComparison(session.id, parsed.data.id);

  if (!result.removed) {
    // Deliberately 404 rather than 403. Answering "forbidden" would confirm
    // that this id exists and belongs to somebody, which is more than a
    // stranger should learn from a failed request.
    return fail("NOT_FOUND", "No such saved comparison.");
  }

  return ok(result, { cache: CACHE.PRIVATE });
});
