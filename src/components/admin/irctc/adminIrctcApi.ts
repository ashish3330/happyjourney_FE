/**
 * Admin-side IRCTC API helpers.
 *
 * Thin wrappers over the project's `api` axios instance for the three admin
 * surfaces backing the IRCTC ops console:
 *
 * - `GET /api/admin/irctc/reverse-orders` (paginated list)
 * - `GET /api/admin/irctc/reverse-orders/{internalOrderId}` (detail)
 * - `GET /api/admin/irctc/stats` (dashboard rollup)
 *
 * Mirrors the runtime-validation pattern in `src/integrations/irctc/api.ts`:
 * zod schema at the boundary, abort signal pass-through, BE error surface
 * funnelled through the shared `parseIrctcError`. The integrations package is
 * never mutated — we only *import* from it here.
 *
 * NOTE: ideally this would live at `src/api/adminIrctc.ts`, but the agent
 * harness only allows writes under `src/components/`. The file is fully
 * relocatable: every import is path-aliased ("@/..."), nothing imports it by
 * relative path yet.
 */

import { z } from "zod";

import api from "@/utils/axios";
import { parseIrctcError } from "@/integrations/irctc/api";
import type {
  IrctcOrderStatus,
  IrctcPaymentType,
  IrctcOrderSummary,
  IrctcRefundStatus,
} from "@/integrations/irctc/types";

export { parseIrctcError };

/* -------------------------------------------------------------------------- */
/*  Runtime validation                                                        */
/* -------------------------------------------------------------------------- */

const orderStatusSchema: z.ZodType<IrctcOrderStatus> = z.enum([
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
]);

const paymentTypeSchema: z.ZodType<IrctcPaymentType> = z.enum([
  "CASH_ON_DELIVERY",
  "PREPAID",
  "PREPAID_ALLOWED",
]);

const refundStatusSchema: z.ZodType<IrctcRefundStatus> = z.enum([
  "NONE",
  "INITIATED",
  "FAILED",
]);

/**
 * Row shape returned by the admin list endpoint. Mirrors
 * `IrctcAdminOrderSummaryDTO` on the BE.
 */
export interface IrctcAdminOrderSummary {
  internalOrderId: number;
  externalOrderId: string;
  status: IrctcOrderStatus;
  paymentType: IrctcPaymentType;
  customerName: string;
  customerMobile: string;
  amountPayable: number;
  bookingDate: string;
  /** ISO timestamp of the last DB-side mutation. */
  updatedAt: string;
  /** Optional — present once BE knows it. */
  vendorId?: number | null;
  refundStatus?: IrctcRefundStatus;
}

const adminOrderSummarySchema: z.ZodType<IrctcAdminOrderSummary> = z.object({
  internalOrderId: z.number(),
  externalOrderId: z.string(),
  status: orderStatusSchema,
  paymentType: paymentTypeSchema,
  customerName: z.string(),
  customerMobile: z.string(),
  amountPayable: z.number(),
  bookingDate: z.string(),
  updatedAt: z.string(),
  vendorId: z.number().nullable().optional(),
  refundStatus: refundStatusSchema.optional(),
});

export interface IrctcAdminPage<T> {
  content: T[];
  totalElements: number;
  totalPages: number;
  page: number;
  size: number;
}

const adminPageSchema = <T>(
  itemSchema: z.ZodType<T>
): z.ZodType<IrctcAdminPage<T>> =>
  z.object({
    content: z.array(itemSchema),
    totalElements: z.number(),
    totalPages: z.number(),
    page: z.number(),
    size: z.number(),
  });

/**
 * Detail shape returned by `GET /api/admin/irctc/reverse-orders/{id}`.
 *
 * Has the same renderable surface as the customer `IrctcOrderSummary` plus
 * the ops-only fields (raw payload, push counters, row version, last error).
 */
export interface IrctcAdminOrderDetail extends IrctcOrderSummary {
  /** Parsed by the BE — already a plain object, no nested JSON string. */
  payloadJson?: Record<string, unknown> | null;
  /** Optimistic-locking version of the underlying row. */
  rowVersion?: number;
  confirmAttemptCount?: number | null;
  lastAttemptAt?: string | null;
  lastError?: string | null;
  pendingPushTarget?: string | null;
  /** Vendor id whose catalog drives this order (for the resync action). */
  vendorId?: number | null;
}

// Loose schema for the detail — we don't want a schema bug to crash the ops
// page right when an engineer needs it. We validate the required surface and
// let extra/missing optional fields pass through.
const adminOrderDetailSchema = z
  .object({
    internalOrderId: z.number(),
    externalOrderId: z.string(),
    status: orderStatusSchema,
    paymentType: paymentTypeSchema,
    customer: z.object({
      fullName: z.string(),
      email: z.string(),
      mobile: z.string(),
      alternateMobile: z.string().nullable(),
    }),
    items: z.array(z.unknown()),
    deliveryDetails: z.object({
      pnr: z.string(),
      coach: z.string(),
      berth: z.string(),
      station: z.object({ code: z.string(), name: z.string() }),
      train: z.object({
        trainNo: z.string(),
        trainName: z.string(),
        eta: z.string(),
        sta: z.string(),
      }),
    }),
    amount: z.object({
      taxAmount: z.number(),
      amountPayable: z.number(),
      totalAmount: z.number(),
      discountAmount: z.number(),
      totalOtherCharges: z.number(),
    }),
    otherCharges: z.array(z.unknown()),
    coupon: z
      .object({ code: z.string(), isPrepaidOnly: z.boolean() })
      .nullable(),
    bookingDate: z.string(),
    comment: z.string().nullable(),
    deliveryOtp: z.string().nullable().optional(),
    refundRef: z.string().nullable().optional(),
    refundStatus: refundStatusSchema.optional(),
    payloadJson: z.record(z.unknown()).nullable().optional(),
    rowVersion: z.number().optional(),
    confirmAttemptCount: z.number().nullable().optional(),
    lastAttemptAt: z.string().nullable().optional(),
    lastError: z.string().nullable().optional(),
    pendingPushTarget: z.string().nullable().optional(),
    vendorId: z.number().nullable().optional(),
  })
  .passthrough();

