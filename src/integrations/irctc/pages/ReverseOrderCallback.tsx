import { useCallback, useEffect, useState } from "react";
import { Link, useSearchParams } from "react-router-dom";
import { toast } from "sonner";
import { AxiosError } from "axios";

import {
  cancelReverseOrder,
  confirmReverseOrder,
  ingestCallback,
} from "../api";
import { IrctcBrandedHeader } from "../BrandingProvider";
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

const errorMessage = (err: unknown): string => {
  if (err instanceof AxiosError) {
    const data = err.response?.data as { message?: string } | undefined;
    return data?.message || err.message || "Failed to load order.";
  }
  if (err instanceof Error) return err.message;
  return "Failed to load order.";
};

const ReverseOrderCallback = () => {
  const [searchParams] = useSearchParams();
  const [state, setState] = useState<LoadState>({ kind: "loading" });

  const dataParam = searchParams.get("data");

  const load = useCallback(async (raw: string) => {
    setState({ kind: "loading" });
    try {
      const summary = await ingestCallback(raw);
      setState({ kind: "ready", summary });
    } catch (err) {
      const message = errorMessage(err);
      toast.error(message);
      setState({ kind: "error", message });
    }
  }, []);

  useEffect(() => {
    if (!dataParam || dataParam.trim() === "") {
      setState({ kind: "missing" });
      return;
    }
    void load(dataParam);
  }, [dataParam, load]);

  if (state.kind === "missing") {
    return <SafeError />;
  }

  if (state.kind === "loading") {
    return <LoadingView />;
  }

  if (state.kind === "error") {
    return (
      <ErrorView
        message={state.message}
        onRetry={() => {
          if (dataParam) void load(dataParam);
        }}
      />
    );
  }

  const { summary } = state;
  const showPayment =
    summary.paymentType === "CASH_ON_DELIVERY" ||
    summary.paymentType === "PREPAID";

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
            <PlaceholderActions summary={summary} />
          )}
        </div>
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
        <span className="inline-flex items-center px-3 py-1 rounded-full text-xs font-medium bg-teal-50 text-teal-700 border border-teal-200">
          {summary.status.replace(/_/g, " ")}
        </span>
        <span className="inline-flex items-center px-3 py-1 rounded-full text-xs font-medium bg-gray-100 text-gray-700 border border-gray-200">
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
              Qty {item.quantity} · {formatCurrency(item.sellingPrice)} each
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
  return (
    <span
      className={`inline-block h-3 w-3 border ${color} rounded-sm`}
      aria-label={type}
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

const PlaceholderActions = ({ summary }: { summary: IrctcOrderSummary }) => {
  const [busy, setBusy] = useState(false);

  const onConfirm = async () => {
    setBusy(true);
    try {
      await confirmReverseOrder(summary.internalOrderId, {
        paymentMode:
          summary.paymentType === "CASH_ON_DELIVERY" ? "COD" : "PREPAID",
      });
      toast.success("Order confirmed (placeholder).");
    } catch (err) {
      toast.error(errorMessage(err));
    } finally {
      setBusy(false);
    }
  };

  const onCancel = async () => {
    setBusy(true);
    try {
      await cancelReverseOrder(summary.internalOrderId, {
        reason: "User cancelled from callback page.",
      });
      toast.success("Order cancelled (placeholder).");
    } catch (err) {
      toast.error(errorMessage(err));
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="bg-white rounded-2xl shadow-sm border border-gray-200 p-6 flex flex-col sm:flex-row gap-3">
      <button
        type="button"
        onClick={onConfirm}
        disabled={busy}
        className="flex-1 bg-teal-600 hover:bg-teal-700 disabled:opacity-50 text-white font-medium rounded-lg py-3 transition-colors"
      >
        Confirm (placeholder)
      </button>
      <button
        type="button"
        onClick={onCancel}
        disabled={busy}
        className="flex-1 bg-white hover:bg-gray-50 disabled:opacity-50 text-gray-700 font-medium rounded-lg py-3 border border-gray-300 transition-colors"
      >
        Cancel (placeholder)
      </button>
    </div>
  );
};

const LoadingView = () => (
  <div className="min-h-screen bg-gray-50">
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
    <div className="bg-white rounded-2xl shadow-sm border border-gray-200 p-8 max-w-md w-full text-center">
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
    </div>
  </div>
);

const ErrorView = ({
  message,
  onRetry,
}: {
  message: string;
  onRetry: () => void;
}) => (
  <div className="min-h-screen bg-gray-50 flex items-center justify-center p-6">
    <div className="bg-white rounded-2xl shadow-sm border border-gray-200 p-8 max-w-md w-full text-center">
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
    </div>
  </div>
);

export default ReverseOrderCallback;
