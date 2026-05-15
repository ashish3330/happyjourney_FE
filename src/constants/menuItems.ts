import {
  LayoutDashboard,
  UtensilsCrossed,
  ShoppingCart,
  Home,
  History,
  AlertCircle,
  Shield,
  XCircle,
  FileText,
  HelpCircle,
  LucideIcon,
  Phone,
  AlertTriangle,
  Package,
  PhoneIncoming,
  Train,
  Download,
  CreditCard,
  FileCheck,
} from "lucide-react";

export type MenuItem = {
  icon: LucideIcon;
  label: string;
  path: string;
};

// Admin menu items (unchanged)
export const adminMenuItems: MenuItem[] = [
  { icon: LayoutDashboard, label: "Dashboard", path: "/dashboard" },
  { icon: UtensilsCrossed, label: "Restaurant", path: "/restaurant" },
  { icon: Train, label: "Cities", path: "/stations" },
  { icon: PhoneIncoming, label: "Callback Requests", path: "/contactrequests" },
  { icon: AlertTriangle, label: "Complaints", path: "/complaints" },
  { icon: Package, label: "Bulk Orders", path: "/bulkorder" },
  { icon: ShoppingCart, label: "All Orders", path: "/orders" },
  { icon: Download, label: "Orders Export", path: "/orders-export" },
  { icon: FileText, label: "Vendor Summary", path: "/vendor-summary" },
  { icon: FileCheck, label: "Vendor Invoice", path: "/vendor-invoice" },
  { icon: Train, label: "IRCTC Ops", path: "/admin/irctc/dashboard" },
];

// Vendor menu items (unchanged)
export const vendorMenuItems: MenuItem[] = [
  { icon: Home, label: "Home", path: "/vendor/home" },
  { icon: UtensilsCrossed, label: "Restaurant Details", path: "/vendor-detail" },
  { icon: ShoppingCart, label: "Orders", path: "/vendor/orders" },
];

// User menu items (unchanged)
export const userMenuItems: MenuItem[] = [
  { icon: Home, label: "Home", path: "/home" },
  { icon: History, label: "Order History", path: "/order-history" },
  { icon: AlertCircle, label: "Complaint", path: "/createcomplaint" },
  { icon: Shield, label: "Privacy Policy", path: "/privacy-policy" },
  { icon: History, label: "Shipping Policy", path: "/shipping-policy" },
  { icon: XCircle, label: "Cancellation Policy", path: "/cancellation-policy" },
  { icon: FileText, label: "Terms & Conditions", path: "/terms" },
  { icon: HelpCircle, label: "Help & Support", path: "/help" },
  { icon: CreditCard, label: "Payment Policy", path: "/payment-policy" },
  { icon: Phone, label: "Contact Us", path: "/contact" },
];

// Guest menu items (for unauthenticated users)
export const guestMenuItems: MenuItem[] = [
  { icon: Home, label: "Home", path: "/home" },
  // { icon: History, label: "Order History", path: "/order-history" },
  { icon: History, label: "Shipping Policy", path: "/shipping-policy" },
  { icon: History, label: "Order History", path: "/order-history" },
  { icon: AlertCircle, label: "Complaint", path: "/createcomplaint" },
  { icon: Shield, label: "Privacy Policy", path: "/privacy-policy" },
  { icon: XCircle, label: "Cancellation Policy", path: "/cancellation-policy" },
  { icon: FileText, label: "Terms & Conditions", path: "/terms" },
  { icon: HelpCircle, label: "Help & Support", path: "/help" },
  { icon: CreditCard, label: "Payment Policy", path: "/payment-policy" },
  { icon: Phone, label: "Contact Us", path: "/contact" },
];