import React, { useEffect, useState, useCallback, useRef } from "react";
import { useNavigate } from "react-router-dom";
import {
  Search, Star, Clock, MapPin, Shield, Utensils,
  Train, ChevronRight, X, TrendingUp, CheckCircle,
} from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import PageSizeSelect from "@/components/PageSizeSelect";
import api from "@/utils/axios";
import Pagination from "@/components/Pagination";
import { SparklesIcon, FireIcon } from "@heroicons/react/20/solid";
import WhyChoose from "@/components/WhyChoose";
import { HappyJourneyConfig } from "@/components/HappyJourneyConfig";
import {
  buildPnrRedirectUrl,
  buildTrainRedirectUrl,
  buildStationRedirectUrl,
} from "@/integrations/irctc/redirectBuilder";
import { useRedirectUser } from "@/integrations/irctc/useRedirectUser";

// ── Types ────────────────────────────────────────────────
interface Station  { stationId: number; stationCode: string; stationName: string; }
interface Category { categoryId: number; vendorId: number; categoryName: string; displayOrder: number; }
interface Vendor {
  vendorId: number; businessName: string; description: string;
  fssaiLicense: string; activeStatus: boolean; logoUrl?: string;
  veg: boolean; preparationTimeMin: number; rating: number;
  address: string; categories?: Category[]; minOrderAmount?: number;
}
interface PaginationData {
  current_page: number; to: number; total: number; from: number;
  per_page: number; remainingPages: number; last_page: number;
}

// ── Static data ──────────────────────────────────────────
const STATS = [
  { value: "25+",   label: "Partner Restaurants", icon: Utensils },
  { value: "30+",  label: "Routes",                icon: Train    },
  { value: "25+",   label: "Cities Covered",       icon: MapPin   },
  { value: "100%",   label: "FSSAI Certified",      icon: Shield   },
];

const HOW_IT_WORKS = [
  {
    step: "01",
    title: "Find Your City",
    desc: "Enter your city name or city code to discover restaurants delivering at your stop.",
    icon: MapPin,
  },
  {
    step: "02",
    title: "Browse & Order",
    desc: "Explore menus, pick your favourite dishes, and add them to your cart in seconds.",
    icon: Utensils,
  },
  {
    step: "03",
    title: "Enjoy at Your Home",
    desc: "Your meal is prepared fresh and delivered hot right to your home.",
    icon: Train,
  },
];

const POPULAR_CITIES = [
  "Delhi", "Mumbai", "Bangalore", "Hyderabad",
  "Chennai", "Kolkata", "Pune", "Jaipur",
];

const HERO_IMAGES = [
  "https://images.unsplash.com/photo-1567620905732-2d1ec7ab7445?auto=format&fit=crop&w=1920&q=90",
  "https://images.unsplash.com/photo-1504674900247-0877df9cc836?auto=format&fit=crop&w=1920&q=90",
  "https://images.unsplash.com/photo-1565299624946-b28f40a0ae38?auto=format&fit=crop&w=1920&q=90",
];

// ── Skeleton card ────────────────────────────────────────
const CardSkeleton = () => (
  <div className="bg-white rounded-2xl overflow-hidden border border-gray-100 animate-pulse">
    <div className="h-48 bg-gray-200" />
    <div className="p-4 space-y-3">
      <div className="h-4 bg-gray-200 rounded w-3/4" />
      <div className="h-3 bg-gray-100 rounded w-1/2" />
      <div className="h-3 bg-gray-100 rounded w-full" />
      <div className="flex justify-between pt-2">
        <div className="h-3 bg-gray-100 rounded w-16" />
        <div className="h-3 bg-gray-100 rounded w-16" />
      </div>
    </div>
  </div>
);

