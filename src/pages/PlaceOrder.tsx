import React, { useState, useEffect, useCallback, useMemo, useRef } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/contexts/AuthContext";
import api from "@/utils/axios";
import { toast } from "sonner";
import { ArrowLeft, MapPin, Clock, ShoppingBag, CreditCard, Banknote, ShoppingCart } from "lucide-react";
import { motion } from "framer-motion";

// Define interfaces
interface CartItem {
  itemId: number;
  quantity: number;
  unitPrice: number;
  itemName: string;
  specialInstructions?: string;
}

interface CartSummary {
  cartId: string;
  userId: number;
  vendorId: number;
  items: CartItem[];
  subtotal: number;
  taxAmount: number;
  deliveryCharges: number;
  finalAmount: number;
  pnrNumber?: string;
  trainId?: number;
  coachNumber?: string;
  seatNumber?: string;
  deliveryStationId?: number;
  deliveryInstructions?: string;
}

interface Station {
  stationId: number;
  stationName: string;
  stationCode: string;
  city?: string;
  state?: string;
  pincode?: string;
  latitude?: number | null;
  longitude?: number | null;
}

interface VendorDetails {
  preparationTimeMin: number;
  vendorName: string;
  stationId?: number;
}

interface MenuItem {
  itemId: number;
  itemName: string;
  basePrice: number;
  description: string;
  categoryId: number;
  vendorId: number;
  vegetarian: boolean;
  available: boolean;
}

interface OrderResponse {
  orderId: string;
  razorpayOrderID?: string;
  amountInPaise?: number;
  paymentMethod: string;
  paymentStatus: string;
}

// Payment status enum
enum PaymentStatus {
  PENDING = "PENDING",
  SUCCESS = "SUCCESS",
  FAILED = "FAILED",
  CANCELLED = "CANCELLED"
}

// Mock logger
const logger = {
  info: (msg: string, meta?: any) => console.log(`[INFO] ${msg}`, meta),
  error: (msg: string, meta?: any) => console.error(`[ERROR] ${msg}`, meta),
  warn: (msg: string, meta?: any) => console.warn(`[WARN] ${msg}`, meta),
};

// Reusable Form Field Component
const FormField: React.FC<{
  label: string;
  id: string;
  name: string;
  value: string;
  onChange?: (e: React.ChangeEvent<HTMLInputElement>) => void;
  error?: string;
  placeholder?: string;
  type?: string;
  maxLength?: number;
  disabled?: boolean;
}> = ({ label, id, name, value, onChange, error, placeholder, type = "text", maxLength, disabled = false }) => (
  <div>
    <label htmlFor={id} className="block text-xs font-semibold text-gray-500 uppercase tracking-wide mb-1.5">
      {label}
    </label>
    <input
      id={id}
      name={name}
      value={value}
      onChange={onChange}
      placeholder={placeholder}
      type={type}
      maxLength={maxLength}
      disabled={disabled}
      className={`w-full border rounded-xl px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-teal-400 bg-white transition-colors ${
        disabled ? "bg-gray-50 cursor-not-allowed text-gray-500" : ""
      } ${error ? "border-red-400 focus:ring-red-400" : "border-gray-200"}`}
      aria-invalid={!!error}
      aria-describedby={error ? `${id}-error` : undefined}
    />
    {error && (
      <p id={`${id}-error`} className="text-red-600 text-xs mt-1">
        {error}
      </p>
    )}
  </div>
);

// Reusable Order Item Component
const OrderItem: React.FC<{ item: CartItem }> = ({ item }) => (
  <div className="flex justify-between items-center">
    <div className="flex-1 min-w-0 mr-3">
      <div className="flex items-center gap-2">
        <span className="bg-teal-50 text-teal-700 text-xs font-bold rounded-md px-2 py-0.5">
          {item.quantity}x
        </span>
        <p className="text-sm font-medium text-gray-800 truncate">{item.itemName}</p>
      </div>
      {item.specialInstructions && (
        <p className="text-xs text-gray-400 mt-0.5 italic truncate">"{item.specialInstructions}"</p>
      )}
    </div>
    <p className="text-sm font-semibold text-gray-900 whitespace-nowrap">
      ₹{(item.unitPrice * item.quantity).toFixed(2)}
    </p>
  </div>
);

