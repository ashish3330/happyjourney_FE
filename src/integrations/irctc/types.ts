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
  | "STATUS_PUSH_FAILED";

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
}
