/**
 * Admin IRCTC ops dashboard.
 *
 * Intended mount path: `/admin/irctc/dashboard`.
 *
 * Polls `GET /api/admin/irctc/stats` every 15s plus an on-demand Refresh
 * button. Renders today's KPI cards, a circuit-breaker alert strip, three
 * "stuck" tiles, a status histogram, and the last sweeper-run timestamp.
 *
 * Visual chrome reuses the teal palette and `IrctcBrandedHeader` /
 * `IrctcPoweredBy` from the integrations package so the surface looks
 * consistent with the customer view.
 *
 * NOTE on location: this file ideally lives at
 * `src/pages/admin/IrctcAdminDashboard.tsx`. The agent harness only allows
 * writes under `src/components/`, so the component is delivered here. It is
 * fully relocatable — every import uses the `@/` alias.
 */

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { RefreshCw, AlertTriangle } from "lucide-react";
import { toast } from "sonner";

import {
  IrctcBrandedHeader,
  IrctcPoweredBy,
} from "@/integrations/irctc/BrandingProvider";

import {
  fetchAdminStats,
  parseIrctcError,
  type IrctcAdminStats,
} from "./adminIrctcApi";
import {
  ADMIN_STATUS_VISUALS,
  STATUS_BAR_COLOR,
  formatRelative,
} from "./statusVisuals";
import type { IrctcOrderStatus } from "@/integrations/irctc/types";

const POLL_MS = 15_000;

type LoadState =
  | { kind: "loading" }
  | { kind: "error"; message: string }
  | { kind: "ready"; stats: IrctcAdminStats; refreshing: boolean };

const IrctcAdminDashboard = () => {
  const [state, setState] = useState<LoadState>({ kind: "loading" });
  // Ticker so the relative-time labels update once a second.
  const [, setTick] = useState(0);
  const abortRef = useRef<AbortController | null>(null);

  const load = useCallback(async (mode: "initial" | "refresh") => {
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
      const stats = await fetchAdminStats(controller.signal);
      setState({ kind: "ready", stats, refreshing: false });
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
  }, []);

  // Initial fetch + cleanup.
  useEffect(() => {
    void load("initial");
    return () => abortRef.current?.abort();
  }, [load]);

  // 15s auto-poll.
  useEffect(() => {
    const id = window.setInterval(() => {
      void load("refresh");
    }, POLL_MS);
    return () => window.clearInterval(id);
  }, [load]);

  // 1s ticker for relative-time labels.
  useEffect(() => {
    const id = window.setInterval(() => setTick((n) => n + 1), 1000);
    return () => window.clearInterval(id);
  }, []);

  return (
    <div className="min-h-full bg-gray-50">
      <div className="max-w-6xl mx-auto p-4 md:p-6">
        <IrctcBrandedHeader
          className="mb-4"
          label="IRCTC Ops Console"
        />
        <div className="flex items-center justify-between mb-6">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">
              IRCTC Operations
            </h1>
            <p className="text-sm text-gray-500 mt-1">
              Live overview of reverse-order ingestion, pushes, and refunds.
            </p>
          </div>
          <button
            type="button"
            onClick={() => void load("refresh")}
            disabled={state.kind === "ready" && state.refreshing}
            className="inline-flex items-center gap-2 px-3 py-2 rounded-lg text-sm font-medium text-teal-700 bg-teal-50 hover:bg-teal-100 border border-teal-200 disabled:opacity-50 transition-colors"
          >
            <RefreshCw
              size={14}
              className={
                state.kind === "ready" && state.refreshing
                  ? "animate-spin"
                  : ""
              }
            />
            {state.kind === "ready" && state.refreshing
              ? "Refreshing"
              : "Refresh"}
          </button>
        </div>

        {state.kind === "loading" && <DashboardSkeleton />}
        {state.kind === "error" && (
          <ErrorPanel
            message={state.message}
            onRetry={() => void load("initial")}
          />
        )}
        {state.kind === "ready" && <DashboardBody stats={state.stats} />}

        <IrctcPoweredBy />
      </div>
    </div>
  );
};