const PlaceOrder: React.FC = () => {
  const { userId, role, username } = useAuth();
  const navigate = useNavigate();
  const { vendorId } = useParams<{ vendorId: string }>();
  const effectiveVendorId = Number(vendorId);

  const [cartSummary, setCartSummary] = useState<CartSummary | null>(null);
  const [station, setStation] = useState<Station | null>(null);
  const [vendorDetails, setVendorDetails] = useState<VendorDetails | null>(null);
  const [estimatedDeliveryTime, setEstimatedDeliveryTime] = useState<string>("");
  const [formData, setFormData] = useState({
    pnrNumber: "",
    trainNumber: "",
    coachNumber: "",
    seatNumber: "",
    deliveryStationId: "",
    deliveryInstructions: "",
    paymentMethod: "COD" as "COD" | "ONLINE",
  });
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [retryCount, setRetryCount] = useState(0);
  const [razorpayLoaded, setRazorpayLoaded] = useState(false);
  const [pendingOrderId, setPendingOrderId] = useState<string | null>(null);
  const [showSuccess, setShowSuccess] = useState(false);
  const maxRetries = 3;

  // Refs to track payment status and prevent unwanted cancellations
  const paymentStatusRef = useRef<PaymentStatus>(PaymentStatus.PENDING);
  const isUnmountingRef = useRef(false);
  const razorpayInstanceRef = useRef<any>(null);
  const isPaymentCompleteRef = useRef(false);
  const paidAmountRef = useRef<number>(0);
  const successOrderIdRef = useRef<string>("");

  // Load Razorpay script
  useEffect(() => {
    const script = document.createElement("script");
    script.src = "https://checkout.razorpay.com/v1/checkout.js";
    script.async = true;
    script.onload = () => {
      logger.info("Razorpay checkout script loaded");
      setRazorpayLoaded(true);
    };
    script.onerror = () => {
      logger.error("Failed to load Razorpay checkout script");
      setError("Failed to load payment gateway. Please try again.");
      toast.error("Failed to load payment gateway");
    };
    document.body.appendChild(script);
    return () => {
      document.body.removeChild(script);
    };
  }, []);

  // Update payment status function
  const updatePaymentStatus = useCallback((status: PaymentStatus) => {
    paymentStatusRef.current = status;
    if (status === PaymentStatus.SUCCESS) {
      isPaymentCompleteRef.current = true;
    }
    logger.info("Payment status updated", { status });
  }, []);

  // Cancel pending order function - only call if payment is still pending
  const cancelPendingOrder = useCallback(async (orderId: string, reason: string) => {
    // Don't cancel if payment was successful or already cancelled
    if (paymentStatusRef.current === PaymentStatus.SUCCESS || isPaymentCompleteRef.current) {
      logger.info("Skipping cancellation - payment was successful", { orderId });
      return;
    }

    if (paymentStatusRef.current === PaymentStatus.CANCELLED) {
      logger.info("Skipping cancellation - already cancelled", { orderId });
      return;
    }

    try {
      logger.info("Cancelling pending order", { orderId, reason });
      updatePaymentStatus(PaymentStatus.CANCELLED);

      // Try the payment cancellation endpoint first
      try {
        await api.post(`/payments/cancel/${orderId}`);
        logger.info("Payment order cancelled successfully", { orderId });
      } catch (paymentError: any) {
        // If payment cancellation fails, try regular order cancellation
        logger.warn("Payment cancellation failed, trying regular cancellation", { orderId });
        await api.delete(`/orders/cancel/${orderId}`);
        logger.info("Regular order cancelled successfully", { orderId });
      }

      setPendingOrderId(null);
    } catch (error: any) {
      logger.error("Failed to cancel pending order", {
        orderId,
        reason,
        error: error.message
      });
      // Don't throw error here to prevent blocking navigation
    }
  }, [updatePaymentStatus]);

  // Auto-cancel pending order when component unmounts or browser closes
  useEffect(() => {
    const handleBeforeUnload = async (event: BeforeUnloadEvent) => {
      if (pendingOrderId && paymentStatusRef.current === PaymentStatus.PENDING && !isPaymentCompleteRef.current) {
        event.preventDefault();
        event.returnValue = "You have a pending payment. Are you sure you want to leave?";

        // Only cancel if we're actually leaving the page and payment is still pending
        if (!isUnmountingRef.current) {
          isUnmountingRef.current = true;
          await cancelPendingOrder(pendingOrderId, "Browser closed/tab refreshed");
        }
      }
    };

    const handleVisibilityChange = async () => {
      if (document.hidden && pendingOrderId && paymentStatusRef.current === PaymentStatus.PENDING && !isPaymentCompleteRef.current) {
        logger.warn("Page hidden with pending order", { pendingOrderId });
        // We don't cancel here as user might come back, but we log it
      }
    };

    window.addEventListener('beforeunload', handleBeforeUnload);
    document.addEventListener('visibilitychange', handleVisibilityChange);

    return () => {
      window.removeEventListener('beforeunload', handleBeforeUnload);
      document.removeEventListener('visibilitychange', handleVisibilityChange);

      // Cancel pending order when component unmounts only if payment is still pending
      if (pendingOrderId && paymentStatusRef.current === PaymentStatus.PENDING && !isPaymentCompleteRef.current) {
        isUnmountingRef.current = true;
        cancelPendingOrder(pendingOrderId, "Component unmounted")
          .catch(error => logger.error("Failed to cancel order on unmount", { error }));
      }
    };
  }, [pendingOrderId, cancelPendingOrder]);

  // Validate vendorId
  if (isNaN(effectiveVendorId) || effectiveVendorId <= 0) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-[#f8f9fb]">
        <div className="bg-white p-8 rounded-2xl shadow-xl max-w-md w-full text-center border border-gray-100">
          <h2 className="text-2xl font-bold text-red-600 mb-4">Invalid Vendor ID</h2>
          <p className="text-gray-600 mb-6">Please select a valid vendor to continue.</p>
          <Button
            onClick={() => navigate("/vendors")}
            className="bg-teal-600 hover:bg-teal-700 text-white rounded-2xl px-6 py-2"
          >
            Browse Vendors
          </Button>
        </div>
      </div>
    );
  }

  // Fetch initial data with retry logic
  const fetchInitialData = useCallback(async () => {
    if (!userId || role?.toLowerCase() !== "user") {
      toast.error("Please log in to continue");
      navigate("/login");
      return;
    }

    setIsLoading(true);
    try {
      logger.info("Fetching initial data", { vendorId: effectiveVendorId, userId });

      // Fetch cart summary - using the correct endpoint from your CartService
      const cartResponse = await api.get(`/cart/summary?vendorId=${effectiveVendorId}`);
      const cartData = cartResponse.data;
      logger.info("Cart summary fetched", { cartId: cartData.cartId, itemCount: cartData.items?.length });

      if (!cartData || !cartData.items || cartData.items.length === 0) {
        logger.warn("Empty cart detected", { cartData });
        if (retryCount < maxRetries) {
          const delay = Math.pow(2, retryCount) * 1000;
          logger.info(`Retrying cart fetch, attempt ${retryCount + 1}`, { delay });
          setTimeout(() => setRetryCount(retryCount + 1), delay);
          return;
        }
        setCartSummary(null);
        setError("Your cart is empty. Add items to proceed.");
        return;
      }

      // Fetch menu items to enrich cart items with names
      const menuItemsResponse = await api.get(`/menu/vendors/${effectiveVendorId}/items`);
      const fetchedMenuItems = menuItemsResponse.data || [];

      // Enrich cart items with itemName
      const enrichedItems = cartData.items.map((item: CartItem) => ({
        ...item,
        itemName: fetchedMenuItems.find((menuItem: MenuItem) => menuItem.itemId === item.itemId)?.itemName || "Unknown Item",
      }));

      setCartSummary({ ...cartData, items: enrichedItems });

      // Fetch vendor details
      const vendorResponse = await api.get(`/vendors/${effectiveVendorId}`);
      const vendorData = vendorResponse.data;
      setVendorDetails(vendorData);
      logger.info("Vendor details fetched", { vendorName: vendorData.vendorName });

      // Fetch station details
      if (vendorData.stationId) {
        const stationResponse = await api.get(`/stations/${vendorData.stationId}`);
        const stationData = stationResponse.data;
        setStation(stationData);
        setFormData((prev) => ({
          ...prev,
          pnrNumber: cartData.pnrNumber || "",
          trainNumber: cartData.trainId?.toString() || "",
          coachNumber: cartData.coachNumber || "",
          seatNumber: cartData.seatNumber || "",
          deliveryStationId: stationData.stationId.toString() || "",
          deliveryInstructions: cartData.deliveryInstructions || "",
        }));
        logger.info("Station details fetched", { stationId: stationData.stationId, stationName: stationData.stationName });
      } else {
        setError("Vendor station information is missing.");
        toast.error("Vendor station information is missing.");
      }
    } catch (err: any) {
      logger.error("Failed to fetch initial data", { error: err.message, status: err.response?.status });
      const errorMessage = err.response?.data?.message || "Failed to load cart data. Please try again.";
      if (retryCount < maxRetries) {
        const delay = Math.pow(2, retryCount) * 1000;
        logger.info(`Retrying fetch, attempt ${retryCount + 1}`, { delay });
        setTimeout(() => setRetryCount(retryCount + 1), delay);
        return;
      }
      setError(errorMessage);
      toast.error(errorMessage);
    } finally {
      setIsLoading(false);
    }
  }, [userId, role, effectiveVendorId, navigate, retryCount]);

  useEffect(() => {
    fetchInitialData();
  }, [fetchInitialData]);

  // Set estimated delivery time
  useEffect(() => {
    if (vendorDetails?.preparationTimeMin && Number.isInteger(vendorDetails.preparationTimeMin) && vendorDetails.preparationTimeMin > 0) {
      const now = new Date();
      const deliveryTime = new Date(now.getTime() + vendorDetails.preparationTimeMin * 60 * 1000);
      const formattedTime = deliveryTime.toLocaleTimeString('en-US', {
        hour: '2-digit',
        minute: '2-digit',
        hour12: true,
      });
      setEstimatedDeliveryTime(`${formattedTime} (${vendorDetails.preparationTimeMin} mins)`);
    } else {
      setEstimatedDeliveryTime("Preparation time unavailable");
    }
  }, [vendorDetails]);

  // Get station name for display
  const stationDisplay = useMemo(() => {
    if (!station) return "Not selected";
    return `${station.stationName} (${station.stationCode})`;
  }, [station]);

  // Handle input changes
  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: value
    }));
  };

  // Handle select changes
  const handleSelectChange = (name: string, value: string) => {
    setFormData((prev) => ({ ...prev, [name]: value }));
  };

  // Get Razorpay key
  const getRazorpayKey = async (): Promise<string> => {
    try {
      const response = await api.get("/payments/key");
      return response.data.key;
    } catch (error: any) {
      logger.error("Failed to get Razorpay key", { error: error.message });
      throw new Error("Failed to initialize payment gateway");
    }
  };

  // Cleanup razorpay instance
  const cleanupRazorpay = useCallback(() => {
    if (razorpayInstanceRef.current) {
      try {
        razorpayInstanceRef.current.close();
        razorpayInstanceRef.current = null;
      } catch (error) {
        logger.warn("Error closing Razorpay instance", { error });
      }
    }
  }, []);

  // Success handler - common function for both payment methods
  // orderId parameter is kept for consistency with the callback signature
  const handlePaymentSuccess = useCallback((_orderId: string) => {
    successOrderIdRef.current = _orderId;
    updatePaymentStatus(PaymentStatus.SUCCESS);
    setCartSummary(null);
    setPendingOrderId(null);
    cleanupRazorpay();
    // Clear global cart
    localStorage.removeItem("cartCount");
    localStorage.removeItem("cartTotal");
    localStorage.removeItem("cartVendorId");
    window.dispatchEvent(new CustomEvent("cart-updated", { detail: { count: 0, total: 0, vendorId: null } }));
    // Show animated success overlay, then navigate
    setShowSuccess(true);
    setTimeout(() => navigate("/order-history"), 2800);
  }, [updatePaymentStatus, cleanupRazorpay, navigate]);

  // Place order handler
  const handlePlaceOrder = async () => {
    if (!cartSummary || !cartSummary.items.length) {
      setError("Your cart is empty. Add items to proceed.");
      toast.error("Your cart is empty");
      logger.error("Empty cart during order placement");
      return;
    }

    if (formData.paymentMethod === "ONLINE" && !razorpayLoaded) {
      setError("Payment gateway not loaded. Please try again.");
      toast.error("Payment gateway not loaded");
      logger.error("Razorpay script not loaded");
      return;
    }

    setIsLoading(true);
    setError(null);
    paidAmountRef.current = cartSummary.finalAmount;
    // Reset payment status when starting new order
    updatePaymentStatus(PaymentStatus.PENDING);
    isPaymentCompleteRef.current = false;

    const orderPayload = {
      vendorId: effectiveVendorId,
      paymentMethod: formData.paymentMethod === "ONLINE" ? "RAZORPAY" : "COD",
      deliveryTime: new Date(new Date().getTime() + (vendorDetails?.preparationTimeMin || 30) * 60 * 1000).toISOString(),
      pnrNumber: formData.pnrNumber || undefined,
      trainId: formData.trainNumber ? Number(formData.trainNumber) : undefined,
      coachNumber: formData.coachNumber || undefined,
      seatNumber: formData.seatNumber || undefined,
      deliveryStationId: formData.deliveryStationId ? Number(formData.deliveryStationId) : undefined,
      deliveryInstructions: formData.deliveryInstructions || undefined,
    };

    let orderId: string | null = null;
    try {
      logger.info(`Creating ${formData.paymentMethod} order`, { vendorId: effectiveVendorId });

      // Call the correct endpoint from OrderController
      const orderResponse = await api.post("/orders", orderPayload);
      const order: OrderResponse = orderResponse.data;
      orderId = order.orderId;
      logger.info(`${formData.paymentMethod} order created`, { orderId });

      if (formData.paymentMethod === "COD") {
        handlePaymentSuccess(orderId);
      } else {
        // For online payment, use Razorpay
        const razorpayKey = await getRazorpayKey();
        if (!order.razorpayOrderID || !order.amountInPaise) {
          throw new Error("Invalid Razorpay order details from server");
        }

        // Set pending order ID for auto-cancellation
        setPendingOrderId(orderId);

        logger.info("Initializing Razorpay checkout", {
          orderId,
          razorpayOrderID: order.razorpayOrderID,
          amount: order.amountInPaise,
          key: razorpayKey
        });

        const options = {
          key: razorpayKey,
          amount: order.amountInPaise,
          currency: "INR",
          name: "HappyJourney",
          description: `Food Order #${orderId}`,
          image: "/favicon.svg",
          order_id: order.razorpayOrderID,
          handler: async function (response: any) {
            try {
              logger.info("Verifying payment", { orderId });

              // Call the correct payment verification endpoint
              await api.post(`/payments/verify/${orderId}`, {
                razorpay_payment_id: response.razorpay_payment_id,
                razorpay_order_id: response.razorpay_order_id,
                razorpay_signature: response.razorpay_signature,
              });

              logger.info("Payment verified successfully", { orderId });
              handlePaymentSuccess(orderId!);
            } catch (error: any) {
              // Handle "already captured" error gracefully
              if (error.response?.data?.includes("already been captured") ||
                  error.response?.data?.includes("already processed")) {
                logger.warn("Payment already captured, proceeding with success", { orderId });
                handlePaymentSuccess(orderId!);
              } else {
                logger.error("Payment verification failed", { error: error.message });
                updatePaymentStatus(PaymentStatus.FAILED);
                toast.error(error.response?.data?.message || "Payment verification failed");
                // Cancel the order since payment failed
                if (orderId) {
                  await cancelPendingOrder(orderId, "Payment verification failed");
                }
                setIsLoading(false);
              }
            }
          },
          prefill: {
            name: username || "Customer Name",
            email: "", // Email is not available in auth context
            contact: "", // Contact is not available in auth context
          },
          notes: {
            orderId,
          },
          theme: {
            color: "#0d9488",
          }
        };

        const razorpay = new (window as any).Razorpay(options);
        razorpayInstanceRef.current = razorpay;

        razorpay.on("payment.failed", async (response: any) => {
          if (paymentStatusRef.current !== PaymentStatus.SUCCESS && !isPaymentCompleteRef.current) {
            toast.error(`Payment failed: ${response.error.description}`);
            logger.error("Payment failed", { orderId, description: response.error.description });
            updatePaymentStatus(PaymentStatus.FAILED);
            // Cancel the order on payment failure only if not successful
            if (orderId) {
              await cancelPendingOrder(orderId, `Payment failed: ${response.error.description}`);
            }
            setIsLoading(false);
          }
        });

        // Additional event listeners for Razorpay
        razorpay.on("close", async () => {
          if (paymentStatusRef.current === PaymentStatus.PENDING && !isPaymentCompleteRef.current) {
            logger.warn("Razorpay popup closed by user", { orderId });
            // Only cancel if payment is still pending
            updatePaymentStatus(PaymentStatus.CANCELLED);
            if (orderId) {
              const orderIdToCancel = orderId; // Create a local constant to ensure type safety
              setTimeout(async () => {
                await cancelPendingOrder(orderIdToCancel, "Razorpay popup closed");
                setIsLoading(false);
              }, 1000);
            }
          }
        });

        razorpay.open();
      }
    } catch (err: any) {
      logger.error(`${formData.paymentMethod} order creation failed`, {
        error: err.message,
        status: err.response?.status,
      });
      const errorMessage = err.response?.data?.message || "Failed to process your order. Please try again.";
      setError(errorMessage);
      toast.error(errorMessage);
      setIsLoading(false);
    }
  };

  // Success overlay — must be before cartSummary checks
  if (showSuccess) {
    return (
      <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm px-4">
        <motion.div
          initial={{ scale: 0.75, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          transition={{ type: "spring", stiffness: 260, damping: 20 }}
          className="bg-white rounded-3xl overflow-hidden shadow-2xl w-full max-w-sm"
        >
          {/* Green header */}
          <div className="bg-gradient-to-br from-green-500 to-emerald-600 px-8 pt-10 pb-8 flex flex-col items-center text-center">
            {/* Animated circle + checkmark */}
            <div className="relative w-20 h-20 mb-5">
              <motion.svg viewBox="0 0 100 100" className="w-full h-full -rotate-90">
                <circle cx="50" cy="50" r="44" fill="none" stroke="rgba(255,255,255,0.25)" strokeWidth="8" />
                <motion.circle
                  cx="50" cy="50" r="44"
                  fill="none" stroke="white" strokeWidth="8"
                  strokeLinecap="round"
                  strokeDasharray={276}
                  initial={{ strokeDashoffset: 276 }}
                  animate={{ strokeDashoffset: 0 }}
                  transition={{ duration: 0.65, ease: "easeOut", delay: 0.1 }}
                />
              </motion.svg>
              <motion.div
                initial={{ scale: 0, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                transition={{ type: "spring", stiffness: 300, damping: 18, delay: 0.6 }}
                className="absolute inset-0 flex items-center justify-center"
              >
                <svg viewBox="0 0 52 52" className="w-10 h-10">
                  <motion.path
                    fill="none" stroke="white" strokeWidth="5"
                    strokeLinecap="round" strokeLinejoin="round"
                    d="M14 27 l9 9 l16 -18"
                    initial={{ pathLength: 0 }}
                    animate={{ pathLength: 1 }}
                    transition={{ duration: 0.35, ease: "easeOut", delay: 0.65 }}
                  />
                </svg>
              </motion.div>
            </div>
            <motion.h2
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.75 }}
              className="text-2xl font-extrabold text-white"
            >
              Order Placed!
            </motion.h2>
            <motion.p
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: 0.85 }}
              className="text-green-100 text-sm mt-1"
            >
              Your food is being prepared 🍽️
            </motion.p>
          </div>

          {/* Details */}
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.9 }}
            className="px-8 py-6 flex flex-col items-center gap-4"
          >
            {/* Amount pill */}
            {paidAmountRef.current > 0 && (
              <div className="flex items-center gap-3 w-full bg-gray-50 rounded-2xl px-4 py-3">
                <div className="flex-1">
                  <p className="text-xs text-gray-400 font-medium">Amount Paid</p>
                  <p className="text-xl font-extrabold text-gray-900">₹{paidAmountRef.current.toFixed(2)}</p>
                </div>
                {successOrderIdRef.current && (
                  <div className="text-right">
                    <p className="text-xs text-gray-400 font-medium">Order ID</p>
                    <p className="text-sm font-bold text-teal-700">#{successOrderIdRef.current}</p>
                  </div>
                )}
              </div>
            )}

            {/* Progress bar */}
            <motion.div
              initial={{ scaleX: 0 }}
              animate={{ scaleX: 1 }}
              transition={{ duration: 2.5, ease: "linear", delay: 0.3 }}
              style={{ originX: 0 }}
              className="h-1 w-full bg-teal-500 rounded-full"
            />
            <p className="text-xs text-gray-400">Redirecting to your orders…</p>
          </motion.div>
        </motion.div>
      </div>
    );
  }

  // Loading skeleton
  if (isLoading && !cartSummary) {
    return (
      <div className="min-h-screen bg-[#f8f9fb] flex items-center justify-center">
        <div className="flex flex-col items-center gap-4">
          <div className="w-10 h-10 border-4 border-teal-500 border-t-transparent rounded-full animate-spin"></div>
          <p className="text-sm text-gray-500 font-medium">Loading your order...</p>
        </div>
      </div>
    );
  }

  // Empty cart state
  if (!cartSummary || !cartSummary.items?.length) {
    return (
      <div className="min-h-screen bg-[#f8f9fb] flex items-center justify-center px-4">
        <div className="bg-white p-10 rounded-2xl border border-gray-100 max-w-md w-full text-center shadow-sm">
          <div className="flex justify-center mb-4">
            <div className="w-16 h-16 bg-teal-50 rounded-full flex items-center justify-center">
              <ShoppingCart className="w-8 h-8 text-teal-500" />
            </div>
          </div>
          <h2 className="text-xl font-bold text-gray-800 mb-2">Your Cart is Empty</h2>
          <p className="text-gray-500 text-sm mb-6">Add some delicious items to your cart to place an order.</p>
          <div className="flex flex-col gap-3">
            <Button
              onClick={() => navigate(`/vendor/${effectiveVendorId}/menu`)}
              className="bg-teal-600 hover:bg-teal-700 text-white rounded-2xl py-3 font-semibold"
            >
              Browse Menu
            </Button>
            <Button
              onClick={() => {
                setRetryCount(0);
                fetchInitialData();
              }}
              variant="outline"
              className="rounded-2xl py-3 font-semibold text-gray-600 border-gray-200"
            >
              Retry
            </Button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#f8f9fb]">

      {/* Sticky Page Header */}
      <div className="sticky top-0 z-10 bg-white shadow-sm border-b border-gray-100">
        <div className="max-w-5xl mx-auto px-4 h-16 flex items-center">
          <button
            onClick={() => navigate(-1)}
            className="p-2 rounded-xl hover:bg-gray-100 transition-colors mr-3"
            aria-label="Go back"
          >
            <ArrowLeft className="w-5 h-5 text-gray-700" />
          </button>
          <div className="flex-1 text-center">
            <h1 className="text-base font-bold text-gray-900 leading-tight">Checkout</h1>
            {vendorDetails?.vendorName && (
              <p className="text-xs text-gray-400 leading-tight">{vendorDetails.vendorName}</p>
            )}
          </div>
          {/* Spacer to balance the back button */}
          <div className="w-9" />
        </div>
      </div>

      {/* Main content */}
      <div className="max-w-5xl mx-auto px-4 py-8 grid grid-cols-1 lg:grid-cols-[1fr_380px] gap-6">

        {/* LEFT COLUMN */}
        <div className="flex flex-col gap-6">

          {/* Error banner */}
          {error && (
            <div className="bg-red-50 border border-red-200 text-red-700 rounded-xl px-4 py-3 text-sm flex items-start gap-2">
              <svg className="w-4 h-4 mt-0.5 shrink-0" fill="currentColor" viewBox="0 0 20 20">
                <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.732 6.732a1 1 0 011.414 0L10 7.586l.854-.854a1 1 0 111.414 1.414L11.414 9l.854.854a1 1 0 11-1.414 1.414L10 10.414l-.854.854a1 1 0 11-1.414-1.414L8.586 9l-.854-.854a1 1 0 010-1.414z" clipRule="evenodd" />
              </svg>
              <span>{error}</span>
            </div>
          )}

          {/* Delivery Details Card */}
          <div className="bg-white rounded-2xl border border-gray-100 p-6">

            {/* Section 1: Delivery Address */}
            <div className="mb-6">
              <div className="flex items-center gap-2 mb-3">
                <MapPin className="w-4 h-4 text-teal-600" />
                <h2 className="text-sm font-bold text-gray-800 uppercase tracking-wide">Delivery Address</h2>
              </div>
              <div className="bg-teal-50 border border-teal-200 rounded-xl px-4 py-3">
                <p className="text-teal-700 text-sm font-medium">{stationDisplay}</p>
              </div>
            </div>

            {/* Section 2: Delivery Details */}
            <div className="mb-6">
              <h2 className="text-sm font-bold text-gray-800 uppercase tracking-wide mb-4">Delivery Details</h2>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <FormField
                  label="House Number"
                  id="pnrNumber"
                  name="pnrNumber"
                  value={formData.pnrNumber}
                  onChange={handleInputChange}
                  placeholder="Enter House Number"
                />
                <FormField
                  label="Floor Number"
                  id="trainNumber"
                  name="trainNumber"
                  value={formData.trainNumber}
                  onChange={handleInputChange}
                  placeholder="Enter Floor Number"
                />
                <FormField
                  label="Street Number"
                  id="coachNumber"
                  name="coachNumber"
                  value={formData.coachNumber}
                  onChange={handleInputChange}
                  placeholder="Enter Street Number"
                />
                <FormField
                  label="Pincode"
                  id="seatNumber"
                  name="seatNumber"
                  value={formData.seatNumber}
                  onChange={handleInputChange}
                  placeholder="Enter Pincode"
                />
              </div>
            </div>

            {/* Section 3: Delivery Instructions */}
            <div className="mb-6">
              <label htmlFor="deliveryInstructions" className="block text-xs font-semibold text-gray-500 uppercase tracking-wide mb-1.5">
                Delivery Instructions <span className="normal-case font-normal text-gray-400">(optional)</span>
              </label>
              <textarea
                id="deliveryInstructions"
                name="deliveryInstructions"
                value={formData.deliveryInstructions}
                onChange={handleInputChange}
                placeholder="e.g., Call before delivery, leave at door..."
                className="w-full border border-gray-200 rounded-xl px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-teal-400 bg-white resize-none h-20 transition-colors"
              />
            </div>

            {/* Section 4: Payment Method */}
            <div>
              <h2 className="text-sm font-bold text-gray-800 uppercase tracking-wide mb-3">Payment Method</h2>
              <div className="grid grid-cols-2 gap-3">
                {/* COD Button */}
                <button
                  type="button"
                  onClick={() => handleSelectChange("paymentMethod", "COD")}
                  className={`flex flex-col items-start gap-1 p-4 rounded-xl border-2 transition-all text-left ${
                    formData.paymentMethod === "COD"
                      ? "border-teal-600 bg-teal-50 text-teal-700"
                      : "border border-gray-200 text-gray-600 hover:border-teal-300"
                  }`}
                >
                  <Banknote className={`w-5 h-5 ${formData.paymentMethod === "COD" ? "text-teal-600" : "text-gray-400"}`} />
                  <span className="text-sm font-semibold leading-tight">Cash on Delivery</span>
                  <span className={`text-xs leading-tight ${formData.paymentMethod === "COD" ? "text-teal-600" : "text-gray-400"}`}>
                    Pay when you receive
                  </span>
                </button>

                {/* Online Button */}
                <button
                  type="button"
                  onClick={() => handleSelectChange("paymentMethod", "ONLINE")}
                  className={`flex flex-col items-start gap-1 p-4 rounded-xl border-2 transition-all text-left ${
                    formData.paymentMethod === "ONLINE"
                      ? "border-teal-600 bg-teal-50 text-teal-700"
                      : "border border-gray-200 text-gray-600 hover:border-teal-300"
                  }`}
                >
                  <CreditCard className={`w-5 h-5 ${formData.paymentMethod === "ONLINE" ? "text-teal-600" : "text-gray-400"}`} />
                  <span className="text-sm font-semibold leading-tight">Pay Online</span>
                  <span className={`text-xs leading-tight ${formData.paymentMethod === "ONLINE" ? "text-teal-600" : "text-gray-400"}`}>
                    UPI · Cards · Net Banking
                  </span>
                </button>
              </div>
            </div>
          </div>

          {/* Estimated Delivery Info Bar */}
          <div className="bg-teal-50 border border-teal-100 rounded-xl px-4 py-3 flex items-center gap-2">
            <Clock className="w-4 h-4 text-teal-600 shrink-0" />
            <p className="text-teal-700 text-sm font-medium">
              Estimated delivery by <span className="font-bold">{estimatedDeliveryTime}</span>
            </p>
          </div>
        </div>

        {/* RIGHT COLUMN — Order Summary */}
        <div className="lg:sticky lg:top-24 self-start">
          <div className="bg-white rounded-2xl border border-gray-100 p-6">
            {/* Title */}
            <div className="flex items-center gap-2 mb-5">
              <ShoppingBag className="w-5 h-5 text-teal-600" />
              <h2 className="text-base font-bold text-gray-900">Order Summary</h2>
            </div>

            {/* Items list */}
            <div className="max-h-60 overflow-y-auto space-y-3 mb-5 pr-1">
              {cartSummary.items.map((item) => (
                <OrderItem key={item.itemId} item={item} />
              ))}
            </div>

            {/* Divider + Price Breakdown */}
            <div className="border-t border-gray-100 pt-4 space-y-2.5">
              <div className="flex justify-between text-sm text-gray-500">
                <span>Subtotal</span>
                <span>₹{cartSummary.subtotal.toFixed(2)}</span>
              </div>
              <div className="flex justify-between text-sm text-gray-500">
                <span>GST ({((cartSummary.taxAmount / cartSummary.subtotal) * 100).toFixed(1)}%)</span>
                <span>₹{cartSummary.taxAmount.toFixed(2)}</span>
              </div>
              <div className="flex justify-between text-sm text-gray-500">
                <span>Delivery</span>
                <span>₹{cartSummary.deliveryCharges.toFixed(2)}</span>
              </div>
              <div className="flex justify-between text-base font-bold text-gray-900 pt-2 border-t border-gray-100">
                <span>Total</span>
                <span className="text-teal-700">₹{cartSummary.finalAmount.toFixed(2)}</span>
              </div>
            </div>

            {/* CTA Button */}
            <button
              onClick={handlePlaceOrder}
              disabled={isLoading || (formData.paymentMethod === "ONLINE" && !razorpayLoaded)}
              aria-busy={isLoading}
              className="w-full mt-6 py-4 bg-teal-600 hover:bg-teal-700 disabled:bg-teal-400 disabled:cursor-not-allowed text-white font-bold rounded-2xl text-base transition-colors flex items-center justify-center gap-2"
            >
              {isLoading ? (
                <>
                  <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin" />
                  <span>Processing...</span>
                </>
              ) : formData.paymentMethod === "COD" ? (
                <span>Place Order →</span>
              ) : (
                <span>Proceed to Pay · ₹{cartSummary.finalAmount.toFixed(2)}</span>
              )}
            </button>
            {/* Trust badge */}
            <div className="mt-3 flex items-center justify-center gap-1.5 text-gray-400">
              <svg className="w-3.5 h-3.5" fill="currentColor" viewBox="0 0 20 20">
                <path fillRule="evenodd" d="M10 1.944A11.954 11.954 0 012.166 5C2.056 5.649 2 6.319 2 7c0 5.225 3.34 9.67 8 11.317C14.66 16.67 18 12.225 18 7c0-.682-.057-1.35-.166-2.001A11.954 11.954 0 0110 1.944zM11 14a1 1 0 11-2 0 1 1 0 012 0zm0-7a1 1 0 10-2 0v3a1 1 0 102 0V7z" clipRule="evenodd" />
              </svg>
              <span className="text-xs font-medium">100% Secure · Powered by Razorpay</span>
            </div>
          </div>
        </div>

      </div>
    </div>
  );
};

export default PlaceOrder;
