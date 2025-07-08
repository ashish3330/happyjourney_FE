import React, { useEffect, forwardRef } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import { userMenuItems } from "../constants/menuItems";
import happy_Journey_Logo from "../assets/Happy_Journey_Logo.jpg"

type UserSidebarProps = {
  collapsed: boolean;
  setCollapsed: React.Dispatch<React.SetStateAction<boolean>>;
  className?: string;
};

const UserSidebar = forwardRef<HTMLDivElement, UserSidebarProps>(({ collapsed, setCollapsed, className }, ref) => {
  const navigate = useNavigate();
  const location = useLocation();

  useEffect(() => {
    const handleResize = () => {
      if (window.innerWidth < 768) {
        setCollapsed(true);
      } else {
        setCollapsed(false);
      }
    };

    handleResize();
    window.addEventListener("resize", handleResize);
    return () => window.removeEventListener("resize", handleResize);
  }, [setCollapsed]);

  return (
    <div
      ref={ref}
      className={`h-full ${
        collapsed ? "w-0 md:w-20" : "w-64"
      } bg-white shadow-sm border-r transition-all duration-300 overflow-hidden md:overflow-visible fixed md:static z-10 ${className || ""}`}
    >
      <div className={`flex items-center p-4 ${collapsed ? "hidden md:flex" : "flex"}`}>
        {!collapsed && (
          <div className="hidden md:flex items-center p-4">
            <img
              src={happy_Journey_Logo}
              alt="HappyJourney Logo"
              className="h-25 w-auto"
            />
          </div>
        )}
      </div>
      <nav className={`mt-10 ${collapsed ? "hidden md:block" : "block"}`}>
        {userMenuItems.map((item, index) => {
          const isActive = location.pathname === item.path;
          return (
            <div key={index} className="px-2 py-1">
              <div
                title={collapsed ? item.label : ""}
                className={`flex items-center ${
                  collapsed ? "justify-center" : "justify-between"
                } px-3 py-2 rounded-lg cursor-pointer transition-colors ${
                  isActive
                    ? "bg-blue-50 text-blue-600 border-l-4 border-blue-600"
                    : "text-gray-600 hover:bg-gray-50"
                }`}
                onClick={() => navigate(item.path)}
              >
                <div className={`flex items-center ${collapsed ? "" : "space-x-3"}`}>
                  <item.icon size={20} />
                  {!collapsed && <span className="text-sm font-medium">{item.label}</span>}
                </div>
              </div>
            </div>
          );
        })}
      </nav>
    </div>
  );
});

export default UserSidebar;