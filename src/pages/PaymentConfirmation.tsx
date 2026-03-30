import React, { useState, useEffect } from "react";
import { useNavigate, useParams } from "react-router-dom";
import api from "@/utils/axios";
import { toast } from "sonner";
import { motion } from "framer-motion";
import { Download, ClipboardList, MapPin, Clock, CreditCard, ChefHat } from "lucide-react";

interface OrderItem {
  itemId: number;
  itemName: string;
  quantity: number;
  unitPrice: number;
  specialInstructions?: string;
}

interface Order {
  orderId: number;
  vendorName: string;
  deliveryStation: string;
  deliveryTime: string;
  items: OrderItem[];
  subtotal: number;
  taxAmount: number;
  deliveryCharges: number;
  finalAmount: number;
  paymentMethod: string;
  paymentStatus: string;
}

const PaymentConfirmation: React.FC = () => {
  const { orderId } = useParams<{ orderId: string }>();
  const navigate = useNavigate();
  const [order, setOrder] = useState<Order | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchOrderDetails = async () => {
      setIsLoading(true);
      try {
        const response = await api.get(`/orders/${orderId}`);
        const d = response.data;
        setOrder({
          orderId: d.orderId,
          vendorName: d.vendor?.businessName || "Vendor",
          deliveryStation: d.deliveryStation?.stationName || "Unknown Station",
          deliveryTime: new Date(d.deliveryTime).toLocaleString(),
          items: d.items.map((item: any) => ({
            itemId: item.itemId,
            itemName: item.itemName || "Item",
            quantity: item.quantity,
            unitPrice: item.unitPrice,
            specialInstructions: item.specialInstructions,
          })),
          subtotal: d.totalAmount,
          taxAmount: d.taxAmount,
          deliveryCharges: d.deliveryCharges,
          finalAmount: d.finalAmount,
          paymentMethod: d.paymentMethod,
          paymentStatus: d.paymentStatus,
        });
      } catch (err: any) {
        setError(err.response?.data?.message || "Failed to load order details.");
        toast.error("Failed to load order details.");
      } finally {
        setIsLoading(false);
      }
    };
    if (orderId) fetchOrderDetails();
  }, [orderId]);

  const handleDownloadInvoice = async () => {
    try {
      const response = await api.get(`/payments/invoice/${orderId}`, { responseType: "blob" });
      const url = window.URL.createObjectURL(new Blob([response.data]));
      const link = document.createElement("a");
      link.href = url;
      link.setAttribute("download", `invoice-${orderId}.pdf`);
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      window.URL.revokeObjectURL(url);
      toast.success("Invoice downloaded!");
    } catch {
      toast.error("Failed to download invoice.");
    }
  };

  if (isLoading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="w-10 h-10 border-4 border-teal-500 border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  if (error || !order) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center px-4">
        <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-8 max-w-sm w-full text-center">
          <p className="text-red-500 font-semibold mb-4">{error || "Order not found."}</p>
          <button
            onClick={() => navigate("/order-history")}
            className="px-6 py-2.5 bg-teal-600 hover:bg-teal-700 text-white rounded-xl text-sm font-semibold transition-colors"
          >
            View Orders
          </button>
        </div>
      </div>
    );
  }

  const isOnline = order.paymentStatus === "COMPLETED";

  return (
    <div className="min-h-screen bg-gray-50 py-8 px-4">
      <div className="max-w-xl mx-auto">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.4 }}
          className="bg-white rounded-3xl shadow-sm border border-gray-100 overflow-hidden"
        >
          {/* Success header */}
          <div className="bg-gradient-to-br from-green-500 to-emerald-600 px-6 py-8 text-center">
            <motion.div
              initial={{ scale: 0 }}
              animate={{ scale: 1 }}
              transition={{ type: "spring", stiffness: 260, damping: 18, delay: 0.15 }}
              className="w-16 h-16 bg-white rounded-full flex items-center justify-center mx-auto mb-4 shadow-lg"
            >
              <svg viewBox="0 0 52 52" className="w-9 h-9">
                <motion.path
                  fill="none" stroke="#16a34a" strokeWidth="5"
                  strokeLinecap="round" strokeLinejoin="round"
                  d="M14 27 l9 9 l16 -18"
                  initial={{ pathLength: 0 }}
                  animate={{ pathLength: 1 }}
                  transition={{ duration: 0.4, ease: "easeOut", delay: 0.35 }}
                />
              </svg>
            </motion.div>
            <motion.h1
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.45 }}
              className="text-2xl font-extrabold text-white"
            >
              Order Confirmed!
            </motion.h1>
            <motion.p
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: 0.55 }}
              className="text-green-100 text-sm mt-1"
            >
              Your food is being prepared with care
            </motion.p>
            <motion.div
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ delay: 0.6 }}
              className="mt-4 inline-flex bg-white/20 backdrop-blur-sm rounded-full px-4 py-1.5"
            >
              <span className="text-white text-sm font-bold">Order #{order.orderId}</span>
            </motion.div>
          </div>

          <div className="p-5 space-y-5">
            {/* Info grid */}
            <div className="grid grid-cols-2 gap-3">
              {[
                { icon: ChefHat, label: "Vendor", value: order.vendorName },
                { icon: MapPin, label: "Delivery City", value: order.deliveryStation },
                { icon: Clock, label: "Est. Delivery", value: order.deliveryTime },
                {
                  icon: CreditCard,
                  label: "Payment",
                  value: order.paymentMethod,
                  badge: (
                    <span className={`text-[10px] font-bold mt-0.5 ${isOnline ? "text-green-600" : "text-yellow-600"}`}>
                      {order.paymentStatus}
                    </span>
                  ),
                },
              ].map(({ icon: Icon, label, value, badge }) => (
                <div key={label} className="bg-gray-50 rounded-xl p-3">
                  <div className="flex items-center gap-1.5 mb-1">
                    <Icon className="w-3.5 h-3.5 text-teal-600" />
                    <span className="text-[10px] font-semibold text-gray-400 uppercase tracking-wide">{label}</span>
                  </div>
                  <p className="text-sm font-semibold text-gray-800 leading-snug">{value}</p>
                  {badge}
                </div>
              ))}
            </div>

            {/* Items */}
            <div>
              <p className="text-xs font-bold text-gray-400 uppercase tracking-wide mb-2.5">Items Ordered</p>
              <div className="space-y-2.5">
                {order.items.map((item) => (
                  <div key={item.itemId} className="flex justify-between items-start">
                    <div className="flex items-center gap-2 min-w-0 mr-2">
                      <span className="shrink-0 bg-teal-50 text-teal-700 text-xs font-bold rounded px-1.5 py-0.5">
                        {item.quantity}×
                      </span>
                      <div className="min-w-0">
                        <p className="text-sm text-gray-800 truncate">{item.itemName}</p>
                        {item.specialInstructions && (
                          <p className="text-xs text-gray-400 italic truncate">"{item.specialInstructions}"</p>
                        )}
                      </div>
                    </div>
                    <span className="shrink-0 text-sm font-semibold text-gray-900">
                      ₹{(item.unitPrice * item.quantity).toFixed(2)}
                    </span>
                  </div>
                ))}
              </div>
            </div>

            {/* Price breakdown */}
            <div className="bg-gray-50 rounded-2xl p-4 space-y-2">
              <div className="flex justify-between text-sm text-gray-500">
                <span>Subtotal</span><span>₹{order.subtotal.toFixed(2)}</span>
              </div>
              <div className="flex justify-between text-sm text-gray-500">
                <span>GST</span><span>₹{order.taxAmount.toFixed(2)}</span>
              </div>
              <div className="flex justify-between text-sm text-gray-500">
                <span>Delivery</span><span>₹{order.deliveryCharges.toFixed(2)}</span>
              </div>
              <div className="flex justify-between text-base font-bold text-gray-900 pt-2 border-t border-gray-200">
                <span>Total Paid</span>
                <span className="text-teal-700">₹{order.finalAmount.toFixed(2)}</span>
              </div>
            </div>

            {/* CTAs */}
            <div className="flex flex-col gap-3 pt-1">
              <button
                onClick={handleDownloadInvoice}
                className="w-full flex items-center justify-center gap-2 py-3.5 rounded-2xl bg-teal-600 hover:bg-teal-700 text-white font-bold text-sm transition-colors"
              >
                <Download className="w-4 h-4" />
                Download Invoice
              </button>
              <button
                onClick={() => navigate("/order-history")}
                className="w-full flex items-center justify-center gap-2 py-3.5 rounded-2xl border border-gray-200 text-gray-700 font-semibold text-sm hover:bg-gray-50 transition-colors"
              >
                <ClipboardList className="w-4 h-4" />
                Track Your Order
              </button>
            </div>
          </div>
        </motion.div>
      </div>
    </div>
  );
};

export default PaymentConfirmation;
