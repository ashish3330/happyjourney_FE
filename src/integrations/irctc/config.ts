/**
 * IRCTC eCatering aggregator integration config.
 *
 * Values are read from Vite env vars (VITE_IRCTC_*). Defaults point at the
 * staging environment so local dev still works when env vars are missing.
 *
 * IMPORTANT: `IRCTC_VENDOR_ID_B64` is the *base64-encoded* IRCTC-issued
 * vendor / partner ID. It is static per environment (stage vs prod) and is
 * pre-computed so we don't have to encode it on every redirect.
 */

const env = import.meta.env as ImportMetaEnv & {
  VITE_IRCTC_BASE_URL?: string;
  VITE_IRCTC_VENDOR_ID_B64?: string;
  VITE_IRCTC_HANDOFF_USER_ENABLED?: string;
};

export const IRCTC_BASE_URL: string =
  (env.VITE_IRCTC_BASE_URL && env.VITE_IRCTC_BASE_URL.trim()) ||
  "https://stage-ecatering.ipsator.com";

export const IRCTC_VENDOR_ID_B64: string =
  (env.VITE_IRCTC_VENDOR_ID_B64 && env.VITE_IRCTC_VENDOR_ID_B64.trim()) || "";

/**
 * Whether to forward the logged-in user (name:mobile:email, base64) as the
 * `user` query param when redirecting to IRCTC. Defaults to true; set
 * VITE_IRCTC_HANDOFF_USER_ENABLED="false" to disable.
 */
export const IRCTC_HANDOFF_USER_ENABLED: boolean =
  (env.VITE_IRCTC_HANDOFF_USER_ENABLED ?? "true").toLowerCase() !== "false";
