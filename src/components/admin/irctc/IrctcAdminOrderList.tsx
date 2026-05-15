/**
 * Admin IRCTC reverse-order list.
 *
 * Intended mount path: `/admin/irctc/orders`.
 *
 * Renders a paginated table backed by
 * `GET /api/admin/irctc/reverse-orders`. Filters live above the table:
 * multi-select status, exact-match external order id, date range. Polls every
 * 15s when the filter form is idle; the polling pauses while the user is
 * actively editing filters (500ms debounce on input) so a fetch can't clobber
 * an in-progress edit.
 *
 * Visual chrome reuses the teal palette + `IrctcBrandedHeader` /
 * `IrctcPoweredBy` so it sits next to the customer page consistently.
 *
 * NOTE on location: this file should live at
 * `src/pages/admin/IrctcAdminOrderList.tsx`. The harness only allows writes
 * under `src/components/`, so it is delivered here; it is fully relocatable
 * (every import is `@/`-aliased).
 */

import {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import { Link } from "react-router-dom";
import { RefreshCw, Filter, X, ChevronDown, ChevronUp } from "lucide-react";
import { toast } from "sonner";

import {
  IrctcBrandedHeader,
  IrctcPoweredBy,
} from "@/integrations/irctc/BrandingProvider";
import type { IrctcOrderStatus } from "@/integrations/irctc/types";

import {
  fetchAdminOrders,
  parseIrctcError,
  type FetchAdminOrdersParams,
  type IrctcAdminOrderSummary,
  type IrctcAdminPage,
} from "./adminIrctcApi";
import {
  ADMIN_STATUS_VISUALS,
  ALL_STATUSES,
  formatCurrency,
  formatRelative,
} from "./statusVisuals";

const POLL_MS = 15_000;
const FILTER_DEBOUNCE_MS = 500;
const PAGE_SIZE_OPTIONS: readonly number[] = [10, 25, 50];

interface FilterState {
  status: IrctcOrderStatus[];
  externalOrderId: string;
  from: string;
  to: string;
}

const emptyFilters: FilterState = {
  status: [],
  externalOrderId: "",
  from: "",
  to: "",
};

type DataState =
  | { kind: "loading" }
  | { kind: "error"; message: string }
  | {
      kind: "ready";
      page: IrctcAdminPage<IrctcAdminOrderSummary>;
      refreshing: boolean;
    };

const IrctcAdminOrderList = () => {
  // The "applied" filter set is what we actually send to the BE. The "draft"
  // set is what's currently in the filter UI. Apply moves draft → applied.
  const [applied, setApplied] = useState<FilterState>(emptyFilters);
  const [draft, setDraft] = useState<FilterState>(emptyFilters);
  const [page, setPage] = useState(0);
  const [size, setSize] = useState<number>(25);
  const [state, setState] = useState<DataState>({ kind: "loading" });
  // True from the moment the user touches a filter until 500ms after they
  // stop. While true the auto-poll is paused.
  const [interacting, setInteracting] = useState(false);
  const interactionTimer = useRef<number | null>(null);
  const abortRef = useRef<AbortController | null>(null);

  const load = useCallback(
    async (
      params: FetchAdminOrdersParams,
      mode: "initial" | "refresh"
    ) => {
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
        const pageRes = await fetchAdminOrders(params, controller.signal);
        setState({ kind: "ready", page: pageRes, refreshing: false });
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

  const applyParams: FetchAdminOrdersParams = useMemo(
    () => ({
      status: applied.status.length > 0 ? applied.status : undefined,
      externalOrderId: applied.externalOrderId.trim() || undefined,
      from: applied.from || undefined,
      to: applied.to || undefined,
      page,
      size,
    }),
    [applied, page, size]
  );

  // Fetch on applied-filter / page / size change.
  useEffect(() => {
    void load(applyParams, "initial");
    return () => abortRef.current?.abort();
  }, [applyParams, load]);

  // Auto-poll while idle.
  useEffect(() => {
    if (interacting) return;
    const id = window.setInterval(() => {
      void load(applyParams, "refresh");
    }, POLL_MS);
    return () => window.clearInterval(id);
  }, [interacting, applyParams, load]);

  // Note that the user is fiddling with filters. Resets a 500ms timer; while
  // the timer is alive the poll loop is paused.
  const markInteracting = useCallback(() => {
    setInteracting(true);
    if (interactionTimer.current) {
      window.clearTimeout(interactionTimer.current);
    }
    interactionTimer.current = window.setTimeout(() => {
      setInteracting(false);
    }, FILTER_DEBOUNCE_MS);
  }, []);

  useEffect(
    () => () => {
      if (interactionTimer.current) {
        window.clearTimeout(interactionTimer.current);
      }
    },
    []
  );

  const updateDraft = useCallback(
    <K extends keyof FilterState>(key: K, value: FilterState[K]) => {
      markInteracting();
      setDraft((prev) => ({ ...prev, [key]: value }));
    },
    [markInteracting]
  );

  const handleApply = () => {
    setPage(0);
    setApplied(draft);
  };

  const handleReset = () => {
    setDraft(emptyFilters);
    setApplied(emptyFilters);
    setPage(0);
  };

  return (
    <div className="min-h-full bg-gray-50">
      <div className="max-w-7xl mx-auto p-4 md:p-6">
        <IrctcBrandedHeader
          className="mb-4"
          label="IRCTC Ops — Orders"
        />
        <div className="flex items-center justify-between mb-4">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">
              Reverse orders
            </h1>
            <p className="text-sm text-gray-500 mt-1">
              {state.kind === "ready"
                ? `${state.page.totalElements.toLocaleString(
                    "en-IN"
                  )} matching orders`
                : "Loading orders…"}
            </p>
          </div>
          <button
            type="button"
            onClick={() => void load(applyParams, "refresh")}
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

        <FilterPanel
          draft={draft}
          updateDraft={updateDraft}
          onApply={handleApply}
          onReset={handleReset}
        />

        <div className="mt-4">
          {state.kind === "loading" && <TableSkeleton />}
          {state.kind === "error" && (
            <ErrorPanel
              message={state.message}
              onRetry={() => void load(applyParams, "initial")}
            />
          )}
          {state.kind === "ready" && (
            <OrdersTable
              rows={state.page.content}
              page={state.page}
              currentPage={page}
              size={size}
              onPageChange={(n) => setPage(n)}
              onSizeChange={(s) => {
                setSize(s);
                setPage(0);
              }}
            />
          )}
        </div>

        <IrctcPoweredBy />
      </div>
    </div>
  );
};

/* -------------------------------------------------------------------------- */
/*  Filter panel                                                              */
/* -------------------------------------------------------------------------- */

const FilterPanel = ({
  draft,
  updateDraft,
  onApply,
  onReset,
}: {
  draft: FilterState;
  updateDraft: <K extends keyof FilterState>(
    key: K,
    value: FilterState[K]
  ) => void;
  onApply: () => void;
  onReset: () => void;
}) => {
  const [statusOpen, setStatusOpen] = useState(false);
  const statusRef = useRef<HTMLDivElement>(null);

  // Close the status popover when clicking outside.
  useEffect(() => {
    const onClick = (e: MouseEvent) => {
      if (
        statusRef.current &&
        !statusRef.current.contains(e.target as Node)
      ) {
        setStatusOpen(false);
      }
    };
    document.addEventListener("mousedown", onClick);
    return () => document.removeEventListener("mousedown", onClick);
  }, []);

  const toggleStatus = (s: IrctcOrderStatus) => {
    if (draft.status.includes(s)) {
      updateDraft(
        "status",
        draft.status.filter((x) => x !== s)
      );
    } else {
      updateDraft("status", [...draft.status, s]);
    }
  };

  return (
    <div className="bg-white rounded-2xl shadow-sm border border-gray-200 p-4">
      <div className="flex items-center gap-2 mb-3 text-sm font-semibold text-gray-700">
        <Filter size={16} className="text-teal-600" />
        Filters
      </div>
      <div className="grid grid-cols-1 md:grid-cols-5 gap-3 items-end">
        {/* Status multi-select */}
        <div ref={statusRef} className="relative">
          <label className="block text-xs font-medium text-gray-600 mb-1">
            Status
          </label>
          <button
            type="button"
            onClick={() => setStatusOpen((v) => !v)}
            className="w-full inline-flex items-center justify-between px-3 py-2 rounded-lg border border-gray-300 bg-white text-sm hover:border-teal-400 transition-colors"
          >
            <span className="truncate text-gray-700">
              {draft.status.length === 0
                ? "Any status"
                : draft.status.length === 1
                  ? ADMIN_STATUS_VISUALS[draft.status[0]].label
                  : `${draft.status.length} selected`}
            </span>
            {statusOpen ? (
              <ChevronUp size={14} className="text-gray-400" />
            ) : (
              <ChevronDown size={14} className="text-gray-400" />
            )}
          </button>
          {statusOpen && (
            <div className="absolute z-20 mt-1 w-full max-h-72 overflow-auto bg-white border border-gray-200 rounded-lg shadow-lg py-1">
              {ALL_STATUSES.map((s) => {
                const active = draft.status.includes(s);
                const visual = ADMIN_STATUS_VISUALS[s];
                return (
                  <label
                    key={s}
                    className="flex items-center gap-2 px-3 py-2 hover:bg-gray-50 cursor-pointer text-sm"
                  >
                    <input
                      type="checkbox"
                      checked={active}
                      onChange={() => toggleStatus(s)}
                      className="accent-teal-600"
                    />
                    <span
                      className={`inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-semibold border ${visual.badgeClassName}`}
                    >
                      {visual.label}
                    </span>
                  </label>
                );
              })}
            </div>
          )}
        </div>

        {/* External order id */}
        <div>
          <label
            htmlFor="filter-externalOrderId"
            className="block text-xs font-medium text-gray-600 mb-1"
          >
            External order id
          </label>
          <input
            id="filter-externalOrderId"
            type="text"
            inputMode="text"
            value={draft.externalOrderId}
            onChange={(e) =>
              updateDraft("externalOrderId", e.target.value)
            }
            placeholder="Exact match"
            className="w-full px-3 py-2 rounded-lg border border-gray-300 bg-white text-sm focus:outline-none focus:border-teal-500"
          />
        </div>

        {/* From date */}
        <div>
          <label
            htmlFor="filter-from"
            className="block text-xs font-medium text-gray-600 mb-1"
          >
            From
          </label>
          <input
            id="filter-from"
            type="date"
            value={draft.from}
            onChange={(e) => updateDraft("from", e.target.value)}
            className="w-full px-3 py-2 rounded-lg border border-gray-300 bg-white text-sm focus:outline-none focus:border-teal-500"
          />
        </div>

        {/* To date */}
        <div>
          <label
            htmlFor="filter-to"
            className="block text-xs font-medium text-gray-600 mb-1"
          >
            To
          </label>
          <input
            id="filter-to"
            type="date"
            value={draft.to}
            onChange={(e) => updateDraft("to", e.target.value)}
            className="w-full px-3 py-2 rounded-lg border border-gray-300 bg-white text-sm focus:outline-none focus:border-teal-500"
          />
        </div>

        {/* Actions */}
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={onApply}
            className="flex-1 px-4 py-2 rounded-lg bg-teal-600 hover:bg-teal-700 text-white text-sm font-semibold transition-colors"
          >
            Apply
          </button>
          <button
            type="button"
            onClick={onReset}
            className="px-3 py-2 rounded-lg border border-gray-300 text-gray-700 hover:bg-gray-50 text-sm transition-colors"
            aria-label="Reset filters"
          >
            <X size={14} />
          </button>
        </div>
      </div>
    </div>
  );
};

/* -------------------------------------------------------------------------- */
/*  Table                                                                     */
/* -------------------------------------------------------------------------- */

const OrdersTable = ({
  rows,
  page,
  currentPage,
  size,
  onPageChange,
  onSizeChange,
}: {
  rows: IrctcAdminOrderSummary[];
  page: IrctcAdminPage<IrctcAdminOrderSummary>;
  currentPage: number;
  size: number;
  onPageChange: (n: number) => void;
  onSizeChange: (s: number) => void;
}) => {
  // Re-render once a second so "updated 30s ago" stays fresh.
  const [, setTick] = useState(0);
  useEffect(() => {
    const id = window.setInterval(() => setTick((n) => n + 1), 1000);
    return () => window.clearInterval(id);
  }, []);

  if (rows.length === 0) {
    return (
      <div className="bg-white rounded-2xl shadow-sm border border-gray-200 p-12 text-center">
        <p className="text-base font-semibold text-gray-900">
          No orders match these filters yet.
        </p>
        <p className="text-sm text-gray-500 mt-2">
          Try widening the date range or clearing the status filter.
        </p>
      </div>
    );
  }

  return (
    <div className="bg-white rounded-2xl shadow-sm border border-gray-200 overflow-hidden">
      <div className="overflow-x-auto">
        <table className="min-w-full text-sm">
          <thead className="sticky top-0 bg-gray-50 z-10">
            <tr className="text-left text-xs uppercase tracking-wide text-gray-500">
              <th className="px-4 py-3 font-semibold">External order id</th>
              <th className="px-4 py-3 font-semibold">Status</th>
              <th className="px-4 py-3 font-semibold">Payment</th>
              <th className="px-4 py-3 font-semibold">Customer</th>
              <th className="px-4 py-3 font-semibold text-right">Amount</th>
              <th className="px-4 py-3 font-semibold">Updated</th>
              <th className="px-4 py-3 font-semibold text-right">Action</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100">
            {rows.map((row) => {
              const visual =
                ADMIN_STATUS_VISUALS[row.status] ?? {
                  label: row.status,
                  badgeClassName:
                    "bg-gray-100 text-gray-700 border-gray-300",
                };
              return (
                <tr key={row.internalOrderId} className="hover:bg-gray-50">
                  <td className="px-4 py-3 font-mono text-xs">
                    <Link
                      to={`/admin/irctc/orders/${row.internalOrderId}`}
                      className="text-teal-700 hover:underline"
                    >
                      {row.externalOrderId}
                    </Link>
                  </td>
                  <td className="px-4 py-3">
                    <span
                      className={`inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-semibold border ${visual.badgeClassName}`}
                    >
                      {visual.label}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-gray-600">
                    {row.paymentType.replace(/_/g, " ")}
                  </td>
                  <td className="px-4 py-3 text-gray-700">
                    <div className="font-medium">{row.customerName}</div>
                    <div className="text-xs text-gray-500">
                      {row.customerMobile}
                    </div>
                  </td>
                  <td className="px-4 py-3 text-right font-semibold text-gray-900 tabular-nums">
                    {formatCurrency(row.amountPayable)}
                  </td>
                  <td className="px-4 py-3 text-gray-600 text-xs">
                    {formatRelative(row.updatedAt)}
                  </td>
                  <td className="px-4 py-3 text-right">
                    <Link
                      to={`/admin/irctc/orders/${row.internalOrderId}`}
                      className="inline-flex items-center px-3 py-1.5 rounded-lg text-xs font-medium text-teal-700 bg-teal-50 hover:bg-teal-100 border border-teal-200 transition-colors"
                    >
                      View
                    </Link>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
      <PaginationFooter
        page={page}
        currentPage={currentPage}
        size={size}
        onPageChange={onPageChange}
        onSizeChange={onSizeChange}
      />
    </div>
  );
};

const PaginationFooter = ({
  page,
  currentPage,
  size,
  onPageChange,
  onSizeChange,
}: {
  page: IrctcAdminPage<IrctcAdminOrderSummary>;
  currentPage: number;
  size: number;
  onPageChange: (n: number) => void;
  onSizeChange: (s: number) => void;
}) => {
  const from = currentPage * size + 1;
  const to = Math.min((currentPage + 1) * size, page.totalElements);
  return (
    <div className="flex flex-col sm:flex-row items-center justify-between gap-2 px-4 py-3 border-t border-gray-100 bg-gray-50 text-xs text-gray-600">
      <div>
        Showing <span className="font-semibold text-gray-900">{from}</span> –{" "}
        <span className="font-semibold text-gray-900">{to}</span> of{" "}
        <span className="font-semibold text-gray-900">
          {page.totalElements.toLocaleString("en-IN")}
        </span>
      </div>
      <div className="flex items-center gap-3">
        <label className="flex items-center gap-2">
          Per page
          <select
            value={size}
            onChange={(e) => onSizeChange(Number(e.target.value))}
            className="px-2 py-1 rounded border border-gray-300 bg-white text-xs"
          >
            {PAGE_SIZE_OPTIONS.map((opt) => (
              <option key={opt} value={opt}>
                {opt}
              </option>
            ))}
          </select>
        </label>
        <button
          type="button"
          disabled={currentPage <= 0}
          onClick={() => onPageChange(Math.max(0, currentPage - 1))}
          className="px-3 py-1.5 rounded border border-gray-300 bg-white hover:bg-gray-100 disabled:opacity-40 disabled:cursor-not-allowed"
        >
          Prev
        </button>
        <span className="tabular-nums">
          Page {currentPage + 1} / {Math.max(1, page.totalPages)}
        </span>
        <button
          type="button"
          disabled={currentPage + 1 >= page.totalPages}
          onClick={() => onPageChange(currentPage + 1)}
          className="px-3 py-1.5 rounded border border-gray-300 bg-white hover:bg-gray-100 disabled:opacity-40 disabled:cursor-not-allowed"
        >
          Next
        </button>
      </div>
    </div>
  );
};

const TableSkeleton = () => (
  <div className="bg-white rounded-2xl shadow-sm border border-gray-200 p-4">
    <div className="space-y-2">
      {Array.from({ length: 8 }).map((_, i) => (
        <div key={i} className="h-10 rounded bg-gray-100 animate-pulse" />
      ))}
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
      Couldn't load orders
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

export default IrctcAdminOrderList;
