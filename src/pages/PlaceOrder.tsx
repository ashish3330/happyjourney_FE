import React, { useState, useEffect, useCallback, useMemo } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { useAuth } from "@/contexts/AuthContext";
import api from "@/utils/axios";
import { toast } from "sonner";
import { z } from "zod";

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
  preparationTime: number;
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

interface FormErrors {
  pnrNumber?: string;
  trainNumber?: string;
  coachNumber?: string;
  seatNumber?: string;
  deliveryStationId?: string;
  paymentMethod?: string;
}

interface OrderResponse {
  orderId: string;
  razorpayOrderID?: string;
  amountInPaise?: number;
  paymentMethod: string;
  paymentStatus: string;
}

// Form validation schema using zod
const formSchema = z.object({
  pnrNumber: z.string().regex(/^\d{10}$/, "PNR number must be exactly 10 digits"),
  trainNumber: z.string().min(1, "Valid train number is required").regex(/^\d+$/, "Train number must be numeric"),
  coachNumber: z.string().min(1, "Coach number is required"),
  seatNumber: z.string().min(1, "Seat number is required"),
  deliveryStationId: z.string().min(1, "Delivery station is required"),
  paymentMethod: z.enum(["COD", "ONLINE"], { message: "Please select a payment method" }),
  deliveryInstructions: z.string().optional(),
});

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
    <Label htmlFor={id} className="text-gray-700 font-medium">
      {label}
    </Label>
    <Input
      id={id}
      name={name}
      value={value}
      onChange={onChange}
      placeholder={placeholder}
      type={type}
      maxLength={maxLength}
      disabled={disabled}
      className={`mt-1 rounded-lg ${disabled ? "bg-gray-100 cursor-not-allowed" : ""} ${
        error ? "border-red-500 focus:ring-red-500" : "focus:ring-blue-500"
      }`}
      aria-invalid={!!error}
      aria-describedby={error ? `${id}-error` : undefined}
    />
    {error && (
      <p id={`${id}-error`} className="text-red-600 text-sm mt-1">
        {error}
      </p>
    )}
  </div>
);

// Reusable Order Item Component
const OrderItem: React.FC<{ item: CartItem }> = ({ item }) => (
  <div className="flex justify-between items-start p-4 bg-gray-50 rounded-lg">
    <div className="flex-1">
      <p className="text-base font-medium text-gray-900">{item.itemName}</p>
      <p className="text-sm text-gray-600">
        ₹{item.unitPrice.toFixed(2)} × {item.quantity}
      </p>
      {item.specialInstructions && (
        <p className="text-xs text-gray-500 mt-1 italic">"{item.specialInstructions}"</p>
      )}
    </div>
    <p className="text-base font-medium text-gray-900">
      ₹{(item.unitPrice * item.quantity).toFixed(2)}
    </p>
  </div>
);

