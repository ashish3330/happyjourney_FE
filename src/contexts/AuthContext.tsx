import React, { createContext, useContext, useState, ReactNode } from "react";

type AuthContextType = {
  accessToken: string | null;
  role: string | null;
  username: string | null;
  userId: number | null;
  vendorId: number | null; // Added
  login: (data: { accessToken: string; role: string; username: string; userId: number }) => void;
  logout: () => void;
  setVendorId: (vendorId: number | null) => void; // Added
};

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const [accessToken, setAccessToken] = useState<string | null>(localStorage.getItem("accessToken"));
  const [role, setRole] = useState<string | null>(localStorage.getItem("role"));
  const [username, setUsername] = useState<string | null>(localStorage.getItem("username"));
  const [userId, setUserId] = useState<number | null>(
    localStorage.getItem("userId") ? Number(localStorage.getItem("userId")) : null
  );
  const [vendorId, setVendorId] = useState<number | null>(
    localStorage.getItem("vendorId") ? Number(localStorage.getItem("vendorId")) : null
  ); // Added

  const login = (data: { accessToken: string; role: string; username: string; userId: number }) => {
    console.log("Logging in with data:", data);
    setAccessToken(data.accessToken);
    setRole(data.role.toLowerCase());
    setUsername(data.username);
    setUserId(data.userId);
    localStorage.setItem("accessToken", data.accessToken);
    localStorage.setItem("role", data.role.toLowerCase());
    localStorage.setItem("username", data.username);
    localStorage.setItem("userId", String(data.userId));
    // Clear vendorId on login to ensure it's fetched fresh
    setVendorId(null);
    localStorage.removeItem("vendorId");
  };

  const logout = () => {
    console.log("Logging out");
    setAccessToken(null);
    setRole(null);
    setUsername(null);
    setUserId(null);
    setVendorId(null); // Added
    localStorage.removeItem("accessToken");
    localStorage.removeItem("role");
    localStorage.removeItem("username");
    localStorage.removeItem("userId");
    localStorage.removeItem("vendorId"); // Added
  };

  return (
    <AuthContext.Provider value={{ accessToken, role, username, userId, vendorId, login, logout, setVendorId }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error("useAuth must be used within an AuthProvider");
  }
  return context;
};