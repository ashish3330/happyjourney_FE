/**
 * Render-time error boundary fallback shared by every IRCTC page.
 *
 * The IRCTC reverse-order surfaces are linked from outside our domain
 * (IRCTC redirects users in via the callback URL). A render-time crash on
 * any of these screens would leave the user staring at a blank tab with no
 * way back to either site. This fallback gives them a clean error card,
 * a retry button (resets the boundary so the affected subtree remounts),
 * and a link home.
 */

import { Link } from "react-router-dom";
import type { FallbackProps } from "react-error-boundary";

import { IrctcBrandedHeader, IrctcPoweredBy } from "./BrandingProvider";

export const IrctcErrorFallback = ({
  error,
  resetErrorBoundary,
}: FallbackProps) => {
  // Coerce to string and clip so we never display a giant stack trace inline.
  const message =
    (error instanceof Error && error.message) ||
    (typeof error === "string" ? error : "An unexpected error occurred.");

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-md mx-auto p-4 md:p-6">
        <IrctcBrandedHeader className="mb-4" />
        <div
          role="alert"
          aria-live="assertive"
          className="bg-white rounded-2xl shadow-sm border border-gray-200 p-8 text-center"
        >
          <div className="mx-auto h-14 w-14 rounded-full bg-red-50 flex items-center justify-center mb-4">
            <svg
              className="h-7 w-7 text-red-500"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
              aria-hidden
            >
              <circle cx="12" cy="12" r="10" />
              <line x1="12" y1="8" x2="12" y2="12" />
              <line x1="12" y1="16" x2="12.01" y2="16" />
            </svg>
          </div>
          <h2 className="text-lg font-semibold text-gray-900">
            Something went wrong
          </h2>
          <p className="text-sm text-gray-500 mt-2 break-words">{message}</p>
          <div className="mt-6 flex flex-col sm:flex-row gap-3 justify-center">
            <button
              type="button"
              onClick={resetErrorBoundary}
              className="bg-teal-600 hover:bg-teal-700 text-white font-medium rounded-lg px-6 py-3 transition-colors"
            >
              Retry
            </button>
            <Link
              to="/"
              className="bg-white hover:bg-gray-50 text-gray-700 font-medium rounded-lg px-6 py-3 border border-gray-300 transition-colors"
            >
              Return to home
            </Link>
          </div>
        </div>
        <IrctcPoweredBy />
      </div>
    </div>
  );
};

export default IrctcErrorFallback;
