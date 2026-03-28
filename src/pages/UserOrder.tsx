import React, { useState, useEffect, useRef, useCallback } from "react";
import { useParams, useNavigate } from "react-router-dom";
import {
  Star, Clock, Leaf, Utensils, Trash2, Plus, Minus,
  ShoppingCart, Search, X, ChevronRight, MapPin,
} from "lucide-react";
import { debounce } from "lodash";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Skeleton } from "@/components/ui/skeleton";
import api from "@/utils/axios";
import { useAuth } from "@/contexts/AuthContext";

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL;

// ── Interfaces ────────────────────────────────────────────
interface Vendor {
  vendorId: number;
  businessName: string;
  description: string;
  logoUrl: string;
  preparationTimeMin: number;
  rating: number;
  veg: boolean;
  stationId?: number;
}

interface Category {
  categoryId: number;
  categoryName: string;
  vendorId: number;
  displayOrder: number;
}

interface MenuItem {
  itemId: number;
  itemName: string;
  basePrice: number;
  description: string;
  categoryId: number;
  categoryName?: string;
  vendorId: number;
  vegetarian: boolean;
  available: boolean;
}

interface CartItem {
  itemId: number;
  quantity: number;
  unitPrice: number;
  itemName?: string;
  specialInstructions?: string;
}

interface CartSummary {
  cartId: string;
  customerId: number | null;
  items: CartItem[];
  subtotal: number;
  taxAmount: number;
  deliveryCharges: number;
  finalAmount: number;
}

// ── Reusable quantity stepper ──────────────────────────────
const QtyButton: React.FC<{
  onClick: () => void;
  disabled?: boolean;
  children: React.ReactNode;
}> = ({ onClick, disabled, children }) => (
  <button
    onClick={onClick}
    disabled={disabled}
    className="w-8 h-8 flex items-center justify-center rounded-full text-teal-600 hover:bg-teal-50 disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
  >
    {children}
  </button>
);

// ── Loading skeleton ───────────────────────────────────────
const PageSkeleton = () => (
  <div className="animate-pulse">
    <div className="h-56 sm:h-72 bg-gray-200 w-full" />
    <div className="max-w-4xl mx-auto px-4 py-6 space-y-6">
      <div className="flex gap-3">
        {[1, 2, 3, 4].map((i) => (
          <Skeleton key={i} className="h-9 w-24 rounded-full" />
        ))}
      </div>
      <Skeleton className="h-12 w-full rounded-xl" />
      {[1, 2].map((i) => (
        <div key={i} className="space-y-3">
          <Skeleton className="h-5 w-36 rounded" />
          {[1, 2, 3].map((j) => (
            <Skeleton key={j} className="h-28 w-full rounded-xl" />
          ))}
        </div>
      ))}
    </div>
  </div>
);

