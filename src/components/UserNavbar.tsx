import { useState, useRef, useEffect } from "react";
import { useNavigate, useLocation, Link } from "react-router-dom";
import {
  Menu, X, ChevronDown, ShoppingCart,
  Home, History, Phone, HelpCircle,
} from "lucide-react";
import { useAuth } from "../contexts/AuthContext";
import api from "../utils/axios";
import Happy_Journey_Logo from "../assets/Happy_Journey_Logo.jpg";

const primaryLinks = [
  { label: "Home",          path: "/home",          icon: Home    },
  { label: "Orders",        path: "/order-history", icon: History, authOnly: true },
  { label: "Contact Us",    path: "/contact",       icon: Phone   },
  { label: "Help & Support",path: "/help",          icon: HelpCircle },
];

const policyLinks = [
  { label: "Privacy Policy",      path: "/privacy-policy"      },
  { label: "Shipping Policy",     path: "/shipping-policy"     },
  { label: "Cancellation Policy", path: "/cancellation-policy" },
  { label: "Terms & Conditions",  path: "/terms"               },
  { label: "Payment Policy",      path: "/payment-policy"      },
];

const UserNavbar = () => {
  const [mobileOpen,        setMobileOpen]        = useState(false);
  const [policyOpen,        setPolicyOpen]        = useState(false);
  const [userDropdownOpen,  setUserDropdownOpen]  = useState(false);

  const navigate  = useNavigate();
  const location  = useLocation();
  const { username, logout, accessToken, role } = useAuth();

  const policyRef = useRef<HTMLDivElement>(null);
  const userRef   = useRef<HTMLDivElement>(null);

  const isUser = role === "user";

  const handleLogout = async () => {
    try { await api.get("/auth/logout"); } catch { /* ignore */ }
    logout();
    navigate("/home");
    setUserDropdownOpen(false);
  };

  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (policyRef.current && !policyRef.current.contains(e.target as Node))
        setPolicyOpen(false);
      if (userRef.current && !userRef.current.contains(e.target as Node))
        setUserDropdownOpen(false);
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, []);

  useEffect(() => { setMobileOpen(false); }, [location.pathname]);

  const visibleLinks = primaryLinks.filter(
    (l) => !l.authOnly || !!accessToken,
  );

  return (
    <header className="sticky top-0 z-50 bg-white shadow-md">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-16">

          {/* ── Logo ── */}
          <div
            className="flex items-center cursor-pointer flex-shrink-0"
            onClick={() => navigate("/home")}
          >
            <img
              src={Happy_Journey_Logo}
              alt="Happy Journey"
              className="h-11 w-auto object-contain"
            />
          </div>

          {/* ── Desktop nav ── */}
          <nav className="hidden md:flex items-center gap-1">
            {visibleLinks.map((link) => (
              <Link
                key={link.path}
                to={link.path}
                className={`px-3 py-2 rounded-md text-sm font-semibold transition-colors ${
                  location.pathname === link.path
                    ? "text-teal-700 bg-teal-50"
                    : "text-gray-600 hover:text-teal-700 hover:bg-teal-50"
                }`}
              >
                {link.label}
              </Link>
            ))}

            {/* Policies dropdown */}
            <div ref={policyRef} className="relative">
              <button
                onClick={() => setPolicyOpen((v) => !v)}
                className="flex items-center gap-1 px-3 py-2 rounded-md text-sm font-semibold text-gray-600 hover:text-teal-700 hover:bg-teal-50 transition-colors"
              >
                Policies
                <ChevronDown
                  size={13}
                  className={`transition-transform duration-200 ${policyOpen ? "rotate-180" : ""}`}
                />
              </button>
              {policyOpen && (
                <div className="absolute top-full left-0 mt-1 w-52 bg-white border border-gray-100 rounded-xl shadow-xl py-1.5 z-50">
                  {policyLinks.map((p) => (
                    <Link
                      key={p.path}
                      to={p.path}
                      onClick={() => setPolicyOpen(false)}
                      className="block px-4 py-2 text-sm text-gray-600 hover:bg-teal-50 hover:text-teal-700 transition-colors"
                    >
                      {p.label}
                    </Link>
                  ))}
                </div>
              )}
            </div>
          </nav>

          {/* ── Right actions ── */}
          <div className="flex items-center gap-2">

            {/* Cart — desktop, logged-in user only */}
            {isUser && (
              <button
                onClick={() => navigate("/order-history")}
                title="My Orders"
                className="hidden md:flex items-center gap-1.5 px-3 py-2 rounded-lg text-gray-600 hover:text-teal-700 hover:bg-teal-50 transition-colors"
              >
                <ShoppingCart size={20} />
                <span className="text-sm font-semibold">Cart</span>
              </button>
            )}

            {/* Auth block */}
            {accessToken ? (
              <div ref={userRef} className="relative">
                <button
                  onClick={() => setUserDropdownOpen((v) => !v)}
                  className="flex items-center gap-2 px-3 py-1.5 rounded-full border border-gray-200 hover:border-teal-300 hover:bg-teal-50 transition-colors"
                >
                  <div className="w-7 h-7 bg-teal-500 rounded-full flex items-center justify-center">
                    <span className="text-white text-xs font-bold">
                      {username ? username.charAt(0).toUpperCase() : "U"}
                    </span>
                  </div>
                  <span className="hidden sm:block text-sm font-semibold text-gray-700 max-w-[96px] truncate">
                    {username || "User"}
                  </span>
                  <ChevronDown
                    size={13}
                    className={`text-gray-400 transition-transform duration-200 ${userDropdownOpen ? "rotate-180" : ""}`}
                  />
                </button>

                {userDropdownOpen && (
                  <div className="absolute right-0 mt-2 w-44 bg-white border border-gray-100 rounded-xl shadow-xl py-1.5 z-50">
                    <div className="px-4 py-2 border-b border-gray-100">
                      <p className="text-xs text-gray-400">Signed in as</p>
                      <p className="text-sm font-semibold text-gray-800 truncate">{username}</p>
                    </div>
                    <button
                      onClick={handleLogout}
                      className="w-full text-left px-4 py-2 text-sm font-medium text-red-600 hover:bg-red-50 transition-colors rounded-b-xl"
                    >
                      Logout
                    </button>
                  </div>
                )}
              </div>
            ) : (
              <button
                onClick={() => navigate("/login")}
                className="hidden md:block px-5 py-2 text-sm font-semibold text-white bg-teal-500 rounded-full hover:bg-teal-700 transition-colors shadow-sm"
              >
                Login
              </button>
            )}

            {/* Mobile: cart icon (logged-in) or login button (guest) */}
            <div className="flex md:hidden items-center gap-2">
              {isUser && (
                <button
                  onClick={() => navigate("/order-history")}
                  title="Cart"
                  className="p-2 rounded-lg text-gray-600 hover:text-teal-700 hover:bg-teal-50 transition-colors"
                >
                  <ShoppingCart size={20} />
                </button>
              )}
              {!accessToken && (
                <button
                  onClick={() => navigate("/login")}
                  className="px-4 py-1.5 text-sm font-semibold text-white bg-teal-500 rounded-full hover:bg-teal-700 transition-colors"
                >
                  Login
                </button>
              )}
              {/* Hamburger */}
              <button
                onClick={() => setMobileOpen((v) => !v)}
                className="p-2 rounded-lg text-gray-600 hover:bg-gray-100 transition-colors"
              >
                {mobileOpen ? <X size={20} /> : <Menu size={20} />}
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* ── Mobile drawer ── */}
      {mobileOpen && (
        <div className="md:hidden border-t border-gray-100 bg-white shadow-lg">
          <nav className="px-4 py-3 space-y-0.5">
            {visibleLinks.map((link) => (
              <Link
                key={link.path}
                to={link.path}
                className={`flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-semibold transition-colors ${
                  location.pathname === link.path
                    ? "text-teal-700 bg-teal-50"
                    : "text-gray-700 hover:bg-gray-50"
                }`}
              >
                <link.icon size={17} />
                {link.label}
              </Link>
            ))}

            {/* Policies section */}
            <div className="pt-2 mt-1 border-t border-gray-100">
              <p className="px-3 pb-1 text-[11px] font-bold text-gray-400 uppercase tracking-widest">
                Policies
              </p>
              {policyLinks.map((p) => (
                <Link
                  key={p.path}
                  to={p.path}
                  className={`flex items-center px-3 py-2.5 rounded-xl text-sm transition-colors ${
                    location.pathname === p.path
                      ? "text-teal-700 bg-teal-50"
                      : "text-gray-600 hover:bg-gray-50"
                  }`}
                >
                  {p.label}
                </Link>
              ))}
            </div>

            {/* Logout in mobile menu */}
            {accessToken && (
              <div className="pt-2 mt-1 border-t border-gray-100">
                <button
                  onClick={handleLogout}
                  className="w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-semibold text-red-600 hover:bg-red-50 transition-colors"
                >
                  Logout
                </button>
              </div>
            )}
          </nav>
        </div>
      )}
    </header>
  );
};

export default UserNavbar;
