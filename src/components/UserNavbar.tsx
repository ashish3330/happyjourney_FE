// components/UserNavbar.tsx
import React from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { Home, ShoppingBag, Clock, User, LogOut, Menu } from 'lucide-react';
import Happy_Journey_Logo from "../assets/Happy_Journey_Logo.jpg";
import { useAuth } from '../contexts/AuthContext';

const UserNavbar = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const { logout, role } = useAuth();

  const navItems = [
    { label: 'Order Food', path: '/order-food', icon: ShoppingBag },
    { label: 'My Orders', path: '/my-orders', icon: Clock },
    { label: 'Profile', path: '/profile', icon: User },
  ];

  const isActive = (path: string) => location.pathname === path;

  return (
    <nav className="bg-white border-b border-gray-200 sticky top-0 z-50 shadow-sm">
      <div className="max-w-7xl mx-auto px-4 md:px-6">
        <div className="h-16 flex items-center justify-between">
          
          {/* Logo */}
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-orange-600 rounded-2xl flex items-center justify-center">
              <span className="text-white text-2xl">🍛</span>
            </div>
            <div>
              <div className="font-bold text-xl text-gray-900 tracking-tight">Happy Journey</div>
              <div className="text-[10px] text-gray-500 -mt-1">DOORSTEP FOOD DELIVERY</div>
            </div>
          </div>

          {/* Navigation Links */}
          <div className="hidden md:flex items-center gap-8">
            {navItems.map((item) => (
              <button
                key={item.path}
                onClick={() => navigate(item.path)}
                className={`flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-medium transition-all hover:bg-gray-100 ${
                  isActive(item.path) 
                    ? 'text-orange-600 bg-orange-50' 
                    : 'text-gray-700 hover:text-gray-900'
                }`}
              >
                <item.icon size={18} />
                {item.label}
              </button>
            ))}
          </div>

          {/* Right Side */}
          <div className="flex items-center gap-4">
            <button 
              onClick={() => navigate('/order-food')}
              className="hidden md:flex items-center gap-2 bg-orange-600 hover:bg-orange-700 text-white px-6 py-2.5 rounded-2xl text-sm font-semibold transition-all"
            >
              Order Food
            </button>

            <button
              onClick={logout}
              className="flex items-center gap-2 text-gray-600 hover:text-red-600 transition-colors px-4 py-2"
            >
              <LogOut size={18} />
              <span className="hidden md:inline">Logout</span>
            </button>

            {/* Mobile Menu Button */}
            <button className="md:hidden p-2">
              <Menu size={24} />
            </button>
          </div>
        </div>
      </div>
    </nav>
  );
};

export default UserNavbar;