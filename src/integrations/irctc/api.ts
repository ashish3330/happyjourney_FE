/**
 * Thin API helpers for the IRCTC reverse-order flow.
 *
 * NOTE: We never decrypt the `data` blob client-side. The raw string from the
 * IRCTC redirect is forwarded verbatim to our BE which owns the AES key.
 */

import { AxiosError } from "axios";
import { z } from "zod";

import api from "@/utils/axios";
import type {
  IrctcEtaResponse,
  IrctcFeedbackBody,
  IrctcOrderStatus,
  IrctcOrderSummary,
  IrctcRefundStatus,
} from "./types";

/* -------------------------------------------------------------------------- */
/*  Runtime validation (zod)                                                  */
/*                                                                            */
/*  The BE shape is documented in `types.ts`. We validate at the boundary so  */
/*  any drift (BE rename, field type change) surfaces here with a clear       */
/*  error rather than crashing deep in a render tree.                         */
/* -------------------------------------------------------------------------- */

const irctcOrderStatusSchema: z.ZodType<IrctcOrderStatus> = z.enum([
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

const irctcPaymentTypeSchema = z.enum([
  "CASH_ON_DELIVERY",
  "PREPAID",
  "PREPAID_ALLOWED",
]);

const irctcCustomerSchema = z.object({
  fullName: z.string(),
  email: z.string(),
  mobile: z.string(),
  alternateMobile: z.string().nullable(),
});

const irctcStationSchema = z.object({
  code: z.string(),
  name: z.string(),
});

const irctcTrainSchema = z.object({
  trainNo: z.string(),
  trainName: z.string(),
  eta: z.string(),
  sta: z.string(),
});

const irctcDeliveryDetailsSchema = z.object({
  pnr: z.string(),
  coach: z.string(),
  berth: z.string(),
  station: irctcStationSchema,
  train: irctcTrainSchema,
});

const irctcVariantSchema = z.object({
  id: z.string(),
  option: z.string().nullable(),
  name: z.string(),
  description: z.string().nullable(),
  optionName: z.string().nullable(),
  basePrice: z.number(),
  extraBasePrice: z.number(),
  selectedOption: z
    .object({
      id: z.string(),
      name: z.string(),
      description: z.string(),
      basePrice: z.number(),
      extraBasePrice: z.number(),
    })
    .nullable(),
});

const irctcCustomisationSchema = z.object({
  id: z.string(),
  variants: z.array(irctcVariantSchema),
  type: z.string(),
  name: z.string(),
});

const irctcItemSchema = z.object({
  id: z.string(),
  name: z.string(),
  basePrice: z.number(),
  sellingPrice: z.number(),
  taxPercentage: z.number(),
  taxAmount: z.number(),
  itemType: z.enum(["VEG", "NON_VEG", "EGG"]),
  quantity: z.number(),
  margin: z.number(),
  discount: z.number(),
  discountedPrice: z.number(),
  customisations: z.array(irctcCustomisationSchema),
});

const irctcAmountSchema = z.object({
  taxAmount: z.number(),
  amountPayable: z.number(),
  totalAmount: z.number(),
  discountAmount: z.number(),
  totalOtherCharges: z.number(),
});

const irctcOtherChargeSchema = z.object({
  id: z.string(),
  name: z.string(),
  amount: z.number(),
  gst: z.number(),
});

const irctcCouponSchema = z.object({
  code: z.string(),
  isPrepaidOnly: z.boolean(),
});

const irctcRefundStatusSchema: z.ZodType<IrctcRefundStatus> = z.enum([
  "NONE",
  "INITIATED",
  "FAILED",
]);

const irctcOrderSummarySchema: z.ZodType<IrctcOrderSummary> = z.object({
  internalOrderId: z.number(),
  externalOrderId: z.string(),
  status: irctcOrderStatusSchema,
  paymentType: irctcPaymentTypeSchema,
  customer: irctcCustomerSchema,
  items: z.array(irctcItemSchema),
  deliveryDetails: irctcDeliveryDetailsSchema,
  amount: irctcAmountSchema,
  otherCharges: z.array(irctcOtherChargeSchema),
  coupon: irctcCouponSchema.nullable(),
  bookingDate: z.string(),
  comment: z.string().nullable(),
  // Optional + nullable on the wire — BE only fills these in once we hit the
  // relevant lifecycle stage. Treat absent / null the same as "not yet known".
  deliveryOtp: z.string().nullable().optional(),
  refundRef: z.string().nullable().optional(),
  refundStatus: irctcRefundStatusSchema.optional(),
});

const confirmCancelResponseSchema = z.object({
  status: irctcOrderStatusSchema,
});

const irctcEtaResponseSchema: z.ZodType<IrctcEtaResponse> = z.object({
  status: z.string(),
  message: z.string(),
  result: z.object({
    eta: z.string(),
    platform: z.string().nullable(),
  }),
});

/**
 * Parse + validate an `IrctcOrderSummary` from an unknown BE payload.
 * Throws a typed error with details if the shape is wrong — callers should
 * route the message through `parseIrctcError`.
 */
const parseOrderSummary = (raw: unknown): IrctcOrderSummary => {
  const result = irctcOrderSummarySchema.safeParse(raw);
  if (!result.success) {
    // Compact issue summary; do not leak the raw payload (may contain PII).
    const issue = result.error.issues[0];
    const path = issue?.path?.join(".") || "<root>";
    throw new Error(
      `Invalid order summary from server (field "${path}": ${
        issue?.message || "unknown"
      })`
    );
  }
  return result.data;
};

/* -------------------------------------------------------------------------- */
/*  Error normalisation                                                       */
/* -------------------------------------------------------------------------- */

export interface IrctcErrorInfo {
  /** HTTP status if the error came from axios; `undefined` for client errors. */
  status: number | undefined;
  /** Programmatic code: HTTP_<status>, NETWORK, ABORTED, INVALID_RESPONSE, UNKNOWN */
  code: string;
  /**
   * Server-side error discriminator from `{error, message, traceId}` body.
   * Known values from the BE: "ingest_error", "not_found", "conflict",
   * "status_push_failed", "refund_failed", "invalid_payload", "rate_limited",
   * "internal_error". `undefined` for non-IRCTC errors.
   */
  serverError: string | undefined;
  /** BE-generated trace id for log correlation; `undefined` if not present. */
  traceId: string | undefined;
  /** Human-readable message suitable for surfacing in the UI. */
  message: string;
  /** True for bad gateway (BE could not push to IRCTC but we accepted). */
  isBadGateway: boolean;
  /** True specifically for {@code serverError === "refund_failed"}. */
  isRefundFailed: boolean;
  /** True specifically for {@code serverError === "conflict"} (HTTP 409). */
  isConflict: boolean;
  /** True when the request was cancelled (e.g. component unmount). */
  isAborted: boolean;
}

interface BeErrorBody {
  message?: string;
  error?: string;
  traceId?: string;
}

/**
 * Normalise any thrown error into a flat shape every IRCTC page can render
 * the same way. Keeps `axios.isAxiosError` checks out of the screens.
 */
export const parseIrctcError = (err: unknown): IrctcErrorInfo => {
  if (err instanceof AxiosError) {
    // axios sets err.code === "ERR_CANCELED" on AbortController-cancelled requests
    if (err.code === "ERR_CANCELED" || err.name === "CanceledError") {
      return {
        status: undefined,
        code: "ABORTED",
        serverError: undefined,
        traceId: undefined,
        message: "Request cancelled.",
        isBadGateway: false,
        isRefundFailed: false,
        isConflict: false,
        isAborted: true,
      };
    }
    const status = err.response?.status;
    const data = err.response?.data as BeErrorBody | undefined;
    const serverError = data?.error;
    const message =
      data?.message ||
      err.message ||
      (status ? `Request failed with status ${status}.` : "Network error.");
    return {
      status,
      code: status ? `HTTP_${status}` : "NETWORK",
      serverError,
      traceId: data?.traceId,
      message,
      isBadGateway: status === 502,
      isRefundFailed: serverError === "refund_failed",
      isConflict: serverError === "conflict" || status === 409,
      isAborted: false,
    };
  }
  if (err instanceof Error) {
    return {
      status: undefined,
      code: "UNKNOWN",
      serverError: undefined,
      traceId: undefined,
      message: err.message || "Something went wrong.",
      isBadGateway: false,
      isRefundFailed: false,
      isConflict: false,
      isAborted: false,
    };
  }
  return {
    status: undefined,
    code: "UNKNOWN",
    serverError: undefined,
    traceId: undefined,
    message: "Something went wrong.",
    isBadGateway: false,
    isRefundFailed: false,
    isConflict: false,
    isAborted: false,
  };
};

/* -------------------------------------------------------------------------- */
/*  API surface                                                               */
/* -------------------------------------------------------------------------- */

/**
 * Ingest the encrypted `data` query param from the IRCTC redirect.
 * BE decrypts, persists the order, and returns a sanitised summary.
 *
 * Pass an `AbortSignal` to cancel the request if the caller unmounts.
 */
export const ingestCallback = async (
  data: string,
  signal?: AbortSignal
): Promise<IrctcOrderSummary> => {
  const res = await api.post<unknown>(
    "/irctc/reverse-order/ingest",
    { data },
    { signal }
  );
  return parseOrderSummary(res.data);
};

export interface ConfirmReverseOrderBody {
  paymentMode: "PREPAID" | "COD";
  paymentRef?: string;
}

/**
 * Confirm a reverse order after payment (COD acknowledgement or PREPAID auth).
 */
export const confirmReverseOrder = async (
  internalOrderId: number,
  body: ConfirmReverseOrderBody,
  signal?: AbortSignal
): Promise<{ status: IrctcOrderStatus }> => {
  const res = await api.post<unknown>(
    `/irctc/reverse-order/${internalOrderId}/confirm`,
    body,
    { signal }
  );
  const parsed = confirmCancelResponseSchema.safeParse(res.data);
  if (!parsed.success) {
    throw new Error("Unexpected confirm response from server.");
  }
  return parsed.data;
};

export interface CancelReverseOrderBody {
  reason: string;
  /**
   * IRCTC cancellation remark enum (API reference §6 / "Cancellation remarks").
   * Optional for legacy callers; the BE defaults to PASSENGER_JOURNEY_CANCELLED
   * when omitted. Customer-driven cancels on the payment screen should always
   * send one of the documented enum values.
   */
  cancelRemark?:
    | "BEYOND_SERVICE_HOUR"
    | "TRAIN_DELAYED"
    | "LAW_N_ORDER"
    | "NATURAL_CALAMITY"
    | "PASSENGER_JOURNEY_CANCELLED";
}

/**
 * Cancel a reverse order before confirmation.
 */
export const cancelReverseOrder = async (
  internalOrderId: number,
  body: CancelReverseOrderBody,
  signal?: AbortSignal
): Promise<{ status: IrctcOrderStatus }> => {
  const res = await api.post<unknown>(
    `/irctc/reverse-order/${internalOrderId}/cancel`,
    body,
    { signal }
  );
  const parsed = confirmCancelResponseSchema.safeParse(res.data);
  if (!parsed.success) {
    throw new Error("Unexpected cancel response from server.");
  }
  return parsed.data;
};

/**
 * Fetch a reverse order summary by its IRCTC `externalOrderId`.
 *
 * Backs the `/irctc-order/:externalOrderId` tracking page. BE handler:
 * `GET /api/irctc/reverse-order/by-external-id/{externalOrderId}` →
 * `IrctcOrderSummaryResponse` (same shape as `IrctcOrderSummary`).
 */
export const fetchByExternalOrderId = async (
  externalOrderId: string,
  signal?: AbortSignal
): Promise<IrctcOrderSummary> => {
  const res = await api.get<unknown>(
    `/irctc/reverse-order/by-external-id/${encodeURIComponent(externalOrderId)}`,
    { signal }
  );
  return parseOrderSummary(res.data);
};

/**
 * Fetch the live ETA + platform for a reverse order. Wraps the IRCTC
 * `/api/v1/order/{id}/eta` endpoint (API reference §7) via our BE proxy.
 *
 * The tracking page calls this on the same 30s cadence as the summary refresh,
 * but the call is **non-blocking** — any error (network, 4xx, 5xx, schema
 * drift) must leave the page rendering its last-known state. Callers should
 * route the error through `parseIrctcError` and silently drop it.
 */
export const fetchIrctcEta = async (
  externalOrderId: string,
  signal?: AbortSignal
): Promise<IrctcEtaResponse> => {
  const res = await api.get<unknown>(
    `/irctc/reverse-order/${encodeURIComponent(externalOrderId)}/eta`,
    { signal }
  );
  const parsed = irctcEtaResponseSchema.safeParse(res.data);
  if (!parsed.success) {
    throw new Error("Unexpected ETA response from server.");
  }
  return parsed.data;
};

/**
 * Submit customer feedback after a `DELIVERED` order. The BE persists it and
 * forwards a sanitised payload to IRCTC's feedback channel.
 */
export const submitIrctcFeedback = async (
  externalOrderId: string,
  body: IrctcFeedbackBody,
  signal?: AbortSignal
): Promise<void> => {
  await api.post<unknown>(
    `/irctc/reverse-order/${encodeURIComponent(externalOrderId)}/feedback`,
    body,
    { signal }
  );
};

// Internal export for tests.
export const __test = {
  parseOrderSummary,
  irctcOrderSummarySchema,
  irctcEtaResponseSchema,
};
