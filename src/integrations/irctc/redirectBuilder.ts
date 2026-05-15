/**
 * Pure helpers that build the IRCTC eCatering aggregator redirect URLs.
 *
 * Three entry-point flows are supported (see PDF Appendix A):
 *   - PNR-based search       -> /{pnr}/outlets
 *   - Train + station search -> /train/{trainNo}/{stationCode}
 *   - Station-only search    -> /station/{stationCode}/outlets
 *
 * Every URL carries `reqId`, which is the base64-encoded vendor ID. When a
 * logged-in user is available, `user` (base64 of `name:mobile:email`) is also
 * appended so the partner site can prefill the order form.
 *
 * These helpers are kept pure (no React, no DOM beyond `btoa`) so they can be
 * unit-tested and reused from anywhere in the app.
 */

import { IRCTC_BASE_URL, IRCTC_VENDOR_ID_B64 } from "./config";

export interface RedirectUser {
  name: string;
  mobile: string;
  email: string;
}

/**
 * UTF-8 safe Base64 encoding for arbitrary unicode strings.
 *
 * `btoa()` throws on any code point > 0xFF — so customer names containing
 * Indic scripts, Bengali, Tamil, Devanagari, accented Latin characters, or
 * emoji would crash the redirect. We TextEncoder → bytes → btoa to keep the
 * output identical to the PDF Appendix A example for ASCII inputs while
 * remaining safe for the full Unicode range.
 */
const utf8ToBase64 = (s: string): string => {
  const bytes = new TextEncoder().encode(s);
  let bin = "";
  for (let i = 0; i < bytes.length; i++) {
    bin += String.fromCharCode(bytes[i]);
  }
  return btoa(bin);
};

/**
 * Base64-encode a `name:mobile:email` triple for the IRCTC `user` param.
 * No validation here – callers decide whether they have enough info to send.
 */
export const encodeUser = (
  name: string,
  mobile: string,
  email: string
): string => utf8ToBase64(`${name}:${mobile}:${email}`);

/** Throw a clear error when a required input is empty / whitespace. */
const requireNonEmpty = (value: string | undefined | null, field: string): string => {
  if (value === undefined || value === null || String(value).trim() === "") {
    throw new Error(`IRCTC redirect: "${field}" is required`);
  }
  return String(value).trim();
};

/** Ensure the static vendor ID has been configured before building any URL. */
const requireVendorId = (): string => {
  if (!IRCTC_VENDOR_ID_B64) {
    throw new Error(
      "IRCTC redirect: aggregator not configured (VITE_IRCTC_VENDOR_ID_B64 is empty)"
    );
  }
  return IRCTC_VENDOR_ID_B64;
};

/** Build the common query string (reqId, optional user) for any flow. */
const buildQuery = (extra: Record<string, string>, user?: RedirectUser): string => {
  const params = new URLSearchParams();
  // Preserve a stable order: caller-supplied params first, then reqId, then user.
  for (const [k, v] of Object.entries(extra)) {
    params.append(k, v);
  }
  params.append("reqId", requireVendorId());
  if (user) {
    params.append(
      "user",
      encodeUser(user.name, user.mobile, user.email)
    );
  }
  return params.toString();
};

/**
 * Build the PNR-based outlet listing URL.
 *
 * Example:
 *   buildPnrRedirectUrl("2721880872", { name, mobile, email })
 *   -> https://stage-ecatering.ipsator.com/2721880872/outlets?reqId=...&user=...
 */
export const buildPnrRedirectUrl = (pnr: string, user?: RedirectUser): string => {
  const cleanPnr = requireNonEmpty(pnr, "pnr");
  const qs = buildQuery({}, user);
  return `${IRCTC_BASE_URL}/${encodeURIComponent(cleanPnr)}/outlets?${qs}`;
};

/**
 * Build the train-number + boarding-station outlet listing URL.
 *
 * Example:
 *   buildTrainRedirectUrl("12951", "BRC", "2025-01-01")
 *   -> https://stage-ecatering.ipsator.com/train/12951/BRC?boardingDate=2025-01-01&reqId=...
 */
export const buildTrainRedirectUrl = (
  trainNo: string,
  boardingStation: string,
  boardingDate: string,
  user?: RedirectUser
): string => {
  const cleanTrain = requireNonEmpty(trainNo, "trainNo");
  const cleanStation = requireNonEmpty(boardingStation, "boardingStation");
  const cleanDate = requireNonEmpty(boardingDate, "boardingDate");
  const qs = buildQuery({ boardingDate: cleanDate }, user);
  return `${IRCTC_BASE_URL}/train/${encodeURIComponent(cleanTrain)}/${encodeURIComponent(
    cleanStation
  )}?${qs}`;
};

/**
 * Build the station-only outlet listing URL.
 *
 * Example:
 *   buildStationRedirectUrl("NDLS")
 *   -> https://stage-ecatering.ipsator.com/station/NDLS/outlets?reqId=...
 */
export const buildStationRedirectUrl = (
  stationCode: string,
  user?: RedirectUser
): string => {
  const cleanStation = requireNonEmpty(stationCode, "stationCode");
  const qs = buildQuery({}, user);
  return `${IRCTC_BASE_URL}/station/${encodeURIComponent(cleanStation)}/outlets?${qs}`;
};
