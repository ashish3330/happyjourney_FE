/**
 * IRCTC reverse-order callback landing page.
 *
 * Mounted at `/reverse-order/callback?data=<encrypted-blob>`. On mount we POST
 * the opaque `data` blob to the BE which decrypts it, persists the order, and
 * returns a sanitised `IrctcOrderSummary`. We then render the summary and
 * hand off to `ReverseOrderPayment` for the payment-mode selection.
 *
 * Hardening notes:
 *  - The ingest request is cancelled via `AbortController` if the component
 *    unmounts mid-fetch, preventing "setState on unmounted component" warnings
 *    and avoiding wasted BE work.
 *  - Skeleton has a soft min-display time so super-fast networks don't make
 *    the layout flash.
 *  - Errors funnel through `parseIrctcError` for a single normalised shape.
 *  - The `?data` param is treated as opaque ciphertext and never logged.
 */

import { forwardRef, useCallback, useEffect, useRef, useState } from "react";
import { Link, useSearchParams } from "react-router-dom";
import { toast } from "sonner";

import { ingestCallback, parseIrctcError } from "../api";
import { IrctcBrandedHeader, IrctcPoweredBy } from "../BrandingProvider";
import type { IrctcOrderSummary } from "../types";
import ReverseOrderPayment from "./ReverseOrderPayment";

type LoadState =
  | { kind: "loading" }
  | { kind: "missing" }
  | { kind: "error"; message: string }
  | { kind: "ready"; summary: IrctcOrderSummary };

const formatCurrency = (n: number): string =>
  new Intl.NumberFormat("en-IN", {
    style: "currency",
    currency: "INR",
    maximumFractionDigits: 2,
  }).format(n);

/** Skeleton must show for at least this long so fast networks don't flash. */
const MIN_SKELETON_MS = 200;

const ReverseOrderCallback = () => {
  const [searchParams] = useSearchParams();
  const [state, setState] = useState<LoadState>({ kind: "loading" });
  const errorRef = useRef<HTMLDivElement | null>(null);

  const dataParam = searchParams.get("data");

  const load = useCallback(async (raw: string, signal: AbortSignal) => {
    setState({ kind: "loading" });
    const startedAt = Date.now();
    try {
      const summary = await ingestCallback(raw, signal);
      // Soft min display so the skeleton doesn't blink on fast connections.
      const elapsed = Date.now() - startedAt;
      if (elapsed < MIN_SKELETON_MS) {
        await new Promise((r) => setTimeout(r, MIN_SKELETON_MS - elapsed));
      }
      if (signal.aborted) return;
      setState({ kind: "ready", summary });
    } catch (err) {
      const info = parseIrctcError(err);
      if (info.isAborted || signal.aborted) return;
      toast.error(info.message);
      setState({ kind: "error", message: info.message });
    }
  }, []);

  useEffect(() => {
    // Trim whitespace so a `?data=%20%20` doesn't fool the truthy check below.
    const trimmed = dataParam?.trim() ?? "";
    if (!trimmed) {
      setState({ kind: "missing" });
      return;
    }
    const controller = new AbortController();
    void load(trimmed, controller.signal);
    return () => controller.abort();
  }, [dataParam, load]);

  // When an error appears, move focus to it so screen-reader users hear it.
  useEffect(() => {
    if (state.kind === "error" && errorRef.current) {
      errorRef.current.focus();
    }
  }, [state.kind]);

  if (state.kind === "missing") {
    return <SafeError />;
  }

  if (state.kind === "loading") {
    return <LoadingView />;
  }

  if (state.kind === "error") {
    return (
      <ErrorView
        ref={errorRef}
        message={state.message}
        onRetry={() => {
          const trimmed = dataParam?.trim();
          if (trimmed) {
            const controller = new AbortController();
            void load(trimmed, controller.signal);
          }
        }}
      />
    );
  }

  const { summary } = state;
  const showPayment =
    summary.paymentType === "CASH_ON_DELIVERY" ||
    summary.paymentType === "PREPAID" ||
    summary.paymentType === "PREPAID_ALLOWED";

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-4xl mx-auto p-4 md:p-6">
        <IrctcBrandedHeader className="mb-4" />
        <div className="space-y-6">
          <Header summary={summary} />
          <DeliveryCard summary={summary} />
          <ItemsCard summary={summary} />
          <AmountCard summary={summary} />

          {showPayment ? (
            <ReverseOrderPayment summary={summary} />
          ) : (
            <UnsupportedPaymentTypeCard summary={summary} />
          )}
        </div>
        <IrctcPoweredBy />
      </div>
    </div>
  );
};

