/**
 * Tabbed wrapper around the three IRCTC entry-point forms.
 *
 * No shadcn `Tabs` primitive ships in this repo (see src/components/ui/),
 * so we roll a small state-driven tab strip that matches the rest of the app
 * (blue palette, rounded inputs, white card). The PDF Appendix C screenshot
 * shows three top tabs — PNR / Train / Station — with the active form below.
 */

import { useState } from "react";
import { Ticket, Train, MapPin } from "lucide-react";
import { IRCTC_BRANDING } from "../BrandingProvider";
import { IrctcPnrSearchForm } from "./IrctcPnrSearchForm";
import { IrctcTrainSearchForm } from "./IrctcTrainSearchForm";
import { IrctcStationSearchForm } from "./IrctcStationSearchForm";

type TabKey = "pnr" | "train" | "station";

interface TabDef {
  key: TabKey;
  label: string;
  icon: React.ReactNode;
}

const TABS: TabDef[] = [
  { key: "pnr", label: "PNR", icon: <Ticket className="size-4" /> },
  { key: "train", label: "Train", icon: <Train className="size-4" /> },
  { key: "station", label: "Station", icon: <MapPin className="size-4" /> },
];

interface IrctcSearchTabsProps {
  /** Optional initial tab; defaults to PNR. */
  defaultTab?: TabKey;
  /** Forward redirect URL instead of navigating (mostly useful for tests). */
  onRedirect?: (url: string) => void;
  className?: string;
}

export function IrctcSearchTabs({
  defaultTab = "pnr",
  onRedirect,
  className,
}: IrctcSearchTabsProps) {
  const [active, setActive] = useState<TabKey>(defaultTab);

  return (
    <div
      className={`w-full max-w-md mx-auto bg-white border border-blue-100 rounded-2xl shadow-sm overflow-hidden ${
        className ?? ""
      }`}
    >
      <header
        className="flex items-center gap-3 px-4 py-3"
        style={{
          backgroundColor: IRCTC_BRANDING.headerBackgroundColor,
          color: IRCTC_BRANDING.headerTextColor,
        }}
      >
        <img
          src={IRCTC_BRANDING.logoUrl}
          alt="Aggregator logo"
          className="h-8 w-auto"
        />
        <span className="font-semibold">
          Order on Train (powered by IRCTC eCatering)
        </span>
      </header>

      <div className="p-4 sm:p-6">
      <div className="mb-4">
        <h2 className="text-lg font-semibold text-blue-900">Order Food on Train</h2>
        <p className="text-xs text-blue-700/70 mt-0.5">
          Search by PNR, train number, or station to find IRCTC eCatering outlets.
        </p>
      </div>

      <div
        role="tablist"
        aria-label="IRCTC search method"
        className="flex items-center gap-1 bg-blue-50 p-1 rounded-xl mb-4"
      >
        {TABS.map((t) => {
          const isActive = active === t.key;
          return (
            <button
              key={t.key}
              role="tab"
              type="button"
              aria-selected={isActive}
              aria-controls={`irctc-tab-panel-${t.key}`}
              id={`irctc-tab-${t.key}`}
              onClick={() => setActive(t.key)}
              className={`flex-1 flex items-center justify-center gap-1.5 text-sm font-medium h-9 rounded-lg transition-colors ${
                isActive
                  ? "bg-blue-600 text-white shadow-sm"
                  : "text-blue-700 hover:bg-blue-100"
              }`}
            >
              {t.icon}
              {t.label}
            </button>
          );
        })}
      </div>

      <div
        role="tabpanel"
        id={`irctc-tab-panel-${active}`}
        aria-labelledby={`irctc-tab-${active}`}
      >
        {active === "pnr" && <IrctcPnrSearchForm onRedirect={onRedirect} />}
        {active === "train" && <IrctcTrainSearchForm onRedirect={onRedirect} />}
        {active === "station" && <IrctcStationSearchForm onRedirect={onRedirect} />}
      </div>
      </div>
    </div>
  );
}

export default IrctcSearchTabs;
