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
} from "lucide-react";

export type MenuItem = {
  icon: LucideIcon;
  label: string;
  path: string;
};

export const adminMenuItems: MenuItem[] = [
  { icon: LayoutDashboard, label: "Dashboard", path: "/dashboard" },
  { icon: UtensilsCrossed, label: "Restaurant", path: "/restaurant" },
  { icon: Train, label: "Stations", path: "/stations" }, // MapPin → Train (if stations are transport-related)
  { icon: PhoneIncoming, label: "Callback Requests", path: "/contactrequests" }, // PhoneCallback → PhoneIncoming
  { icon: AlertTriangle, label: "Complaints", path: "/complaints" }, // AlertCircle → AlertTriangle (more urgent)
  { icon: Package, label: "Bulk Orders", path: "/bulkorder" }, // BulkOrder → "Bulk Orders" (better readability)
  {icon:  ShoppingCart, label: "All Orders", path: "/orders" },
  {icon:  Download, label: "Orders Export", path: "/orders-export"},
];

export const vendorMenuItems: MenuItem[] = [
  { icon: Home, label: "Home", path: "/vendor/home" },
  { icon: UtensilsCrossed, label: "Restaurant Details", path: "/vendor-detail" },
  { icon: ShoppingCart, label: "Orders", path: "/vendor/orders"  },
];

export const userMenuItems: MenuItem[] = [
  { icon: Home, label: "Home", path: "/home" },
  // { icon: ShoppingCart, label: "My Orders", path: "/orders" },
  // { icon: Wallet, label: "Wallet", path: "/wallet" },
  { icon: History, label: "Order History", path: "/order-history" },
  { icon: AlertCircle, label: "Complaint", path: "/createcomplaint" },  
  // { icon: MessageSquare, label: "Feedback", path: "/feedback" },
  { icon: Shield, label: "Privacy Policy", path: "/privacy-policy" },
  { icon: XCircle, label: "Cancellation Policy", path: "/cancellation-policy" },
  { icon: FileText, label: "Terms & Conditions", path: "/terms" },
  { icon: HelpCircle, label: "Help & Support", path: "/help" },
  { icon: Phone, label: "Contact Us", path: "/contact" }

];