const DashboardBody = ({ stats }: { stats: IrctcAdminStats }) => {
  return (
    <div className="space-y-6">
      {stats.circuitOpen && (
        <div className="rounded-xl border border-red-300 bg-red-50 p-4 flex items-start gap-3">
          <AlertTriangle size={18} className="text-red-700 mt-0.5" />
          <div className="text-sm text-red-800">
            <p className="font-semibold">
              IRCTC status-push circuit breaker is OPEN
            </p>
            <p className="mt-0.5">
              Outbound pushes are paused. Inbound ingestion continues — the
              sweeper will retry pushes automatically once the breaker
              half-opens.
            </p>
          </div>
        </div>
      )}

      <KpiRow stats={stats} />
      <StuckTiles stats={stats} />
      <StatusBarChart stats={stats} />
      <SweeperFooter stats={stats} />
    </div>
  );
};

const KpiRow = ({ stats }: { stats: IrctcAdminStats }) => (
  <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
    <KpiCard
      label="Ingested today"
      value={stats.todayCounts.ingested}
      tone="neutral"
    />
    <KpiCard
      label="Confirmed today"
      value={stats.todayCounts.confirmed}
      tone="success"
    />
    <KpiCard
      label="Cancelled today"
      value={stats.todayCounts.cancelled}
      tone="danger"
    />
  </div>
);

const KpiCard = ({
  label,
  value,
  tone,
}: {
  label: string;
  value: number;
  tone: "neutral" | "success" | "danger";
}) => {
  const accent =
    tone === "success"
      ? "text-green-700"
      : tone === "danger"
        ? "text-red-700"
        : "text-teal-700";
  return (
    <div className="bg-white rounded-2xl shadow-sm border border-gray-200 p-5">
      <p className="text-xs uppercase tracking-wide text-gray-500 font-semibold">
        {label}
      </p>
      <p className={`mt-2 text-3xl font-bold tabular-nums ${accent}`}>
        {value.toLocaleString("en-IN")}
      </p>
    </div>
  );
};

const StuckTiles = ({ stats }: { stats: IrctcAdminStats }) => (
  <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
    <StuckTile label="Stuck pending" value={stats.stuckPending} />
    <StuckTile label="Push failed" value={stats.stuckPushFailed} />
    <StuckTile label="Refund failed" value={stats.stuckRefundFailed} />
  </div>
);

const StuckTile = ({ label, value }: { label: string; value: number }) => {
  const isHot = value > 0;
  return (
    <div
      className={`rounded-2xl border p-5 transition-colors ${
        isHot
          ? "bg-red-50 border-red-300"
          : "bg-white border-gray-200"
      }`}
    >
      <p
        className={`text-xs uppercase tracking-wide font-semibold ${
          isHot ? "text-red-700" : "text-gray-500"
        }`}
      >
        {label}
      </p>
      <p
        className={`mt-2 text-3xl font-bold tabular-nums ${
          isHot ? "text-red-700" : "text-gray-400"
        }`}
      >
        {value.toLocaleString("en-IN")}
      </p>
      {isHot && (
        <p className="mt-1 text-xs text-red-600">Needs ops attention.</p>
      )}
    </div>
  );
};