// ── Main component ───────────────────────────────────────
const OrderFood = () => {
  const [heroSlide, setHeroSlide] = useState(0);
  // Post-approval the page is IRCTC-only — every search hands the user off
  // to IRCTC eCatering via one of the three §4.1 entry points (PNR / Train
  // / Station). The old City/Code local-outlet search was the pre-approval
  // workaround and has been retired.
  const [searchType,  setSearchType]  = useState<
    "pnr" | "train" | "station"
  >("pnr");
  const [searchQuery, setSearchQuery] = useState("");
  // Train mode needs two extra fields beyond the main input.
  const [boardingStation, setBoardingStation] = useState("");
  const [boardingDate, setBoardingDate] = useState(
    () => new Date().toISOString().slice(0, 10)
  );
  const [searchError, setSearchError] = useState<string | null>(null);
  const redirectUser = useRedirectUser();

  const inputRef = useRef<HTMLInputElement>(null);

  // ── Hero carousel ────────────────────────────────────
  useEffect(() => {
    const id = setInterval(() => setHeroSlide((s) => (s + 1) % HERO_IMAGES.length), 4000);
    return () => clearInterval(id);
  }, []);

  const handleInput = (e: React.ChangeEvent<HTMLInputElement>) => {
    setSearchQuery(e.target.value);
    setSearchError(null);
  };

  /**
   * Single Search button — every mode is an IRCTC redirect.
   * - pnr     → buildPnrRedirectUrl    (PDF §4.1 PNR)
   * - train   → buildTrainRedirectUrl  (PDF §4.1 Train + boarding station + date)
   * - station → buildStationRedirectUrl (PDF §4.1 Station)
   */
  const handleSearch = () => {
    setSearchError(null);
    try {
      if (searchType === "pnr") {
        if (!/^\d{10}$/.test(searchQuery.trim())) {
          setSearchError("Enter a 10-digit PNR.");
          return;
        }
        window.location.href = buildPnrRedirectUrl(searchQuery.trim(), redirectUser);
        return;
      }
      if (searchType === "train") {
        if (!/^\d{5}$/.test(searchQuery.trim())) {
          setSearchError("Train number must be 5 digits.");
          return;
        }
        const stn = boardingStation.trim().toUpperCase();
        if (!/^[A-Z]{2,5}$/.test(stn)) {
          setSearchError("Boarding station code must be 2-5 letters.");
          return;
        }
        if (!/^\d{4}-\d{2}-\d{2}$/.test(boardingDate)) {
          setSearchError("Pick a boarding date.");
          return;
        }
        window.location.href = buildTrainRedirectUrl(
          searchQuery.trim(), stn, boardingDate, redirectUser
        );
        return;
      }
      if (searchType === "station") {
        const stn = searchQuery.trim().toUpperCase();
        if (!/^[A-Z]{2,5}$/.test(stn)) {
          setSearchError("Station code must be 2-5 letters.");
          return;
        }
        window.location.href = buildStationRedirectUrl(stn, redirectUser);
        return;
      }
    } catch (err) {
      setSearchError(err instanceof Error ? err.message : "Failed to build IRCTC redirect.");
    }
  };

  // ═══════════════════════════════════════════════════════
  //  RENDER
  // ═══════════════════════════════════════════════════════
  return (
    <div className="min-h-screen bg-[#f8f9fb]">

      {/* ══════════════════════════════════════════
          HERO — full-screen with background image
      ══════════════════════════════════════════ */}
      <section className="relative h-[75vh] min-h-[520px] max-h-[780px] flex items-center justify-center overflow-hidden">
        {/* Background carousel */}
        <div className="absolute inset-0">
          <AnimatePresence mode="sync">
            <motion.img
              key={heroSlide}
              src={HERO_IMAGES[heroSlide]}
              alt=""
              className="absolute inset-0 w-full h-full object-cover"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 1.2, ease: "easeInOut" }}
            />
          </AnimatePresence>
          <div className="absolute inset-0 bg-black/60" />
          <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-transparent to-transparent" />
        </div>

        {/* Dot pattern */}
        <div className="absolute inset-0 opacity-[0.04]"
          style={{ backgroundImage: "radial-gradient(circle, white 1px, transparent 1px)", backgroundSize: "28px 28px" }}
        />

        {/* ── Centred content ── */}
        <div className="relative w-full px-4 flex flex-col items-center text-center">

          {/* Eyebrow pill */}
          <div className="inline-flex items-center gap-2 bg-teal-500/20 border border-teal-400/40 text-teal-300 text-xs font-bold px-4 py-2 rounded-full mb-5 backdrop-blur-sm">
            <Train size={12} />
            Authorised IRCTC eCatering Partner
          </div>

          {/* Headline */}
          <h1 className="text-4xl sm:text-5xl lg:text-6xl font-extrabold text-white leading-[1.1] tracking-tight mb-4">
            Order Food on{" "}
            <span className="text-teal-400">Your Train</span>
            <br className="hidden sm:block" />
            {" "}Right to Your Seat
          </h1>

          <p className="text-gray-300 text-base sm:text-lg mb-8 max-w-lg leading-relaxed">
            Search by PNR, train number, or station — fresh, hygienic meals delivered to your berth via IRCTC eCatering.
          </p>

          {/* ── Compact search bar ── */}
          <div className="w-full max-w-2xl">
            <div className="bg-white rounded-2xl shadow-2xl p-2 flex flex-col sm:flex-row items-stretch gap-2">

              {/* IRCTC entry tabs — PDF §4.1: PNR / Train / Station. */}
              <div className="flex gap-1 p-1 bg-gray-100 rounded-xl shrink-0 overflow-x-auto">
                {(["pnr", "train", "station"] as const).map((type) => (
                  <button
                    key={type}
                    onClick={() => { setSearchType(type); setSearchError(null); setSearchQuery(""); }}
                    className={`px-3 py-2 rounded-lg text-xs font-bold whitespace-nowrap transition-all ${
                      searchType === type
                        ? "bg-teal-600 text-white shadow-sm"
                        : "text-gray-500 hover:text-gray-700"
                    }`}
                  >
                    {type === "pnr" && "🎫 PNR"}
                    {type === "train" && "🚆 Train"}
                    {type === "station" && "📍 Station"}
                  </button>
                ))}
              </div>

              {/* Input */}
              <div className="flex-1 relative min-w-0">
                <MapPin className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400 pointer-events-none" />
                <input
                  ref={inputRef}
                  type="text"
                  inputMode={searchType === "pnr" || searchType === "train" ? "numeric" : "text"}
                  maxLength={searchType === "pnr" ? 10 : searchType === "train" ? 5 : 5}
                  value={searchQuery}
                  onChange={handleInput}
                  onKeyDown={(e) => e.key === "Enter" && handleSearch()}
                  placeholder={
                    searchType === "pnr" ? "10-digit PNR (e.g. 2721880872)" :
                    searchType === "train" ? "5-digit train number (e.g. 12951)" :
                    "Station code — NDLS, BCT, MAS…"
                  }
                  className={`w-full h-full pl-9 pr-8 py-3 text-sm text-gray-800 placeholder-gray-400 focus:outline-none bg-transparent ${
                    searchType === "station" ? "uppercase" : ""
                  }`}
                />
                {searchQuery && (
                  <button
                    onClick={() => { setSearchQuery(""); setSearchError(null); inputRef.current?.focus(); }}
                    className="absolute right-2 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
                  >
                    <X size={14} />
                  </button>
                )}
              </div>

              {/* Search button — every mode redirects to IRCTC eCatering. */}
              <button
                onClick={handleSearch}
                disabled={!searchQuery.trim()}
                className="flex items-center justify-center gap-2 px-6 py-3 bg-teal-600 hover:bg-teal-700 disabled:opacity-50 text-white text-sm font-bold rounded-xl transition-all active:scale-95 shrink-0"
              >
                <Search size={15} />
                <span className="hidden sm:inline">Order on Train</span>
              </button>
            </div>

            {/* Train mode — extra fields appear inline so the toggle stays
                a single search-bar experience instead of opening a separate
                widget. */}
            {searchType === "train" && (
              <div className="mt-2 flex flex-col sm:flex-row gap-2 bg-white rounded-2xl shadow-lg p-2">
                <input
                  type="text"
                  value={boardingStation}
                  onChange={(e) => setBoardingStation(e.target.value.toUpperCase().slice(0, 5))}
                  placeholder="Boarding station — NDLS, BRC…"
                  className="flex-1 px-3 py-3 text-sm text-gray-800 placeholder-gray-400 focus:outline-none uppercase"
                />
                <input
                  type="date"
                  value={boardingDate}
                  onChange={(e) => setBoardingDate(e.target.value)}
                  min={new Date().toISOString().slice(0, 10)}
                  className="px-3 py-3 text-sm text-gray-800 focus:outline-none"
                />
              </div>
            )}

            {/* Inline error message — same surface, no toast required. */}
            {searchError && (
              <p className="mt-2 text-xs font-semibold text-rose-300 bg-rose-900/40 border border-rose-500/40 rounded-lg px-3 py-2">
                {searchError}
              </p>
            )}

            {/* Trust mark under the bar — IRCTC partnership is the brand
                handshake the customer wants to see before typing a PNR. */}
            <p className="text-center mt-3 text-xs text-white/60 font-medium">
              Powered by{" "}
              <span className="text-white font-semibold">IRCTC eCatering</span>
              {" · FSSAI-approved outlets · cash on delivery accepted"}
            </p>
          </div>

          {/* Carousel dots */}
          <div className="flex gap-2 mt-6">
            {HERO_IMAGES.map((_, i) => (
              <button
                key={i}
                onClick={() => setHeroSlide(i)}
                className={`transition-all duration-300 rounded-full ${
                  i === heroSlide ? "w-6 h-2 bg-teal-400" : "w-2 h-2 bg-white/40 hover:bg-white/60"
                }`}
                aria-label={`Slide ${i + 1}`}
              />
            ))}
          </div>
        </div>
      </section>

      {/* The standalone IRCTC widget has been merged into the hero search
          bar above (PNR + Train pills). Removed the duplicate surface. */}

      {/* ══════════════════════════════════════════
          STATS BAR
      ══════════════════════════════════════════ */}
      <section className="bg-white border-y border-gray-100 shadow-sm">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid grid-cols-2 lg:grid-cols-4">
            {STATS.map(({ value, label, icon: Icon }, i) => (
              <div
                key={label}
                className={`flex items-center gap-4 py-5 px-6 ${i < 3 ? "border-b lg:border-b-0 lg:border-r border-gray-100" : ""} ${i === 1 ? "border-r border-gray-100 lg:border-r" : ""}`}
              >
                <div className="w-11 h-11 bg-teal-50 rounded-2xl flex items-center justify-center flex-shrink-0">
                  <Icon className="w-5 h-5 text-teal-600" />
                </div>
                <div>
                  <p className="text-xl font-extrabold text-gray-900 leading-none">{value}</p>
                  <p className="text-xs text-gray-500 mt-0.5 font-medium">{label}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>


      {/* ══════════════════════════════════════════
          HOW IT WORKS — train-food focused now that the page is IRCTC-only.
          (The pre-search gate `!hasSearched` was dropped — the section always
          renders because the search redirects away, it doesn't reveal local
          results inline anymore.)
      ══════════════════════════════════════════ */}
      <section className="bg-white py-20">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-14">
            <div className="inline-flex items-center gap-2 text-teal-600 text-sm font-bold bg-teal-50 px-4 py-2 rounded-full mb-4">
              <TrendingUp size={14} />
              Simple & Fast
            </div>
            <h2 className="text-3xl sm:text-4xl font-extrabold text-gray-900 mb-4">
              How It Works
            </h2>
            <p className="text-gray-500 max-w-xl mx-auto text-base">
              Three steps to fresh food at your berth — search, pay, eat.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-8 relative">
            <div className="hidden md:block absolute top-14 left-[20%] right-[20%] h-px bg-gradient-to-r from-teal-200 via-teal-400 to-teal-200" />
            {HOW_IT_WORKS.map(({ step, title, desc, icon: Icon }, i) => (
              <div key={step} className="relative flex flex-col items-center text-center px-4">
                <div className="relative mb-6">
                  <div className="w-16 h-16 bg-teal-600 rounded-2xl flex items-center justify-center shadow-lg shadow-teal-200">
                    <Icon className="w-7 h-7 text-white" />
                  </div>
                  <span className="absolute -top-2 -right-2 w-6 h-6 bg-yellow-400 text-gray-900 text-[11px] font-extrabold rounded-full flex items-center justify-center shadow">
                    {i + 1}
                  </span>
                </div>
                <h3 className="text-lg font-extrabold text-gray-900 mb-2">{title}</h3>
                <p className="text-sm text-gray-500 leading-relaxed max-w-xs">{desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      <WhyChoose config={HappyJourneyConfig} />
    </div>
  );
};

export default OrderFood;
