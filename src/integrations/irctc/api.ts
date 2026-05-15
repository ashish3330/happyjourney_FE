/**
 * Thin API helpers for the IRCTC reverse-order flow.
 *
 * NOTE: We never decrypt the `data` blob client-side. The raw string from the
 * IRCTC redirect is forwarded verbatim to our BE which owns the AES key.
 */

import api from "@/utils/axios";
import type { IrctcOrderStatus, IrctcOrderSummary } from "./types";

/**
 * Ingest the encrypted `data` query param from the IRCTC redirect.
 * BE decrypts, persists the order, and returns a sanitised summary.
 */
export const ingestCallback = async (
  data: string
): Promise<IrctcOrderSummary> => {
  const res = await api.post<IrctcOrderSummary>(
    "/irctc/reverse-order/ingest",
    { data }
  );
  return res.data;
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
  body: ConfirmReverseOrderBody
): Promise<{ status: IrctcOrderStatus }> => {
  const res = await api.post<{ status: IrctcOrderStatus }>(
    `/irctc/reverse-order/${internalOrderId}/confirm`,
    body
  );
  return res.data;
};

export interface CancelReverseOrderBody {
  reason: string;
}

/**
 * Cancel a reverse order before confirmation.
 */
export const cancelReverseOrder = async (
  internalOrderId: number,
  body: CancelReverseOrderBody
): Promise<{ status: IrctcOrderStatus }> => {
  const res = await api.post<{ status: IrctcOrderStatus }>(
    `/irctc/reverse-order/${internalOrderId}/cancel`,
    body
  );
  return res.data;
};

/**
 * Fetch a reverse order summary by its IRCTC `externalOrderId`.
 *
 * Backs the `/irctc-order/:externalOrderId` tracking page. BE handler:
 * `GET /api/irctc/reverse-order/by-external-id/{externalOrderId}` →
 * `IrctcOrderSummaryResponse` (same shape as `IrctcOrderSummary`).
 */
export const fetchByExternalOrderId = async (
  externalOrderId: string
): Promise<IrctcOrderSummary> => {
  const res = await api.get<IrctcOrderSummary>(
    `/irctc/reverse-order/by-external-id/${encodeURIComponent(externalOrderId)}`
  );
  return res.data;
};