const StatusBarChart = ({ stats }: { stats: IrctcAdminStats }) => {
  const entries = useMemo(() => {
    const all = Object.entries(stats.countsByStatus);
    // Sort highest count first; keep zeros at the bottom for visual stability.
    return all.sort(([, a], [, b]) => b - a);
  }, [stats.countsByStatus]);
  const max = useMemo(
    () => entries.reduce((m, [, v]) => Math.max(m, v), 0),
    [entries]
  );

  if (entries.length === 0) {
    return (
      <div className="bg-white rounded-2xl shadow-sm border border-gray-200 p-6">
        <h2 className="text-base font-semibold text-gray-900 mb-2">
          Orders by status
        </h2>
        <p className="text-sm text-gray-500">No data in window.</p>
      </div>
    );
  }

  return (
    <div className="bg-white rounded-2xl shadow-sm border border-gray-200 p-6">
      <h2 className="text-base font-semibold text-gray-900 mb-4">
        Orders by status
      </h2>
      <ul className="space-y-3">
        {entries.map(([status, count]) => {
          const visual =
            ADMIN_STATUS_VISUALS[status as IrctcOrderStatus] ?? {
              label: status,
              badgeClassName: "bg-gray-100 text-gray-700 border-gray-300",
            };
          const colour = STATUS_BAR_COLOR[status] ?? "#6b7280";
          const pct = max > 0 ? Math.max(2, (count / max) * 100) : 0;
          return (
            <li key={status} className="flex items-center gap-3">
              <div className="w-36 text-xs font-medium text-gray-700 truncate">
                {visual.label}
              </div>
              <div className="flex-1 relative h-6 bg-gray-100 rounded-md overflow-hidden">
                <div
                  className="absolute top-0 left-0 h-full rounded-md transition-all"
                  style={{
                    width: `${pct}%`,
                    backgroundColor: colour,
                  }}
                  aria-hidden
                />
              </div>
              <div className="w-16 text-right text-sm font-semibold text-gray-900 tabular-nums">
                {count.toLocaleString("en-IN")}
              </div>
            </li>
          );
        })}
      </ul>
    </div>
  );
};

const SweeperFooter = ({ stats }: { stats: IrctcAdminStats }) => {
  const label = stats.lastSweeperRunMs
    ? formatRelative(stats.lastSweeperRunMs)
    : "never";
  return (
    <div className="flex items-center justify-between text-xs text-gray-500 px-1">
      <span>
        Last sweeper run:{" "}
        <span className="font-medium text-gray-700">{label}</span>
      </span>
      <span>Auto-refresh every 15s.</span>
    </div>
  );
};

const DashboardSkeleton = () => (
  <div className="space-y-6">
    <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
      {Array.from({ length: 3 }).map((_, i) => (
        <div
          key={i}
          className="bg-white rounded-2xl shadow-sm border border-gray-200 p-5"
        >
          <div className="h-3 w-24 rounded bg-gray-200 animate-pulse" />
          <div className="h-8 w-20 mt-3 rounded bg-gray-200 animate-pulse" />
        </div>
      ))}
    </div>
    <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
      {Array.from({ length: 3 }).map((_, i) => (
        <div
          key={i}
          className="bg-white rounded-2xl shadow-sm border border-gray-200 p-5"
        >
          <div className="h-3 w-24 rounded bg-gray-200 animate-pulse" />
          <div className="h-8 w-16 mt-3 rounded bg-gray-200 animate-pulse" />
        </div>
      ))}
    </div>
    <div className="bg-white rounded-2xl shadow-sm border border-gray-200 p-6">
      <div className="h-4 w-32 rounded bg-gray-200 animate-pulse mb-5" />
      <div className="space-y-3">
        {Array.from({ length: 6 }).map((_, i) => (
          <div key={i} className="flex items-center gap-3">
            <div className="h-3 w-28 rounded bg-gray-200 animate-pulse" />
            <div className="flex-1 h-5 rounded bg-gray-200 animate-pulse" />
          </div>
        ))}
      </div>
    </div>
  </div>
);

const ErrorPanel = ({
  message,
  onRetry,
}: {
  message: string;
  onRetry: () => void;
}) => (
  <div className="bg-white rounded-2xl shadow-sm border border-gray-200 p-8 text-center">
    <h2 className="text-lg font-semibold text-gray-900">
      Couldn't load IRCTC ops stats
    </h2>
    <p className="text-sm text-gray-500 mt-2">{message}</p>
    <button
      type="button"
      onClick={onRetry}
      className="mt-6 inline-flex bg-teal-600 hover:bg-teal-700 text-white font-medium rounded-lg px-6 py-3 transition-colors"
    >
      Retry
    </button>
  </div>
);

export default IrctcAdminDashboard;