// ── Main component ─────────────────────────────────────────
const UserOrder: React.FC = () => {
  const { id: urlId } = useParams<{ id: string }>();
  const { accessToken } = useAuth();
  const navigate = useNavigate();

  const [vendor,         setVendor]         = useState<Vendor | null>(null);
  const [categories,     setCategories]     = useState<Category[]>([]);
  const [menuItems,      setMenuItems]      = useState<MenuItem[]>([]);
  const [filteredItems,  setFilteredItems]  = useState<MenuItem[]>([]);
  const [cartSummary,    setCartSummary]    = useState<CartSummary | null>(null);
  const [isLoading,      setIsLoading]      = useState(true);
  const [error,          setError]          = useState<string | null>(null);
  const [isClearCartOpen,setIsClearCartOpen]= useState(false);
  const [isAddingItem,   setIsAddingItem]   = useState<number | null>(null);
  const [quantities,     setQuantities]     = useState<Record<number, number>>({});
  const [isCartOpen,     setIsCartOpen]     = useState(false);   // mobile/desktop cart drawer
  const [activeCategory, setActiveCategory] = useState<number | null>(null);
  const [searchQuery,    setSearchQuery]    = useState("");

  const categoryRefs = useRef<Record<number, HTMLDivElement | null>>({});
  const cartSheetRef = useRef<HTMLDivElement>(null);

  const effectiveVendorId = Number(urlId);

  if (isNaN(effectiveVendorId)) {
    return (
      <div className="max-w-4xl mx-auto p-6">
        <p className="text-red-600 font-medium">Invalid vendor ID. Please go back and try again.</p>
      </div>
    );
  }

  const getLogoUrl = (fileName: string) =>
    `${API_BASE_URL}/files/download?systemFileName=${encodeURIComponent(fileName)}`;

  // ── Data fetching ──────────────────────────────────────
  const fetchCartSummary = useCallback(async (items: MenuItem[] = menuItems) => {
    try {
      const res = await api.get(`/cart/summary`, { params: { vendorId: effectiveVendorId } });
      const summary: CartSummary = res.data;
      const enriched = summary.items.map((ci) => ({
        ...ci,
        itemName: items.find((m) => m.itemId === ci.itemId)?.itemName ?? "Unknown",
      }));
      setCartSummary({ ...summary, items: enriched });
      const count = enriched.reduce((s, i) => s + i.quantity, 0);
      localStorage.setItem("cartCount", String(count));
      window.dispatchEvent(new CustomEvent("cart-updated", { detail: { count } }));
    } catch {
      setCartSummary(null);
      localStorage.setItem("cartCount", "0");
      window.dispatchEvent(new CustomEvent("cart-updated", { detail: { count: 0 } }));
    }
  }, [effectiveVendorId]);

  const fetchData = useCallback(async () => {
    setIsLoading(true);
    setError(null);
    try {
      const [vendorRes, catRes, itemsRes] = await Promise.all([
        api.get(`/vendors/${effectiveVendorId}`),
        api.get(`/menu/vendors/${effectiveVendorId}/categories`),
        api.get(`/menu/vendors/${effectiveVendorId}/items`),
      ]);

      const fetchedCats: Category[] = catRes.data.content || [];
      setVendor(vendorRes.data);
      setCategories(fetchedCats);

      const itemsWithCat: MenuItem[] = itemsRes.data.map((item: MenuItem) => ({
        ...item,
        categoryName: fetchedCats.find((c) => c.categoryId === item.categoryId)?.categoryName ?? "Other",
      }));
      setMenuItems(itemsWithCat);
      setFilteredItems(itemsWithCat);
      await fetchCartSummary(itemsWithCat);
    } catch (e: any) {
      setError(e.response?.data?.message ?? "Failed to load restaurant. Please try again.");
    } finally {
      setIsLoading(false);
    }
  }, [effectiveVendorId, fetchCartSummary]);

  useEffect(() => { fetchData(); }, [fetchData]);

  // ── Search debounce ────────────────────────────────────
  const debouncedSearch = useCallback(
    debounce((q: string, items: MenuItem[]) => {
      if (!q.trim()) { setFilteredItems(items); return; }
      const lq = q.toLowerCase();
      setFilteredItems(items.filter(
        (i) => i.itemName?.toLowerCase().includes(lq) || i.description?.toLowerCase().includes(lq),
      ));
    }, 300),
    [],
  );

  useEffect(() => {
    debouncedSearch(searchQuery, menuItems);
    return () => debouncedSearch.cancel();
  }, [searchQuery, menuItems, debouncedSearch]);

  // ── Cart actions ───────────────────────────────────────
  const addItemToCart = async (itemId: number, qty: number) => {
    if (qty < 1) return;
    if (!accessToken) {
      navigate(`/login?returnTo=/user-order/${effectiveVendorId}`);
      return;
    }
    setIsAddingItem(itemId);
    try {
      await api.post(`/cart/add-item`, {
        itemId,
        vendorId: effectiveVendorId,
        quantity: qty,
        specialInstructions: "",
        deliveryStationId: vendor?.stationId ?? null,
      });
      await fetchCartSummary();
      setQuantities((prev) => ({ ...prev, [itemId]: 0 }));
    } catch (e: any) {
      setError(e.response?.data?.message ?? "Failed to add item.");
    } finally {
      setIsAddingItem(null);
    }
  };

  const updateCartItem = async (itemId: number, newQty: number) => {
    const cur = cartSummary?.items.find((i) => i.itemId === itemId);
    if (!cur || newQty === cur.quantity) return;
    setIsAddingItem(itemId);
    try {
      await api.post(`/cart/add-item`, {
        itemId,
        vendorId: effectiveVendorId,
        quantity: newQty - cur.quantity,
        specialInstructions: "",
        deliveryStationId: vendor?.stationId ?? null,
      });
      await fetchCartSummary();
    } catch (e: any) {
      setError(e.response?.data?.message ?? "Failed to update item.");
    } finally {
      setIsAddingItem(null);
    }
  };

  const removeItemFromCart = async (itemId: number) => {
    try {
      await api.delete(`/cart/items/${itemId}`, { params: { vendorId: effectiveVendorId } });
      await fetchCartSummary();
    } catch (e: any) {
      setError(e.response?.data?.message ?? "Failed to remove item.");
    }
  };

  const clearCart = async () => {
    try {
      await api.delete(`/cart`, { params: { vendorId: effectiveVendorId } });
      setCartSummary(null);
      setIsClearCartOpen(false);
      setIsCartOpen(false);
      localStorage.setItem("cartCount", "0");
      window.dispatchEvent(new CustomEvent("cart-updated", { detail: { count: 0 } }));
    } catch (e: any) {
      setError(e.response?.data?.message ?? "Failed to clear cart.");
    }
  };

  const handleCheckout = () => {
    if (!accessToken) navigate(`/login?returnTo=/checkout/${effectiveVendorId}`);
    else navigate(`/checkout/${effectiveVendorId}`);
  };

  // ── Category scroll ────────────────────────────────────
  const scrollToCategory = (catId: number) => {
    setActiveCategory(catId);
    categoryRefs.current[catId]?.scrollIntoView({ behavior: "smooth", block: "start" });
  };

  // ── Close cart on outside click ────────────────────────
  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (cartSheetRef.current && !cartSheetRef.current.contains(e.target as Node))
        setIsCartOpen(false);
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, []);

  // ── Open cart drawer from navbar cart icon ──────────────
  useEffect(() => {
    const handler = () => setIsCartOpen(true);
    window.addEventListener("cart-open", handler);
    return () => window.removeEventListener("cart-open", handler);
  }, []);

  const sortedCategories = [...categories].sort((a, b) => (a.displayOrder || 0) - (b.displayOrder || 0));
  const cartItemCount = cartSummary?.items.reduce((s, i) => s + i.quantity, 0) ?? 0;
  const hasCart = cartItemCount > 0;

  // ── Guards ─────────────────────────────────────────────
  if (isLoading) return <PageSkeleton />;

  if (error || !vendor) {
    return (
      <div className="max-w-4xl mx-auto p-6 text-center">
        <div className="w-16 h-16 bg-red-50 rounded-full flex items-center justify-center mx-auto mb-4">
          <Utensils className="w-7 h-7 text-red-400" />
        </div>
        <p className="text-red-600 font-semibold mb-4">{error ?? "Failed to load restaurant."}</p>
        <button
          onClick={() => window.location.reload()}
          className="px-6 py-2 bg-teal-600 text-white rounded-xl font-semibold hover:bg-teal-700 transition-colors"
        >
          Retry
        </button>
      </div>
    );
  }

  // ── Shared cart items list (used in both drawer and bottom bar) ──
  const CartItemsList = () => (
    <div className="space-y-3 overflow-y-auto max-h-[40vh]">
      {cartSummary!.items.map((item) => (
        <div key={item.itemId} className="flex items-center gap-3 p-3 bg-gray-50 rounded-xl">
          <div className="flex-1 min-w-0">
            <p className="text-sm font-semibold text-gray-800 truncate">{item.itemName}</p>
            <p className="text-xs text-gray-500 mt-0.5">₹{item.unitPrice} × {item.quantity}</p>
          </div>
          <div className="flex items-center gap-1 border border-teal-200 rounded-full px-1 bg-white">
            <QtyButton
              onClick={() => {
                const nq = item.quantity - 1;
                if (nq < 1) removeItemFromCart(item.itemId);
                else updateCartItem(item.itemId, nq);
              }}
              disabled={isAddingItem === item.itemId}
            >
              {isAddingItem === item.itemId ? (
                <span className="w-3 h-3 border-2 border-teal-600 border-t-transparent rounded-full animate-spin" />
              ) : (
                <Minus size={13} />
              )}
            </QtyButton>
            <span className="w-6 text-center text-sm font-bold text-teal-700">
              {item.quantity}
            </span>
            <QtyButton
              onClick={() => updateCartItem(item.itemId, item.quantity + 1)}
              disabled={isAddingItem === item.itemId}
            >
              <Plus size={13} />
            </QtyButton>
          </div>
          <p className="text-sm font-bold text-gray-800 w-16 text-right">
            ₹{(item.unitPrice * item.quantity).toFixed(0)}
          </p>
          <button
            onClick={() => removeItemFromCart(item.itemId)}
            disabled={isAddingItem === item.itemId}
            className="p-1.5 text-gray-400 hover:text-red-500 hover:bg-red-50 rounded-lg transition-colors"
          >
            <Trash2 size={14} />
          </button>
        </div>
      ))}
    </div>
  );

  const CartTotals = () => (
    <div className="space-y-1.5 border-t border-gray-100 pt-3">
      {[
        ["Subtotal",  `₹${cartSummary!.subtotal.toFixed(2)}`],
        ["Tax",       `₹${cartSummary!.taxAmount.toFixed(2)}`],
        ["Delivery",  `₹${cartSummary!.deliveryCharges.toFixed(2)}`],
      ].map(([label, val]) => (
        <div key={label} className="flex justify-between text-sm text-gray-500">
          <span>{label}</span><span>{val}</span>
        </div>
      ))}
      <div className="flex justify-between text-base font-extrabold text-gray-900 pt-1">
        <span>Total</span>
        <span>₹{cartSummary!.finalAmount.toFixed(2)}</span>
      </div>
    </div>
  );

  // ── Single menu item card ──────────────────────────────
  const MenuCard = ({ item }: { item: MenuItem }) => {
    const cartQty = cartSummary?.items.find((c) => c.itemId === item.itemId)?.quantity ?? 0;
    const localQty = quantities[item.itemId] ?? 0;

    return (
      <div className={`flex items-start gap-4 p-4 bg-white rounded-2xl border transition-all ${
        !item.available ? "opacity-50" : "border-gray-100 hover:border-teal-200 hover:shadow-md"
      }`}>
        {/* Veg / Non-veg dot */}
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 mb-1">
            <span className={`w-3.5 h-3.5 rounded-sm border-2 flex items-center justify-center flex-shrink-0 ${
              item.vegetarian ? "border-green-600" : "border-red-600"
            }`}>
              <span className={`w-1.5 h-1.5 rounded-full ${item.vegetarian ? "bg-green-600" : "bg-red-600"}`} />
            </span>
            {!item.available && (
              <span className="text-xs font-semibold text-red-500 bg-red-50 px-2 py-0.5 rounded-full">
                Unavailable
              </span>
            )}
          </div>

          <h4 className="text-sm font-bold text-gray-900 leading-snug">{item.itemName}</h4>
          <p className="text-xs text-gray-500 mt-1 line-clamp-2 leading-relaxed">{item.description}</p>
          <p className="text-base font-extrabold text-gray-900 mt-2">₹{item.basePrice}</p>
        </div>

        {/* Add / stepper */}
        <div className="flex-shrink-0 flex flex-col items-center gap-2">
          {cartQty > 0 ? (
            /* Already in cart: show inline stepper */
            <div className="flex items-center border-2 border-teal-500 rounded-xl overflow-hidden">
              <button
                className="px-2.5 py-1.5 text-teal-600 hover:bg-teal-50 font-bold text-lg leading-none"
                onClick={() => {
                  const nq = cartQty - 1;
                  if (nq === 0) removeItemFromCart(item.itemId);
                  else updateCartItem(item.itemId, nq);
                }}
                disabled={isAddingItem === item.itemId}
              >−</button>
              <span className="w-8 text-center text-sm font-bold text-teal-700">
                {isAddingItem === item.itemId
                  ? <span className="inline-block w-3 h-3 border-2 border-teal-600 border-t-transparent rounded-full animate-spin" />
                  : cartQty
                }
              </span>
              <button
                className="px-2.5 py-1.5 text-teal-600 hover:bg-teal-50 font-bold text-lg leading-none"
                onClick={() => updateCartItem(item.itemId, cartQty + 1)}
                disabled={isAddingItem === item.itemId}
              >+</button>
            </div>
          ) : (
            /* Not in cart: qty picker + ADD */
            <div className="flex flex-col items-center gap-1.5">
              <div className="flex items-center border border-gray-200 rounded-lg overflow-hidden text-sm">
                <button
                  className="px-2 py-1.5 text-gray-500 hover:bg-gray-50 disabled:opacity-30"
                  onClick={() => setQuantities((p) => ({ ...p, [item.itemId]: Math.max(0, localQty - 1) }))}
                  disabled={localQty <= 0}
                >
                  <Minus size={12} />
                </button>
                <span className="w-8 text-center font-semibold">{localQty}</span>
                <button
                  className="px-2 py-1.5 text-gray-500 hover:bg-gray-50"
                  onClick={() => setQuantities((p) => ({ ...p, [item.itemId]: localQty + 1 }))}
                >
                  <Plus size={12} />
                </button>
              </div>
              <button
                onClick={() => addItemToCart(item.itemId, localQty || 1)}
                disabled={isAddingItem === item.itemId || !item.available}
                className="px-4 py-1.5 bg-teal-600 hover:bg-teal-700 text-white text-xs font-bold rounded-lg transition-colors disabled:opacity-50 flex items-center gap-1"
              >
                {isAddingItem === item.itemId
                  ? <span className="w-3 h-3 border-2 border-white border-t-transparent rounded-full animate-spin" />
                  : <><Plus size={12} /> ADD</>
                }
              </button>
            </div>
          )}
        </div>
      </div>
    );
  };

  // ══════════════════════════════════════════════════════
  //  RENDER
  // ══════════════════════════════════════════════════════
  return (
    <div className="min-h-screen bg-gray-50 pb-28">

      {/* ── Restaurant hero banner ── */}
      <div className="relative w-full h-52 sm:h-72 overflow-hidden">
        <img
          src={vendor.logoUrl ? getLogoUrl(vendor.logoUrl) : "https://images.unsplash.com/photo-1504674900247-0877df9cc836?auto=format&fit=crop&w=1400&q=80"}
          alt={vendor.businessName}
          className="w-full h-full object-cover"
          onError={(e) => {
            e.currentTarget.src = "https://images.unsplash.com/photo-1504674900247-0877df9cc836?auto=format&fit=crop&w=1400&q=80";
          }}
        />
        <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/30 to-transparent" />

        {/* Back button */}
        <button
          onClick={() => navigate(-1)}
          className="absolute top-4 left-4 w-9 h-9 bg-white/20 backdrop-blur-sm rounded-full flex items-center justify-center text-white hover:bg-white/30 transition-colors"
        >
          <ChevronRight size={18} className="rotate-180" />
        </button>

        {/* Restaurant info overlay */}
        <div className="absolute bottom-0 left-0 right-0 p-5 sm:p-8">
          <div className="max-w-4xl mx-auto">
            <h1 className="text-2xl sm:text-3xl font-extrabold text-white leading-tight">
              {vendor.businessName}
            </h1>
            <p className="text-white/80 text-sm mt-1 line-clamp-1">{vendor.description}</p>
            <div className="flex flex-wrap items-center gap-2 mt-3">
              <span className="flex items-center gap-1.5 bg-white/20 backdrop-blur-sm text-white text-xs font-semibold px-3 py-1.5 rounded-full">
                <Star size={12} className="fill-yellow-400 text-yellow-400" />
                {vendor.rating ?? "New"}
              </span>
              <span className="flex items-center gap-1.5 bg-white/20 backdrop-blur-sm text-white text-xs font-semibold px-3 py-1.5 rounded-full">
                <Clock size={12} />
                {vendor.preparationTimeMin} min
              </span>
              <span className={`flex items-center gap-1.5 backdrop-blur-sm text-white text-xs font-semibold px-3 py-1.5 rounded-full ${
                vendor.veg ? "bg-green-600/80" : "bg-red-600/80"
              }`}>
                <Leaf size={12} />
                {vendor.veg ? "Pure Veg" : "Non-Veg"}
              </span>
              {vendor.stationId && (
                <span className="flex items-center gap-1.5 bg-white/20 backdrop-blur-sm text-white text-xs font-semibold px-3 py-1.5 rounded-full">
                  <MapPin size={12} />
                  Delivers to your seat
                </span>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* ── Category tabs (sticky) ── */}
      {sortedCategories.length > 0 && (
        <div className="sticky top-16 z-30 bg-white border-b border-gray-200 shadow-sm">
          <div className="max-w-4xl mx-auto px-4">
            <div className="flex gap-1 overflow-x-auto py-3 scrollbar-hide">
              {sortedCategories.map((cat) => (
                <button
                  key={cat.categoryId}
                  onClick={() => scrollToCategory(cat.categoryId)}
                  className={`flex-shrink-0 px-4 py-1.5 rounded-full text-sm font-semibold transition-all ${
                    activeCategory === cat.categoryId
                      ? "bg-teal-600 text-white shadow-sm"
                      : "bg-gray-100 text-gray-600 hover:bg-teal-50 hover:text-teal-700"
                  }`}
                >
                  {cat.categoryName}
                </button>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* ── Main content ── */}
      <div className="max-w-4xl mx-auto px-4 py-6">

        {/* Search */}
        <div className="relative mb-6">
          <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
          <input
            type="text"
            placeholder="Search dishes..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-10 pr-4 py-3 border border-gray-200 rounded-xl text-sm bg-white focus:outline-none focus:ring-2 focus:ring-teal-400 focus:border-transparent shadow-sm"
          />
          {searchQuery && (
            <button
              onClick={() => setSearchQuery("")}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
            >
              <X size={16} />
            </button>
          )}
        </div>

        {/* Search results */}
        {searchQuery && (
          <div className="mb-8">
            <p className="text-sm font-semibold text-gray-500 mb-3">
              {filteredItems.length} result{filteredItems.length !== 1 ? "s" : ""} for "{searchQuery}"
            </p>
            {filteredItems.length > 0 ? (
              <div className="space-y-3">
                {filteredItems.map((item) => <MenuCard key={item.itemId} item={item} />)}
              </div>
            ) : (
              <div className="text-center py-12 bg-white rounded-2xl border border-gray-100">
                <Search className="w-8 h-8 text-gray-300 mx-auto mb-2" />
                <p className="text-gray-500 font-medium">No dishes found</p>
                <p className="text-gray-400 text-sm mt-1">Try a different keyword</p>
              </div>
            )}
          </div>
        )}

        {/* Category sections */}
        {!searchQuery && sortedCategories.map((cat) => {
          const items = filteredItems.filter((i) => i.categoryId === cat.categoryId && i.available !== false);
          const unavailable = filteredItems.filter((i) => i.categoryId === cat.categoryId && i.available === false);
          const allItems = [...items, ...unavailable];
          if (allItems.length === 0) return null;

          return (
            <div
              key={cat.categoryId}
              ref={(el) => { categoryRefs.current[cat.categoryId] = el; }}
              className="mb-8 scroll-mt-32"
            >
              <div className="flex items-center gap-2 mb-4">
                <h3 className="text-lg font-extrabold text-gray-900">{cat.categoryName}</h3>
                <span className="text-xs text-gray-400 font-medium bg-gray-100 px-2 py-0.5 rounded-full">
                  {allItems.length}
                </span>
              </div>
              <div className="space-y-3">
                {allItems.map((item) => <MenuCard key={item.itemId} item={item} />)}
              </div>
            </div>
          );
        })}

        {!searchQuery && sortedCategories.length === 0 && (
          <div className="text-center py-16 bg-white rounded-2xl border border-dashed border-gray-200">
            <Utensils className="w-10 h-10 text-gray-300 mx-auto mb-3" />
            <p className="text-gray-500 font-semibold">No menu available</p>
          </div>
        )}
      </div>

      {/* ══════════════════════════════════════════
          DESKTOP — Sticky bottom cart bar
      ══════════════════════════════════════════ */}
      {hasCart && (
        <div className="hidden md:block fixed bottom-0 left-0 right-0 z-40 bg-white border-t border-gray-200 shadow-2xl">
          <div className="max-w-4xl mx-auto px-6 py-3 flex items-center justify-between gap-4">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-teal-600 rounded-xl flex items-center justify-center relative">
                <ShoppingCart size={18} className="text-white" />
                <span className="absolute -top-1.5 -right-1.5 w-5 h-5 bg-red-500 text-white text-[10px] font-bold rounded-full flex items-center justify-center">
                  {cartItemCount}
                </span>
              </div>
              <div>
                <p className="text-xs text-gray-500 font-medium leading-none mb-0.5">
                  {cartItemCount} item{cartItemCount !== 1 ? "s" : ""}
                </p>
                <p className="text-base font-extrabold text-gray-900">
                  ₹{cartSummary!.finalAmount.toFixed(2)}
                </p>
              </div>
            </div>

            <div className="flex items-center gap-3 flex-shrink-0">
              <button
                onClick={() => setIsCartOpen(true)}
                className="px-4 py-2 border-2 border-teal-600 text-teal-700 text-sm font-bold rounded-xl hover:bg-teal-50 transition-colors"
              >
                View Cart
              </button>
              <button
                onClick={handleCheckout}
                className="flex items-center gap-2 px-5 py-2 bg-teal-600 hover:bg-teal-700 text-white text-sm font-bold rounded-xl transition-colors shadow-sm"
              >
                Checkout
                <ChevronRight size={16} />
              </button>
              <button
                onClick={() => setIsClearCartOpen(true)}
                className="p-2 text-gray-400 hover:text-red-500 hover:bg-red-50 rounded-lg transition-colors"
                title="Clear cart"
              >
                <Trash2 size={16} />
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ══════════════════════════════════════════
          Cart drawer (both mobile & desktop "View Cart")
      ══════════════════════════════════════════ */}
      {isCartOpen && hasCart && (
        <div className="fixed inset-0 z-50">
          {/* Backdrop */}
          <div
            className="absolute inset-0 bg-black/50 backdrop-blur-sm"
            onClick={() => setIsCartOpen(false)}
          />

          {/* Drawer — slides up from bottom */}
          <div
            ref={cartSheetRef}
            className="absolute bottom-0 left-0 right-0 md:left-auto md:right-6 md:bottom-6 md:w-96 bg-white md:rounded-2xl rounded-t-3xl shadow-2xl p-5 max-h-[85vh] flex flex-col"
          >
            {/* Handle (mobile) */}
            <div className="flex justify-center mb-3 md:hidden">
              <div className="w-10 h-1 bg-gray-200 rounded-full" />
            </div>

            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-extrabold text-gray-900 flex items-center gap-2">
                <ShoppingCart size={18} className="text-teal-600" />
                Your Order
                <span className="text-sm font-semibold text-gray-500">({cartItemCount} items)</span>
              </h3>
              <button
                onClick={() => setIsCartOpen(false)}
                className="p-1.5 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-lg"
              >
                <X size={18} />
              </button>
            </div>

            <CartItemsList />

            <div className="mt-4">
              <CartTotals />
            </div>

            <div className="flex gap-3 mt-4">
              <button
                onClick={() => setIsClearCartOpen(true)}
                className="flex-1 py-2.5 border border-gray-200 text-gray-600 text-sm font-semibold rounded-xl hover:bg-gray-50 transition-colors"
              >
                Clear Cart
              </button>
              <button
                onClick={handleCheckout}
                className="flex-1 py-2.5 bg-teal-600 hover:bg-teal-700 text-white text-sm font-bold rounded-xl transition-colors flex items-center justify-center gap-1.5"
              >
                Checkout
                <ChevronRight size={15} />
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Mobile bottom tab (when cart exists but drawer is closed) */}
      {hasCart && !isCartOpen && (
        <div className="md:hidden fixed bottom-0 left-0 right-0 z-40 bg-teal-600 px-4 py-3">
          <button
            onClick={() => setIsCartOpen(true)}
            className="w-full flex items-center justify-between text-white"
          >
            <div className="flex items-center gap-2">
              <span className="bg-white/20 rounded-lg px-2 py-0.5 text-sm font-bold">
                {cartItemCount} item{cartItemCount !== 1 ? "s" : ""}
              </span>
            </div>
            <span className="text-sm font-bold">View Cart →</span>
            <span className="font-extrabold text-base">₹{cartSummary!.finalAmount.toFixed(2)}</span>
          </button>
        </div>
      )}

      {/* ── Clear cart confirm dialog ── */}
      <Dialog open={isClearCartOpen} onOpenChange={setIsClearCartOpen}>
        <DialogContent className="sm:max-w-sm rounded-2xl">
          <DialogHeader>
            <DialogTitle className="text-base font-bold">Clear Cart?</DialogTitle>
          </DialogHeader>
          <p className="text-sm text-gray-500">All items will be removed from your cart.</p>
          <DialogFooter className="flex gap-3 mt-2">
            <button
              onClick={() => setIsClearCartOpen(false)}
              className="flex-1 py-2 border border-gray-200 rounded-xl text-sm font-semibold text-gray-600 hover:bg-gray-50"
            >
              Cancel
            </button>
            <button
              onClick={clearCart}
              className="flex-1 py-2 bg-red-600 hover:bg-red-700 text-white rounded-xl text-sm font-bold transition-colors"
            >
              Clear Cart
            </button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default UserOrder;
