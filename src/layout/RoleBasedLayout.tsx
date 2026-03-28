import React, { useState, useEffect, useRef } from "react";
import Sidebar from "../components/Sidebar";
import VendorSidebar from "../components/VendorSidebar";
import Navbar from "../components/Navbar";
import UserNavbar from "../components/UserNavbar";
import CartBar from "../components/CartBar";
import { useAuth } from "../contexts/AuthContext";

const RoleBasedLayout: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { role } = useAuth();
  const [collapsed, setCollapsed] = useState(false);
  const navbarRef = useRef<HTMLDivElement>(null);
  const sidebarRef = useRef<HTMLDivElement>(null);

  const isUserRole = !role || role.toLowerCase() === "user";

  const renderSidebar = () => {
    if (isUserRole) return null;
    switch (role!.toLowerCase()) {
      case "admin":
        return <Sidebar collapsed={collapsed} setCollapsed={setCollapsed} ref={sidebarRef} className="sidebar-admin" />;
      case "vendor":
        return <VendorSidebar collapsed={collapsed} setCollapsed={setCollapsed} ref={sidebarRef} className="sidebar-vendor" />;
      default:
        return null;
    }
  };

  useEffect(() => {
    if (isUserRole) return;
    const handleClickOutside = (event: MouseEvent) => {
      if (window.innerWidth < 768 && !collapsed) {
        if (
          navbarRef.current &&
          !navbarRef.current.contains(event.target as Node) &&
          sidebarRef.current &&
          !sidebarRef.current.contains(event.target as Node)
        ) {
          setCollapsed(true);
        }
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, [collapsed, isUserRole]);

  // User/guest: full-width layout with top navbar
  if (isUserRole) {
    return (
      <div className="min-h-screen flex flex-col bg-gray-50">
        <UserNavbar />
        <main className="flex-1">{children}</main>
        <CartBar />
      </div>
    );
  }

  // Admin/Vendor: sidebar + top navbar layout
  return (
    <div className="flex h-screen overflow-hidden">
      {renderSidebar()}
      <div className="flex-1 flex flex-col">
        <div ref={navbarRef}>
          <Navbar collapsed={collapsed} setCollapsed={setCollapsed} />
        </div>
        <div className="flex-1 overflow-auto p-4 bg-gray-50">{children}</div>
      </div>
    </div>
  );
};

export default RoleBasedLayout;
