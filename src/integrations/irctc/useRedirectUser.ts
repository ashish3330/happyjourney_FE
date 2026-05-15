/**
 * Hook that resolves the currently-logged-in user into a `RedirectUser` shape
 * suitable for handoff to the IRCTC aggregator.
 *
 * Resolution order for each field:
 *   1. AuthContext (populated at login from the BE response — see Login.tsx /
 *      UserPasswordlessLogin.tsx, which forward the identifier as either
 *      `email` or `mobile`).
 *   2. localStorage (mirror of the context, also written on previous logins
 *      so cross-tab / hard-refresh users still get a prefilled handoff).
 *
 * Returns `undefined` (which the redirect builders treat as "skip the user
 * param") only when name, mobile, AND email are all missing — handing IRCTC a
 * blob with two of three fields is still useful for prefill.
 */

import { useAuth } from "@/contexts/AuthContext";
import { IRCTC_HANDOFF_USER_ENABLED } from "./config";
import type { RedirectUser } from "./redirectBuilder";

export function useRedirectUser(): RedirectUser | undefined {
  const { accessToken, username, email: ctxEmail, mobile: ctxMobile } = useAuth();

  if (!IRCTC_HANDOFF_USER_ENABLED) return undefined;
  if (!accessToken || !username) return undefined;

  // Prefer context, fall back to localStorage (e.g. older sessions that
  // persisted contact info before they were lifted into the context).
  const mobile =
    ctxMobile ||
    (typeof window !== "undefined" && window.localStorage.getItem("mobile")) ||
    "";
  const email =
    ctxEmail ||
    (typeof window !== "undefined" && window.localStorage.getItem("email")) ||
    "";

  if (!username && !mobile && !email) {
    // No useful info at all — let IRCTC prompt the user instead of sending
    // an empty handoff blob.
    return undefined;
  }

  return { name: username, mobile, email };
}
