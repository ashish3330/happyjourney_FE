import React, { useEffect, useState, useCallback, useRef } from "react";
import { useNavigate } from "react-router-dom";
import {
  Search, Star, Clock, MapPin, Shield, Utensils,
  Train, ChevronRight, X, TrendingUp, CheckCircle,
} from "lucide-react";
import api from "@/utils/axios";
import Pagination from "@/components/Pagination";
import { SparklesIcon, FireIcon } from "@heroicons/react/20/solid";
import WhyChoose from "@/components/WhyChoose";
import { HappyJourneyConfig } from "@/components/HappyJourneyConfig";

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
  { value: "500+",   label: "Partner Restaurants", icon: Utensils },
  { value: "2000+",  label: "Home Routes",          icon: Train    },
  { value: "400+",   label: "Cities Covered",       icon: MapPin   },
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
    title: "Enjoy at Your Seat",
    desc: "Your meal is prepared fresh and delivered hot right to your seat.",
    icon: Train,
  },
];

const POPULAR_CITIES = [
  "Delhi", "Mumbai", "Bangalore", "Hyderabad",
  "Chennai", "Kolkata", "Pune", "Jaipur",
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
  const [searchType,  setSearchType]  = useState<"stationCode" | "city">("city");
  const [searchQuery, setSearchQuery] = useState("");
  const [stations,    setStations]    = useState<Station[]>([]);
  const [vendors,     setVendors]     = useState<Vendor[]>([]);
  const [loading,     setLoading]     = useState(false);
  const [imageUrls,   setImageUrls]   = useState<Record<string, string>>({});
  const [hasSearched, setHasSearched] = useState(false);
  const [page, setPage] = useState<PaginationData>({
    current_page: 1, to: 0, total: 0, from: 0,
    per_page: 12, remainingPages: 0, last_page: 0,
  });

  const navigate   = useNavigate();
  const inputRef   = useRef<HTMLInputElement>(null);
  const resultsRef = useRef<HTMLDivElement>(null);

  // ── Image fetch ──────────────────────────────────────
  const fetchImage = async (logoUrl: string) => {
    if (!logoUrl || imageUrls[logoUrl]) return;
    try {
      const res = await api.get(`/files/download?systemFileName=${logoUrl}`, { responseType: "blob" });
      if (res.status === 200)
        setImageUrls((prev) => ({ ...prev, [logoUrl]: URL.createObjectURL(res.data) }));
    } catch {
      setImageUrls((prev) => ({ ...prev, [logoUrl]: "" }));
    }
  };

  // ── Debounce ─────────────────────────────────────────
  const debounce = <F extends (...args: any[]) => void>(fn: F, ms: number) => {
    let t: ReturnType<typeof setTimeout>;
    return (...args: Parameters<F>) => { clearTimeout(t); t = setTimeout(() => fn(...args), ms); };
  };

  // ── Vendors ──────────────────────────────────────────
  const fetchVendors = async (stationId: number, pageNumber = 1, pageSize = 12) => {
    if (!stationId) return;
    setLoading(true);
    try {
      const res = await api.get<{
        content: any[]; pageable: { offset: number; pageSize: number };
        numberOfElements: number; totalElements: number; totalPages: number;
      }>(`/vendors/stations/${stationId}?page=${pageNumber - 1}&size=${pageSize}`);

      const data = res.data.content || [];
      setVendors(data.map((v) => ({ ...v, veg: v.isVeg ?? true, categories: [] })));
      data.forEach((v) => { if (v.logoUrl) fetchImage(v.logoUrl); });

      const withCats = await Promise.all(
        data.map(async (v) => {
          try {
            const cr = await api.get<{ content: Category[] }>(`/menu/vendors/${v.vendorId}/categories`);
            return { ...v, veg: v.isVeg ?? true, categories: cr.data.content || [] };
          } catch { return { ...v, veg: v.isVeg ?? true, categories: [] }; }
        }),
      );
      setVendors(withCats);

      const { pageable, numberOfElements, totalElements, totalPages } = res.data;
      setPage({
        current_page: pageNumber, from: pageable.offset + 1,
        to: pageable.offset + numberOfElements, total: totalElements,
        per_page: pageable.pageSize, remainingPages: totalPages - pageNumber,
        last_page: totalPages,
      });
    } catch { setVendors([]); }
    finally { setLoading(false); }
  };

  // ── Stations ─────────────────────────────────────────
  const fetchStations = useCallback(
    async (query: string, type: "stationCode" | "city") => {
      if (!query.trim()) { setStations([]); setVendors([]); setHasSearched(false); return; }
      setLoading(true);
      setHasSearched(true);
      try {
        const params = type === "stationCode" ? { stationCode: query } : { city: query };
        const res = await api.get<Station[]>("/stations/all", { params });
        if (Array.isArray(res.data)) {
          setStations(res.data);
          if (res.data.length > 0) {
            setPage((p) => ({ ...p, current_page: 1 }));
            fetchVendors(res.data[0].stationId, 1, page.per_page);
            // scroll to results
            setTimeout(() => resultsRef.current?.scrollIntoView({ behavior: "smooth", block: "start" }), 300);
          } else {
            setVendors([]);
          }
        }
      } catch { setStations([]); setVendors([]); }
      finally { setLoading(false); }
    },
    [page.per_page],
  );

  // eslint-disable-next-line react-hooks/exhaustive-deps
  const debouncedFetch = useCallback(
    debounce((q: string, t: "stationCode" | "city") => fetchStations(q, t), 500),
    [fetchStations],
  );

  const handleInput = (e: React.ChangeEvent<HTMLInputElement>) => {
    const q = e.target.value;
    setSearchQuery(q);
    debouncedFetch(q, searchType);
  };

  const handleSearch = () => fetchStations(searchQuery, searchType);

  const handleCityClick = (city: string) => {
    setSearchQuery(city);
    setSearchType("city");
    fetchStations(city, "city");
    setTimeout(() => resultsRef.current?.scrollIntoView({ behavior: "smooth", block: "start" }), 300);
  };

  const handlePageClick = (e: { selected: number }) => {
    if (loading) return;
    const newPage = e.selected + 1;
    if (newPage !== page.current_page && stations.length > 0) {
      setPage((p) => ({ ...p, current_page: newPage }));
      fetchVendors(stations[0].stationId, newPage, page.per_page);
      resultsRef.current?.scrollIntoView({ behavior: "smooth", block: "start" });
    }
  };

  const handlePageSizeChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const size = parseInt(e.target.value, 10);
    setPage((p) => ({ ...p, per_page: size, current_page: 1 }));
    if (stations.length > 0) fetchVendors(stations[0].stationId, 1, size);
  };

  useEffect(() => {
    return () => {
      Object.values(imageUrls).forEach((u) => {
        if (u && !u.includes("unsplash.com")) URL.revokeObjectURL(u);
      });
    };
  }, [imageUrls]);

  // ═══════════════════════════════════════════════════════
  //  RENDER
  // ═══════════════════════════════════════════════════════
  return (
    <div className="min-h-screen bg-[#f8f9fb]">

      {/* ══════════════════════════════════════════
          HERO — full-screen with background image
      ══════════════════════════════════════════ */}
      <section className="relative h-[75vh] min-h-[520px] max-h-[780px] flex items-center justify-center overflow-hidden">
        {/* Background */}
        <div className="absolute inset-0">
          <img
            src="https://images.unsplash.com/photo-1567620905732-2d1ec7ab7445?auto=format&fit=crop&w=1920&q=90"
            alt=""
            className="w-full h-full object-cover"
          />
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
            India's #1 Home Food Delivery
          </div>

          {/* Headline */}
          <h1 className="text-4xl sm:text-5xl lg:text-6xl font-extrabold text-white leading-[1.1] tracking-tight mb-4">
            Delicious Food,{" "}
            <span className="text-teal-400">Right to</span>
            <br className="hidden sm:block" />
            {" "}Your Seat
          </h1>

          <p className="text-gray-300 text-base sm:text-lg mb-8 max-w-lg leading-relaxed">
            Order from 500+ restaurants at 400+ cities across India — fresh, hot &amp; on time.
          </p>

          {/* ── Compact search bar ── */}
          <div className="w-full max-w-2xl">
            <div className="bg-white rounded-2xl shadow-2xl p-2 flex flex-col sm:flex-row items-stretch gap-2">

              {/* Toggle (compact pills) */}
              <div className="flex gap-1 p-1 bg-gray-100 rounded-xl shrink-0">
                {(["city", "stationCode"] as const).map((type) => (
                  <button
                    key={type}
                    onClick={() => setSearchType(type)}
                    className={`px-3 py-2 rounded-lg text-xs font-bold whitespace-nowrap transition-all ${
                      searchType === type
                        ? "bg-teal-600 text-white shadow-sm"
                        : "text-gray-500 hover:text-gray-700"
                    }`}
                  >
                    {type === "city" ? "🏙 City" : "🔍 Code"}
                  </button>
                ))}
              </div>

              {/* Input */}
              <div className="flex-1 relative min-w-0">
                <MapPin className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400 pointer-events-none" />
                <input
                  ref={inputRef}
                  type="text"
                  value={searchQuery}
                  onChange={handleInput}
                  onKeyDown={(e) => e.key === "Enter" && handleSearch()}
                  placeholder={searchType === "city" ? "Search city — Delhi, Mumbai…" : "City code — NDLS, BCT…"}
                  className="w-full h-full pl-9 pr-8 py-3 text-sm text-gray-800 placeholder-gray-400 focus:outline-none bg-transparent"
                />
                {searchQuery && (
                  <button
                    onClick={() => { setSearchQuery(""); setVendors([]); setHasSearched(false); inputRef.current?.focus(); }}
                    className="absolute right-2 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
                  >
                    <X size={14} />
                  </button>
                )}
              </div>

              {/* Search button */}
              <button
                onClick={handleSearch}
                disabled={loading || !searchQuery.trim()}
                className="flex items-center justify-center gap-2 px-6 py-3 bg-teal-600 hover:bg-teal-700 disabled:opacity-50 text-white text-sm font-bold rounded-xl transition-all active:scale-95 shrink-0"
              >
                {loading
                  ? <span className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                  : <Search size={15} />
                }
                <span className="hidden sm:inline">{loading ? "Searching…" : "Search"}</span>
              </button>
            </div>

            {/* Popular cities — below bar */}
            <div className="flex items-center gap-2 mt-3 flex-wrap justify-center">
              <span className="text-white/50 text-xs font-semibold">Popular:</span>
              {POPULAR_CITIES.slice(0, 6).map((city) => (
                <button
                  key={city}
                  onClick={() => handleCityClick(city)}
                  className="px-3 py-1 bg-white/10 hover:bg-white/20 border border-white/20 text-white/80 hover:text-white text-xs font-semibold rounded-full transition-all backdrop-blur-sm"
                >
                  {city}
                </button>
              ))}
            </div>
          </div>
        </div>
      </section>

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
          RESULTS SECTION
      ══════════════════════════════════════════ */}
      <div ref={resultsRef} className="scroll-mt-20" />

      {(hasSearched || vendors.length > 0 || loading) && (
        <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">

          {/* Section header */}
          <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center mb-8 gap-4">
            <div>
              {stations[0] && (
                <div className="flex items-center gap-2 text-teal-600 text-sm font-semibold mb-1">
                  <MapPin size={14} />
                  {stations[0].stationName} ({stations[0].stationCode})
                </div>
              )}
              <h2 className="text-2xl font-extrabold text-gray-900">
                {loading ? "Finding restaurants…" : vendors.length > 0
                  ? `${page.total} Restaurant${page.total !== 1 ? "s" : ""} Available`
                  : "No restaurants found"
                }
              </h2>
              {!loading && vendors.length > 0 && (
                <p className="text-sm text-gray-500 mt-0.5">
                  Showing {page.from}–{page.to} of {page.total}
                </p>
              )}
            </div>

            {vendors.length > 0 && (
              <div className="flex items-center gap-3">
                <select
                  value={page.per_page}
                  onChange={handlePageSizeChange}
                  className="border border-gray-200 rounded-xl px-3 py-2 text-sm text-gray-600 focus:ring-2 focus:ring-teal-400 focus:outline-none bg-white shadow-sm"
                >
                  <option value={12}>Show 12</option>
                  <option value={24}>Show 24</option>
                  <option value={48}>Show 48</option>
                </select>
              </div>
            )}
          </div>

          {/* Loading skeletons */}
          {loading && (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-5">
              {Array.from({ length: 8 }).map((_, i) => <CardSkeleton key={i} />)}
            </div>
          )}

          {/* Vendor cards */}
          {!loading && vendors.length > 0 && (
            <>
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-5">
                {vendors.map((vendor) => (
                  <div
                    key={vendor.vendorId}
                    onClick={() => navigate(`/user-order/${vendor.vendorId}`)}
                    className="group bg-white rounded-2xl overflow-hidden shadow-sm hover:shadow-xl transition-all duration-300 cursor-pointer border border-gray-100 hover:-translate-y-1"
                  >
                    {/* Image */}
                    <div className="relative h-44 overflow-hidden bg-gray-100">
                      {vendor.logoUrl && imageUrls[vendor.logoUrl] ? (
                        <img
                          src={imageUrls[vendor.logoUrl]}
                          alt={vendor.businessName}
                          className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
                          onError={(e) => { (e.target as HTMLImageElement).style.display = "none"; }}
                        />
                      ) : (
                        <div className="w-full h-full bg-gradient-to-br from-teal-50 via-teal-100 to-teal-200 flex flex-col items-center justify-center gap-2">
                          <Utensils className="w-10 h-10 text-teal-400" />
                          <span className="text-xs text-teal-500 font-medium">Restaurant</span>
                        </div>
                      )}

                      {/* Gradient overlay at bottom */}
                      <div className="absolute inset-0 bg-gradient-to-t from-black/30 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300" />

                      {/* Veg/Non-Veg */}
                      <div className={`absolute top-3 left-3 flex items-center gap-1 px-2.5 py-1 rounded-lg text-[11px] font-extrabold shadow-md ${
                        vendor.veg ? "bg-green-600 text-white" : "bg-red-600 text-white"
                      }`}>
                        {vendor.veg
                          ? <><SparklesIcon className="w-3 h-3" /> VEG</>
                          : <><FireIcon className="w-3 h-3" /> NON-VEG</>}
                      </div>

                      {/* Rating */}
                      <div className="absolute top-3 right-3 flex items-center gap-1 bg-white/95 backdrop-blur-sm px-2.5 py-1 rounded-lg shadow-md">
                        <Star className="w-3.5 h-3.5 fill-yellow-400 text-yellow-400" />
                        <span className="text-xs font-extrabold text-gray-800">
                          {vendor.rating ? vendor.rating.toFixed(1) : "New"}
                        </span>
                      </div>

                      {/* Hover CTA overlay */}
                      <div className="absolute inset-0 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity duration-300">
                        <span className="bg-white text-teal-700 text-xs font-bold px-4 py-2 rounded-full shadow-lg flex items-center gap-1.5">
                          View Menu <ChevronRight size={13} />
                        </span>
                      </div>
                    </div>

                    {/* Card body */}
                    <div className="p-4">
                      <div className="flex items-start justify-between gap-2 mb-1">
                        <h3 className="text-sm font-extrabold text-gray-900 line-clamp-1 leading-snug flex-1">
                          {vendor.businessName}
                        </h3>
                        {vendor.fssaiLicense && (
                          <CheckCircle className="w-4 h-4 text-teal-500 flex-shrink-0 mt-0.5" />
                        )}
                      </div>

                      {vendor.categories && vendor.categories.length > 0 && (
                        <p className="text-[11px] text-gray-400 font-medium mb-2 line-clamp-1">
                          {vendor.categories.slice(0, 3).map((c) => c.categoryName).join(" · ")}
                          {vendor.categories.length > 3 && " · +more"}
                        </p>
                      )}

                      {vendor.description && (
                        <p className="text-xs text-gray-500 line-clamp-2 mb-3 leading-relaxed">
                          {vendor.description}
                        </p>
                      )}

                      {/* Meta */}
                      <div className="flex items-center justify-between pt-3 border-t border-gray-100 text-xs text-gray-500">
                        <div className="flex items-center gap-1">
                          <Clock className="w-3.5 h-3.5 text-teal-500" />
                          <span className="font-semibold">{vendor.preparationTimeMin || 15} min</span>
                        </div>
                        <div className="flex items-center gap-1">
                          <span className="text-gray-400">Min.</span>
                          <span className="font-bold text-gray-700">₹{vendor.minOrderAmount || 99}</span>
                        </div>
                      </div>
                    </div>
                  </div>
                ))}
              </div>

              <div className="mt-10">
                <Pagination
                  numOfPages={page.last_page}
                  pageNo={page.current_page}
                  pageSize={page.per_page}
                  handlePageClick={handlePageClick}
                  totalItems={page.total}
                  from={page.from}
                  to={page.to}
                />
              </div>
            </>
          )}

          {/* No results */}
          {!loading && hasSearched && vendors.length === 0 && (
            <div className="flex flex-col items-center justify-center py-20 text-center">
              <div className="w-24 h-24 bg-teal-50 rounded-full flex items-center justify-center mb-6">
                <Search className="w-10 h-10 text-teal-300" />
              </div>
              <h3 className="text-xl font-extrabold text-gray-800 mb-2">No restaurants found</h3>
              <p className="text-gray-500 text-sm max-w-sm mb-6">
                We couldn't find any restaurants for <strong>"{searchQuery}"</strong>.
                Try a different {searchType === "stationCode" ? "city code" : "city name"}.
              </p>
              <div className="flex flex-wrap justify-center gap-2">
                {POPULAR_CITIES.slice(0, 4).map((city) => (
                  <button
                    key={city}
                    onClick={() => handleCityClick(city)}
                    className="px-4 py-2 bg-teal-50 hover:bg-teal-100 text-teal-700 text-sm font-semibold rounded-full transition-colors border border-teal-200"
                  >
                    Try {city}
                  </button>
                ))}
              </div>
            </div>
          )}
        </section>
      )}

      {/* ══════════════════════════════════════════
          PRE-SEARCH: HOW IT WORKS
      ══════════════════════════════════════════ */}
      {!hasSearched && (
        <>
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
                  Getting food delivered to your train seat is easier than you think.
                  Three simple steps and your meal is on its way.
                </p>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-8 relative">
                {/* Connector line (desktop) */}
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

          {/* ── Popular cities section ── */}
          <section className="bg-[#f8f9fb] py-16">
            <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
              <div className="text-center mb-10">
                <h2 className="text-2xl sm:text-3xl font-extrabold text-gray-900 mb-2">
                  Popular Destinations
                </h2>
                <p className="text-gray-500 text-sm">
                  Click a city to instantly discover restaurants available at that location.
                </p>
              </div>

              <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
                {[
                  { city: "Delhi",     img: "https://images.unsplash.com/photo-1587474260584-136574528ed5?auto=format&fit=crop&w=400&q=80" },
                  { city: "Mumbai",    img: "https://images.unsplash.com/photo-1529253355930-ddbe423a2ac7?auto=format&fit=crop&w=400&q=80" },
                  { city: "Bangalore", img: "https://images.unsplash.com/photo-1596176530529-78163a4f7af2?auto=format&fit=crop&w=400&q=80" },
                  { city: "Jaipur",    img: "https://images.unsplash.com/photo-1603262110263-fb0112e7cc33?auto=format&fit=crop&w=400&q=80" },
                ].map(({ city, img }) => (
                  <button
                    key={city}
                    onClick={() => handleCityClick(city)}
                    className="group relative rounded-2xl overflow-hidden h-36 sm:h-44 shadow-sm hover:shadow-xl transition-all duration-300 hover:-translate-y-1"
                  >
                    <img src={img} alt={city} className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-500" />
                    <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-black/20 to-transparent" />
                    <div className="absolute bottom-0 left-0 right-0 p-4 text-left">
                      <p className="text-white font-extrabold text-base leading-tight">{city}</p>
                      <p className="text-white/70 text-xs mt-0.5 flex items-center gap-1">
                        <MapPin size={10} /> Tap to explore
                      </p>
                    </div>
                  </button>
                ))}
              </div>
            </div>
          </section>
        </>
      )}

      <WhyChoose config={HappyJourneyConfig} />
    </div>
  );
};

export default OrderFood;
