/**
 * IRCTC reverse-order tracking page.
 *
 * Mounted at `/irctc-order/:externalOrderId`. Fetches the order summary from
 * the BE (`GET /irctc/reverse-order/by-external-id/{id}`), renders a header
 * with a colour-coded status badge, delivery details, item list, amount
 * breakdown, and a visual status stepper. Auto-refreshes every 30s while the
 * order is not in a terminal state.
 */

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { Link, useParams } from "react-router-dom";
import { toast } from "sonner";
import { AxiosError } from "axios";

import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Textarea } from "@/components/ui/textarea";

import { IrctcBrandedHeader, IrctcPoweredBy } from "../BrandingProvider";
import {
  fetchByExternalOrderId,
  fetchIrctcEta,
  parseIrctcError,
  submitIrctcFeedback,
} from "../api";
import type {
  IrctcEtaResponse,
  IrctcOrderStatus,
  IrctcOrderSummary,
} from "../types";

const AUTO_REFRESH_MS = 30_000;

/**
 * localStorage namespace for "has the customer already submitted feedback for
 * this order". Per-externalOrderId so multiple orders in the same session work
 * independently.
 */
const FEEDBACK_FLAG_KEY = (externalOrderId: string): string =>
  `irctc:feedback:submitted:${externalOrderId}`;

const isFeedbackSubmitted = (externalOrderId: string): boolean => {
  try {
    return window.localStorage.getItem(FEEDBACK_FLAG_KEY(externalOrderId)) === "1";
  } catch {
    // Safari private mode etc. — treat as not-submitted; the worst case is
    // showing the CTA once more on reload.
    return false;
  }
};

const markFeedbackSubmitted = (externalOrderId: string): void => {
  try {
    window.localStorage.setItem(FEEDBACK_FLAG_KEY(externalOrderId), "1");
  } catch {
    // Best-effort; non-fatal.
  }
};

type LoadState =
  | { kind: "loading" }
  | { kind: "missing" }
  | { kind: "error"; message: string }
  | { kind: "ready"; summary: IrctcOrderSummary; refreshing: boolean };

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

/* -------------------------------------------------------------------------- */
/*  Status helpers                                                            */
/* -------------------------------------------------------------------------- */

interface StatusVisual {
  /** Tailwind classes for the badge pill (bg + text + border). */
  badgeClassName: string;
  /** Human label rendered inside the badge. */
  label: string;
}

