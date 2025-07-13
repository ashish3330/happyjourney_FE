import { BrowserRouter, Navigate, Route, Routes } from "react-router-dom";
import PublicLayout from "./layout/PublicLayout";
import Login from "./pages/Login";
import Otp from "./pages/Otp";
import Dashboard from "./pages/Dashboard";
import Media from "./pages/Media";
import AdminRegister from "./pages/AdminRegister";
import UserRegister from "./pages/UserRegister";
import Restaurant from "./pages/Restaurant";
import Station from "./pages/Station";
import RestaurantDetail from "./pages/RestaurantDetail";
import AdminOrders from "./pages/AdminOrders";
import VendorHome from "./pages/VendorHome";
import PaymentPolicy from "./pages/PaymentPolicy";
import OrderFood from "./pages/OrderFood";
import VendorOrders from "./pages/VendorOrders";
import { AuthProvider, useAuth } from "./contexts/AuthContext";
import PrivateRoute from "./layout/PrivateRoute";
import BulkOrderForm from "./pages/BulkOrderForm";
import WalletPage from "./pages/WalletPage";
import CancellationPolicy from "./pages/CancellationPolicy";
import HelpAndSupport from "./pages/HelpAndSupport ";
import OrderHistory from "./pages/OrderHistory";
import PrivacyPolicy from "./pages/PrivacyPolicy";
import TermsAndConditions from "./pages/TermsAndConditions";
import ComplaintForm from "./pages/ComplaintForm";
import ContactForm from "./pages/ContactForm";
import FeedbackForm from "./pages/FeedbackForm";
import UserOrder from "./pages/UserOrder";
import PlaceOrder from "./pages/PlaceOrder";
import OrderConfirmation from "./pages/OrderConfirmation";
import BulkOrdersDashboard from "./pages/BulkOrderDashboard";
import ComplaintsDashboard from "./pages/ComplaintsDashboard";
import CallbacksDashboard from "./pages/CallbacksDashboard";
import OrdersExportDashboard from "./pages/OrdersExportDashboard";
import { RelswadFooter } from "./components/FooterConfigs";
import UserPasswordlessLogin from "./pages/UserPasswordlessLogin";
import ShippingPolicy from "./pages/ShippingPolicy";
import VendorLedgerSummary from "./pages/VendorLedgerSummary";

const FooterWrapper = () => {
  const { accessToken } = useAuth();
  return accessToken ? <RelswadFooter /> : null;
};

const App = () => {
  return (
    <AuthProvider>
      <BrowserRouter>
        <Routes>
          {/* Routes without navbar and sidebar */}
          <Route path="/login" element={<UserPasswordlessLogin />} />
          <Route path="/admin-vendor/login" element={<Login />} />
          <Route path="/passwordless-login" element={<UserPasswordlessLogin />} />
          <Route path="/register" element={<UserRegister />} />
          <Route path="/admin/register" element={<AdminRegister />} />
          <Route path="/verify-otp" element={<Otp />} />
          <Route path="/shipping-policy" element={<ShippingPolicy />} />
          {/* Public routes with navbar and sidebar */}
          <Route element={<PublicLayout />}>
            <Route path="/home" element={<OrderFood />} />
            <Route path="/user-order/:id" element={<UserOrder />} />
            <Route path="/unauthorized" element={<div>Unauthorized Access</div>} />
            <Route path="*" element={<div>404 Not Found</div>} />
          </Route>

          {/* Admin protected routes */}
          <Route element={<PrivateRoute allowedRoles={["admin"]} />}>
            <Route path="/dashboard" element={<Dashboard />} />
            <Route path="/media" element={<Media />} />
            <Route path="/restaurant" element={<Restaurant />} />
            <Route path="/bulkorder" element={<BulkOrdersDashboard />} />
            <Route path="/stations" element={<Station />} />
            <Route path="/complaints" element={<ComplaintsDashboard />} />
            <Route path="/contactrequests" element={<CallbacksDashboard />} />
            <Route path="/vendor-detail/:id" element={<RestaurantDetail />} />
            <Route path="/orders/" element={<AdminOrders />} />
            <Route path="/orders-export/" element={<OrdersExportDashboard />} />
            <Route path="/vendor-summary/" element={<VendorLedgerSummary />} />

          </Route>

          {/* Vendor protected routes */}
          <Route element={<PrivateRoute allowedRoles={["vendor"]} />}>
            <Route path="/vendor/home" element={<VendorHome />} />
            <Route path="/vendor/orders" element={<VendorOrders />} />
          </Route>

          {/* User protected routes */}
          <Route element={<PrivateRoute allowedRoles={["user"]} />}>
            <Route path="/cart" element={<OrderFood />} />
            <Route path="/bulk-order" element={<BulkOrderForm />} />
            <Route path="/createcomplaint" element={<ComplaintForm />} />
            <Route path="/feedback" element={<FeedbackForm />} />
            <Route path="/contact" element={<ContactForm />} />
            <Route path="/wallet" element={<WalletPage />} />
            <Route path="/order-history" element={<OrderHistory />} />
            <Route path="/privacy-policy" element={<PrivacyPolicy />} />
            <Route path="/cancellation-policy" element={<CancellationPolicy />} />
            <Route path="/payment-policy" element={<PaymentPolicy />} />
            <Route path="/terms" element={<TermsAndConditions />} />
            <Route path="/help" element={<HelpAndSupport />} />
            <Route path="/checkout/:vendorId" element={<PlaceOrder />} />
            <Route path="/order-confirmation/:orderId" element={<OrderConfirmation />} />
            <Route path="/shipping-policy/" element={<ShippingPolicy />} />
          </Route>

          {/* Root route */}
          <Route
            path="/"
            element={
              <Navigate
                to={
                  localStorage.getItem("accessToken")
                    ? localStorage.getItem("role")?.toLowerCase() === "admin"
                      ? "/dashboard"
                      : localStorage.getItem("role")?.toLowerCase() === "vendor"
                      ? "/vendor/home"
                      : "/home"
                    : "/home"
                }
                replace
              />
            }
          />
        </Routes>
        <FooterWrapper />
      </BrowserRouter>
    </AuthProvider>
  );
};

export default App;