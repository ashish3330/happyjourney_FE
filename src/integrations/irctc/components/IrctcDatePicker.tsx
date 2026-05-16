/**
 * IrctcDatePicker — a self-contained calendar popover with no external
 * dependencies (no react-datepicker, no shadcn Popover).
 *
 * Why custom: the native `<input type="date">` rendering is OS-dependent
 * and on Chromium it shows a flat dropdown that visually splits the
 * unified search bar. This component renders the trigger as a regular
 * pill that matches the rest of the IRCTC search row, and pops a teal-
 * themed month grid below.
 *
 * Props:
 *   value     — ISO date string `YYYY-MM-DD`. Required (controlled).
 *   onChange  — fired with the new ISO date string.
 *   minDate?  — earliest selectable date (ISO). Defaults to today.
 *   className?
 *
 * Keyboard:
 *   Enter / Space  open the popover (when focused on the trigger)
 *   Escape         close
 *   Arrows         nav within the grid when popover open
 *   Enter          confirm focused cell
 *
 * Click outside the popover closes it.
 */

import {
  useCallback,
  useEffect,
  useLayoutEffect,
  useMemo,
  useRef,
  useState,
  type KeyboardEvent as ReactKeyboardEvent,
} from "react";
import { createPortal } from "react-dom";
import { Calendar, ChevronLeft, ChevronRight } from "lucide-react";

const MONTHS = [
  "January", "February", "March", "April", "May", "June",
  "July", "August", "September", "October", "November", "December",
];
const WEEKDAYS = ["S", "M", "T", "W", "T", "F", "S"];

/** Convert a `YYYY-MM-DD` string to a `Date` at local midnight. */
const parseIso = (iso: string): Date => {
  const [y, m, d] = iso.split("-").map((n) => parseInt(n, 10));
  return new Date(y, (m || 1) - 1, d || 1);
};

/** Format a `Date` as ISO `YYYY-MM-DD` in local time (NOT toISOString — that's UTC). */
const formatIso = (d: Date): string => {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
};

/** Human-readable trigger label: "Mon, 16 May". */
const formatTriggerLabel = (iso: string): string => {
  if (!iso) return "Pick date";
  const d = parseIso(iso);
  const wd = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"][d.getDay()];
  const day = d.getDate();
  const mo = MONTHS[d.getMonth()].slice(0, 3);
  return `${wd}, ${day} ${mo}`;
};

const sameDay = (a: Date, b: Date): boolean =>
  a.getFullYear() === b.getFullYear() &&
  a.getMonth() === b.getMonth() &&
  a.getDate() === b.getDate();

interface IrctcDatePickerProps {
  value: string;
  onChange: (next: string) => void;
  minDate?: string;
  className?: string;
}

/** Width of the popover card (matches `w-72` Tailwind = 18rem = 288px). */
const POPOVER_WIDTH = 288;
/** Vertical gap between trigger bottom and popover top. */
const POPOVER_GAP = 8;

