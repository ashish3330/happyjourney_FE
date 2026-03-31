import { useState, useEffect } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import { ShoppingCart, ChevronRight } from "lucide-react";
import api from "@/utils/axios";

// Pages that have their own cart UI — don't show global bar on these
const EXCLUDED_PATHS = ["/user-order/", "/checkout/"];

const clearCartStorage = () => {
  localStorage.removeItem("cartCount");
  localStorage.removeItem("cartTotal");
  localStorage.removeItem("cartVendorId");
};

const CartBar = () => {
  const [cartCount,    setCartCount]    = useState(0);
  const [cartTotal,    setCartTotal]    = useState(0);
  const [cartVendorId, setCartVendorId] = useState<string | null>(null);

  const navigate = useNavigate();
  const location = useLocation();

  // Sync from localStorage and validate against API on every route change
  useEffect(() => {
    const count    = Number(localStorage.getItem("cartCount")  ?? 0);
    const total    = Number(localStorage.getItem("cartTotal")  ?? 0);
    const vendorId = localStorage.getItem("cartVendorId");

    if (!vendorId || count === 0) {
      clearCartStorage();
      setCartCount(0);
      setCartTotal(0);
      setCartVendorId(null);
      return;
    }

    // Verify the cart is still live on the server
    api.get("/cart/summary", { params: { vendorId } })
      .then((res) => {
        const items: { quantity: number }[] = res.data?.items ?? [];
        const liveCount = items.reduce((s, i) => s + i.quantity, 0);
        if (liveCount === 0) {
          clearCartStorage();
          setCartCount(0);
          setCartTotal(0);
          setCartVendorId(null);
          window.dispatchEvent(new CustomEvent("cart-updated", { detail: { count: 0 } }));
        } else {
          const liveTotal = res.data?.finalAmount ?? total;
          localStorage.setItem("cartCount", String(liveCount));
          localStorage.setItem("cartTotal", String(liveTotal));
          setCartCount(liveCount);
          setCartTotal(liveTotal);
          setCartVendorId(vendorId);
        }
      })
      .catch(() => {
        // Cart not found or server error — clear stale data
        clearCartStorage();
        setCartCount(0);
        setCartTotal(0);
        setCartVendorId(null);
        window.dispatchEvent(new CustomEvent("cart-updated", { detail: { count: 0 } }));
      });
  }, [location.pathname]);

  // Real-time updates via custom event
  useEffect(() => {
    const handler = (e: Event) => {
      const { count = 0, total = 0, vendorId } = (e as CustomEvent).detail ?? {};
      setCartCount(count);
      setCartTotal(total);
      setCartVendorId(vendorId ? String(vendorId) : null);
    };
    window.addEventListener("cart-updated", handler);
    return () => window.removeEventListener("cart-updated", handler);
  }, []);

  const isExcluded = EXCLUDED_PATHS.some((p) => location.pathname.startsWith(p));
  if (isExcluded || cartCount === 0 || !cartVendorId) return null;

  const goToCart     = () => navigate(`/user-order/${cartVendorId}`, { state: { openCart: true } });
  const goToCheckout = () => navigate(`/checkout/${cartVendorId}`);

  return (
    <div className="fixed bottom-0 left-0 right-0 z-50 bg-white border-t border-gray-200 shadow-2xl">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-3 flex items-center justify-between gap-4">

        {/* Left — cart info */}
        <div className="flex items-center gap-3 min-w-0">
          <div className="relative flex-shrink-0">
            <div className="w-10 h-10 bg-teal-600 rounded-xl flex items-center justify-center">
              <ShoppingCart size={18} className="text-white" />
            </div>
            <span className="absolute -top-1.5 -right-1.5 w-5 h-5 bg-red-500 text-white text-[10px] font-bold rounded-full flex items-center justify-center">
              {cartCount > 99 ? "99+" : cartCount}
            </span>
          </div>
          <div className="min-w-0">
            <p className="text-xs text-gray-500 font-medium leading-none mb-0.5 truncate">
              {cartCount} item{cartCount !== 1 ? "s" : ""} in cart
            </p>
            <p className="text-base font-extrabold text-gray-900 leading-none">
              ₹{cartTotal.toFixed(2)}
            </p>
          </div>
        </div>

        {/* Right — actions */}
        <div className="flex items-center gap-2 flex-shrink-0">
          {/* Mobile: single View Cart button */}
          <button
            onClick={goToCart}
            className="md:hidden flex items-center gap-1.5 px-4 py-2.5 bg-teal-600 hover:bg-teal-700 text-white text-sm font-extrabold rounded-xl transition-colors"
          >
            View Cart
            <ChevronRight size={15} />
          </button>

          {/* Desktop: View Cart (outlined) + Checkout (solid) */}
          <button
            onClick={goToCart}
            className="hidden md:flex items-center gap-1.5 px-4 py-2 border-2 border-teal-600 text-teal-700 text-sm font-bold rounded-xl hover:bg-teal-50 transition-colors"
          >
            View Cart
          </button>
          <button
            onClick={goToCheckout}
            className="hidden md:flex items-center gap-1.5 px-5 py-2 bg-teal-600 hover:bg-teal-700 text-white text-sm font-extrabold rounded-xl transition-colors shadow-sm"
          >
            Checkout
            <ChevronRight size={15} />
          </button>
        </div>
      </div>
    </div>
  );
};

export default CartBar;