const Header = ({ summary }: { summary: IrctcOrderSummary }) => (
  <div className="bg-white rounded-2xl shadow-sm border border-gray-200 p-6">
    <div className="flex flex-col md:flex-row md:items-start md:justify-between gap-4">
      <div>
        <p className="text-xs uppercase tracking-wide text-teal-600 font-semibold">
          IRCTC Order
        </p>
        <h1 className="text-2xl font-bold text-gray-900 mt-1">
          #{summary.externalOrderId}
        </h1>
        <p className="text-sm text-gray-500 mt-1">
          Booked on {summary.bookingDate}
        </p>
      </div>
      <div className="flex flex-wrap gap-2">
        <span
          className="inline-flex items-center px-3 py-1 rounded-full text-xs font-medium bg-teal-50 text-teal-700 border border-teal-200"
          aria-label={`Order status: ${summary.status.replace(/_/g, " ")}`}
        >
          {summary.status.replace(/_/g, " ")}
        </span>
        <span
          className="inline-flex items-center px-3 py-1 rounded-full text-xs font-medium bg-gray-100 text-gray-700 border border-gray-200"
          aria-label={`Payment type: ${summary.paymentType.replace(/_/g, " ")}`}
        >
          {summary.paymentType.replace(/_/g, " ")}
        </span>
      </div>
    </div>
    <div className="mt-4 pt-4 border-t border-gray-100 text-sm text-gray-600">
      <p>
        <span className="font-medium text-gray-900">{summary.customer.fullName}</span>
        {" · "}
        {summary.customer.mobile}
        {summary.customer.email ? ` · ${summary.customer.email}` : ""}
      </p>
    </div>
  </div>
);