export const IrctcDatePicker = ({
  value,
  onChange,
  minDate,
  className = "",
}: IrctcDatePickerProps) => {
  const [open, setOpen] = useState(false);
  const triggerRef = useRef<HTMLButtonElement>(null);
  const popoverRef = useRef<HTMLDivElement>(null);
  /** Fixed-position coords for the portal-rendered popover. */
  const [coords, setCoords] = useState<{ top: number; left: number } | null>(null);

  // Month currently shown in the grid. Defaults to the month of `value`,
  // or today's month if value is empty.
  const valueDate = value ? parseIso(value) : new Date();
  const [viewMonth, setViewMonth] = useState<Date>(
    new Date(valueDate.getFullYear(), valueDate.getMonth(), 1)
  );

  const today = useMemo(() => {
    const t = new Date();
    return new Date(t.getFullYear(), t.getMonth(), t.getDate());
  }, []);

  const min = minDate ? parseIso(minDate) : today;

  // Re-sync the view to the current value when it changes externally.
  useEffect(() => {
    if (value) {
      const v = parseIso(value);
      setViewMonth(new Date(v.getFullYear(), v.getMonth(), 1));
    }
  }, [value]);

  /**
   * Position the portal-rendered popover relative to the trigger.
   * Uses fixed coords so we escape any `overflow-hidden` on ancestors
   * (e.g. the hero section's clipped background carousel).
   * Clamps inside the viewport so the popover never hangs off-screen.
   */
  const reposition = useCallback(() => {
    const t = triggerRef.current;
    if (!t) return;
    const rect = t.getBoundingClientRect();
    const vw = window.innerWidth;
    // Prefer left-aligned to the trigger; fall back to right-aligned if
    // that would overflow the viewport.
    let left = rect.left;
    if (left + POPOVER_WIDTH + 8 > vw) {
      left = Math.max(8, rect.right - POPOVER_WIDTH);
    }
    setCoords({ top: rect.bottom + POPOVER_GAP, left });
  }, []);

  // Open → measure trigger and place the popover.
  useLayoutEffect(() => {
    if (open) reposition();
  }, [open, reposition]);

  // Track scroll / resize so the popover follows the trigger if the
  // page moves under it.
  useEffect(() => {
    if (!open) return;
    const onMove = () => reposition();
    window.addEventListener("scroll", onMove, true);
    window.addEventListener("resize", onMove);
    return () => {
      window.removeEventListener("scroll", onMove, true);
      window.removeEventListener("resize", onMove);
    };
  }, [open, reposition]);

  // Close on click outside + Esc. "Outside" = neither the trigger nor the
  // popover (both can live in different parts of the DOM thanks to the
  // portal, so check both refs).
  useEffect(() => {
    if (!open) return;
    const onDoc = (e: MouseEvent) => {
      const target = e.target as Node;
      if (
        !triggerRef.current?.contains(target) &&
        !popoverRef.current?.contains(target)
      ) {
        setOpen(false);
      }
    };
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") setOpen(false);
    };
    document.addEventListener("mousedown", onDoc);
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("mousedown", onDoc);
      document.removeEventListener("keydown", onKey);
    };
  }, [open]);

  // Build the 6×7 grid for the current viewMonth. Each cell is a Date.
  // The first cell is the Sunday on or before the 1st of the month.
  const grid = useMemo(() => {
    const firstOfMonth = new Date(viewMonth.getFullYear(), viewMonth.getMonth(), 1);
    const start = new Date(firstOfMonth);
    start.setDate(start.getDate() - start.getDay()); // back to Sunday
    return Array.from({ length: 42 }, (_, i) => {
      const d = new Date(start);
      d.setDate(start.getDate() + i);
      return d;
    });
  }, [viewMonth]);

  const goPrevMonth = () =>
    setViewMonth(new Date(viewMonth.getFullYear(), viewMonth.getMonth() - 1, 1));
  const goNextMonth = () =>
    setViewMonth(new Date(viewMonth.getFullYear(), viewMonth.getMonth() + 1, 1));

  const pick = (d: Date) => {
    if (d < min) return;
    onChange(formatIso(d));
    setOpen(false);
  };

  const onTriggerKey = (e: ReactKeyboardEvent<HTMLButtonElement>) => {
    if (e.key === "Enter" || e.key === " ") {
      e.preventDefault();
      setOpen((v) => !v);
    }
  };

  const popover = open && coords && (
    <div
      ref={popoverRef}
      role="dialog"
      aria-label="Choose date"
      style={{
        position: "fixed",
        top: coords.top,
        left: coords.left,
        width: POPOVER_WIDTH,
      }}
      className="z-[1000] bg-white border border-gray-200 rounded-2xl shadow-2xl p-3 select-none"
    >
          {/* Month nav */}
          <div className="flex items-center justify-between mb-2">
            <button
              type="button"
              onClick={goPrevMonth}
              className="p-1.5 rounded-full hover:bg-gray-100 text-gray-600"
              aria-label="Previous month"
            >
              <ChevronLeft className="w-4 h-4" />
            </button>
            <div className="text-sm font-bold text-gray-900">
              {MONTHS[viewMonth.getMonth()]} {viewMonth.getFullYear()}
            </div>
            <button
              type="button"
              onClick={goNextMonth}
              className="p-1.5 rounded-full hover:bg-gray-100 text-gray-600"
              aria-label="Next month"
            >
              <ChevronRight className="w-4 h-4" />
            </button>
          </div>

          {/* Weekday header */}
          <div className="grid grid-cols-7 mb-1">
            {WEEKDAYS.map((w, i) => (
              <div
                key={i}
                className="text-[10px] font-bold text-gray-400 text-center py-1 uppercase tracking-wide"
              >
                {w}
              </div>
            ))}
          </div>

          {/* Day grid */}
          <div className="grid grid-cols-7 gap-0.5">
            {grid.map((d, i) => {
              const inMonth = d.getMonth() === viewMonth.getMonth();
              const isToday = sameDay(d, today);
              const isSelected = value && sameDay(d, parseIso(value));
              const isPast = d < min;
              return (
                <button
                  key={i}
                  type="button"
                  onClick={() => pick(d)}
                  disabled={isPast}
                  className={[
                    "h-8 w-8 mx-auto rounded-full text-xs font-medium transition-colors",
                    isPast
                      ? "text-gray-300 cursor-not-allowed"
                      : !inMonth
                      ? "text-gray-300 hover:bg-gray-50"
                      : "text-gray-700 hover:bg-teal-50",
                    isSelected
                      ? "bg-teal-600 !text-white shadow-sm hover:bg-teal-700"
                      : "",
                    isToday && !isSelected
                      ? "ring-1 ring-teal-400 ring-inset"
                      : "",
                  ].join(" ")}
                  aria-label={formatIso(d)}
                  aria-current={isToday ? "date" : undefined}
                  aria-pressed={Boolean(isSelected)}
                >
                  {d.getDate()}
                </button>
              );
            })}
          </div>

          {/* Quick-pick row */}
          <div className="mt-3 pt-3 border-t border-gray-100 flex items-center justify-between gap-2 text-xs">
            <button
              type="button"
              onClick={() => pick(today)}
              className="text-teal-700 hover:text-teal-800 font-semibold"
            >
              Today
            </button>
            <button
              type="button"
              onClick={() => {
                const t = new Date(today);
                t.setDate(t.getDate() + 1);
                pick(t);
              }}
              className="text-teal-700 hover:text-teal-800 font-semibold"
            >
              Tomorrow
            </button>
            <button
              type="button"
              onClick={() => setOpen(false)}
              className="ml-auto text-gray-500 hover:text-gray-700 font-medium"
            >
              Close
            </button>
          </div>
    </div>
  );

  return (
    <div className={`relative ${className}`}>
      <button
        ref={triggerRef}
        type="button"
        onClick={() => setOpen((v) => !v)}
        onKeyDown={onTriggerKey}
        aria-haspopup="dialog"
        aria-expanded={open}
        className="w-full h-full flex items-center gap-2 px-3 py-3 text-sm text-gray-800 hover:bg-gray-50 rounded-lg focus:outline-none focus:ring-2 focus:ring-teal-500 focus:ring-inset"
      >
        <Calendar className="w-4 h-4 text-gray-400 flex-shrink-0" />
        <span className="font-medium truncate">{formatTriggerLabel(value)}</span>
      </button>

      {/* Render the popover via a portal so it escapes any
          `overflow-hidden` / `transform` / stacking-context ancestor —
          notably the hero section that clips its background carousel. */}
      {typeof window !== "undefined" && popover
        ? createPortal(popover, document.body)
        : null}
    </div>
  );
};

export default IrctcDatePicker;
