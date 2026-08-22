import "server-only";

import { cookies } from "next/headers";
import { SignJWT, jwtVerify } from "jose";
import bcrypt from "bcryptjs";
import { env } from "@/lib/env";

/**
 * Session management: password hashing, JWT signing, and the session cookie.
 *
 * Hand-rolled rather than Auth.js. That is a deliberate choice for this
 * project — it is roughly a hundred lines that can be explained end to end,
 * and every security decision below is visible rather than buried in a
 * library's defaults. For an application with OAuth providers, email
 * verification and account linking, the calculation flips and a library wins.
 *
 * The "server-only" import at the top is a build-time guard: if any Client
 * Component ever imports this module, the build FAILS instead of quietly
 * shipping the signing secret to the browser.
 */

/**
 * bcrypt cost factor.
 *
 * Each increment doubles the work. 10 is roughly 100ms on current hardware:
 * slow enough that offline brute-forcing a stolen hash is expensive, fast
 * enough that logging in does not feel broken. Raising it improves resistance
 * to cracking but also makes a login endpoint easier to overload, since the
 * server pays that cost on every attempt.
 */
const BCRYPT_COST = 10;

/** Seven days. Long enough to be convenient, short enough to bound a leak. */
const SESSION_MAX_AGE_SECONDS = 60 * 60 * 24 * 7;

const COOKIE_NAME = "cc_session";

/**
 * jose needs the secret as bytes, not a string.
 *
 * env.JWT_SECRET is already guaranteed to be at least 32 characters by the
 * Zod schema in lib/env.ts, which matters: HS256's security rests entirely on
 * this secret being long enough not to be brute-forced. A short secret means
 * anyone can forge a session cookie for any user — a total authentication
 * bypass, not a partial one.
 */
const secretKey = new TextEncoder().encode(env.JWT_SECRET);

export type SessionUser = {
  id: string;
  email: string;
  name: string;
};

// ---------------------------------------------------------------------------
// Passwords
// ---------------------------------------------------------------------------

export async function hashPassword(plaintext: string): Promise<string> {
  return bcrypt.hash(plaintext, BCRYPT_COST);
}

export async function verifyPassword(plaintext: string, hash: string): Promise<boolean> {
  // bcrypt.compare is constant-time with respect to the hash contents, so it
  // does not leak how many characters matched. Never compare hashes with ===.
  return bcrypt.compare(plaintext, hash);
}

/**
 * A bcrypt hash of a throwaway value, used to burn time when an email does
 * not exist.
 *
 * Without this, a login attempt for an unknown email returns immediately while
 * a known email costs ~100ms of hashing. That timing difference is measurable
 * over enough requests, and it turns the login form into an oracle for which
 * email addresses have accounts. Hashing against this dummy makes both paths
 * cost about the same.
 */
const DUMMY_HASH = "$2b$10$CwTycUXWue0Thq9StjUM0uJ8.4kMBGvfF0.HdKcvVQpVCyKzHZWMy";

export async function burnPasswordTime(plaintext: string): Promise<void> {
  await bcrypt.compare(plaintext, DUMMY_HASH);
}

// ---------------------------------------------------------------------------
// JWT
// ---------------------------------------------------------------------------

async function signSessionToken(user: SessionUser): Promise<string> {
  return new SignJWT({ email: user.email, name: user.name })
    .setProtectedHeader({ alg: "HS256" })
    // `sub` is the standard JWT claim for "who this token is about".
    .setSubject(user.id)
    .setIssuedAt()
    // Expiry is INSIDE the signed payload, not only on the cookie. A cookie
    // Max-Age is a request from the server that the browser is free to ignore
    // or that an attacker can simply strip; an exp claim is signed, so an
    // expired token cannot be replayed no matter how it is presented.
    .setExpirationTime(`${SESSION_MAX_AGE_SECONDS}s`)
    .sign(secretKey);
}

async function verifySessionToken(token: string): Promise<SessionUser | null> {
  try {
    const { payload } = await jwtVerify(token, secretKey, { algorithms: ["HS256"] });

    // Pinning the algorithm matters. Without it, a verifier can be tricked
    // into accepting a token whose header claims alg: "none", or into
    // verifying an RS256 token using the public key as an HMAC secret. Both
    // are classic JWT bypasses.

    if (typeof payload.sub !== "string") return null;

    return {
      id: payload.sub,
      email: String(payload.email ?? ""),
      name: String(payload.name ?? ""),
    };
  } catch {
    // Any failure — bad signature, expired, malformed, tampered — is simply
    // "not signed in". The specific reason is deliberately not surfaced to the
    // caller, because telling an attacker WHY their forged token was rejected
    // helps them craft a better one.
    return null;
  }
}

// ---------------------------------------------------------------------------
// Cookie
// ---------------------------------------------------------------------------

export async function createSession(user: SessionUser): Promise<void> {
  const token = await signSessionToken(user);
  const cookieStore = await cookies();

  cookieStore.set(COOKIE_NAME, token, {
    /**
     * httpOnly — JavaScript cannot read this cookie.
     *
     * This is the single most important flag here. The common alternative is
     * storing a token in localStorage, which any script on the page can read:
     * one XSS bug, or one compromised npm dependency, and every session token
     * is exfiltrated. An httpOnly cookie is invisible to JavaScript, so the
     * same XSS can act as the user while they are on the page but cannot steal
     * a credential to use later from somewhere else.
     */
    httpOnly: true,

    /**
     * secure — only sent over HTTPS.
     *
     * Disabled in development because localhost is plain HTTP and the cookie
     * would otherwise never be set at all.
     */
    secure: env.NODE_ENV === "production",

    /**
     * sameSite: "lax" — not sent on cross-site POST requests.
     *
     * This is the CSRF defence. Without it, a form on any other website could
     * POST to our API and the browser would helpfully attach this cookie.
     * "lax" still sends it on top-level navigation, so following a link into
     * the site keeps you signed in, which "strict" would break.
     */
    sameSite: "lax",

    path: "/",
    maxAge: SESSION_MAX_AGE_SECONDS,
  });
}

export async function destroySession(): Promise<void> {
  const cookieStore = await cookies();
  // Deleting rather than setting an empty value, so no stale token remains in
  // the jar to be re-read by anything.
  cookieStore.delete(COOKIE_NAME);
}

/**
 * The signed-in user, or null.
 *
 * Reads and verifies on every call. There is no in-memory session store to
 * fall out of sync, and nothing is trusted that has not been cryptographically
 * checked against our secret on this request.
 */
export async function getSession(): Promise<SessionUser | null> {
  const cookieStore = await cookies();
  const token = cookieStore.get(COOKIE_NAME)?.value;

  if (!token) return null;
  return verifySessionToken(token);
}

/**
 * The signed-in user, or throw.
 *
 * For API routes that must not proceed without a session. The route handler
 * catches this and answers 401 — see requireSessionOr401 in the routes.
 */
export class UnauthorizedError extends Error {
  constructor() {
    super("Authentication required");
    this.name = "UnauthorizedError";
  }
}

export async function requireSession(): Promise<SessionUser> {
  const session = await getSession();
  if (!session) throw new UnauthorizedError();
  return session;
}
