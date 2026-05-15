import { useEffect, useMemo, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { toast } from "sonner";

import api from "@/utils/axios";
import { loadScript } from "@/utils/razorpay";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

import {
  cancelReverseOrder,
  confirmReverseOrder,
  parseIrctcError,
} from "../api";
import type { CancelReverseOrderBody } from "../api";
import { IrctcBrandedHeader, IrctcPoweredBy } from "../BrandingProvider";
import type { IrctcOrderSummary, IrctcPaymentType } from "../types";

/**
 * IRCTC reverse-order payment screen (Wave 2).
 *
 * Renders the order summary, payment-mode selector (Prepaid via Razorpay or
 * CoD), and drives the confirm/cancel API calls. Mounted by the callback page
 * (`ReverseOrderCallback`) after the encrypted blob has been ingested.
 */

export interface ReverseOrderPaymentProps {
  summary: IrctcOrderSummary;
  /** Optional hook fired after a successful confirm. */
  onConfirmed?: () => void;
}

type PaymentMode = "PREPAID" | "COD";

type PayStage = "idle" | "creating-razorpay" | "razorpay-open" | "confirming";

const RAZORPAY_CHECKOUT_SRC = "https://checkout.razorpay.com/v1/checkout.js";

/**
 * BE endpoint that creates a Razorpay order for an IRCTC reverse-order.
 *
 * TODO(BE-W2): the existing `/api/payments/create-order/:orderId` endpoint
 * works against our native orders table; the aggregator (reverse-order) flow
 * needs its own endpoint that looks up the order by the IRCTC internal id and
 * uses the IRCTC-derived amountPayable. Until the BE-W2 agent ships
 * `/api/payments/aggregator/irctc/create-order/:internalOrderId`, the FE
 * assumes this path.
 */
const RAZORPAY_CREATE_ORDER_PATH = (internalOrderId: number): string =>
  `/api/payments/aggregator/irctc/create-order/${internalOrderId}`;

const formatRupees = (n: number): string => `₹${n.toFixed(2)}`;

interface AllowedModes {
  prepaid: boolean;
  cod: boolean;
  prepaidDisabledReason?: string;
  codDisabledReason?: string;
  defaultMode: PaymentMode;
}

/**
 * IRCTC-approved cancellation remarks (API reference §6 / "Cancellation
 * remarks"). The dropdown surfaces a friendly label; we transmit the enum
 * value verbatim to the BE so it can be forwarded to IRCTC unmodified.
 *
 * `PASSENGER_JOURNEY_CANCELLED` is the safe default — it covers the most
 * common user-initiated cancel and is the only remark IRCTC always accepts
 * without an ops follow-up.
 */
type CancelRemark = NonNullable<CancelReverseOrderBody["cancelRemark"]>;

const CANCEL_REMARK_OPTIONS: ReadonlyArray<{
  value: CancelRemark;
  label: string;
}> = [
  { value: "PASSENGER_JOURNEY_CANCELLED", label: "Journey cancelled" },
  { value: "TRAIN_DELAYED", label: "Train delayed" },
  { value: "BEYOND_SERVICE_HOUR", label: "Outside service hours" },
  { value: "LAW_N_ORDER", label: "Law & order issue" },
  { value: "NATURAL_CALAMITY", label: "Natural calamity" },
];

const DEFAULT_CANCEL_REMARK: CancelRemark = "PASSENGER_JOURNEY_CANCELLED";

const allowedModesFor = (
  paymentType: IrctcPaymentType,
  couponIsPrepaidOnly: boolean
): AllowedModes => {
  if (paymentType === "CASH_ON_DELIVERY") {
    return {
      prepaid: false,
      cod: true,
      prepaidDisabledReason: "IRCTC has flagged this order as cash on delivery",
      defaultMode: "COD",
    };
  }
  if (paymentType === "PREPAID") {
    return {
      prepaid: true,
      cod: false,
      codDisabledReason: "IRCTC has flagged this order as prepaid-only",
      defaultMode: "PREPAID",
    };
  }
  // PREPAID_ALLOWED
  if (couponIsPrepaidOnly) {
    return {
      prepaid: true,
      cod: false,
      codDisabledReason:
        "The applied coupon is valid on prepaid orders only",
      defaultMode: "PREPAID",
    };
  }
  return { prepaid: true, cod: true, defaultMode: "PREPAID" };
};

// Razorpay options shape isn't typed by their SDK; using Record<string, any>
// is acceptable for the single payload we hand to checkout.js.
// eslint-disable-next-line @typescript-eslint/no-explicit-any
type RazorpayOptions = Record<string, any>;

interface RazorpayCtor {
  new (options: RazorpayOptions): {
    open: () => void;
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    on: (event: string, cb: (response: any) => void) => void;
  };
}

const getRazorpayCtor = (): RazorpayCtor | undefined => {
  const w = window as unknown as { Razorpay?: RazorpayCtor };
  return w.Razorpay;
};

export const ReverseOrderPayment = ({
  summary,
  onConfirmed,
}: ReverseOrderPaymentProps) => {
  const navigate = useNavigate();

  const modes = useMemo(
    () =>
      allowedModesFor(
        summary.paymentType,
        summary.coupon?.isPrepaidOnly === true
      ),
    [summary.paymentType, summary.coupon]
  );

  const [mode, setMode] = useState<PaymentMode>(modes.defaultMode);
  const [stage, setStage] = useState<PayStage>("idle");
  const [confirmed, setConfirmed] = useState(false);
  const [lastError, setLastError] = useState<{
    message: string;
    isBadGateway: boolean;
  } | null>(null);

  const [codDialogOpen, setCodDialogOpen] = useState(false);
  const [cancelDialogOpen, setCancelDialogOpen] = useState(false);
  const [cancelling, setCancelling] = useState(false);
  const [cancelRemark, setCancelRemark] = useState<CancelRemark>(
    DEFAULT_CANCEL_REMARK
  );

  // Eagerly load the Razorpay script so the modal opens instantly on click.
  const [razorpayReady, setRazorpayReady] = useState<boolean>(
    typeof window !== "undefined" && Boolean(getRazorpayCtor())
  );
  useEffect(() => {
    if (razorpayReady) return;
    let cancelled = false;
    void loadScript(RAZORPAY_CHECKOUT_SRC).then((ok) => {
      if (cancelled) return;
      setRazorpayReady(ok && Boolean(getRazorpayCtor()));
    });
    return () => {
      cancelled = true;
    };
  }, [razorpayReady]);

  const busy =
    stage !== "idle" || cancelling || codDialogOpen || cancelDialogOpen;

  const handleConfirmSuccess = () => {
    setConfirmed(true);
    setLastError(null);
    toast.success("Order confirmed!");
    onConfirmed?.();
  };

  const handleConfirmFailure = (err: unknown) => {
    const info = parseIrctcError(err);
    let message: string;
    if (info.isRefundFailed) {
      // Cancel path failure: refund could not be issued. Money is still with
      // the customer's payment provider — ops will reconcile manually.
      message =
        "We couldn't process the refund automatically. Our team has been notified and will reach out within 24 hours.";
    } else if (info.isBadGateway) {
      message =
        "Your payment succeeded but we couldn't update IRCTC. Our team is retrying automatically — you'll receive an SMS shortly.";
    } else if (info.isConflict) {
      message =
        "This order is in a state that can't be changed right now. Please refresh and try again.";
    } else {
      message = info.message;
    }
    setLastError({ message, isBadGateway: info.isBadGateway || info.isRefundFailed });
    toast.error(message);
  };

  const runPrepaid = async () => {
    if (!razorpayReady || !getRazorpayCtor()) {
      toast.error("Payment gateway is still loading. Please try again.");
      return;
    }
    setLastError(null);
    setStage("creating-razorpay");
    try {
      const createResp = await api.post<string | { id: string }>(
        RAZORPAY_CREATE_ORDER_PATH(summary.internalOrderId)
      );
      // Mirror PlaceOrder.tsx behaviour where the BE returns the order id as a
      // plain string; also tolerate the `{ id: "..." }` shape some Razorpay
      // helpers return.
      const razorpayOrderId =
        typeof createResp.data === "string"
          ? createResp.data
          : createResp.data?.id;
      if (!razorpayOrderId) {
        throw new Error("Razorpay order id missing in response.");
      }

      const key = import.meta.env.VITE_RAZORPAY_KEY_ID;
      if (!key) {
        throw new Error("Razorpay key not configured.");
      }

      const Razorpay = getRazorpayCtor();
      if (!Razorpay) {
        throw new Error("Razorpay checkout is unavailable.");
      }

      setStage("razorpay-open");

      const options: RazorpayOptions = {
        key,
        amount: Math.round(summary.amount.amountPayable * 100),
        currency: "INR",
        name: "Railswad",
        description: `IRCTC Order #${summary.externalOrderId}`,
        order_id: razorpayOrderId,
        prefill: {
          name: summary.customer.fullName,
          email: summary.customer.email,
          contact: summary.customer.mobile,
        },
        notes: {
          irctcExternalOrderId: summary.externalOrderId,
          internalOrderId: String(summary.internalOrderId),
        },
        theme: { color: "#0d9488" },
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        handler: async (response: any) => {
          setStage("confirming");
          try {
            await confirmReverseOrder(summary.internalOrderId, {
              paymentMode: "PREPAID",
              paymentRef: response?.razorpay_payment_id,
            });
            handleConfirmSuccess();
          } catch (err) {
            handleConfirmFailure(err);
          } finally {
            setStage("idle");
          }
        },
        modal: {
          ondismiss: async () => {
            setStage("idle");
            try {
              await cancelReverseOrder(summary.internalOrderId, {
                reason: "user_dismissed_payment",
              });
            } catch (err) {
              // Best-effort cancel; surface but don't block the UI.
              toast.error(parseIrctcError(err).message);
            }
            toast.error("Payment cancelled.");
          },
        },
      };

      const rzp = new Razorpay(options);
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      rzp.on("payment.failed", (response: any) => {
        const desc =
          response?.error?.description || "Payment failed. Please try again.";
        toast.error(desc);
        setStage("idle");
      });
      rzp.open();
    } catch (err) {
      setStage("idle");
      const info = parseIrctcError(err);
      setLastError({ message: info.message, isBadGateway: false });
      toast.error(info.message);
    }
  };

  const runCod = async () => {
    setLastError(null);
    setStage("confirming");
    try {
      await confirmReverseOrder(summary.internalOrderId, {
        paymentMode: "COD",
      });
      handleConfirmSuccess();
    } catch (err) {
      handleConfirmFailure(err);
    } finally {
      setStage("idle");
    }
  };

  const handlePayClick = () => {
    if (mode === "PREPAID") {
      void runPrepaid();
    } else {
      setCodDialogOpen(true);
    }
  };

  const handleRetry = () => {
    if (mode === "PREPAID") {
      void runPrepaid();
    } else {
      void runCod();
    }
  };

  const handleCancel = async () => {
    setCancelling(true);
    try {
      await cancelReverseOrder(summary.internalOrderId, {
        reason: "user_cancelled_from_payment_screen",
        cancelRemark,
      });
      toast.success("Order cancelled.");
      navigate("/");
    } catch (err) {
      const info = parseIrctcError(err);
      // Refund-failed = money is parked, not lost: keep them on the screen
      // with a clear non-toast message so they don't reload thinking it
      // worked.
      if (info.isRefundFailed) {
        setLastError({
          message:
            "We've cancelled the order but the refund could not be issued automatically. Our team will reach out within 24 hours to complete the refund.",
          isBadGateway: true,
        });
      }
      toast.error(info.message);
    } finally {
      setCancelling(false);
      setCancelDialogOpen(false);
    }
  };

  if (confirmed) {
    return (
      <SuccessPanel
        externalOrderId={summary.externalOrderId}
        amountPayable={summary.amount.amountPayable}
        paymentMode={mode}
      />
    );
  }

  return (
    <div className="space-y-6">
      <IrctcBrandedHeader />
      <OrderSummaryCard summary={summary} />

      <div className="bg-white rounded-2xl shadow-sm border border-gray-200 p-6">
        <h2 className="text-base font-semibold text-gray-900 mb-4">
          Choose Payment Mode
        </h2>
        <fieldset
          className="space-y-3"
          disabled={busy}
          aria-label="Payment mode"
        >
          <PaymentOption
            id="pm-prepaid"
            checked={mode === "PREPAID"}
            disabled={!modes.prepaid}
            onChange={() => setMode("PREPAID")}
            title="PREPAID (Razorpay)"
            subtitle="Pay now via UPI, cards, netbanking or wallets"
            disabledReason={modes.prepaidDisabledReason}
          />
          <PaymentOption
            id="pm-cod"
            checked={mode === "COD"}
            disabled={!modes.cod}
            onChange={() => setMode("COD")}
            title="Cash on Delivery"
            subtitle="Pay our delivery partner on board"
            disabledReason={modes.codDisabledReason}
          />
        </fieldset>

        {lastError && (
          <div className="mt-4 p-4 rounded-lg bg-red-50 border border-red-200">
            <p className="text-sm text-red-700">{lastError.message}</p>
            {!lastError.isBadGateway && (
              <button
                type="button"
                onClick={handleRetry}
                disabled={busy}
                className="mt-2 text-sm font-medium text-red-700 underline disabled:opacity-50"
              >
                Retry
              </button>
            )}
          </div>
        )}

        <div className="mt-6 flex flex-col sm:flex-row gap-3">
          <Button
            type="button"
            onClick={handlePayClick}
            disabled={
              busy ||
              (mode === "PREPAID" && !razorpayReady) ||
              (!modes.prepaid && !modes.cod)
            }
            className="flex-1 bg-teal-600 hover:bg-teal-700 text-white h-12 text-base font-semibold"
          >
            {stage === "creating-razorpay" && (
              <Spinner label="Preparing payment" />
            )}
            {stage === "razorpay-open" && <Spinner label="Opening Razorpay" />}
            {stage === "confirming" && <Spinner label="Confirming" />}
            {stage === "idle" &&
              (mode === "PREPAID"
                ? `Pay ${formatRupees(summary.amount.amountPayable)}`
                : `Confirm CoD ${formatRupees(summary.amount.amountPayable)}`)}
          </Button>
          <Button
            type="button"
            variant="outline"
            onClick={() => setCancelDialogOpen(true)}
            disabled={busy}
            className="sm:w-48 h-12 text-base"
          >
            Cancel Order
          </Button>
        </div>
        {mode === "PREPAID" && !razorpayReady && (
          <p className="mt-3 text-xs text-gray-500">
            Loading payment gateway…
          </p>
        )}
      </div>

      <Dialog open={codDialogOpen} onOpenChange={setCodDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Confirm Cash on Delivery</DialogTitle>
            <DialogDescription>
              Confirm cash on delivery for{" "}
              {formatRupees(summary.amount.amountPayable)}? You'll pay our
              delivery partner directly on board.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setCodDialogOpen(false)}
              disabled={stage === "confirming"}
            >
              Back
            </Button>
            <Button
              className="bg-teal-600 hover:bg-teal-700 text-white"
              onClick={async () => {
                setCodDialogOpen(false);
                await runCod();
              }}
              disabled={stage === "confirming"}
            >
              {stage === "confirming" ? (
                <Spinner label="Confirming" />
              ) : (
                "Yes, confirm CoD"
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <IrctcPoweredBy />

      <Dialog
        open={cancelDialogOpen}
        onOpenChange={(open) => {
          setCancelDialogOpen(open);
          // Reset the dropdown when the user closes/cancels the dialog so
          // re-opening it always starts at the documented default.
          if (!open) setCancelRemark(DEFAULT_CANCEL_REMARK);
        }}
      >
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Cancel this order?</DialogTitle>
            <DialogDescription>
              We'll let IRCTC know you've cancelled. You can place a new order
              from the IRCTC eCatering app any time.
            </DialogDescription>
          </DialogHeader>
          <div className="py-2 space-y-2">
            <label
              htmlFor="cancel-remark"
              className="text-sm font-medium text-gray-900"
            >
              Cancellation reason
            </label>
            <Select
              value={cancelRemark}
              onValueChange={(v) => setCancelRemark(v as CancelRemark)}
              disabled={cancelling}
            >
              <SelectTrigger id="cancel-remark" className="w-full">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {CANCEL_REMARK_OPTIONS.map((opt) => (
                  <SelectItem key={opt.value} value={opt.value}>
                    {opt.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <p className="text-xs text-gray-500">
              We share this with IRCTC for refund eligibility.
            </p>
          </div>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setCancelDialogOpen(false)}
              disabled={cancelling}
            >
              Keep order
            </Button>
            <Button
              variant="destructive"
              onClick={handleCancel}
              disabled={cancelling}
            >
              {cancelling ? <Spinner label="Cancelling" /> : "Cancel order"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};

const PaymentOption = ({
  id,
  checked,
  disabled,
  onChange,
  title,
  subtitle,
  disabledReason,
}: {
  id: string;
  checked: boolean;
  disabled: boolean;
  onChange: () => void;
  title: string;
  subtitle: string;
  disabledReason?: string;
}) => (
  <label
    htmlFor={id}
    className={`flex items-start gap-3 p-4 rounded-xl border transition-colors cursor-pointer ${
      disabled
        ? "bg-gray-50 border-gray-200 opacity-60 cursor-not-allowed"
        : checked
          ? "bg-teal-50 border-teal-500 ring-1 ring-teal-500"
          : "bg-white border-gray-200 hover:border-gray-300"
    }`}
  >
    <input
      id={id}
      type="radio"
      name="payment-mode"
      checked={checked}
      disabled={disabled}
      onChange={onChange}
      className="mt-1 h-4 w-4 text-teal-600 focus:ring-teal-500"
    />
    <div className="flex-1 min-w-0">
      <p className="text-sm font-semibold text-gray-900">{title}</p>
      <p className="text-xs text-gray-500 mt-0.5">{subtitle}</p>
      {disabled && disabledReason && (
        <p className="text-xs text-amber-700 mt-2">{disabledReason}</p>
      )}
    </div>
  </label>
);

const Spinner = ({ label }: { label: string }) => (
  <span className="inline-flex items-center gap-2">
    <span
      className="inline-block h-4 w-4 border-2 border-white border-t-transparent rounded-full animate-spin"
      aria-hidden
    />
    <span>{label}…</span>
  </span>
);

const OrderSummaryCard = ({ summary }: { summary: IrctcOrderSummary }) => {
  const { items, amount, otherCharges, deliveryDetails: d } = summary;
  const subtotal = items.reduce(
    (acc, it) => acc + it.discountedPrice * it.quantity,
    0
  );

  return (
    <div className="bg-white rounded-2xl shadow-sm border border-gray-200 p-6 space-y-6">
      <div className="flex items-center justify-between flex-wrap gap-2">
        <div>
          <p className="text-xs uppercase tracking-wide text-teal-600 font-semibold">
            IRCTC Order
          </p>
          <p className="text-lg font-bold text-gray-900">
            #{summary.externalOrderId}
          </p>
        </div>
        <span className="inline-flex items-center px-3 py-1 rounded-full text-xs font-medium bg-teal-50 text-teal-700 border border-teal-200">
          {summary.paymentType.replace(/_/g, " ")}
        </span>
      </div>

      <section>
        <h3 className="text-sm font-semibold text-gray-900 mb-2">Items</h3>
        <ul className="divide-y divide-gray-100">
          {items.map((item) => (
            <li
              key={item.id}
              className="py-2 flex items-start justify-between gap-4"
            >
              <div className="min-w-0">
                <p className="text-sm font-medium text-gray-900">
                  {item.name}
                </p>
                <p className="text-xs text-gray-500">
                  Qty {item.quantity} · {formatRupees(item.sellingPrice)} each
                </p>
              </div>
              <p className="text-sm font-semibold text-gray-900 whitespace-nowrap">
                {formatRupees(item.discountedPrice * item.quantity)}
              </p>
            </li>
          ))}
        </ul>
      </section>

      <section>
        <h3 className="text-sm font-semibold text-gray-900 mb-2">
          Delivery Details
        </h3>
        <div className="grid grid-cols-2 md:grid-cols-3 gap-3 text-sm">
          <Field label="PNR" value={d.pnr} />
          <Field label="Coach" value={d.coach} />
          <Field label="Berth" value={d.berth} />
          <Field
            label="Station"
            value={`${d.station.name} (${d.station.code})`}
          />
          <Field
            label="Train"
            value={`${d.train.trainName} (${d.train.trainNo})`}
          />
          <Field label="ETA" value={d.train.eta} />
        </div>
      </section>

      <section>
        <h3 className="text-sm font-semibold text-gray-900 mb-2">
          Amount Breakdown
        </h3>
        <dl className="space-y-1.5 text-sm">
          <Row label="Subtotal" value={formatRupees(subtotal)} />
          <Row label="Taxes" value={formatRupees(amount.taxAmount)} />
          {otherCharges.length > 0 && (
            <Row
              label="Other charges"
              value={formatRupees(amount.totalOtherCharges)}
            />
          )}
          {amount.discountAmount > 0 && (
            <Row
              label={
                summary.coupon
                  ? `Discount (${summary.coupon.code})`
                  : "Discount"
              }
              value={`- ${formatRupees(amount.discountAmount)}`}
              valueClassName="text-green-600"
            />
          )}
          <div className="pt-2 mt-2 border-t border-gray-200">
            <Row
              label="Total Payable"
              value={formatRupees(amount.amountPayable)}
              labelClassName="text-base font-semibold text-gray-900"
              valueClassName="text-lg font-bold text-teal-700"
            />
          </div>
        </dl>
      </section>
    </div>
  );
};

const Field = ({ label, value }: { label: string; value: string }) => (
  <div>
    <p className="text-xs uppercase text-gray-500 tracking-wide">{label}</p>
    <p className="text-sm font-medium text-gray-900 mt-0.5 break-words">
      {value}
    </p>
  </div>
);

const Row = ({
  label,
  value,
  labelClassName,
  valueClassName,
}: {
  label: string;
  value: string;
  labelClassName?: string;
  valueClassName?: string;
}) => (
  <div className="flex items-center justify-between">
    <dt className={labelClassName || "text-gray-600"}>{label}</dt>
    <dd className={valueClassName || "text-gray-900 font-medium"}>{value}</dd>
  </div>
);

const SuccessPanel = ({
  externalOrderId,
  amountPayable,
  paymentMode,
}: {
  externalOrderId: string;
  amountPayable: number;
  paymentMode: PaymentMode;
}) => (
  <div className="space-y-6">
    <IrctcBrandedHeader />
    <IrctcPoweredBy />
    <div className="bg-white rounded-2xl shadow-sm border border-gray-200 p-8 text-center">
      <div className="text-5xl mb-3" aria-hidden>
        🎉
      </div>
      <h2 className="text-2xl font-bold text-gray-900">Congratulations!</h2>
      <p className="text-base font-medium text-teal-700 mt-2">
        Order confirmed
      </p>
      <p className="text-sm text-gray-500 mt-3 max-w-md mx-auto">
        Your IRCTC order #{externalOrderId} for{" "}
        {formatRupees(amountPayable)} has been confirmed
        {paymentMode === "COD" ? " (cash on delivery)" : ""}. You'll receive an
        SMS with delivery updates closer to your station.
      </p>
      <div className="mt-6 flex flex-col sm:flex-row gap-3 justify-center">
        <Link
          to={`/irctc-order/${externalOrderId}`}
          className="inline-flex items-center justify-center bg-teal-600 hover:bg-teal-700 text-white font-medium rounded-lg px-6 py-3 transition-colors"
        >
          Track Order
        </Link>
        <Link
          to="/"
          className="inline-flex items-center justify-center bg-white hover:bg-gray-50 text-gray-700 font-medium rounded-lg px-6 py-3 border border-gray-300 transition-colors"
        >
          Back to Home
        </Link>
      </div>
    </div>
  </div>
);

export default ReverseOrderPayment;