const DeliveryCard = ({ summary }: { summary: IrctcOrderSummary }) => {
  const { deliveryDetails: d } = summary;
  return (
    <div className="bg-white rounded-2xl shadow-sm border border-gray-200 p-6">
      <h2 className="text-base font-semibold text-gray-900 mb-4">
        Delivery Details
      </h2>
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
        <Field label="PNR" value={d.pnr} />
        <Field label="Coach" value={d.coach} />
        <Field label="Berth" value={d.berth} />
        <Field label="Station" value={`${d.station.name} (${d.station.code})`} />
        <Field
          label="Train"
          value={`${d.train.trainName} (${d.train.trainNo})`}
        />
        <Field label="STA" value={d.train.sta} />
        <Field label="ETA" value={d.train.eta} />
      </div>
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

const ItemsCard = ({ summary }: { summary: IrctcOrderSummary }) => (
  <div className="bg-white rounded-2xl shadow-sm border border-gray-200 p-6">
    <h2 className="text-base font-semibold text-gray-900 mb-4">Items</h2>
    <ul className="divide-y divide-gray-100">
      {summary.items.map((item) => (
        <li key={item.id} className="py-3 flex items-start justify-between gap-4">
          <div className="min-w-0 flex-1">
            <div className="flex items-center gap-2">
              <ItemTypeDot type={item.itemType} />
              <p className="text-sm font-medium text-gray-900 truncate">
                {item.name}
              </p>
            </div>
            <p className="text-xs text-gray-500 mt-1">
              Qty {item.quantity} {"·"} {formatCurrency(item.sellingPrice)} each
            </p>
            {item.customisations.length > 0 && (
              <p className="text-xs text-gray-500 mt-1">
                {item.customisations
                  .flatMap((c) =>
                    c.variants.map(
                      (v) => v.selectedOption?.name || v.optionName || v.name
                    )
                  )
                  .filter(Boolean)
                  .join(", ")}
              </p>
            )}
          </div>
          <p className="text-sm font-semibold text-gray-900 whitespace-nowrap">
            {formatCurrency(item.discountedPrice * item.quantity)}
          </p>
        </li>
      ))}
    </ul>
  </div>
);

const ItemTypeDot = ({ type }: { type: "VEG" | "NON_VEG" | "EGG" }) => {
  const color =
    type === "VEG"
      ? "border-green-600 bg-green-600"
      : type === "EGG"
        ? "border-yellow-600 bg-yellow-600"
        : "border-red-600 bg-red-600";
  const label =
    type === "VEG" ? "Vegetarian" : type === "EGG" ? "Contains egg" : "Non-vegetarian";
  return (
    <span
      role="img"
      className={`inline-block h-3 w-3 border ${color} rounded-sm`}
      aria-label={label}
    />
  );
};

const AmountCard = ({ summary }: { summary: IrctcOrderSummary }) => {
  const { amount, otherCharges } = summary;
  const subtotal = amount.totalAmount - amount.taxAmount - amount.totalOtherCharges;
  return (
    <div className="bg-white rounded-2xl shadow-sm border border-gray-200 p-6">
      <h2 className="text-base font-semibold text-gray-900 mb-4">
        Amount Breakdown
      </h2>
      <dl className="space-y-2 text-sm">
        <Row label="Subtotal" value={formatCurrency(subtotal)} />
        <Row label="Taxes" value={formatCurrency(amount.taxAmount)} />
        {otherCharges.map((c) => (
          <Row
            key={c.id}
            label={c.name}
            value={formatCurrency(c.amount + c.gst)}
          />
        ))}
        {amount.discountAmount > 0 && (
          <Row
            label={
              summary.coupon ? `Discount (${summary.coupon.code})` : "Discount"
            }
            value={`- ${formatCurrency(amount.discountAmount)}`}
            valueClassName="text-green-600"
          />
        )}
        <div className="pt-2 mt-2 border-t border-gray-200">
          <Row
            label="Total Payable"
            value={formatCurrency(amount.amountPayable)}
            labelClassName="text-base font-semibold text-gray-900"
            valueClassName="text-base font-bold text-teal-700"
          />
        </div>
      </dl>
    </div>
  );
};

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

/**
 * Defence-in-depth fallback rendered when the BE returns a `paymentType` we
 * don't know how to drive (e.g. a future value added without a FE update).
 * Avoids leaving the user with no actionable surface.
 */
const UnsupportedPaymentTypeCard = ({
  summary,
}: {
  summary: IrctcOrderSummary;
}) => (
  <div className="bg-white rounded-2xl shadow-sm border border-amber-200 p-6">
    <h2 className="text-base font-semibold text-gray-900">
      This payment type is not yet supported here
    </h2>
    <p className="text-sm text-gray-600 mt-2">
      Our team has been notified. You can track this order at any time using
      the order id below.
    </p>
    <Link
      to={`/irctc-order/${summary.externalOrderId}`}
      className="mt-4 inline-block bg-teal-600 hover:bg-teal-700 text-white font-medium rounded-lg px-5 py-2.5 transition-colors"
    >
      Track Order #{summary.externalOrderId}
    </Link>
  </div>
);

const LoadingView = () => (
  <div className="min-h-screen bg-gray-50" aria-busy="true">
    <div className="max-w-4xl mx-auto p-4 md:p-6">
      <IrctcBrandedHeader className="mb-4" />
      <p className="sr-only" aria-live="polite">
        Confirming order details with IRCTC.
      </p>
      <div className="space-y-6">
        {/* Header skeleton — mirrors `Header` */}
        <SkeletonCard>
          <div className="flex flex-col md:flex-row md:items-start md:justify-between gap-4">
            <div className="space-y-2">
              <div className="h-3 w-20 rounded bg-gray-200 animate-pulse" />
              <div className="h-7 w-64 rounded bg-gray-200 animate-pulse" />
              <div className="h-3 w-40 rounded bg-gray-200 animate-pulse" />
            </div>
            <div className="flex flex-wrap gap-2">
              <div className="h-6 w-24 rounded-full bg-gray-200 animate-pulse" />
              <div className="h-6 w-20 rounded-full bg-gray-200 animate-pulse" />
            </div>
          </div>
          <div className="mt-4 pt-4 border-t border-gray-100">
            <div className="h-3 w-72 rounded bg-gray-200 animate-pulse" />
          </div>
        </SkeletonCard>

        {/* Delivery skeleton */}
        <SkeletonCard>
          <div className="h-4 w-32 rounded bg-gray-200 animate-pulse mb-4" />
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            {Array.from({ length: 7 }).map((_, i) => (
              <div key={i} className="space-y-1.5">
                <div className="h-2.5 w-12 rounded bg-gray-200 animate-pulse" />
                <div className="h-4 w-24 rounded bg-gray-200 animate-pulse" />
              </div>
            ))}
          </div>
        </SkeletonCard>

        {/* Items skeleton */}
        <SkeletonCard>
          <div className="h-4 w-16 rounded bg-gray-200 animate-pulse mb-4" />
          <div className="divide-y divide-gray-100">
            {Array.from({ length: 3 }).map((_, i) => (
              <div
                key={i}
                className="py-3 flex items-start justify-between gap-4"
              >
                <div className="flex-1 space-y-2">
                  <div className="h-4 w-48 rounded bg-gray-200 animate-pulse" />
                  <div className="h-3 w-28 rounded bg-gray-200 animate-pulse" />
                </div>
                <div className="h-4 w-16 rounded bg-gray-200 animate-pulse" />
              </div>
            ))}
          </div>
        </SkeletonCard>

        {/* Amount skeleton */}
        <SkeletonCard>
          <div className="h-4 w-40 rounded bg-gray-200 animate-pulse mb-4" />
          <div className="space-y-3">
            {Array.from({ length: 3 }).map((_, i) => (
              <div key={i} className="flex justify-between">
                <div className="h-4 w-32 rounded bg-gray-200 animate-pulse" />
                <div className="h-4 w-16 rounded bg-gray-200 animate-pulse" />
              </div>
            ))}
            <div className="pt-3 mt-3 border-t border-gray-200 flex justify-between">
              <div className="h-5 w-28 rounded bg-gray-200 animate-pulse" />
              <div className="h-5 w-20 rounded bg-gray-200 animate-pulse" />
            </div>
          </div>
        </SkeletonCard>
      </div>
      <IrctcPoweredBy />
    </div>
  </div>
);

const SkeletonCard = ({ children }: { children: React.ReactNode }) => (
  <div className="bg-white rounded-2xl shadow-sm border border-gray-200 p-6">
    {children}
  </div>
);

const SafeError = () => (
  <div className="min-h-screen bg-gray-50 flex items-center justify-center p-6">
    <div
      role="alert"
      className="bg-white rounded-2xl shadow-sm border border-gray-200 p-8 max-w-md w-full text-center"
    >
      <h2 className="text-lg font-semibold text-gray-900">
        Order link is invalid
      </h2>
      <p className="text-sm text-gray-500 mt-2">
        We couldn't find your order details in this link. Please return home and
        try again.
      </p>
      <Link
        to="/"
        className="mt-6 inline-block bg-teal-600 hover:bg-teal-700 text-white font-medium rounded-lg px-6 py-3 transition-colors"
      >
        Return to home
      </Link>
      <IrctcPoweredBy />
    </div>
  </div>
);

const ErrorView = forwardRef<
  HTMLDivElement,
  {
    message: string;
    onRetry: () => void;
  }
>(({ message, onRetry }, ref) => (
  <div className="min-h-screen bg-gray-50 flex items-center justify-center p-6">
    <div
      ref={ref}
      tabIndex={-1}
      role="alert"
      aria-live="assertive"
      className="bg-white rounded-2xl shadow-sm border border-gray-200 p-8 max-w-md w-full text-center outline-none"
    >
      <h2 className="text-lg font-semibold text-gray-900">
        Something went wrong
      </h2>
      <p className="text-sm text-gray-500 mt-2">{message}</p>
      <div className="mt-6 flex flex-col sm:flex-row gap-3 justify-center">
        <button
          type="button"
          onClick={onRetry}
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
      <IrctcPoweredBy />
    </div>
  </div>
));
ErrorView.displayName = "ErrorView";

export default ReverseOrderCallback;
