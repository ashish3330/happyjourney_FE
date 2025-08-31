import React, { useState, useEffect } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { Button } from "@/components/ui/button";
import api from "@/utils/axios";
import { toast } from "sonner";

// Mock logger
const logger = {
  info: (msg: string, meta?: any) => console.log(`[INFO] ${msg}`, meta),
  error: (msg: string, meta?: any) => console.error(`[ERROR] ${msg}`, meta),
};

// Define interfaces
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
        logger.info("Fetching order details", { orderId });
        const response = await api.get(`/orders/${orderId}`);
        const orderData = response.data;
        setOrder({
          orderId: orderData.orderId,
          vendorName: orderData.vendor?.businessName || "Vendor",
          deliveryStation: orderData.deliveryStation?.stationName || "Unknown Station",
          deliveryTime: new Date(orderData.deliveryTime).toLocaleString(),
          items: orderData.items.map((item: any) => ({
            itemId: item.itemId,
            itemName: item.itemName || "Unknown Item",
            quantity: item.quantity,
            unitPrice: item.unitPrice,
            specialInstructions: item.specialInstructions,
          })),
          subtotal: orderData.totalAmount,
          taxAmount: orderData.taxAmount,
          deliveryCharges: orderData.deliveryCharges,
          finalAmount: orderData.finalAmount,
          paymentMethod: orderData.paymentMethod,
          paymentStatus: orderData.paymentStatus,
        });
        logger.info("Order details fetched successfully", { orderId });
      } catch (err: any) {
        logger.error("Failed to fetch order details", { error: err.message });
        setError(err.response?.data?.message || "Failed to load order details.");
        toast.error(err.response?.data?.message || "Failed to load order details.");
      } finally {
        setIsLoading(false);
      }
    };

    if (orderId) {
      fetchOrderDetails();
    }
  }, [orderId]);

  const handleDownloadInvoice = async () => {
    try {
      logger.info("Downloading invoice", { orderId });
      const response = await api.get(`/payments/invoice/${orderId}`, {
        responseType: "blob",
      });
      const url = window.URL.createObjectURL(new Blob([response.data]));
      const link = document.createElement("a");
      link.href = url;
      link.setAttribute("download", `invoice-${orderId}.pdf`);
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      window.URL.revokeObjectURL(url);
      logger.info("Invoice downloaded successfully", { orderId });
      toast.success("Invoice downloaded successfully!");
    } catch (err: any) {
      logger.error("Failed to download invoice", { error: err.message });
      toast.error("Failed to download invoice. Please try again.");
    }
  };

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-100">
        <div className="bg-white p-8 rounded-2xl shadow-xl max-w-2xl w-full">
          <div className="h-8 bg-gray-200 rounded animate-pulse mb-4"></div>
          {[...Array(5)].map((_, i) => (
            <div key={i} className="h-6 bg-gray-200 rounded animate-pulse mb-2"></div>
          ))}
        </div>
      </div>
    );
  }

  if (error || !order) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-100">
        <div className="bg-white p-8 rounded-2xl shadow-xl max-w-md w-full text-center">
          <h2 className="text-2xl font-bold text-red-600 mb-4">Error</h2>
          <p className="text-gray-600 mb-6">{error || "Order not found."}</p>
          <Button
            onClick={() => navigate("/order-history")}
            className="bg-blue-600 hover:bg-blue-700 text-white rounded-full px-6 py-2"
          >
            View Order History
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-100 py-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-2xl mx-auto bg-white rounded-2xl shadow-xl p-8">
        <h1 className="text-3xl font-bold text-gray-900 mb-6">Order Confirmation</h1>
        <div className="space-y-6">
          <div>
            <h2 className="text-xl font-semibold text-gray-800">Order #{order.orderId}</h2>
            <p className="text-gray-600">Thank you for your order! Your food will be delivered soon.</p>
          </div>
          <div className="border-t border-gray-200 pt-4">
            <h3 className="text-lg font-medium text-gray-900">Order Details</h3>
            <p className="text-gray-600">Vendor: {order.vendorName}</p>
            <p className="text-gray-600">Delivery City: {order.deliveryStation}</p>
            <p className="text-gray-600">Estimated Delivery: {order.deliveryTime}</p>
            <p className="text-gray-600">Payment Method: {order.paymentMethod}</p>
            <p className="text-gray-600">Payment Status: {order.paymentStatus}</p>
          </div>
          <div className="border-t border-gray-200 pt-4">
            <h3 className="text-lg font-medium text-gray-900">Items</h3>
            {order.items.map((item) => (
              <div key={item.itemId} className="flex justify-between py-2">
                <div>
                  <p className="text-gray-800">{item.itemName} x {item.quantity}</p>
                  {item.specialInstructions && (
                    <p className="text-sm text-gray-500 italic">"{item.specialInstructions}"</p>
                  )}
                </div>
                <p className="text-gray-800">₹{(item.unitPrice * item.quantity).toFixed(2)}</p>
              </div>
            ))}
          </div>
          <div className="border-t border-gray-200 pt-4">
            <div className="flex justify-between text-sm text-gray-700">
              <span>Subtotal</span>
              <span>₹{order.subtotal.toFixed(2)}</span>
            </div>
            <div className="flex justify-between text-sm text-gray-700">
              <span>GST</span>
              <span>₹{order.taxAmount.toFixed(2)}</span>
            </div>
            <div className="flex justify-between text-sm text-gray-700">
              <span>Delivery</span>
              <span>₹{order.deliveryCharges.toFixed(2)}</span>
            </div>
            <div className="flex justify-between text-lg font-bold text-gray-900 pt-2">
              <span>Total</span>
              <span>₹{order.finalAmount.toFixed(2)}</span>
            </div>
          </div>
          <div className="flex gap-4">
            <Button
              onClick={handleDownloadInvoice}
              className="bg-blue-600 hover:bg-blue-700 text-white rounded-full px-6 py-2"
            >
              Download Invoice
            </Button>
            <Button
              onClick={() => navigate("/order-history")}
              className="bg-gray-600 hover:bg-gray-700 text-white rounded-full px-6 py-2"
            >
              View Order History
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default PaymentConfirmation;