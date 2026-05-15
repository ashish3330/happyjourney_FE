/**
 * TS types mirroring the BE-decrypted IRCTC reverse-order payload.
 * Sourced from the IRCTC eCatering aggregator PDF, Appendix B.
 *
 * The FE never sees the encrypted blob's contents — these types describe
 * what the BE returns to us after it decrypts, persists, and sanitises.
 */

export interface IrctcCustomer {
  fullName: string;
  email: string;
  mobile: string;
  alternateMobile: string | null;
}

export interface IrctcStation {
  code: string;
  name: string;
}

export interface IrctcTrain {
  trainNo: string;
  trainName: string;
  eta: string;
  sta: string;
}

export interface IrctcDeliveryDetails {
  pnr: string;
  coach: string;
  berth: string;
  station: IrctcStation;
  train: IrctcTrain;
}

export interface IrctcVariant {
  id: string;
  option: string | null;
  name: string;
  description: string | null;
  optionName: string | null;
  basePrice: number;
  extraBasePrice: number;
  selectedOption: {
    id: string;
    name: string;
    description: string;
    basePrice: number;
    extraBasePrice: number;
  } | null;
}

export interface IrctcCustomisation {
  id: string;
  variants: IrctcVariant[];
  type: string;
  name: string;
}

export interface IrctcItem {
  id: string;
  name: string;
  basePrice: number;
  sellingPrice: number;
  taxPercentage: number;
  taxAmount: number;
  itemType: "VEG" | "NON_VEG" | "EGG";
  quantity: number;
  margin: number;
  discount: number;
  discountedPrice: number;
  customisations: IrctcCustomisation[];
}

export interface IrctcAmount {
  taxAmount: number;
  amountPayable: number;
  totalAmount: number;
  discountAmount: number;
  totalOtherCharges: number;
}

export interface IrctcOtherCharge {
  id: string;
  name: string;
  amount: number;
  gst: number;
}

export interface IrctcCoupon {
  code: string;
  isPrepaidOnly: boolean;
}

export type IrctcPaymentType = "CASH_ON_DELIVERY" | "PREPAID" | "PREPAID_ALLOWED";

/**
 * Lifecycle of an IRCTC reverse-order from ingest through delivery.
 *
 * - ORDER_PENDING / PENDING — pre-confirm placeholder state.
 * - PAYMENT_AWAITING — payment in flight, awaiting Razorpay or CoD acknowledgement.
 * - ORDER_CONFIRMED / CONFIRMED — confirmed and pushed to IRCTC.
 * - PREPARING — vendor is preparing the order.
 * - OUT_FOR_DELIVERY — delivery partner is on the train.
 * - DELIVERED — handed over to the passenger; terminal.
 * - ORDER_CANCELLED / CANCELLED — cancelled before confirmation; terminal.
 * - STATUS_PUSH_FAILED — confirmation/payment succeeded but IRCTC push failed; terminal for the FE poll loop.
 * - REFUND_FAILED — cancel was issued on a PREPAID order but the refund failed; ops must intervene. Terminal.
 */
export type IrctcOrderStatus =
  | "ORDER_PENDING"
  | "PENDING"
  | "PAYMENT_AWAITING"
  | "ORDER_CONFIRMED"
  | "CONFIRMED"
  | "PREPARING"
  | "OUT_FOR_DELIVERY"
  | "DELIVERED"
  | "ORDER_CANCELLED"
  | "CANCELLED"
  | "STATUS_PUSH_FAILED"
  | "REFUND_FAILED";

/**
 * Refund lifecycle for a reverse order.
 *
 * - NONE — no refund is in progress (most orders, including CoD, sit here).
 * - INITIATED — a Razorpay refund has been kicked off; `refundRef` carries the id.
 * - FAILED — the refund could not be issued automatically; ops will resolve.
 */
export type IrctcRefundStatus = "NONE" | "INITIATED" | "FAILED";

export interface IrctcOrderSummary {
  /** Our internal id, for confirm/cancel calls */
  internalOrderId: number;
  /** IRCTC's order id */
  externalOrderId: string;
  status: IrctcOrderStatus;
  paymentType: IrctcPaymentType;
  customer: IrctcCustomer;
  items: IrctcItem[];
  deliveryDetails: IrctcDeliveryDetails;
  amount: IrctcAmount;
  otherCharges: IrctcOtherCharge[];
  coupon: IrctcCoupon | null;
  bookingDate: string;
  comment: string | null;
  /**
   * 6-digit OTP the passenger reads back to the delivery partner. BE returns
   * it only once the order is OUT_FOR_DELIVERY (or later); null otherwise.
   */
  deliveryOtp?: string | null;
  /** Razorpay refund id once a refund has been initiated; null otherwise. */
  refundRef?: string | null;
  /** Refund lifecycle stage. Defaults to NONE when the BE omits it. */
  refundStatus?: IrctcRefundStatus;
}

/**
 * Response of `GET /irctc/reverse-order/{externalOrderId}/eta`. Mirrors the
 * IRCTC ETA endpoint (API reference §7) one-for-one. `platform` is often null
 * — IRCTC only knows it close to arrival.
 */
export interface IrctcEtaResponse {
  status: string;
  message: string;
  result: {
    eta: string;
    platform: string | null;
  };
}

/**
 * Body for `POST /irctc/reverse-order/{externalOrderId}/feedback`. The BE
 * persists this and forwards a sanitised version to IRCTC.
 */
export interface IrctcFeedbackBody {
  rating: number;
  comment?: string;
}
