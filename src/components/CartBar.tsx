import { useState, useEffect } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import { ShoppingCart, ChevronRight } from "lucide-react";

// Pages that have their own cart UI — don't show global bar on these
const EXCLUDED_PATHS = ["/user-order/", "/checkout/"];

const CartBar = () => {
  const [cartCount,    setCartCount]    = useState(0);
  const [cartTotal,    setCartTotal]    = useState(0);
  const [cartVendorId, setCartVendorId] = useState<string | null>(null);

  const navigate = useNavigate();
  const location = useLocation();

  // Sync from localStorage on every route change
  useEffect(() => {
    const count    = Number(localStorage.getItem("cartCount")     ?? 0);
    const total    = Number(localStorage.getItem("cartTotal")     ?? 0);
    const vendorId = localStorage.getItem("cartVendorId");
    setCartCount(count);
    setCartTotal(total);
    setCartVendorId(vendorId);
  }, [location.pathname]);

  // Real-time updates from UserOrder via custom event
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

  // Don't render on excluded pages or when cart is empty
  const isExcluded = EXCLUDED_PATHS.some((p) => location.pathname.startsWith(p));
  if (isExcluded || cartCount === 0 || !cartVendorId) return null;

  return (
    <div className="fixed bottom-0 left-0 right-0 z-50 bg-teal-600 shadow-2xl">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-3 flex items-center justify-between gap-4">

        {/* Left — cart info */}
        <div className="flex items-center gap-3 min-w-0">
          <div className="relative flex-shrink-0">
            <div className="w-10 h-10 bg-white/20 rounded-xl flex items-center justify-center">
              <ShoppingCart size={18} className="text-white" />
            </div>
            <span className="absolute -top-1.5 -right-1.5 w-5 h-5 bg-yellow-400 text-gray-900 text-[10px] font-extrabold rounded-full flex items-center justify-center">
              {cartCount > 99 ? "99+" : cartCount}
            </span>
          </div>
          <div className="min-w-0">
            <p className="text-white/75 text-xs font-medium leading-none mb-0.5 truncate">
              {cartCount} item{cartCount !== 1 ? "s" : ""} in cart
            </p>
            <p className="text-white font-extrabold text-base leading-none">
              ₹{cartTotal.toFixed(2)}
            </p>
          </div>
        </div>

        {/* Right — actions */}
        <div className="flex items-center gap-2 flex-shrink-0">
          {/* Mobile: single View Cart button */}
          <button
            onClick={() => navigate(`/user-order/${cartVendorId}`)}
            className="md:hidden flex items-center gap-1.5 px-4 py-2.5 bg-white text-teal-700 text-sm font-extrabold rounded-xl hover:bg-teal-50 transition-colors"
          >
            View Cart
            <ChevronRight size={15} />
          </button>

          {/* Desktop: View Cart (outlined) + Checkout (solid white) */}
          <button
            onClick={() => navigate(`/user-order/${cartVendorId}`)}
            className="hidden md:flex items-center gap-1.5 px-4 py-2 border-2 border-white/40 text-white text-sm font-bold rounded-xl hover:bg-white/10 transition-colors"
          >
            View Cart
          </button>
          <button
            onClick={() => navigate(`/checkout/${cartVendorId}`)}
            className="hidden md:flex items-center gap-1.5 px-5 py-2 bg-white text-teal-700 text-sm font-extrabold rounded-xl hover:bg-teal-50 transition-colors shadow-sm"
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