const STATUS_VISUALS: Record<IrctcOrderStatus, StatusVisual> = {
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

const TERMINAL_STATUSES: ReadonlySet<IrctcOrderStatus> = new Set([
  "DELIVERED",
  "ORDER_CANCELLED",
  "CANCELLED",
  "STATUS_PUSH_FAILED",
  "REFUND_FAILED",
]);

const isTerminal = (status: IrctcOrderStatus): boolean =>
  TERMINAL_STATUSES.has(status);

/* -------------------------------------------------------------------------- */
/*  Stepper                                                                   */
/* -------------------------------------------------------------------------- */

/** Visual progression of a happy-path order. */
const STEPS: Array<{
  /** Statuses that should highlight this step. */
  match: IrctcOrderStatus[];
  label: string;
}> = [
  { match: ["ORDER_PENDING", "PENDING", "PAYMENT_AWAITING"], label: "Order placed" },
  { match: ["ORDER_CONFIRMED", "CONFIRMED"], label: "Confirmed" },
  { match: ["PREPARING"], label: "Preparing" },
  { match: ["OUT_FOR_DELIVERY"], label: "Out for delivery" },
  { match: ["DELIVERED"], label: "Delivered" },
];

const stepIndexFor = (status: IrctcOrderStatus): number => {
  const idx = STEPS.findIndex((step) => step.match.includes(status));
  if (idx >= 0) return idx;
  if (status === "ORDER_CANCELLED" || status === "CANCELLED") return -1;
  if (status === "STATUS_PUSH_FAILED") return 1; // confirmed but push failed
  return 0;
};

/* -------------------------------------------------------------------------- */
/*  Page                                                                      */
/* -------------------------------------------------------------------------- */

const IrctcOrderTracking = () => {
  const { externalOrderId } = useParams<{ externalOrderId: string }>();
  const [state, setState] = useState<LoadState>({ kind: "loading" });
  const [eta, setEta] = useState<IrctcEtaResponse["result"] | null>(null);
  const [feedbackOpen, setFeedbackOpen] = useState(false);
  const [feedbackHidden, setFeedbackHidden] = useState<boolean>(() =>
    externalOrderId ? isFeedbackSubmitted(externalOrderId) : false
  );

  // Keep a ref to the current status so the interval can decide whether to
  // keep polling without re-creating itself on every refresh.
  const currentStatusRef = useRef<IrctcOrderStatus | null>(null);

  const load = useCallback(
    async (id: string, mode: "initial" | "refresh") => {
      if (mode === "initial") {
        setState({ kind: "loading" });
      } else {
        setState((prev) =>
          prev.kind === "ready" ? { ...prev, refreshing: true } : prev
        );
      }
      try {
        const summary = await fetchByExternalOrderId(id);
        currentStatusRef.current = summary.status;
        setState({ kind: "ready", summary, refreshing: false });
      } catch (err) {
        const message = errorMessage(err);
        if (mode === "initial") {
          toast.error(message);
          setState({ kind: "error", message });
        } else {
          // Don't blow up the screen on a transient poll failure — keep the
          // existing summary on screen and surface a soft toast.
          toast.error(`Refresh failed: ${message}`);
          setState((prev) =>
            prev.kind === "ready" ? { ...prev, refreshing: false } : prev
          );
        }
      }
    },
    []
  );

  /**
   * Non-blocking ETA fetch. ETA is an IRCTC upstream call so it's the most
   * likely refresh to flake; we deliberately swallow all errors here so the
   * tracking surface stays usable even if `/eta` is down. The chip falls back
   * to "ETA pending" when we have no data.
   */
  const loadEta = useCallback(async (id: string) => {
    try {
      const resp = await fetchIrctcEta(id);
      setEta(resp.result);
    } catch (err) {
      const info = parseIrctcError(err);
      if (info.isAborted) return;
      // Soft-fail: leave whatever we had (or null) in place. We log to console
      // only so an investigator can see it; no toast — ETA is supplementary.
      // eslint-disable-next-line no-console
      console.debug("[IRCTC ETA] fetch failed", info.code, info.message);
    }
  }, []);

  useEffect(() => {
    if (!externalOrderId || externalOrderId.trim() === "") {
      setState({ kind: "missing" });
      return;
    }
    void load(externalOrderId, "initial");
    void loadEta(externalOrderId);
  }, [externalOrderId, load, loadEta]);

  // Auto-refresh every AUTO_REFRESH_MS while not in a terminal state. The ETA
  // piggybacks on the same cadence — never on its own timer — so a single
  // network blip can't desync the two.
  useEffect(() => {
    if (!externalOrderId) return;
    const interval = window.setInterval(() => {
      const status = currentStatusRef.current;
      if (!status || isTerminal(status)) return;
      void load(externalOrderId, "refresh");
      void loadEta(externalOrderId);
    }, AUTO_REFRESH_MS);
    return () => window.clearInterval(interval);
  }, [externalOrderId, load, loadEta]);

  if (state.kind === "missing") {
    return <MissingIdView />;
  }

  if (state.kind === "loading") {
    return <SkeletonView externalOrderId={externalOrderId ?? ""} />;
  }

  if (state.kind === "error") {
    return (
      <ErrorView
        message={state.message}
        onRetry={() => {
          if (externalOrderId) void load(externalOrderId, "initial");
        }}
      />
    );
  }

  const { summary, refreshing } = state;
  const showOtpCard =
    summary.status === "OUT_FOR_DELIVERY" &&
    typeof summary.deliveryOtp === "string" &&
    summary.deliveryOtp.length > 0;
  const showFeedbackCta =
    summary.status === "DELIVERED" && !feedbackHidden && Boolean(externalOrderId);

  return (
    <Shell>
      {showOtpCard && <DeliveryOtpCard otp={summary.deliveryOtp as string} />}
      <TrackingHeader
        summary={summary}
        refreshing={refreshing}
        eta={eta}
        onRefresh={() => {
          if (externalOrderId) {
            void load(externalOrderId, "refresh");
            void loadEta(externalOrderId);
          }
        }}
      />
      {showFeedbackCta && (
        <FeedbackCta onClick={() => setFeedbackOpen(true)} />
      )}
      <RefundPanel summary={summary} />
      <StatusTimelineCard status={summary.status} />
      <DeliveryCard summary={summary} />
      <ItemsCard summary={summary} />
      <AmountCard summary={summary} />

      {externalOrderId && (
        <FeedbackModal
          open={feedbackOpen}
          onOpenChange={setFeedbackOpen}
          externalOrderId={externalOrderId}
          onSubmitted={() => {
            markFeedbackSubmitted(externalOrderId);
            setFeedbackHidden(true);
            setFeedbackOpen(false);
            toast.success("Thanks for your feedback!");
          }}
        />
      )}
    </Shell>
  );
};

/* -------------------------------------------------------------------------- */
/*  Layout primitives                                                         */
/* -------------------------------------------------------------------------- */

const Shell = ({ children }: { children: React.ReactNode }) => (
  <div className="min-h-screen bg-gray-50">
    <div className="max-w-4xl mx-auto p-4 md:p-6">
      <IrctcBrandedHeader className="mb-4" />
      <div className="space-y-6">{children}</div>
      <IrctcPoweredBy />
    </div>
  </div>
);

const TrackingHeader = ({
  summary,
  refreshing,
  eta,
  onRefresh,
}: {
  summary: IrctcOrderSummary;
  refreshing: boolean;
  eta: IrctcEtaResponse["result"] | null;
  onRefresh: () => void;
}) => {
  const visual = STATUS_VISUALS[summary.status] ?? {
    badgeClassName: "bg-gray-100 text-gray-700 border-gray-300",
    label: summary.status.replace(/_/g, " "),
  };
  return (
    <div className="bg-white rounded-2xl shadow-sm border border-gray-200 p-6">
      <div className="flex flex-col md:flex-row md:items-start md:justify-between gap-4">
        <div>
          <p className="text-xs uppercase tracking-wide text-teal-600 font-semibold">
            IRCTC Order
          </p>
          <h1 className="text-2xl font-bold text-gray-900 mt-1">
            Order #{summary.externalOrderId}
          </h1>
          <p className="text-sm text-gray-500 mt-1">
            Booked on {summary.bookingDate}
          </p>
          <div className="mt-3">
            <EtaChip eta={eta} />
          </div>
        </div>
        <div className="flex items-center gap-3">
          <span
            className={`inline-flex items-center px-3 py-1 rounded-full text-xs font-semibold border ${visual.badgeClassName}`}
          >
            {visual.label}
          </span>
          <button
            type="button"
            onClick={onRefresh}
            disabled={refreshing}
            className="inline-flex items-center gap-2 px-3 py-1.5 rounded-lg text-xs font-medium text-teal-700 bg-teal-50 hover:bg-teal-100 border border-teal-200 disabled:opacity-50 transition-colors"
          >
            <RefreshIcon spinning={refreshing} />
            {refreshing ? "Refreshing" : "Refresh"}
          </button>
        </div>
      </div>
      <div className="mt-4 pt-4 border-t border-gray-100 text-sm text-gray-600">
        <p>
          <span className="font-medium text-gray-900">
            {summary.customer.fullName}
          </span>
          {" · "}
          {summary.customer.mobile}
          {summary.customer.email ? ` · ${summary.customer.email}` : ""}
        </p>
      </div>
    </div>
  );
};

/**
 * Live IRCTC ETA chip. Renders three states:
 *
 * - `eta` is null/empty → "ETA pending" (we haven't heard back from IRCTC yet,
 *   or the upstream call failed — we deliberately don't distinguish for the
 *   user).
 * - `eta` is known but `platform` is null → "ETA: <eta>"
 * - both known → "ETA: <eta> · Platform <platform>"
 *
 * Styling matches the rounded-pill chips elsewhere on the page.
 */
const EtaChip = ({
  eta,
}: {
  eta: IrctcEtaResponse["result"] | null;
}) => {
  const hasEta = Boolean(eta?.eta && eta.eta.trim().length > 0);
  if (!hasEta) {
    return (
      <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-medium bg-gray-100 text-gray-600 border border-gray-200">
        <ClockIcon />
        ETA pending
      </span>
    );
  }
  return (
    <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-medium bg-teal-50 text-teal-700 border border-teal-200">
      <ClockIcon />
      ETA: {eta!.eta}
      {eta!.platform ? ` · Platform ${eta!.platform}` : ""}
    </span>
  );
};

const ClockIcon = () => (
  <svg
    className="h-3.5 w-3.5"
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth="2"
    strokeLinecap="round"
    strokeLinejoin="round"
    aria-hidden
  >
    <circle cx="12" cy="12" r="10" />
    <polyline points="12 6 12 12 16 14" />
  </svg>
);

/**
 * Prominent OTP card shown only while `status === OUT_FOR_DELIVERY` AND BE
 * provided a non-empty `deliveryOtp`. Renders the OTP in a large, easily
 * read-aloud mono font (tracking-[0.5em] adds character-level spacing).
 */
const DeliveryOtpCard = ({ otp }: { otp: string }) => (
  <div className="bg-teal-600 rounded-2xl shadow-md border border-teal-700 p-6 text-white">
    <p className="text-xs uppercase tracking-wide font-semibold opacity-90">
      Your delivery OTP
    </p>
    <p
      className="mt-3 text-4xl font-mono font-bold tracking-[0.5em] select-all"
      aria-label={`Delivery OTP ${otp.split("").join(" ")}`}
    >
      {otp}
    </p>
    <p className="mt-3 text-sm opacity-90 max-w-md">
      Share this with the delivery partner when they arrive. It confirms you
      received your order.
    </p>
  </div>
);

/**
 * Compact CTA shown above the timeline once the order is `DELIVERED`. Hides
 * itself once feedback has been submitted (tracked in localStorage per order).
 */
const FeedbackCta = ({ onClick }: { onClick: () => void }) => (
  <div className="bg-white rounded-2xl shadow-sm border border-gray-200 p-4 flex items-center justify-between gap-4">
    <div>
      <p className="text-sm font-semibold text-gray-900">
        How was your order?
      </p>
      <p className="text-xs text-gray-500 mt-0.5">
        A quick rating helps us improve service on this train.
      </p>
    </div>
    <Button
      type="button"
      onClick={onClick}
      className="bg-teal-600 hover:bg-teal-700 text-white whitespace-nowrap"
    >
      Rate your order
    </Button>
  </div>
);

/**
 * Refund banner driven by `refundStatus`. We render nothing on `NONE` (most
 * orders) so we don't introduce extra chrome on the happy CoD path.
 */
const RefundPanel = ({ summary }: { summary: IrctcOrderSummary }) => {
  const status = summary.refundStatus ?? "NONE";
  if (status === "NONE") return null;
  if (status === "INITIATED") {
    return (
      <div className="rounded-2xl border border-green-200 bg-green-50 p-4 text-sm text-green-800">
        <p className="font-semibold">Refund initiated</p>
        <p className="mt-1">
          Refund of {formatCurrency(summary.amount.amountPayable)} initiated.
          {summary.refundRef
            ? ` Razorpay reference: ${summary.refundRef}.`
            : ""}{" "}
          Funds will reach your bank within 5–7 business days.
        </p>
      </div>
    );
  }
  // FAILED
  return (
    <div className="rounded-2xl border border-amber-300 bg-amber-50 p-4 text-sm text-amber-900">
      <p className="font-semibold">Refund needs attention</p>
      <p className="mt-1">
        We could not refund automatically — our team is working on it. You'll
        receive an email within 24 hours.
      </p>
    </div>
  );
};

/**
 * Feedback dialog. 5-star rating implemented as accessible buttons (no extra
 * dependency) plus a 500-char comment textarea. Posts through
 * `submitIrctcFeedback`; on success the parent flips the localStorage flag and
 * closes the dialog.
 */
const FeedbackModal = ({
  open,
  onOpenChange,
  externalOrderId,
  onSubmitted,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  externalOrderId: string;
  onSubmitted: () => void;
}) => {
  const [rating, setRating] = useState<number>(0);
  const [comment, setComment] = useState<string>("");
  const [submitting, setSubmitting] = useState<boolean>(false);

  // Reset transient state every time the dialog closes — re-opening should
  // start fresh.
  useEffect(() => {
    if (!open) {
      setRating(0);
      setComment("");
      setSubmitting(false);
    }
  }, [open]);

  const handleSubmit = async () => {
    if (rating < 1) {
      toast.error("Please select a rating before submitting.");
      return;
    }
    setSubmitting(true);
    try {
      await submitIrctcFeedback(externalOrderId, {
        rating,
        comment: comment.trim() ? comment.trim() : undefined,
      });
      onSubmitted();
    } catch (err) {
      const info = parseIrctcError(err);
      toast.error(info.message);
      setSubmitting(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Rate your order</DialogTitle>
          <DialogDescription>
            Tap a star to rate, and add an optional note. Your feedback goes to
            our team and to IRCTC.
          </DialogDescription>
        </DialogHeader>
        <div className="py-2 space-y-4">
          <StarRating value={rating} onChange={setRating} disabled={submitting} />
          <div>
            <label
              htmlFor="feedback-comment"
              className="text-sm font-medium text-gray-900"
            >
              Comment <span className="text-gray-400">(optional)</span>
            </label>
            <Textarea
              id="feedback-comment"
              maxLength={500}
              rows={4}
              value={comment}
              onChange={(e) => setComment(e.target.value)}
              placeholder="Tell us anything you'd like our team to know…"
              disabled={submitting}
              className="mt-1"
            />
            <p className="text-xs text-gray-400 mt-1 text-right">
              {comment.length}/500
            </p>
          </div>
        </div>
        <DialogFooter>
          <Button
            variant="outline"
            onClick={() => onOpenChange(false)}
            disabled={submitting}
          >
            Cancel
          </Button>
          <Button
            onClick={handleSubmit}
            disabled={submitting || rating < 1}
            className="bg-teal-600 hover:bg-teal-700 text-white"
          >
            {submitting ? "Submitting…" : "Submit feedback"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};

/**
 * Accessible 5-button star rating row. Avoids pulling in a star-rating
 * dependency — we use simple buttons + SVG that flip styling based on the
 * currently-selected value.
 */
const StarRating = ({
  value,
  onChange,
  disabled,
}: {
  value: number;
  onChange: (v: number) => void;
  disabled?: boolean;
}) => (
  <div
    className="flex items-center gap-2"
    role="radiogroup"
    aria-label="Rating from 1 to 5 stars"
  >
    {[1, 2, 3, 4, 5].map((n) => {
      const active = n <= value;
      return (
        <button
          key={n}
          type="button"
          role="radio"
          aria-checked={value === n}
          aria-label={`${n} star${n === 1 ? "" : "s"}`}
          disabled={disabled}
          onClick={() => onChange(n)}
          className={`h-10 w-10 flex items-center justify-center rounded-md border transition-colors disabled:opacity-50 ${
            active
              ? "bg-teal-50 border-teal-500 text-teal-600"
              : "bg-white border-gray-200 text-gray-300 hover:border-gray-300"
          }`}
        >
          <StarIcon filled={active} />
        </button>
      );
    })}
  </div>
);

const StarIcon = ({ filled }: { filled: boolean }) => (
  <svg
    className="h-6 w-6"
    viewBox="0 0 24 24"
    fill={filled ? "currentColor" : "none"}
    stroke="currentColor"
    strokeWidth="2"
    strokeLinecap="round"
    strokeLinejoin="round"
    aria-hidden
  >
    <polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2" />
  </svg>
);

const RefreshIcon = ({ spinning }: { spinning: boolean }) => (
  <svg
    className={`h-3.5 w-3.5 ${spinning ? "animate-spin" : ""}`}
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth="2"
    strokeLinecap="round"
    strokeLinejoin="round"
    aria-hidden
  >
    <polyline points="23 4 23 10 17 10" />
    <polyline points="1 20 1 14 7 14" />
    <path d="M3.51 9a9 9 0 0 1 14.85-3.36L23 10M1 14l4.64 4.36A9 9 0 0 0 20.49 15" />
  </svg>
);

const StatusTimelineCard = ({ status }: { status: IrctcOrderStatus }) => {
  const activeIndex = stepIndexFor(status);
  const isCancelled = status === "ORDER_CANCELLED" || status === "CANCELLED";
  const isPushFailed = status === "STATUS_PUSH_FAILED";

  return (
    <div className="bg-white rounded-2xl shadow-sm border border-gray-200 p-6">
      <h2 className="text-base font-semibold text-gray-900 mb-5">
        Order Status
      </h2>

      {isCancelled ? (
        <div className="rounded-xl border border-red-200 bg-red-50 p-4 text-sm text-red-700">
          This order has been cancelled. If you've already paid, the refund will
          reach you within 5–7 business days.
        </div>
      ) : (
        <>
          {isPushFailed && (
            <div className="mb-4 rounded-xl border border-orange-200 bg-orange-50 p-3 text-xs text-orange-800">
              We received your order but couldn't sync the latest status with
              IRCTC yet. Our team is retrying automatically.
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
                <li key={step.label} className="flex gap-4 pb-6 last:pb-0">
                  <div className="flex flex-col items-center">
                    <div className={`${dotBase} ${dotState}`}>
                      {isDone ? <CheckIcon /> : idx + 1}
                    </div>
                    {!isLast && (
                      <div className={`w-0.5 flex-1 mt-1 ${lineState}`} />
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
                    {isCurrent && (
                      <p className="text-xs text-gray-500 mt-0.5">
                        Current step — refreshing every 30s
                      </p>
                    )}
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

const CheckIcon = () => (
  <svg
    className="h-4 w-4"
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth="3"
    strokeLinecap="round"
    strokeLinejoin="round"
    aria-hidden
  >
    <polyline points="20 6 9 17 4 12" />
  </svg>
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

const ItemsCard = ({ summary }: { summary: IrctcOrderSummary }) => (
  <div className="bg-white rounded-2xl shadow-sm border border-gray-200 p-6">
    <h2 className="text-base font-semibold text-gray-900 mb-4">Items</h2>
    <ul className="divide-y divide-gray-100">
      {summary.items.map((item) => (
        <li
          key={item.id}
          className="py-3 flex items-start justify-between gap-4"
        >
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
  const subtotal = useMemo(
    () => amount.totalAmount - amount.taxAmount - amount.totalOtherCharges,
    [amount.totalAmount, amount.taxAmount, amount.totalOtherCharges]
  );
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

/* -------------------------------------------------------------------------- */
/*  Loading / error fallbacks                                                 */
/* -------------------------------------------------------------------------- */

const SkeletonView = ({ externalOrderId }: { externalOrderId: string }) => (
  <div className="min-h-screen bg-gray-50">
    <div className="max-w-4xl mx-auto p-4 md:p-6">
      <IrctcBrandedHeader className="mb-4" />
      <div className="space-y-6">
        <SkeletonCard>
          <div className="flex flex-col md:flex-row md:items-start md:justify-between gap-4">
            <div className="space-y-2">
              <div className="h-3 w-20 rounded bg-gray-200 animate-pulse" />
              <div className="h-7 w-64 rounded bg-gray-200 animate-pulse" />
              <div className="h-3 w-40 rounded bg-gray-200 animate-pulse" />
            </div>
            <div className="h-6 w-24 rounded-full bg-gray-200 animate-pulse" />
          </div>
          <div className="mt-4 pt-4 border-t border-gray-100">
            <div className="h-3 w-72 rounded bg-gray-200 animate-pulse" />
          </div>
          {externalOrderId && (
            <p className="sr-only">Loading order #{externalOrderId}</p>
          )}
        </SkeletonCard>

        <SkeletonCard>
          <div className="h-4 w-32 rounded bg-gray-200 animate-pulse mb-5" />
          <div className="space-y-4">
            {Array.from({ length: 4 }).map((_, i) => (
              <div key={i} className="flex items-center gap-4">
                <div className="h-8 w-8 rounded-full bg-gray-200 animate-pulse" />
                <div className="h-3 w-32 rounded bg-gray-200 animate-pulse" />
              </div>
            ))}
          </div>
        </SkeletonCard>

        <SkeletonCard>
          <div className="h-4 w-32 rounded bg-gray-200 animate-pulse mb-4" />
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            {Array.from({ length: 8 }).map((_, i) => (
              <div key={i} className="space-y-1.5">
                <div className="h-2.5 w-12 rounded bg-gray-200 animate-pulse" />
                <div className="h-4 w-24 rounded bg-gray-200 animate-pulse" />
              </div>
            ))}
          </div>
        </SkeletonCard>

        <SkeletonCard>
          <div className="h-4 w-20 rounded bg-gray-200 animate-pulse mb-4" />
          <div className="space-y-3">
            {Array.from({ length: 3 }).map((_, i) => (
              <div key={i} className="flex justify-between">
                <div className="h-4 w-48 rounded bg-gray-200 animate-pulse" />
                <div className="h-4 w-16 rounded bg-gray-200 animate-pulse" />
              </div>
            ))}
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

const MissingIdView = () => (
  <div className="min-h-screen bg-gray-50 flex items-center justify-center p-6">
    <div className="bg-white rounded-2xl shadow-sm border border-gray-200 p-8 max-w-md w-full text-center">
      <h2 className="text-lg font-semibold text-gray-900">
        Order link is invalid
      </h2>
      <p className="text-sm text-gray-500 mt-2">
        We couldn't find the order id in this link. Please return home and try
        again.
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
        Couldn't load your order
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

export default IrctcOrderTracking;
