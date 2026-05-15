/**
 * IRCTC branding constants.
 *
 * These values are registered with IRCTC during onboarding and surface in the
 * WebView header when users transition into the IRCTC flow. Sourced from Vite
 * env vars so non-prod environments can override without a rebuild; the
 * defaults match the production Happy Journey brand.
 *
 * No React provider/context is required yet — a plain constant export is the
 * smallest surface that satisfies current callers (doc agent, onboarding
 * handoff file). If we later need per-tenant theming we can wrap this in a
 * context without changing the import path.
 */

export interface IrctcBranding {
  logoUrl: string;
  headerBackgroundColor: string;
  headerTextColor: string;
}

export const IRCTC_BRANDING: IrctcBranding = {
  logoUrl:
    import.meta.env.VITE_IRCTC_BRANDING_LOGO_URL ||
    "https://thehappyjourneyy.com/logo.png",
  headerBackgroundColor:
    import.meta.env.VITE_IRCTC_BRANDING_HEADER_BG || "#0d9488",
  headerTextColor:
    import.meta.env.VITE_IRCTC_BRANDING_HEADER_FG || "#ffffff",
};

/**
 * Shared branded header strip used across IRCTC reverse-order screens
 * (search, callback, payment, fallback, tracking). IRCTC will read these
 * same branding values from our onboarding config and apply them to their
 * pages during the reverse flow — keeping a single component here makes
 * sure the visual stays consistent across every surface we own.
 */
export interface IrctcBrandedHeaderProps {
  /** Override the default tagline. */
  label?: string;
  /** Tailwind classes appended to the outer wrapper. */
  className?: string;
  /** When true, strips the default rounded-top so the header can sit flush in a card. */
  flush?: boolean;
}

export const IrctcBrandedHeader = ({
  label = "Order on Train (powered by IRCTC eCatering)",
  className,
  flush = false,
}: IrctcBrandedHeaderProps) => (
  <header
    className={`flex items-center gap-3 px-4 py-3 ${
      flush ? "" : "rounded-t-xl"
    } ${className ?? ""}`}
    style={{
      backgroundColor: IRCTC_BRANDING.headerBackgroundColor,
      color: IRCTC_BRANDING.headerTextColor,
    }}
  >
    <img
      src={IRCTC_BRANDING.logoUrl}
      alt="Aggregator logo"
      className="h-8 w-auto"
    />
    <span className="font-semibold">{label}</span>
  </header>
);

/**
 * Small "Powered by IRCTC eCatering" footer mark rendered at the bottom of
 * every reverse-order surface. Matches Appendix C of the IRCTC integration
 * PDF, which requires aggregator pages to carry IRCTC attribution.
 */
export interface IrctcPoweredByProps {
  className?: string;
}

export const IrctcPoweredBy = ({ className }: IrctcPoweredByProps) => (
  <p
    className={`text-center text-xs text-gray-400 mt-6 ${className ?? ""}`}
    role="contentinfo"
  >
    Powered by{" "}
    <span className="font-semibold text-gray-500">IRCTC eCatering</span>
  </p>
);
