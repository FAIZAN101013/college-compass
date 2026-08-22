/**
 * Validate a post-login redirect target.
 *
 * ── The vulnerability this prevents: OPEN REDIRECT ────────────────────────
 * Several places send users to /login?next=<where they were> so signing in
 * returns them to the page they wanted. The obvious implementation redirects
 * to `next` directly. That is exploitable:
 *
 *   /login?next=https://evil-example.com/college-compass-login
 *
 * The link genuinely points at OUR domain, so it survives a careful reader, a
 * link preview and most URL filters. After signing in, the victim is handed to
 * an attacker-controlled page — typically a pixel-perfect copy of this one
 * asking them to "sign in again". They have just been phished by a link that
 * really did start on our site, which is why open redirects are treated as a
 * genuine vulnerability rather than a cosmetic bug.
 *
 * The fix is an ALLOWLIST of shapes, not a blocklist of bad ones. Blocklists
 * lose here: "//evil.com" is protocol-relative and slips past most naive
 * checks, "/\evil.com" is normalised toward a host by browsers, and new
 * encoded variants keep arriving. Only same-origin absolute paths pass.
 */

/** Where users go when no valid target was supplied. */
const DEFAULT_REDIRECT = "/saved";

/**
 * True if the string contains any control character.
 *
 * Checked by character code rather than with a regex character class, because
 * a class containing literal control bytes is invisible in a diff and easy to
 * corrupt when the file is edited by tooling. This says exactly what it means.
 *
 * Range 0x00-0x1F covers NUL, tab, newline and carriage return; 0x7F is DEL.
 * Newlines matter most: injected into a Location header they can split the
 * response.
 */
function hasControlCharacter(value: string): boolean {
  for (let i = 0; i < value.length; i++) {
    const code = value.charCodeAt(i);
    if (code <= 0x1f || code === 0x7f) return true;
  }
  return false;
}

export function safeRedirectPath(candidate: string | undefined | null): string {
  if (!candidate) return DEFAULT_REDIRECT;

  // Must be an absolute path on this site.
  if (!candidate.startsWith("/")) return DEFAULT_REDIRECT;

  // Reject protocol-relative URLs. "//evil.com" starts with "/" and passes the
  // check above, but a browser reads it as "https://evil.com". This is the one
  // line most open-redirect fixes forget.
  if (candidate.startsWith("//")) return DEFAULT_REDIRECT;

  // Backslash variants are protocol-relative URLs in disguise: browsers
  // normalise "/\evil.com" toward a host.
  if (candidate.includes("\\")) return DEFAULT_REDIRECT;

  // Reject rather than sanitise. Stripping characters from a hostile string is
  // how "/\/evil.com" becomes "//evil.com" after cleanup.
  if (hasControlCharacter(candidate)) return DEFAULT_REDIRECT;

  return candidate;
}