const PlaceOrder: React.FC = () => {
  const { userId, role, user } = useAuth(); // Added user to get name, email, contact
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
  const [errors, setErrors] = useState<FormErrors>({});
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [retryCount, setRetryCount] = useState(0);
  const [razorpayLoaded, setRazorpayLoaded] = useState(false);
  const maxRetries = 3;

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

  // Validate vendorId
  if (isNaN(effectiveVendorId) || effectiveVendorId <= 0) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-100">
        <div className="bg-white p-8 rounded-2xl shadow-xl max-w-md w-full text-center">
          <h2 className="text-2xl font-bold text-red-600 mb-4">Invalid Vendor ID</h2>
          <p className="text-gray-600 mb-6">Please select a valid vendor to continue.</p>
          <Button
            onClick={() => navigate("/vendors")}
            className="bg-blue-600 hover:bg-blue-700 text-white rounded-full px-6 py-2"
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

      // Fetch cart summary
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

      // Fetch menu items
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
    if (vendorDetails?.preparationTime) {
      const now = new Date();
      const deliveryTime = new Date(now.getTime() + vendorDetails.preparationTime * 60 * 1000);
      const formattedTime = deliveryTime.toLocaleTimeString([], {
        hour: "2-digit",
        minute: "2-digit",
        hour12: true,
      });
      setEstimatedDeliveryTime(`${formattedTime} (${vendorDetails.preparationTime} mins)`);
    } else {
      setEstimatedDeliveryTime("Preparation time unavailable");
    }
  }, [vendorDetails]);

  // Get station name for display
  const stationDisplay = useMemo(() => {
    if (!station) return "Not selected";
    return `${station.stationName} (${station.stationCode})`;
  }, [station]);

  // Form validation
  const validateForm = useCallback(() => {
    try {
      formSchema.parse(formData);
      setErrors({});
      return true;
    } catch (err) {
      if (err instanceof z.ZodError) {
        const newErrors: FormErrors = {};
        err.errors.forEach((error) => {
          newErrors[error.path[0] as keyof FormErrors] = error.message;
        });
        setErrors(newErrors);
        logger.warn("Form validation failed", { errors: newErrors });
        return false;
      }
      return false;
    }
  }, [formData]);

  // Handle input changes
  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
    setErrors((prev) => ({ ...prev, [name]: "" }));
  };

  // Handle select changes
  const handleSelectChange = (name: string, value: string) => {
    setFormData((prev) => ({ ...prev, [name]: value }));
    setErrors((prev) => ({ ...prev, [name]: "" }));
  };

  // Place order handler with retry logic for payment verification
  const handlePlaceOrder = async () => {
    if (!validateForm()) {
      toast.error("Please correct the form errors");
      logger.warn("Order placement aborted due to form errors");
      return;
    }

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

    const orderPayload = {
      vendorId: effectiveVendorId,
      paymentMethod: formData.paymentMethod === "ONLINE" ? "RAZORPAY" : "COD",
      deliveryTime: new Date(new Date().getTime() + (vendorDetails?.preparationTime || 30) * 60 * 1000).toISOString(),
      pnrNumber: formData.pnrNumber,
      trainId: Number(formData.trainNumber),
      coachNumber: formData.coachNumber,
      seatNumber: formData.seatNumber,
      deliveryStationId: Number(formData.deliveryStationId),
      deliveryInstructions: formData.deliveryInstructions,
      cartId: cartSummary.cartId,
    };

    let orderId: string | null = null;
    try {
      logger.info(`Creating ${formData.paymentMethod} order`, { vendorId: effectiveVendorId });
      const orderResponse = await api.post("/orders", orderPayload);
      const order: OrderResponse = orderResponse.data;
      orderId = order.orderId;
      logger.info(`${formData.paymentMethod} order created`, { orderId });

      if (formData.paymentMethod === "COD") {
        setCartSummary(null);
        toast.success("🎉 Order placed successfully! You'll receive it soon!", { duration: 3000 });
        navigate("/order-history");
      } else {
        const razorpayKey = import.meta.env.VITE_RAZORPAY_KEY_ID;
        if (!razorpayKey) {
          throw new Error("Razorpay key not configured");
        }
        if (!order.razorpayOrderID || !order.amountInPaise) {
          throw new Error("Invalid Razorpay order details from server");
        }

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
          name: "SwadExpress",
          description: `Food Order #${orderId}`,
          order_id: order.razorpayOrderID,
          handler: async function (response: any) {
            let verificationAttempts = 0;
            const maxVerificationRetries = 3;
            while (verificationAttempts < maxVerificationRetries) {
              try {
                logger.info("Verifying payment", { orderId, attempt: verificationAttempts + 1 });
                await api.post(`/orders/verify`, {
                  orderId,
                  paymentId: response.razorpay_payment_id,
                  razorpayOrderId: response.razorpay_order_id,
                  signature: response.razorpay_signature,
                });
                logger.info("Payment verified successfully", { orderId });
                setCartSummary(null);
                toast.success("🎉 Payment successful! Your order is confirmed!", { duration: 3000 });
                navigate(`/order-confirmation/${orderId}`);
                return;
              } catch (error: any) {
                verificationAttempts++;
                logger.error("Payment verification failed", {
                  error: error.message,
                  attempt: verificationAttempts,
                });
                if (verificationAttempts >= maxVerificationRetries) {
                  toast.error(error.response?.data?.message || "Payment verification failed after retries");
                  try {
                    await api.delete(`/orders/cancel/${orderId}`);
                    logger.info("Temporary order deleted due to verification failure", { orderId });
                  } catch (cancelError: any) {
                    logger.error("Failed to delete temporary order", { error: cancelError.message });
                  }
                  setIsLoading(false);
                  return;
                }
                await new Promise((resolve) => setTimeout(resolve, 1000 * verificationAttempts));
              }
            }
          },
          prefill: {
            name: user?.name || "Customer Name",
            email: user?.email || "customer@example.com",
            contact: user?.contact || "9999999999",
          },
          notes: {
            orderId,
          },
          theme: {
            color: "#3399cc",
          },
          modal: {
            ondismiss: async () => {
              toast.error("Payment cancelled");
              logger.warn("Payment cancelled by user", { orderId });
              try {
                await api.delete(`/orders/cancel/${orderId}`);
                logger.info("Temporary order deleted due to payment cancellation", { orderId });
              } catch (cancelError: any) {
                logger.error("Failed to delete temporary order", { error: cancelError.message });
              }
              setIsLoading(false);
            },
          },
        };

        const razorpay = new (window as any).Razorpay(options);
        razorpay.on("payment.failed", async (response: any) => {
          toast.error(`Payment failed: ${response.error.description}`);
          logger.error("Payment failed", { orderId, description: response.error.description });
          try {
            await api.delete(`/orders/cancel/${orderId}`);
            logger.info("Temporary order deleted due to payment failure", { orderId });
          } catch (cancelError: any) {
            logger.error("Failed to delete temporary order", { error: cancelError.message });
          }
          setIsLoading(false);
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
      if (orderId) {
        try {
          await api.delete(`/orders/cancel/${orderId}`);
          logger.info("Temporary order deleted due to order creation failure", { orderId });
        } catch (cancelError: any) {
          logger.error("Failed to delete temporary order", { error: cancelError.message });
        }
      }
      setIsLoading(false);
    }
  };

  // Loading state with skeleton
  if (isLoading && !cartSummary) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-100">
        <div className="max-w-7xl w-full p-8 space-y-6">
          <div className="h-10 bg-gray-200 rounded animate-pulse"></div>
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
            <div className="col-span-2 bg-white p-8 rounded-2xl shadow-xl space-y-4">
              {[...Array(6)].map((_, i) => (
                <div key={i} className="h-16 bg-gray-200 rounded animate-pulse"></div>
              ))}
            </div>
            <div className="bg-white p-8 rounded-2xl shadow-xl space-y-4">
              {[...Array(4)].map((_, i) => (
                <div key={i} className="h-12 bg-gray-200 rounded animate-pulse"></div>
              ))}
            </div>
          </div>
        </div>
      </div>
    );
  }

  // Empty cart state
  if (!cartSummary || !cartSummary.items?.length) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-100">
        <div className="bg-white p-8 rounded-2xl shadow-xl max-w-md w-full text-center">
          <h2 className="text-2xl font-bold text-gray-800 mb-4">Your Cart is Empty</h2>
          <p className="text-gray-600 mb-6">Add some delicious items to your cart to place an order.</p>
          <Button
            onClick={() => navigate(`/vendor/${effectiveVendorId}/menu`)}
            className="bg-blue-600 hover:bg-blue-700 text-white rounded-full px-6 py-2"
          >
            Browse Menu
          </Button>
          <Button
            onClick={() => {
              setRetryCount(0);
              fetchInitialData();
            }}
            className="bg-gray-600 hover:bg-gray-700 text-white rounded-full px-6 py-2 mt-4"
          >
            Retry Loading Cart
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-100 py-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-7xl mx-auto">
        <h1 className="text-4xl font-bold text-gray-900 mb-10 text-center">
          Place Order with {vendorDetails?.vendorName || "Vendor"}
        </h1>

        {error && (
          <div className="mb-8 p-4 bg-red-50 text-red-700 rounded-lg flex items-center">
            <svg className="w-5 h-5 mr-2" fill="currentColor" viewBox="0 0 20 20" aria-hidden="true">
              <path
                fillRule="evenodd"
                d="10 18a8 8 0 100-16 8 8 0 000 16zM8.732 6.732a1 1 0 011.414 0L10 7.586l.854-.854a1 1 0 111.414 1.414L11.414 9l.854.854a1 1 0 11-1.414 1.414L10 10.414l-.854.854a1 1 0 11-1.414-1.414L8.586 9l-.854-.854a1 1 0 010-1.414z"
                clipRule="evenodd"
              />
            </svg>
            {error}
          </div>
        )}

        <div className="flex flex-col lg:flex-row gap-8">
          <div className="flex-1 bg-white rounded-2xl shadow-xl p-8">
            <h2 className="text-2xl font-semibold text-gray-900 mb-8">Delivery Details</h2>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="md:col-span-2">
                <FormField
                  label="Delivery City"
                  id="deliveryStationId"
                  name="deliveryStationId"
                  value={stationDisplay}
                  error={errors.deliveryStationId}
                  disabled={true}
                  placeholder="City not available"
                />
              </div>
              <FormField
                label="PNR Number"
                id="pnrNumber"
                name="pnrNumber"
                value={formData.pnrNumber}
                onChange={handleInputChange}
                error={errors.pnrNumber}
                placeholder="Enter 10-digit PNR"
                maxLength={10}
              />
              <FormField
                label="Doorstep Number"
                id="trainNumber"
                name="trainNumber"
                value={formData.trainNumber}
                onChange={handleInputChange}
                error={errors.trainNumber}
                placeholder="e.g., 12345"
              />
              <FormField
                label="Coach Number"
                id="coachNumber"
                name="coachNumber"
                value={formData.coachNumber}
                onChange={handleInputChange}
                error={errors.coachNumber}
                placeholder="e.g., A1"
              />
              <FormField
                label="Seat Number"
                id="seatNumber"
                name="seatNumber"
                value={formData.seatNumber}
                onChange={handleInputChange}
                error={errors.seatNumber}
                placeholder="e.g., 12"
              />
              <div className="md:col-span-2">
                <div className="p-4 bg-blue-50 rounded-lg">
                  <p className="text-blue-800 font-medium">Estimated delivery: {estimatedDeliveryTime}</p>
                  <p className="text-sm text-blue-600 mt-1">Based on vendor's preparation time</p>
                </div>
              </div>
              <div className="md:col-span-2">
                <Label htmlFor="deliveryInstructions" className="text-gray-700 font-medium">
                  Delivery Instructions (Optional)
                </Label>
                <Textarea
                  id="deliveryInstructions"
                  name="deliveryInstructions"
                  value={formData.deliveryInstructions}
                  onChange={handleInputChange}
                  placeholder="e.g., Call before delivery"
                  className="mt-1 rounded-lg h-24 focus:ring-blue-500"
                  aria-describedby="deliveryInstructions-desc"
                />
                <p id="deliveryInstructions-desc" className="text-sm text-gray-500 mt-1">
                  Add any special instructions for the delivery person
                </p>
              </div>
              <div className="md:col-span-2">
                <Label htmlFor="paymentMethod" className="text-gray-700 font-medium">
                  Payment Method
                </Label>
                <Select
                  onValueChange={(value) => handleSelectChange("paymentMethod", value)}
                  value={formData.paymentMethod}
                >
                  <SelectTrigger
                    className={`mt-1 rounded-lg ${errors.paymentMethod ? "border-red-500 focus:ring-red-500" : "focus:ring-blue-500"}`}
                    aria-invalid={!!errors.paymentMethod}
                    aria-describedby={errors.paymentMethod ? "paymentMethod-error" : undefined}
                  >
                    <SelectValue placeholder="Select Payment Method" />
                  </SelectTrigger>
                  <SelectContent className="bg-white rounded-lg shadow-lg">
                    <SelectItem value="COD" className="hover:bg-gray-100">
                      Cash on Delivery
                    </SelectItem>
                    <SelectItem value="ONLINE" className="hover:bg-gray-100">
                      Online Payment
                    </SelectItem>
                  </SelectContent>
                </Select>
                {errors.paymentMethod && (
                  <p id="paymentMethod-error" className="text-red-600 text-sm mt-1">
                    {errors.paymentMethod}
                  </p>
                )}
              </div>
            </div>
          </div>
          <div className="w-full lg:w-96 bg-white rounded-2xl shadow-xl p-8 lg:sticky lg:top-8">
            <h2 className="text-2xl font-semibold text-gray-900 mb-6">Order Summary</h2>
            <div className="space-y-4 mb-6 max-h-96 overflow-y-auto pr-2">
              {cartSummary.items.map((item) => (
                <OrderItem key={item.itemId} item={item} />
              ))}
            </div>
            <div className="border-t border-gray-200 pt-4 space-y-3">
              <div className="flex justify-between text-sm text-gray-700">
                <span>Subtotal</span>
                <span>₹{cartSummary.subtotal.toFixed(2)}</span>
              </div>
              <div className="flex justify-between text-sm text-gray-700">
                <span>GST ({((cartSummary.taxAmount / cartSummary.subtotal) * 100).toFixed(1)}%)</span>
                <span>₹{cartSummary.taxAmount.toFixed(2)}</span>
              </div>
              <div className="flex justify-between text-sm text-gray-700">
                <span>Delivery</span>
                <span>₹{cartSummary.deliveryCharges.toFixed(2)}</span>
              </div>
              <div className="flex justify-between text-lg font-bold text-gray-900 pt-3">
                <span>Total</span>
                <span>₹{cartSummary.finalAmount.toFixed(2)}</span>
              </div>
            </div>
            <Button
              className="w-full mt-8 bg-blue-600 hover:bg-blue-700 text-white rounded-full py-3 text-lg font-semibold transition-all duration-200 flex items-center justify-center"
              onClick={handlePlaceOrder}
              disabled={isLoading || (formData.paymentMethod === "ONLINE" && !razorpayLoaded)}
              aria-busy={isLoading}
            >
              {isLoading ? (
                <div className="w-6 h-6 border-2 border-white border-t-transparent rounded-full animate-spin mr-2"></div>
              ) : null}
              {isLoading ? "Processing..." : formData.paymentMethod === "COD" ? "Place Order" : "Pay Now"}
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default PlaceOrder;