import { ChevronDown, Menu } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { useEffect, useRef, useState } from "react";
import api from "../utils/axios";
import { useAuth } from "../contexts/AuthContext";
import Happy_Journey_Logo from "../assets/Happy_Journey_Logo.jpg";

type NavbarProps = {
  collapsed?: boolean;
  setCollapsed?: React.Dispatch<React.SetStateAction<boolean>>;
};

const Navbar: React.FC<NavbarProps> = ({ collapsed, setCollapsed }) => {
  const [dropdownOpen, setDropdownOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);
  const navigate = useNavigate();
  const { username, logout, accessToken } = useAuth();

  const handleLogout = async () => {
    try {
      const response = await api.get("/auth/logout");
      if (response.status === 200) {
        logout();
        navigate("/home");
      } else {
        throw new Error("Invalid response");
      }
    } catch (error) {
      console.error("Logout failed", error);
      logout();
      navigate("/home");
    }
  };

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setDropdownOpen(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  return (
    <header className="bg-white shadow-sm border-b border-gray-200 px-6 py-4 relative z-20">
      <div className="flex items-center justify-between">
        <div className="flex items-center space-x-4">
          {setCollapsed && (
            <button
              onClick={() => setCollapsed(!collapsed)}
              className="p-2 rounded hover:bg-gray-100 transition"
            >
              <Menu size={20} />
            </button>
          )}
          {collapsed && (
            <img
              src={Happy_Journey_Logo}
              alt="Happy Journey Logo"
              className="h-15 w-auto"
            />
          )}
          <div>
            <div className="flex items-center text-sm text-gray-500 mt-1">
              <span className="mx-2"></span>
            </div>
          </div>
        </div>

        <div className="relative flex items-center space-x-4">
          {accessToken ? (
            <div ref={dropdownRef}>
              <button
                className="flex items-center space-x-2 focus:outline-none"
                onClick={() => setDropdownOpen(!dropdownOpen)}
              >
                <span className="text-sm text-gray-600 hidden sm:inline">
                  Hi, {username || "User"}
                </span>
                <div className="w-8 h-8 bg-indigo-500 rounded-full flex items-center justify-center">
                  <span className="text-white text-sm font-medium">
                    {username ? username.charAt(0).toUpperCase() : "U"}
                  </span>
                </div>
                <ChevronDown className="w-4 h-4 text-gray-500" />
              </button>
              {dropdownOpen && (
                <div className="absolute right-0 mt-2 w-40 bg-white border rounded-lg shadow-lg z-30">
                  <button
                    onClick={handleLogout}
                    className="w-full text-left px-4 py-2 text-sm text-red-600 hover:bg-red-50"
                  >
                    Logout
                  </button>
                </div>
              )}
            </div>
          ) : (
              <div className="flex items-center space-x-4">
                <button
                  onClick={() => navigate("/login")}
                  type="button"
                  className="px-4 py-2 text-sm font-medium text-white bg-blue-600 rounded-md hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500"
                >
                  Login
                </button>
              </div>
          )}
        </div>
      </div>
    </header>
  );
};

export default Navbar;