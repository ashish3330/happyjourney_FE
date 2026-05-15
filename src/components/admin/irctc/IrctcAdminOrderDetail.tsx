/**
 * Admin IRCTC reverse-order detail.
 *
 * Intended mount path: `/admin/irctc/orders/:internalOrderId`.
 *
 * Reuses the *visual* anatomy of `IrctcOrderTracking.tsx` (status stepper,
 * delivery details, item list, amount breakdown, OTP card) but does NOT
 * import that page — those components are intentionally re-implemented here
 * so the customer view stays a pure customer experience and the ops view can
 * evolve independently.
 *
 * Adds an "Ops panel" at the top: pending push target, attempt count, last
 * error, row version, and a collapsible pretty-printed view of the raw IRCTC
 * payload. A "Force resync" button hits the catalog resync endpoint for the
 * order's vendor when known; greyed out otherwise.
 *
 * Polls every 5s (faster than the list because this is the deep-dive screen).
 *
 * NOTE on location: this file should live at
 * `src/pages/admin/IrctcAdminOrderDetail.tsx`. The harness only allows writes
 * under `src/components/`, so it is delivered here; it is fully relocatable.
 */

import {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import { Link, useParams, useNavigate } from "react-router-dom";
import {
  RefreshCw,
  AlertTriangle,
  ChevronDown,
  ChevronRight,
  ArrowLeft,
  RotateCw,
} from "lucide-react";
import { toast } from "sonner";

import {
  IrctcBrandedHeader,
  IrctcPoweredBy,
} from "@/integrations/irctc/BrandingProvider";
import type {
  IrctcOrderStatus,
  IrctcOrderSummary,
} from "@/integrations/irctc/types";

import {
  fetchAdminOrderDetail,
  parseIrctcError,
  triggerOutletResync,
  type IrctcAdminOrderDetail as IrctcAdminOrderDetailDTO,
} from "./adminIrctcApi";
import {
  ADMIN_STATUS_VISUALS,
  formatCurrency,
  formatRelative,
} from "./statusVisuals";

const POLL_MS = 5_000;

type LoadState =
  | { kind: "loading" }
  | { kind: "missing" }
  | { kind: "error"; message: string }
  | {
      kind: "ready";
      order: IrctcAdminOrderDetailDTO;
      refreshing: boolean;
    };

const STEPS: Array<{
  match: IrctcOrderStatus[];
  label: string;
}> = [
  {
    match: ["ORDER_PENDING", "PENDING", "PAYMENT_AWAITING"],
    label: "Order placed",
  },
  { match: ["ORDER_CONFIRMED", "CONFIRMED"], label: "Confirmed" },
  { match: ["PREPARING"], label: "Preparing" },
  { match: ["OUT_FOR_DELIVERY"], label: "Out for delivery" },
  { match: ["DELIVERED"], label: "Delivered" },
];

const stepIndexFor = (status: IrctcOrderStatus): number => {
  const idx = STEPS.findIndex((s) => s.match.includes(status));
  if (idx >= 0) return idx;
  if (status === "ORDER_CANCELLED" || status === "CANCELLED") return -1;
  if (status === "STATUS_PUSH_FAILED") return 1;
  return 0;
};

const IrctcAdminOrderDetail = () => {
  const { internalOrderId: rawId } = useParams<{ internalOrderId: string }>();
  const navigate = useNavigate();
  const parsedId = useMemo(() => {
    if (!rawId) return null;
    const n = Number(rawId);
    return Number.isFinite(n) && n > 0 ? n : null;
  }, [rawId]);

  const [state, setState] = useState<LoadState>({ kind: "loading" });
  const [, setTick] = useState(0);
  const abortRef = useRef<AbortController | null>(null);
  const [resyncing, setResyncing] = useState(false);

  const load = useCallback(
    async (id: number, mode: "initial" | "refresh") => {
      abortRef.current?.abort();
      const controller = new AbortController();
      abortRef.current = controller;
      if (mode === "initial") {
        setState({ kind: "loading" });
      } else {
        setState((prev) =>
          prev.kind === "ready" ? { ...prev, refreshing: true } : prev
        );
      }
      try {
        const order = await fetchAdminOrderDetail(id, controller.signal);
        setState({ kind: "ready", order, refreshing: false });
      } catch (err) {
        const info = parseIrctcError(err);
        if (info.isAborted) return;
        if (mode === "initial") {
          setState({ kind: "error", message: info.message });
        } else {
          toast.error(`Refresh failed: ${info.message}`);
          setState((prev) =>
            prev.kind === "ready" ? { ...prev, refreshing: false } : prev
          );
        }
      }
    },
    []
  );

  useEffect(() => {
    if (parsedId == null) {
      setState({ kind: "missing" });
      return;
    }
    void load(parsedId, "initial");
    return () => abortRef.current?.abort();
  }, [parsedId, load]);

  useEffect(() => {
    if (parsedId == null) return;
    const id = window.setInterval(() => {
      void load(parsedId, "refresh");
    }, POLL_MS);
    return () => window.clearInterval(id);
  }, [parsedId, load]);

  useEffect(() => {
    const id = window.setInterval(() => setTick((n) => n + 1), 1000);
    return () => window.clearInterval(id);
  }, []);

  const onResync = async () => {
    if (state.kind !== "ready") return;
    const vid = state.order.vendorId;
    if (vid == null) return;
    setResyncing(true);
    try {
      await triggerOutletResync(vid);
      toast.success(`Catalog resync queued for vendor #${vid}.`);
    } catch (err) {
      const info = parseIrctcError(err);
      toast.error(info.message);
    } finally {
      setResyncing(false);
    }
  };

  if (state.kind === "missing") {
    return (
      <CenteredCard
        title="Order id is invalid"
        body="We couldn't read an order id from this URL."
        action={
          <Link
            to="/admin/irctc/orders"
            className="inline-block bg-teal-600 hover:bg-teal-700 text-white font-medium rounded-lg px-6 py-3 transition-colors"
          >
            Back to orders
          </Link>
        }
      />
    );
  }

  if (state.kind === "loading") {
    return <DetailSkeleton />;
  }

  if (state.kind === "error") {
    return (
      <CenteredCard
        title="Couldn't load this order"
        body={state.message}
        action={
          <div className="flex gap-3 justify-center">
            <button
              type="button"
              onClick={() => parsedId && void load(parsedId, "initial")}
              className="bg-teal-600 hover:bg-teal-700 text-white font-medium rounded-lg px-6 py-3 transition-colors"
            >
              Retry
            </button>
            <Link
              to="/admin/irctc/orders"
              className="bg-white hover:bg-gray-50 text-gray-700 font-medium rounded-lg px-6 py-3 border border-gray-300 transition-colors"
            >
              Back
            </Link>
          </div>
        }
      />
    );
  }

  const { order, refreshing } = state;
  const visual =
    ADMIN_STATUS_VISUALS[order.status] ?? {
      badgeClassName: "bg-gray-100 text-gray-700 border-gray-300",
      label: order.status,
    };
  const showOtp =
    order.status === "OUT_FOR_DELIVERY" &&
    typeof order.deliveryOtp === "string" &&
    order.deliveryOtp.length > 0;

  return (
    <div className="min-h-full bg-gray-50">
      <div className="max-w-5xl mx-auto p-4 md:p-6">
        <IrctcBrandedHeader
          className="mb-4"
          label="IRCTC Ops — Order detail"
        />
        <div className="flex items-center justify-between mb-4">
          <button
            type="button"
            onClick={() => navigate("/admin/irctc/orders")}
            className="inline-flex items-center gap-2 text-sm text-gray-600 hover:text-gray-900"
          >
            <ArrowLeft size={14} /> Back to orders
          </button>
          <button
            type="button"
            onClick={() => parsedId && void load(parsedId, "refresh")}
            disabled={refreshing}
            className="inline-flex items-center gap-2 px-3 py-2 rounded-lg text-sm font-medium text-teal-700 bg-teal-50 hover:bg-teal-100 border border-teal-200 disabled:opacity-50 transition-colors"
          >
            <RefreshCw
              size={14}
              className={refreshing ? "animate-spin" : ""}
            />
            {refreshing ? "Refreshing" : "Refresh"}
          </button>
        </div>

        <OpsPanel
          order={order}
          resyncing={resyncing}
          onResync={() => void onResync()}
        />

        {showOtp && <DeliveryOtpCard otp={order.deliveryOtp as string} />}

        <HeaderCard order={order} visual={visual} />

        <RefundPanel order={order} />

        <StatusStepperCard status={order.status} />
        <DeliveryCard order={order} />
        <ItemsCard order={order} />
        <AmountCard order={order} />

        <IrctcPoweredBy />
      </div>
    </div>
  );
};

/* -------------------------------------------------------------------------- */
/*  Ops panel                                                                 */
/* -------------------------------------------------------------------------- */

const OpsPanel = ({
  order,
  resyncing,
  onResync,
}: {
  order: IrctcAdminOrderDetailDTO;
  resyncing: boolean;
  onResync: () => void;
}) => {
  const [errorOpen, setErrorOpen] = useState(false);
  const [payloadOpen, setPayloadOpen] = useState(false);
  const vendorKnown = order.vendorId != null;

  return (
    <div className="bg-white rounded-2xl shadow-sm border border-gray-200 p-5 mb-6">
      <div className="flex items-center justify-between mb-4">
        <h2 className="text-base font-semibold text-gray-900">Ops panel</h2>
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={onResync}
            disabled={!vendorKnown || resyncing}
            title={
              vendorKnown
                ? "Trigger outlet catalog resync"
                : "Vendor id not yet available on summary"
            }
            className={`inline-flex items-center gap-2 px-3 py-2 rounded-lg text-sm font-medium border transition-colors ${
              vendorKnown
                ? "text-orange-700 bg-orange-50 hover:bg-orange-100 border-orange-200 disabled:opacity-50"
                : "text-gray-400 bg-gray-50 border-gray-200 cursor-not-allowed"
            }`}
          >
            <RotateCw
              size={14}
              className={resyncing ? "animate-spin" : ""}
            />
            {resyncing ? "Queuing…" : "Force resync"}
          </button>
        </div>
      </div>

      <dl className="grid grid-cols-1 md:grid-cols-3 gap-x-6 gap-y-3 text-sm">
        <OpsField
          label="Pending push target"
          value={order.pendingPushTarget ?? "—"}
        />
        <OpsField
          label="Attempts"
          value={
            order.confirmAttemptCount != null
              ? String(order.confirmAttemptCount)
              : "—"
          }
        />
        <OpsField
          label="Last attempt"
          value={
            order.lastAttemptAt
              ? `${formatRelative(order.lastAttemptAt)}`
              : "—"
          }
        />
        <OpsField
          label="Row version"
          value={
            order.rowVersion != null ? String(order.rowVersion) : "—"
          }
        />
        <OpsField label="Internal id" value={String(order.internalOrderId)} />
        <OpsField
          label="Vendor id"
          value={order.vendorId != null ? String(order.vendorId) : "—"}
        />
      </dl>

      {order.lastError && (
        <div className="mt-4 rounded-xl border border-amber-200 bg-amber-50 p-3">
          <button
            type="button"
            onClick={() => setErrorOpen((v) => !v)}
            className="w-full flex items-center justify-between text-sm font-semibold text-amber-800"
          >
            <span className="flex items-center gap-2">
              <AlertTriangle size={14} />
              Last error
            </span>
            {errorOpen ? (
              <ChevronDown size={14} />
            ) : (
              <ChevronRight size={14} />
            )}
          </button>
          {errorOpen && (
            <pre className="mt-2 text-xs whitespace-pre-wrap break-words text-amber-900 font-mono">
              {order.lastError}
            </pre>
          )}
        </div>
      )}

      <div className="mt-4 rounded-xl border border-gray-200 bg-gray-50 p-3">
        <button
          type="button"
          onClick={() => setPayloadOpen((v) => !v)}
          className="w-full flex items-center justify-between text-sm font-semibold text-gray-700"
        >
          <span>Raw IRCTC payload</span>
          {payloadOpen ? (
            <ChevronDown size={14} />
          ) : (
            <ChevronRight size={14} />
          )}
        </button>
        {payloadOpen && (
          <pre className="mt-2 text-xs leading-relaxed text-gray-700 font-mono bg-white border border-gray-200 rounded-lg p-3 max-h-96 overflow-auto">
            {order.payloadJson
              ? JSON.stringify(order.payloadJson, null, 2)
              : "(no payload)"}
          </pre>
        )}
      </div>
    </div>
  );
};

const OpsField = ({ label, value }: { label: string; value: string }) => (
  <div>
    <dt className="text-xs uppercase tracking-wide text-gray-500">{label}</dt>
    <dd className="mt-0.5 text-sm font-medium text-gray-900 break-all">
      {value}
    </dd>
  </div>
);

/* -------------------------------------------------------------------------- */
/*  Customer-view-style cards (re-implemented, NOT imported)                  */
/* -------------------------------------------------------------------------- */

const HeaderCard = ({
  order,
  visual,
}: {
  order: IrctcAdminOrderDetailDTO;
  visual: { badgeClassName: string; label: string };
}) => (
  <div className="bg-white rounded-2xl shadow-sm border border-gray-200 p-6 mb-6">
    <div className="flex flex-col md:flex-row md:items-start md:justify-between gap-4">
      <div>
        <p className="text-xs uppercase tracking-wide text-teal-600 font-semibold">
          IRCTC Order
        </p>
        <h1 className="text-2xl font-bold text-gray-900 mt-1">
          Order #{order.externalOrderId}
        </h1>
        <p className="text-sm text-gray-500 mt-1">
          Booked on {order.bookingDate}
        </p>
      </div>
      <span
        className={`inline-flex items-center px-3 py-1 rounded-full text-xs font-semibold border ${visual.badgeClassName}`}
      >
        {visual.label}
      </span>
    </div>
    <div className="mt-4 pt-4 border-t border-gray-100 text-sm text-gray-600">
      <p>
        <span className="font-medium text-gray-900">
          {order.customer.fullName}
        </span>
        {" · "}
        {order.customer.mobile}
        {order.customer.email ? ` · ${order.customer.email}` : ""}
      </p>
    </div>
  </div>
);

const DeliveryOtpCard = ({ otp }: { otp: string }) => (
  <div className="bg-teal-600 rounded-2xl shadow-md border border-teal-700 p-6 text-white mb-6">
    <p className="text-xs uppercase tracking-wide font-semibold opacity-90">
      Delivery OTP
    </p>
    <p
      className="mt-3 text-4xl font-mono font-bold tracking-[0.5em] select-all"
      aria-label={`Delivery OTP ${otp.split("").join(" ")}`}
    >
      {otp}
    </p>
    <p className="mt-3 text-sm opacity-90 max-w-md">
      Shared with the passenger and the delivery partner.
    </p>
  </div>
);

const RefundPanel = ({ order }: { order: IrctcAdminOrderDetailDTO }) => {
  const status = order.refundStatus ?? "NONE";
  if (status === "NONE") return null;
  if (status === "INITIATED") {
    return (
      <div className="rounded-2xl border border-green-200 bg-green-50 p-4 text-sm text-green-800 mb-6">
        <p className="font-semibold">Refund initiated</p>
        <p className="mt-1">
          Refund of {formatCurrency(order.amount.amountPayable)} initiated.
          {order.refundRef
            ? ` Razorpay reference: ${order.refundRef}.`
            : ""}
        </p>
      </div>
    );
  }
  return (
    <div className="rounded-2xl border border-red-300 bg-red-50 p-4 text-sm text-red-900 mb-6">
      <p className="font-semibold">Refund failed — needs ops</p>
      <p className="mt-1">
        Automatic refund didn't go through. Resolve via Razorpay dashboard
        and update the row manually.
      </p>
    </div>
  );
};

const StatusStepperCard = ({ status }: { status: IrctcOrderStatus }) => {
  const activeIndex = stepIndexFor(status);
  const isCancelled =
    status === "ORDER_CANCELLED" || status === "CANCELLED";
  const isPushFailed = status === "STATUS_PUSH_FAILED";

  return (
    <div className="bg-white rounded-2xl shadow-sm border border-gray-200 p-6 mb-6">
      <h2 className="text-base font-semibold text-gray-900 mb-5">
        Order status
      </h2>
      {isCancelled ? (
        <div className="rounded-xl border border-red-200 bg-red-50 p-4 text-sm text-red-700">
          This order is cancelled.
        </div>
      ) : (
        <>
          {isPushFailed && (
            <div className="mb-4 rounded-xl border border-orange-200 bg-orange-50 p-3 text-xs text-orange-800">
              Status was set locally but the push to IRCTC failed. Sweeper is
              retrying.
            </div>
          )}
          <ol className="relative">
            {STEPS.map((step, idx) => {
              const isCurrent = idx === activeIndex;
              const isDone = idx < activeIndex;
              const isLast = idx === STEPS.length - 1;
              const dotBase =
                "relative z-10 h-8 w-8 rounded-full flex items-center justify-center text-xs font-semibold border-2";
              const dotState = isDone
                ? "bg-teal-600 border-teal-600 text-white"
                : isCurrent
                  ? "bg-white border-teal-600 text-teal-700 ring-4 ring-teal-100"
                  : "bg-white border-gray-300 text-gray-400";
              const lineState =
                isDone || isCurrent ? "bg-teal-600" : "bg-gray-200";
              return (
                <li
                  key={step.label}
                  className="flex gap-4 pb-6 last:pb-0"
                >
                  <div className="flex flex-col items-center">
                    <div className={`${dotBase} ${dotState}`}>
                      {isDone ? "✓" : idx + 1}
                    </div>
                    {!isLast && (
                      <div
                        className={`w-0.5 flex-1 mt-1 ${lineState}`}
                      />
                    )}
                  </div>
                  <div className="pt-1 pb-2">
                    <p
                      className={`text-sm font-medium ${
                        isCurrent
                          ? "text-teal-700"
                          : isDone
                            ? "text-gray-900"
                            : "text-gray-500"
                      }`}
                    >
                      {step.label}
                    </p>
                  </div>
                </li>
              );
            })}
          </ol>
        </>
      )}
    </div>
  );
};

const DeliveryCard = ({ order }: { order: IrctcAdminOrderDetailDTO }) => {
  const d = order.deliveryDetails;
  return (
    <div className="bg-white rounded-2xl shadow-sm border border-gray-200 p-6 mb-6">
      <h2 className="text-base font-semibold text-gray-900 mb-4">
        Delivery details
      </h2>
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
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

// Items array is `unknown[]` at the API boundary; we render a minimal,
// defensive row that pulls only the fields the customer page renders.
interface CardItem {
  id?: string;
  name?: string;
  sellingPrice?: number;
  discountedPrice?: number;
  quantity?: number;
  itemType?: "VEG" | "NON_VEG" | "EGG";
}

const ItemsCard = ({ order }: { order: IrctcAdminOrderDetailDTO }) => {
  const items = order.items as unknown as CardItem[];
  return (
    <div className="bg-white rounded-2xl shadow-sm border border-gray-200 p-6 mb-6">
      <h2 className="text-base font-semibold text-gray-900 mb-4">Items</h2>
      <ul className="divide-y divide-gray-100">
        {items.map((item, idx) => {
          const qty = item.quantity ?? 0;
          const dp = item.discountedPrice ?? item.sellingPrice ?? 0;
          return (
            <li
              key={item.id ?? idx}
              className="py-3 flex items-start justify-between gap-4"
            >
              <div className="min-w-0 flex-1">
                <div className="flex items-center gap-2">
                  {item.itemType && (
                    <ItemTypeDot type={item.itemType} />
                  )}
                  <p className="text-sm font-medium text-gray-900 truncate">
                    {item.name ?? "(unnamed)"}
                  </p>
                </div>
                <p className="text-xs text-gray-500 mt-1">
                  Qty {qty} ·{" "}
                  {formatCurrency(item.sellingPrice ?? 0)} each
                </p>
              </div>
              <p className="text-sm font-semibold text-gray-900 whitespace-nowrap">
                {formatCurrency(dp * qty)}
              </p>
            </li>
          );
        })}
      </ul>
    </div>
  );
};

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

interface CardCharge {
  id?: string;
  name?: string;
  amount?: number;
  gst?: number;
}

const AmountCard = ({ order }: { order: IrctcAdminOrderDetailDTO }) => {
  const { amount } = order;
  const otherCharges = order.otherCharges as unknown as CardCharge[];
  const coupon: IrctcOrderSummary["coupon"] = order.coupon;
  const subtotal =
    amount.totalAmount - amount.taxAmount - amount.totalOtherCharges;
  return (
    <div className="bg-white rounded-2xl shadow-sm border border-gray-200 p-6 mb-6">
      <h2 className="text-base font-semibold text-gray-900 mb-4">
        Amount breakdown
      </h2>
      <dl className="space-y-2 text-sm">
        <Row label="Subtotal" value={formatCurrency(subtotal)} />
        <Row label="Taxes" value={formatCurrency(amount.taxAmount)} />
        {otherCharges.map((c, idx) => (
          <Row
            key={c.id ?? idx}
            label={c.name ?? "Charge"}
            value={formatCurrency((c.amount ?? 0) + (c.gst ?? 0))}
          />
        ))}
        {amount.discountAmount > 0 && (
          <Row
            label={coupon ? `Discount (${coupon.code})` : "Discount"}
            value={`- ${formatCurrency(amount.discountAmount)}`}
            valueClassName="text-green-600"
          />
        )}
        <div className="pt-2 mt-2 border-t border-gray-200">
          <Row
            label="Total payable"
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

/* -------------------------------------------------------------------------- */
/*  States                                                                    */
/* -------------------------------------------------------------------------- */

const DetailSkeleton = () => (
  <div className="min-h-full bg-gray-50">
    <div className="max-w-5xl mx-auto p-4 md:p-6">
      <IrctcBrandedHeader
        className="mb-4"
        label="IRCTC Ops — Order detail"
      />
      <div className="space-y-6">
        {Array.from({ length: 4 }).map((_, i) => (
          <div
            key={i}
            className="bg-white rounded-2xl shadow-sm border border-gray-200 p-6"
          >
            <div className="h-4 w-32 rounded bg-gray-200 animate-pulse mb-4" />
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              {Array.from({ length: 8 }).map((__, j) => (
                <div key={j} className="space-y-1.5">
                  <div className="h-2.5 w-12 rounded bg-gray-200 animate-pulse" />
                  <div className="h-4 w-24 rounded bg-gray-200 animate-pulse" />
                </div>
              ))}
            </div>
          </div>
        ))}
      </div>
    </div>
  </div>
);

const CenteredCard = ({
  title,
  body,
  action,
}: {
  title: string;
  body: string;
  action: React.ReactNode;
}) => (
  <div className="min-h-full bg-gray-50 flex items-center justify-center p-6">
    <div className="bg-white rounded-2xl shadow-sm border border-gray-200 p-8 max-w-md w-full text-center">
      <h2 className="text-lg font-semibold text-gray-900">{title}</h2>
      <p className="text-sm text-gray-500 mt-2">{body}</p>
      <div className="mt-6">{action}</div>
    </div>
  </div>
);

export default IrctcAdminOrderDetail;
