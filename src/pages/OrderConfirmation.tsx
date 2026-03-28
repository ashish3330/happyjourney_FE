import React, { useEffect, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import api from "@/utils/axios";
import { Button } from "@/components/ui/button";

interface Order {
  orderId: number;
  finalAmount: number;
  orderStatus: string;
  paymentStatus: string;
}

const OrderConfirmation: React.FC = () => {
  const { orderId } = useParams<{ orderId: string }>();
  const navigate = useNavigate();
  const [order, setOrder] = useState<Order | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchOrder = async () => {
      try {
        const response = await api.get(`/orders/${orderId}`);
        setOrder(response.data);
      } catch (err: any) {
        setError(err.response?.data?.message || "Failed to fetch order details");
      }
    };
    fetchOrder();
  }, [orderId]);

  if (error) {
    return (
      <div className="max-w-7xl mx-auto p-4">
        <div className="text-red-600 text-lg font-medium">{error}</div>
      </div>
    );
  }

  if (!order) {
    return (
      <div className="max-w-7xl mx-auto p-4">
        <div className="flex justify-center items-center h-64">
          <div className="w-8 h-8 border-4 border-teal-600 border-t-transparent rounded-full animate-spin"></div>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-7xl mx-auto p-4 sm:p-6 lg:p-8">
      <h1 className="text-3xl font-bold text-gray-800 mb-6">Order Confirmation</h1>
      <div className="bg-white rounded-xl shadow-md p-6">
        <h2 className="text-xl font-semibold text-gray-800 mb-4">
          Thank you for your order! 🎉
        </h2>
        <p className="text-gray-600 mb-4">
          Your order has been placed successfully. You'll receive a confirmation soon.
        </p>
        <div className="space-y-2">
          <p className="text-sm text-gray-700">
            <span className="font-medium">Order ID:</span> {order.orderId}
          </p>
          <p className="text-sm text-gray-700">
            <span className="font-medium">Total Amount:</span> ₹{order.finalAmount.toFixed(2)}
          </p>
          <p className="text-sm text-gray-700">
            <span className="font-medium">Order Status:</span> {order.orderStatus}
          </p>
          <p className="text-sm text-gray-700">
            <span className="font-medium">Payment Status:</span> {order.paymentStatus}
          </p>
        </div>
        <Button
          className="mt-6 bg-teal-600 hover:bg-teal-700 text-white"
          onClick={() => navigate("/orders")}
        >
          View Orders
        </Button>
      </div>
    </div>
  );
};

export default OrderConfirmation;