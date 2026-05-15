/**
 * Shared status palette + small formatting helpers for the admin IRCTC pages.
 *
 * The palette intentionally mirrors `STATUS_VISUALS` inside the customer
 * tracking page (`src/integrations/irctc/pages/IrctcOrderTracking.tsx`) so the
 * same colour means the same thing on both surfaces. We can't import from
 * that file — it's a page component, not a leaf export — so the palette is
 * duplicated here and must be kept in lockstep if the customer view shifts.
 */

import type { IrctcOrderStatus } from "@/integrations/irctc/types";

export interface StatusVisual {
  badgeClassName: string;
  label: string;
}

export const ADMIN_STATUS_VISUALS: Record<IrctcOrderStatus, StatusVisual> = {
  ORDER_PENDING: {
    badgeClassName: "bg-gray-100 text-gray-700 border-gray-300",
    label: "Pending",
  },
  PENDING: {
    badgeClassName: "bg-gray-100 text-gray-700 border-gray-300",
    label: "Pending",
  },
  PAYMENT_AWAITING: {
    badgeClassName: "bg-amber-50 text-amber-800 border-amber-300",
    label: "Payment awaiting",
  },
  ORDER_CONFIRMED: {
    badgeClassName: "bg-green-50 text-green-700 border-green-300",
    label: "Confirmed",
  },
  CONFIRMED: {
    badgeClassName: "bg-green-50 text-green-700 border-green-300",
    label: "Confirmed",
  },
  PREPARING: {
    badgeClassName: "bg-blue-50 text-blue-700 border-blue-300",
    label: "Preparing",
  },
  OUT_FOR_DELIVERY: {
    badgeClassName: "bg-indigo-50 text-indigo-700 border-indigo-300",
    label: "Out for delivery",
  },
  DELIVERED: {
    badgeClassName: "bg-green-700 text-white border-green-800",
    label: "Delivered",
  },
  ORDER_CANCELLED: {
    badgeClassName: "bg-red-50 text-red-700 border-red-300",
    label: "Cancelled",
  },
  CANCELLED: {
    badgeClassName: "bg-red-50 text-red-700 border-red-300",
    label: "Cancelled",
  },
  STATUS_PUSH_FAILED: {
    badgeClassName: "bg-orange-50 text-orange-700 border-orange-300",
    label: "Sync delayed",
  },
  REFUND_FAILED: {
    badgeClassName: "bg-red-50 text-red-800 border-red-400",
    label: "Refund pending",
  },
};

export const ALL_STATUSES: IrctcOrderStatus[] = [
  "ORDER_PENDING",
  "PENDING",
  "PAYMENT_AWAITING",
  "ORDER_CONFIRMED",
  "CONFIRMED",
  "PREPARING",
  "OUT_FOR_DELIVERY",
  "DELIVERED",
  "ORDER_CANCELLED",
  "CANCELLED",
  "STATUS_PUSH_FAILED",
  "REFUND_FAILED",
];

/** Hex colour for chart bars per status. Keep in sync with badgeClassName. */
export const STATUS_BAR_COLOR: Record<string, string> = {
  ORDER_PENDING: "#6b7280",
  PENDING: "#6b7280",
  PAYMENT_AWAITING: "#d97706",
  ORDER_CONFIRMED: "#16a34a",
  CONFIRMED: "#16a34a",
  PREPARING: "#2563eb",
  OUT_FOR_DELIVERY: "#4f46e5",
  DELIVERED: "#15803d",
  ORDER_CANCELLED: "#dc2626",
  CANCELLED: "#dc2626",
  STATUS_PUSH_FAILED: "#ea580c",
  REFUND_FAILED: "#b91c1c",
};

const formatRel = (diffMs: number): string => {
  const sec = Math.round(diffMs / 1000);
  if (sec < 60) return `${sec}s ago`;
  const min = Math.round(sec / 60);
  if (min < 60) return `${min}m ago`;
  const hr = Math.round(min / 60);
  if (hr < 24) return `${hr}h ago`;
  const days = Math.round(hr / 24);
  return `${days}d ago`;
};

/** Render an ISO timestamp (or epoch millis) as "12s ago" / "3h ago". */
export const formatRelative = (
  input: string | number | null | undefined,
  now: number = Date.now()
): string => {
  if (input == null) return "—";
  const ts = typeof input === "string" ? Date.parse(input) : input;
  if (!Number.isFinite(ts)) return "—";
  const diff = Math.max(0, now - ts);
  return formatRel(diff);
};

export const formatCurrency = (n: number): string =>
  new Intl.NumberFormat("en-IN", {
    style: "currency",
    currency: "INR",
    maximumFractionDigits: 2,
  }).format(n);