export interface IrctcAdminStats {
  countsByStatus: Record<string, number>;
  stuckPending: number;
  stuckPushFailed: number;
  stuckRefundFailed: number;
  todayCounts: {
    ingested: number;
    confirmed: number;
    cancelled: number;
  };
  lastSweeperRunMs: number | null;
  circuitOpen: boolean;
}

const adminStatsSchema: z.ZodType<IrctcAdminStats> = z.object({
  countsByStatus: z.record(z.number()),
  stuckPending: z.number(),
  stuckPushFailed: z.number(),
  stuckRefundFailed: z.number(),
  todayCounts: z.object({
    ingested: z.number(),
    confirmed: z.number(),
    cancelled: z.number(),
  }),
  lastSweeperRunMs: z.number().nullable(),
  circuitOpen: z.boolean(),
});

/* -------------------------------------------------------------------------- */
/*  Helpers                                                                   */
/* -------------------------------------------------------------------------- */

const formatZodIssue = (label: string, err: z.ZodError): Error => {
  const issue = err.issues[0];
  const path = issue?.path?.join(".") || "<root>";
  return new Error(
    `Invalid ${label} from server (field "${path}": ${
      issue?.message || "unknown"
    })`
  );
};

/* -------------------------------------------------------------------------- */
/*  API surface                                                               */
/* -------------------------------------------------------------------------- */

export interface FetchAdminOrdersParams {
  status?: IrctcOrderStatus[];
  externalOrderId?: string;
  from?: string;
  to?: string;
  page: number;
  size: number;
}

const buildOrdersParams = (
  p: FetchAdminOrdersParams
): Record<string, string | number> => {
  const params: Record<string, string | number> = {
    page: p.page,
    size: p.size,
  };
  if (p.status && p.status.length > 0) {
    params.status = p.status.join(",");
  }
  if (p.externalOrderId && p.externalOrderId.trim().length > 0) {
    params.externalOrderId = p.externalOrderId.trim();
  }
  if (p.from) params.from = p.from;
  if (p.to) params.to = p.to;
  return params;
};

export const fetchAdminOrders = async (
  params: FetchAdminOrdersParams,
  signal?: AbortSignal
): Promise<IrctcAdminPage<IrctcAdminOrderSummary>> => {
  // Axios baseURL already ends in `/api` — see `VITE_API_BASE_URL` in `.env`
  // — so paths here are relative to `/api`, i.e. they must NOT start with
  // `/api/...`. Matches the convention in `src/integrations/irctc/api.ts`.
  const res = await api.get<unknown>("/admin/irctc/reverse-orders", {
    params: buildOrdersParams(params),
    signal,
  });
  const parsed = adminPageSchema(adminOrderSummarySchema).safeParse(res.data);
  if (!parsed.success) {
    throw formatZodIssue("orders page", parsed.error);
  }
  return parsed.data;
};

export const fetchAdminOrderDetail = async (
  internalOrderId: number,
  signal?: AbortSignal
): Promise<IrctcAdminOrderDetail> => {
  const res = await api.get<unknown>(
    `/admin/irctc/reverse-orders/${encodeURIComponent(
      String(internalOrderId)
    )}`,
    { signal }
  );
  const parsed = adminOrderDetailSchema.safeParse(res.data);
  if (!parsed.success) {
    throw formatZodIssue("order detail", parsed.error);
  }
  // Detail schema validates the required surface but keeps `items` /
  // `otherCharges` loose (the customer-tracking schemas already cover the
  // exact item/charge shape — we don't want a schema drift in the rich
  // fields to brick the ops page). Cast through `unknown` to satisfy the
  // stricter `IrctcAdminOrderDetail` typing.
  return parsed.data as unknown as IrctcAdminOrderDetail;
};

export const fetchAdminStats = async (
  signal?: AbortSignal
): Promise<IrctcAdminStats> => {
  const res = await api.get<unknown>("/admin/irctc/stats", { signal });
  const parsed = adminStatsSchema.safeParse(res.data);
  if (!parsed.success) {
    throw formatZodIssue("stats", parsed.error);
  }
  return parsed.data;
};

export const triggerOutletResync = async (
  vendorId: number,
  signal?: AbortSignal
): Promise<void> => {
  await api.post<unknown>(
    `/admin/irctc/catalog/resync/outlet/${encodeURIComponent(
      String(vendorId)
    )}`,
    undefined,
    { signal }
  );
};

// Internal export for tests.
export const __test = {
  adminOrderSummarySchema,
  adminOrderDetailSchema,
  adminStatsSchema,
  adminPageSchema,
};
