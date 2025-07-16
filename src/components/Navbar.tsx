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
  const [isUpdateModalOpen, setIsUpdateModalOpen] = useState(false);
  const [isSuccessPopupOpen, setIsSuccessPopupOpen] = useState(false);
  const [formData, setFormData] = useState({
    username: "",
    email: "",
    phoneNumber: "",
  });
  const [error, setError] = useState<string | null>(null);
  const dropdownRef = useRef<HTMLDivElement>(null);
  const modalRef = useRef<HTMLDivElement>(null);
  const navigate = useNavigate();
  const { username, logout, accessToken } = useAuth();

  useEffect(() => {
    setFormData({
      username: username || "",
      email: "",
      phoneNumber: "",
    });
  }, [username]);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setDropdownOpen(false);
      }
      if (modalRef.current && !modalRef.current.contains(event.target as Node)) {
        setIsUpdateModalOpen(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

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

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
  };

  const isFormValid = () => {
    return (
      formData.username.trim() !== "" ||
      formData.email.trim() !== "" ||
      formData.phoneNumber.trim() !== ""
    );
  };

  const handleUpdateProfile = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    try {
      const response = await api.put("/auth/update-profile", formData);
      if (response.status === 200) {
        setIsUpdateModalOpen(false);
        setIsSuccessPopupOpen(true);
        setTimeout(() => setIsSuccessPopupOpen(false), 2000);
      }
    } catch (error: any) {
      console.error("Profile update failed", error);
      const errorMessage = error.response?.status === 409
        ? (error.response?.data?.error || "Email or phone number already exists. Please use a different email or phone number.")
        : error.response?.data?.error || "Failed to update profile. Please try again.";
      setError(errorMessage);
    }
  };

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
                    onClick={() => setIsUpdateModalOpen(true)}
                    className="w-full text-left px-4 py-2 text-sm text-gray-600 hover:bg-gray-50"
                  >
                    Update Profile
                  </button>
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

      {/* Update Profile Modal */}
      {isUpdateModalOpen && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div ref={modalRef} className="bg-white rounded-lg p-6 w-full max-w-md">
            <h2 className="text-xl font-semibold mb-4">Update Profile</h2>
            {error && <p className="text-red-500 mb-4">{error}</p>}
            <form onSubmit={handleUpdateProfile}>
              <div className="mb-4">
                <label className="block text-sm font-medium text-gray-700">Username</label>
                <input
                  type="text"
                  name="username"
                  value={formData.username}
                  onChange={handleInputChange}
                  className="mt-1 p-2 w-full border rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>
              <div className="mb-4">
                <label className="block text-sm font-medium text-gray-700">Email</label>
                <input
                  type="email"
                  name="email"
                  value={formData.email}
                  onChange={handleInputChange}
                  className="mt-1 p-2 w-full border rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>
              <div className="mb-4">
                <label className="block text-sm font-medium text-gray-700">Phone Number</label>
                <input
                  type="tel"
                  name="phoneNumber"
                  value={formData.phoneNumber}
                  onChange={handleInputChange}
                  className="mt-1 p-2 w-full border rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>
              <div className="flex justify-end space-x-2">
                <button
                  type="button"
                  onClick={() => setIsUpdateModalOpen(false)}
                  className="px-4 py-2 text-sm font-medium text-gray-600 bg-gray-200 rounded-md hover:bg-gray-300"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={!isFormValid()}
                  className={`px-4 py-2 text-sm font-medium text-white rounded-md ${
                    isFormValid() ? "bg-blue-600 hover:bg-blue-700" : "bg-gray-400 cursor-not-allowed"
                  }`}
                >
                  Submit
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Success Popup */}
      {isSuccessPopupOpen && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 w-full max-w-sm">
            <p className="text-green-600 text-center">Profile updated successfully!</p>
          </div>
        </div>
      )}
    </header>
  );
};

export default Navbar;