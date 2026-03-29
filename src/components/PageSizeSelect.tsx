import { useState, useRef, useEffect } from "react";
import { ChevronDown, Check } from "lucide-react";

interface Props {
  value: number;
  options: number[];
  onChange: (size: number) => void;
  label?: string; // e.g. "per page" or "records"
}

const PageSizeSelect = ({ value, options, onChange, label = "per page" }: Props) => {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, []);

  return (
    <div ref={ref} className="relative">
      {/* Trigger button */}
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        className="flex items-center gap-2 px-3.5 py-2 bg-white border border-gray-200 rounded-xl text-sm font-semibold text-gray-700 hover:border-teal-400 hover:text-teal-700 transition-all shadow-sm"
      >
        <span className="tabular-nums">{value}</span>
        <span className="text-gray-400 font-normal">{label}</span>
        <ChevronDown
          size={14}
          className={`text-gray-400 transition-transform duration-200 ${open ? "rotate-180" : ""}`}
        />
      </button>

      {/* Dropdown panel */}
      {open && (
        <div className="absolute right-0 top-full mt-1.5 bg-white border border-gray-100 rounded-xl shadow-xl py-1.5 z-50 min-w-[130px]">
          {options.map((opt) => (
            <button
              key={opt}
              type="button"
              onClick={() => { onChange(opt); setOpen(false); }}
              className={`w-full flex items-center justify-between px-4 py-2.5 text-sm transition-colors ${
                opt === value
                  ? "text-teal-700 font-bold bg-teal-50"
                  : "text-gray-700 font-medium hover:bg-gray-50"
              }`}
            >
              <span className="tabular-nums">{opt}</span>
              {opt === value && <Check size={13} className="text-teal-600" />}
            </button>
          ))}
        </div>
      )}
    </div>
  );
};

export default PageSizeSelect;
