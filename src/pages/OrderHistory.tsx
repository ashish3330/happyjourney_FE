import React, { useState, useEffect, useMemo } from "react";
import {
  FaDownload,
  FaMapMarkerAlt,
  FaReceipt,
  FaBoxOpen,
} from "react-icons/fa";
import { MdPayment, MdFastfood } from "react-icons/md";
import { IoTime, IoChevronDown, IoChevronUp } from "react-icons/io5";
import { CheckCircle, XCircle, Clock, Loader2, CreditCard, Wallet, Truck, ChefHat } from "lucide-react";
import { jsPDF } from "jspdf";
import autoTable from "jspdf-autotable";
import api from "@/utils/axios";
import { useAuth } from "@/contexts/AuthContext";
import { motion, AnimatePresence } from "framer-motion";
import { Skeleton } from "@/components/ui/skeleton";
import { format } from "date-fns";

interface OrderItemDTO {
  itemId: number;
  itemName?: string;
  quantity: number;
  unitPrice: number;
  specialInstructions: string | null;
  category?: string;
  imageUrl?: string | null;
}

interface OrderDTO {
  orderId: number;
  customerId: number;
  vendorId: number;
  trainId: number;
  pnrNumber: string;
  coachNumber: string;
  seatNumber: string;
  deliveryStationId: number;
  deliveryTime: string;
  orderStatus: "PLACED" | "PENDING" | "PREPARING" | "DISPATCHED" | "DELIVERED" | "CANCELLED";
  totalAmount: number;
  deliveryCharges: number;
  taxAmount: number;
  taxPercentage: number;
  discountAmount: number | null;
  finalAmount: number;
  paymentStatus: "COMPLETED" | "PENDING" | "FAILED";
  paymentMethod: "COD" | "UPI" | "CARD" | "NETBANKING" | "RAZORPAY";
  razorpayOrderID: string | null;
  deliveryInstructions: string | null;
  items: OrderItemDTO[];
  vendorName?: string;
  trainNumber?: string;
}

interface StationDTO {
  stationId: number;
  stationName: string;
  stationCode: string;
  city: string;
  state: string;
}

interface MenuItemDTO {
  itemId: number;
  itemName: string;
  description: string;
  category: string;
  imageUrl: string | null;
}

interface VendorDTO {
  vendorId: number;
  businessName: string;
}

interface PageResponse<T> {
  content: T[];
  pageable: {
    pageNumber: number;
    pageSize: number;
  };
  totalElements: number;
  totalPages: number;
}

const statusConfig = {
  PLACED: {
    color: "bg-teal-50 text-teal-800",
    icon: <Clock className="w-4 h-4" />,
    label: "Order Placed",
  },
  PENDING: {
    color: "bg-amber-50 text-amber-800",
    icon: <Clock className="w-4 h-4" />,
    label: "Pending Confirmation",
  },
  PREPARING: {
    color: "bg-purple-50 text-purple-800",
    icon: <ChefHat className="w-4 h-4" />,
    label: "Preparing Your Meal",
  },
  DISPATCHED: {
    color: "bg-teal-50 text-teal-800",
    icon: <Truck className="w-4 h-4" />,
    label: "Order Dispatched",
  },
  DELIVERED: {
    color: "bg-green-50 text-green-800",
    icon: <CheckCircle className="w-4 h-4" />,
    label: "Delivered Successfully",
  },
  CANCELLED: {
    color: "bg-red-50 text-red-800",
    icon: <XCircle className="w-4 h-4" />,
    label: "Order Cancelled",
  },
};

const paymentConfig = {
  COMPLETED: {
    color: "bg-green-50 text-green-800",
    icon: <CheckCircle className="w-4 h-4" />,
    label: "Payment Successful",
  },
  PENDING: {
    color: "bg-amber-50 text-amber-800",
    icon: <Clock className="w-4 h-4" />,
    label: "Payment Pending",
  },
  FAILED: {
    color: "bg-red-50 text-red-800",
    icon: <XCircle className="w-4 h-4" />,
    label: "Payment Failed",
  },
};

const paymentMethodConfig = {
  COD: {
    color: "text-red-600",
    icon: <Wallet className="w-5 h-5" />,
    label: "Cash on Delivery",
  },
  UPI: {
    color: "text-teal-600",
    icon: <MdPayment className="w-5 h-5" />,
    label: "UPI Payment",
  },
  CARD: {
    color: "text-purple-600",
    icon: <CreditCard className="w-5 h-5" />,
    label: "Credit/Debit Card",
  },
  NETBANKING: {
    color: "text-green-600",
    icon: <MdPayment className="w-5 h-5" />,
    label: "Net Banking",
  },
  RAZORPAY: {
    color: "text-green-600",
    icon: <MdPayment className="w-5 h-5" />,
    label: "Razorpay",
  },
};

const OrderHistory: React.FC = () => {
  const { userId, accessToken, username } = useAuth();
  const [activeOrders, setActiveOrders] = useState<OrderDTO[]>([]);
  const [historicalOrders, setHistoricalOrders] = useState<OrderDTO[]>([]);
  const [stationData, setStationData] = useState<{ [key: number]: StationDTO }>({});
  const [itemData, setItemData] = useState<{ [key: number]: MenuItemDTO }>({});
  const [vendorData, setVendorData] = useState<{ [key: number]: VendorDTO }>({});
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [expandedOrderId, setExpandedOrderId] = useState<number | null>(null);
  const [activeTab, setActiveTab] = useState<"active" | "completed">("active");

  // Safe data access functions
  const getStatusConfig = (status: OrderDTO["orderStatus"]) => {
    return statusConfig[status] || statusConfig.PLACED;
  };

  const getPaymentConfig = (status: OrderDTO["paymentStatus"]) => {
    return paymentConfig[status] || paymentConfig.PENDING;
  };

  const getPaymentMethodConfig = (method: OrderDTO["paymentMethod"]) => {
    return paymentMethodConfig[method] || paymentMethodConfig.COD;
  };

  // Format date safely
  const formatDate = (dateString: string, forPdf = false): string => {
    try {
      if (!dateString) return "N/A";
      
      const date = new Date(dateString);
      if (isNaN(date.getTime())) return "Invalid Date";
      
      if (forPdf) {
        return format(date, "dd MMM yyyy, hh:mm a");
      }
      return format(date, "PPPp");
    } catch (error) {
      console.error("Error formatting date:", error);
      return "Date Error";
    }
  };

  const fetchOrdersAndData = async () => {
    if (!userId || !accessToken) {
      setError("Authentication required. Please log in.");
      setLoading(false);
      return;
    }

    setLoading(true);
    setError(null);

    try {
      const [activeResponse, historicalResponse] = await Promise.all([
        api.get<PageResponse<OrderDTO>>("/orders/user/active", {
          params: { page: 0, size: 100 },
          headers: { Authorization: `Bearer ${accessToken}` },
        }),
        api.get<PageResponse<OrderDTO>>("/orders/user/historical", {
          params: { page: 0, size: 100 },
          headers: { Authorization: `Bearer ${accessToken}` },
        }),
      ]);

      const activeOrdersData = activeResponse.data?.content || [];
      const historicalOrdersData = historicalResponse.data?.content || [];
      const allOrders = [...activeOrdersData, ...historicalOrdersData];

      if (allOrders.length === 0) {
        setActiveOrders([]);
        setHistoricalOrders([]);
        setLoading(false);
        return;
      }

      const [stationsData, itemsData, vendorsData] = await Promise.all([
        fetchStationData(allOrders),
        fetchItemData(allOrders),
        fetchVendorData(allOrders),
      ]);

      const transformedOrders = allOrders.map((order) => ({
        ...order,
        items: (order.items || []).map((item) => ({
          ...item,
          itemName: itemsData[item.itemId]?.itemName || `Item #${item.itemId}`,
          category: itemsData[item.itemId]?.category,
          imageUrl: itemsData[item.itemId]?.imageUrl,
          specialInstructions: item.specialInstructions || "No special instructions",
        })),
        vendorName: vendorsData[order.vendorId]?.businessName || `Vendor #${order.vendorId}`,
        trainNumber: order.trainNumber || `${order.trainId}`,
      }));

      setActiveOrders(
        transformedOrders.filter((o) => ["PLACED", "PENDING", "PREPARING", "DISPATCHED"].includes(o.orderStatus))
      );
      setHistoricalOrders(transformedOrders.filter((o) => ["DELIVERED", "CANCELLED"].includes(o.orderStatus)));

      setStationData(stationsData);
      setItemData(itemsData);
      setVendorData(vendorsData);
    } catch (err: any) {
      console.error("Order fetch error:", err);
      setError(err.response?.data?.message || "Failed to fetch orders. Please try again later.");
    } finally {
      setLoading(false);
    }
  };

  const fetchStationData = async (orders: OrderDTO[]) => {
    if (!accessToken) return stationData;
    
    const stationIds = [...new Set(orders.map((o) => o.deliveryStationId))];
    const existingStations = Object.keys(stationData).map(Number);
    const newStationIds = stationIds.filter((id) => !existingStations.includes(id));

    if (newStationIds.length === 0) return stationData;

    try {
      const responses = await Promise.all(
        newStationIds.map((id) =>
          api
            .get<StationDTO>(`/stations/${id}`, {
              headers: { Authorization: `Bearer ${accessToken}` },
            })
            .catch(() => null)
        )
      );

      const newStations = responses.reduce((acc, res, index) => {
        if (res && res.data) {
          acc[newStationIds[index]] = res.data;
        }
        return acc;
      }, {} as { [key: number]: StationDTO });

      return { ...stationData, ...newStations };
    } catch (err) {
      console.error("Failed to fetch some cities:", err);
      return stationData;
    }
  };

  const fetchItemData = async (orders: OrderDTO[]) => {
    if (!accessToken) return itemData;
    
    const itemIds = [...new Set(orders.flatMap((o) => (o.items || []).map((i) => i.itemId)))];
    const existingItems = Object.keys(itemData).map(Number);
    const newItemIds = itemIds.filter((id) => !existingItems.includes(id));

    if (newItemIds.length === 0) return itemData;

    try {
      const responses = await Promise.all(
        newItemIds.map((id) =>
          api
            .get<MenuItemDTO>(`/menu/items/${id}`, {
              headers: { Authorization: `Bearer ${accessToken}` },
            })
            .catch(() => null)
        )
      );

      const newItems = responses.reduce((acc, res, index) => {
        if (res && res.data) {
          acc[newItemIds[index]] = res.data;
        }
        return acc;
      }, {} as { [key: number]: MenuItemDTO });

      return { ...itemData, ...newItems };
    } catch (err) {
      console.error("Failed to fetch some items:", err);
      return itemData;
    }
  };

  const fetchVendorData = async (orders: OrderDTO[]) => {
    if (!accessToken) return vendorData;
    
    const vendorIds = [...new Set(orders.map((o) => o.vendorId))];
    const existingVendors = Object.keys(vendorData).map(Number);
    const newVendorIds = vendorIds.filter((id) => !existingVendors.includes(id));

    if (newVendorIds.length === 0) return vendorData;

    try {
      const responses = await Promise.all(
        newVendorIds.map((id) =>
          api
            .get<VendorDTO>(`/vendors/${id}`, {
              headers: { Authorization: `Bearer ${accessToken}` },
            })
            .catch(() => null)
          )
      );

      const newVendors = responses.reduce((acc, res, index) => {
        if (res && res.data) {
          acc[newVendorIds[index]] = res.data;
        }
        return acc;
      }, {} as { [key: number]: VendorDTO });

      return { ...vendorData, ...newVendors };
    } catch (err) {
      console.error("Failed to fetch vendors:", err);
      return vendorData;
    }
  };

  useEffect(() => {
    fetchOrdersAndData();
  }, [userId, accessToken]);

  const generateInvoice = (order: OrderDTO) => {
    try {
      const doc = new jsPDF({
        orientation: "portrait",
        unit: "mm",
        format: "a4",
      });

      // Setting up fonts and margins
      doc.setFont("helvetica", "normal");
      const marginLeft = 14;
      const marginRight = 14;
      const pageWidth = doc.internal.pageSize.width;
      const labelColumnWidth = 100;
      let currentY = 20;

      // Header
      doc.setFontSize(22);
      doc.setTextColor(30, 64, 175);
      doc.setFont("helvetica", "bold");
      doc.text("HappyJourney", pageWidth / 2, currentY, { align: "center" });
      currentY += 6;

      doc.setFontSize(10);
      doc.setTextColor(100, 116, 139);
      doc.text("Food Delivery On The Go", pageWidth / 2, currentY, { align: "center" });
      currentY += 10;

      // Order Information
      doc.setFontSize(16);
      doc.setTextColor(0, 0, 0);
      doc.text(`ORDER #${order.orderId}`, marginLeft, currentY);
      currentY += 8;

      doc.setFontSize(10);
      doc.text(`Date: ${formatDate(order.deliveryTime, true)}`, marginLeft, currentY);
      currentY += 4;
      doc.text(`Customer ID: ${order.customerId}`, marginLeft, currentY);
      currentY += 4;
      doc.text(`Customer Name: ${username || "N/A"}`, marginLeft, currentY);
      currentY += 4;
      doc.text(`House Number: ${order.pnrNumber || "N/A"}`, marginLeft, currentY);
      currentY += 10;

      // Delivery Information
      doc.setFontSize(12);
      doc.setTextColor(30, 64, 175);
      doc.text("Delivery Information", marginLeft, currentY);
      currentY += 6;

      doc.setFontSize(10);
      doc.setTextColor(0, 0, 0);
      const station = stationData[order.deliveryStationId];
      doc.text(
        `City: ${station ? `${station.stationName} (${station.stationCode})` : `City #${order.deliveryStationId}`}`,
        marginLeft,
        currentY
      );
      currentY += 4;
      doc.text(`Street Num: ${order.trainNumber || `Street Num #${order.trainId}`}`, marginLeft, currentY);
      currentY += 4;
      doc.text(`House Num/Floor: ${order.coachNumber}/${order.seatNumber}`, marginLeft, currentY);
      currentY += 4;
      doc.text(`Delivery Time: ${formatDate(order.deliveryTime, true)}`, marginLeft, currentY);
      currentY += 4;
      doc.text(`Vendor: ${order.vendorName || `Vendor #${order.vendorId}`}`, marginLeft, currentY);
      currentY += 4;
      if (order.deliveryInstructions) {
        doc.text(`Instructions: ${order.deliveryInstructions}`, marginLeft, currentY, { maxWidth: 170 });
        currentY += 6 + Math.ceil(doc.getTextWidth(`Instructions: ${order.deliveryInstructions}`) / 170) * 5;
      } else {
        currentY += 2;
      }

      // Order Items
      doc.setFontSize(12);
      doc.setTextColor(30, 64, 175);
      doc.text("Order Items", marginLeft, currentY);
      currentY += 6;

      const headers = [["No.", "Item", "Qty", "Unit Price", "Total", "Notes"]];
      const data = (order.items || []).map((item, index) => [
        index + 1,
        item.itemName || `Item #${item.itemId}`,
        item.quantity,
        `₹${(item.unitPrice || 0).toFixed(2)}`,
        `₹${((item.quantity || 0) * (item.unitPrice || 0)).toFixed(2)}`,
        item.specialInstructions || "-",
      ]);

      autoTable(doc, {
        startY: currentY,
        head: headers,
        body: data,
        theme: "grid",
        headStyles: {
          fillColor: [30, 64, 175],
          textColor: 255,
          fontStyle: "bold",
          fontSize: 9,
        },
        columnStyles: {
          0: { cellWidth: 10 },
          1: { cellWidth: 60 },
          2: { cellWidth: 15 },
          3: { cellWidth: 25 },
          4: { cellWidth: 25 },
          5: { cellWidth: 55 },
        },
        styles: {
          fontSize: 9,
          cellPadding: 3,
          overflow: "linebreak",
        },
      });

      currentY = (doc as any).lastAutoTable.finalY + 10;

      // Order Summary
      doc.setFontSize(12);
      doc.setTextColor(30, 64, 175);
      doc.text("Order Summary", marginLeft, currentY);
      currentY += 6;

      doc.setFontSize(10);
      doc.setTextColor(0, 0, 0);
      doc.text("Subtotal:", pageWidth - marginRight - labelColumnWidth, currentY);
      doc.text(`₹${(order.totalAmount || 0).toFixed(2)}`, pageWidth - marginRight, currentY, { align: "right" });
      currentY += 6;
      doc.text("Delivery Charges:", pageWidth - marginRight - labelColumnWidth, currentY);
      doc.text(`₹${(order.deliveryCharges || 0).toFixed(2)}`, pageWidth - marginRight, currentY, { align: "right" });
      currentY += 6;
      doc.text(`GST (${order.taxPercentage || 5}%):`, pageWidth - marginRight - labelColumnWidth, currentY);
      doc.text(`₹${(order.taxAmount || 0).toFixed(2)}`, pageWidth - marginRight, currentY, { align: "right" });
      currentY += 6;
      if (order.discountAmount && order.discountAmount > 0) {
        doc.text("Discount:", pageWidth - marginRight - labelColumnWidth, currentY);
        doc.text(`-₹${order.discountAmount.toFixed(2)}`, pageWidth - marginRight, currentY, { align: "right" });
        currentY += 6;
      }
      doc.setFont("helvetica", "bold");
      doc.text("Total Amount:", pageWidth - marginRight - labelColumnWidth, currentY);
      doc.text(`₹${(order.finalAmount || 0).toFixed(2)}`, pageWidth - marginRight, currentY, { align: "right" });
      currentY += 10;

      // Payment Information
      doc.setFont("helvetica", "normal");
      doc.setFontSize(12);
      doc.setTextColor(30, 64, 175);
      doc.text("Payment Information", marginLeft, currentY);
      currentY += 6;

      doc.setFontSize(10);
      doc.setTextColor(0, 0, 0);
      const paymentMethod = getPaymentMethodConfig(order.paymentMethod);
      doc.text(`Method: ${paymentMethod.label}`, marginLeft, currentY);
      currentY += 4;
      const paymentStatus = getPaymentConfig(order.paymentStatus);
      doc.text(`Status: ${paymentStatus.label}`, marginLeft, currentY);
      currentY += 4;
      if (order.razorpayOrderID) {
        doc.text(`Transaction ID: ${order.razorpayOrderID}`, marginLeft, currentY);
        currentY += 4;
      }

      // Footer
      doc.setFontSize(8);
      doc.setTextColor(100, 116, 139);
      doc.text("Thank you for choosing RelSwad!", pageWidth / 2, 280, { align: "center" });
      doc.text("For any queries, please contact support@thehappyjourneyy.com", pageWidth / 2, 284, { align: "center" });

      doc.save(`HappyJourney_Invoice_${order.orderId}.pdf`);
    } catch (error) {
      console.error("Error generating invoice:", error);
      alert("Failed to generate invoice. Please try again.");
    }
  };

  const currentOrders = useMemo(
    () => (activeTab === "active" ? activeOrders : historicalOrders),
    [activeTab, activeOrders, historicalOrders]
  );

  const toggleOrderDetails = (orderId: number) => {
    setExpandedOrderId(expandedOrderId === orderId ? null : orderId);
  };

  const canDownloadInvoice = (order: OrderDTO) => {
    return order.orderStatus === "DELIVERED" || order.paymentStatus === "COMPLETED";
  };

  const STEPS = ["Placed", "Confirmed", "Preparing", "On the Way", "Delivered"];
  const stepIndex: Record<string, number> = {
    PLACED: 0, PENDING: 1, PREPARING: 2, DISPATCHED: 3, DELIVERED: 4, CANCELLED: -1,
  };

  const borderColor = (status: OrderDTO["orderStatus"]) => {
    if (status === "DELIVERED") return "border-l-green-500";
    if (status === "CANCELLED") return "border-l-red-400";
    return "border-l-teal-500";
  };

  const totalSpent = historicalOrders
    .filter((o) => o.orderStatus === "DELIVERED")
    .reduce((s, o) => s + (o.finalAmount || 0), 0);

  if (loading) {
    return (
      <div className="min-h-screen bg-[#f8f9fb]">
        <div className="bg-white border-b border-gray-100 px-4 sm:px-8 py-8">
          <Skeleton className="h-8 w-44 mb-2" />
          <Skeleton className="h-4 w-64" />
        </div>
        <div className="max-w-3xl mx-auto px-4 sm:px-6 py-8 space-y-4">
          {[1, 2, 3].map((i) => (
            <div key={i} className="bg-white rounded-2xl p-5 border border-gray-100 space-y-4">
              <div className="flex justify-between">
                <div className="space-y-2">
                  <Skeleton className="h-5 w-40" />
                  <Skeleton className="h-3 w-28" />
                </div>
                <Skeleton className="h-8 w-24 rounded-full" />
              </div>
              <Skeleton className="h-3 w-3/4" />
            </div>
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#f8f9fb]">

      {/* ── Page header ── */}
      <div className="bg-white border-b border-gray-100">
        <div className="max-w-3xl mx-auto px-4 sm:px-6 py-8">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div>
              <h1 className="text-2xl font-extrabold text-gray-900 tracking-tight">My Orders</h1>
              <p className="text-sm text-gray-500 mt-1">
                {activeOrders.length + historicalOrders.length} orders · ₹{totalSpent.toFixed(0)} spent
              </p>
            </div>
            <button
              onClick={fetchOrdersAndData}
              disabled={loading}
              className="flex items-center gap-2 px-4 py-2 rounded-xl border border-gray-200 text-sm font-medium text-gray-600 hover:bg-gray-50 transition-colors self-start sm:self-auto"
            >
              {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : "↻"} Refresh
            </button>
          </div>

          {/* Tabs */}
          <div className="flex gap-2 mt-6">
            {(["active", "completed"] as const).map((tab) => (
              <button
                key={tab}
                onClick={() => setActiveTab(tab)}
                className={`px-5 py-2 rounded-full text-sm font-semibold transition-all ${
                  activeTab === tab
                    ? "bg-teal-600 text-white shadow-sm"
                    : "bg-gray-100 text-gray-500 hover:bg-gray-200"
                }`}
              >
                {tab === "active" ? "Active" : "Completed"}
                <span className={`ml-2 text-xs px-1.5 py-0.5 rounded-full font-bold ${
                  activeTab === tab ? "bg-white/20 text-white" : "bg-gray-200 text-gray-500"
                }`}>
                  {tab === "active" ? activeOrders.length : historicalOrders.length}
                </span>
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* ── Content ── */}
      <div className="max-w-3xl mx-auto px-4 sm:px-6 py-6 space-y-4">
        {error ? (
          <div className="bg-white rounded-2xl p-10 text-center border border-red-100">
            <div className="w-14 h-14 bg-red-50 rounded-full flex items-center justify-center mx-auto mb-4">
              <XCircle className="w-7 h-7 text-red-500" />
            </div>
            <h3 className="text-lg font-bold text-gray-900">Something went wrong</h3>
            <p className="text-sm text-gray-500 mt-1 mb-5">{error}</p>
            <button
              onClick={fetchOrdersAndData}
              className="px-5 py-2.5 bg-teal-600 text-white rounded-xl text-sm font-semibold hover:bg-teal-700 transition-colors"
            >
              Try Again
            </button>
          </div>
        ) : currentOrders.length === 0 ? (
          <div className="bg-white rounded-2xl p-14 text-center border border-gray-100">
            <div className="w-16 h-16 bg-teal-50 rounded-full flex items-center justify-center mx-auto mb-4">
              <FaBoxOpen className="w-7 h-7 text-teal-500" />
            </div>
            <h3 className="text-lg font-bold text-gray-900">
              No {activeTab === "active" ? "active" : "completed"} orders
            </h3>
            <p className="text-sm text-gray-400 mt-1">
              {activeTab === "active"
                ? "Your live orders will show up here."
                : "Your past orders will appear here once delivered."}
            </p>
          </div>
        ) : (
          currentOrders.map((order) => {
            const sc = getStatusConfig(order.orderStatus);
            const pc = getPaymentConfig(order.paymentStatus);
            const pmc = getPaymentMethodConfig(order.paymentMethod);
            const isExpanded = expandedOrderId === order.orderId;
            const currentStep = stepIndex[order.orderStatus] ?? 0;
            const previewItems = (order.items || []).slice(0, 2);
            const extraCount = (order.items || []).length - 2;

            return (
              <motion.div
                key={order.orderId}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.25 }}
                className={`bg-white rounded-2xl border-l-4 border border-gray-100 overflow-hidden ${borderColor(order.orderStatus)}`}
              >
                {/* ── Card header ── */}
                <button
                  className="w-full text-left p-5 hover:bg-gray-50/50 transition-colors"
                  onClick={() => toggleOrderDetails(order.orderId)}
                >
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex-1 min-w-0">
                      {/* Restaurant + order id */}
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="text-base font-extrabold text-gray-900 truncate">
                          {order.vendorName || `Vendor #${order.vendorId}`}
                        </span>
                        <span className="text-xs text-gray-400 font-medium shrink-0">#{order.orderId}</span>
                      </div>

                      {/* Date + city */}
                      <div className="flex items-center gap-3 mt-1 flex-wrap">
                        <span className="text-xs text-gray-400 flex items-center gap-1">
                          <IoTime size={11} /> {formatDate(order.deliveryTime)}
                        </span>
                        <span className="text-xs text-gray-400 flex items-center gap-1">
                          <FaMapMarkerAlt size={10} />
                          {stationData[order.deliveryStationId]?.stationName || `City #${order.deliveryStationId}`}
                        </span>
                      </div>

                      {/* Items preview */}
                      <p className="text-xs text-gray-500 mt-2 truncate">
                        {previewItems.map((i) => i.itemName).join(", ")}
                        {extraCount > 0 && <span className="text-teal-600 font-semibold"> +{extraCount} more</span>}
                      </p>
                    </div>

                    {/* Right: amount + status + chevron */}
                    <div className="flex flex-col items-end gap-2 shrink-0">
                      <span className="text-lg font-extrabold text-teal-600">₹{(order.finalAmount || 0).toFixed(0)}</span>
                      <span className={`inline-flex items-center gap-1 text-[11px] font-semibold px-2.5 py-1 rounded-full ${sc.color}`}>
                        {sc.icon}
                        {sc.label}
                      </span>
                      <span className="text-gray-400">{isExpanded ? <IoChevronUp size={16} /> : <IoChevronDown size={16} />}</span>
                    </div>
                  </div>

                  {/* ── Step tracker (active non-cancelled orders) ── */}
                  {activeTab === "active" && order.orderStatus !== "CANCELLED" && (
                    <div className="mt-4 pt-4 border-t border-gray-50">
                      <div className="flex items-center">
                        {STEPS.map((step, i) => (
                          <React.Fragment key={step}>
                            <div className="flex flex-col items-center">
                              <div className={`w-6 h-6 rounded-full flex items-center justify-center text-[10px] font-bold transition-colors ${
                                i < currentStep ? "bg-teal-500 text-white"
                                : i === currentStep ? "bg-teal-600 text-white ring-4 ring-teal-100"
                                : "bg-gray-100 text-gray-400"
                              }`}>
                                {i < currentStep ? "✓" : i + 1}
                              </div>
                              <span className={`text-[9px] mt-1 font-medium hidden sm:block ${
                                i <= currentStep ? "text-teal-600" : "text-gray-400"
                              }`}>{step}</span>
                            </div>
                            {i < STEPS.length - 1 && (
                              <div className={`flex-1 h-0.5 mx-1 rounded-full ${i < currentStep ? "bg-teal-500" : "bg-gray-200"}`} />
                            )}
                          </React.Fragment>
                        ))}
                      </div>
                    </div>
                  )}
                </button>

                {/* ── Expanded details ── */}
                <AnimatePresence>
                  {isExpanded && (
                    <motion.div
                      initial={{ opacity: 0, height: 0 }}
                      animate={{ opacity: 1, height: "auto" }}
                      exit={{ opacity: 0, height: 0 }}
                      transition={{ duration: 0.25 }}
                      className="overflow-hidden"
                    >
                      <div className="px-5 pb-5 pt-1 border-t border-gray-100 space-y-5">

                        {/* Order items */}
                        <div>
                          <p className="text-xs font-bold text-gray-400 uppercase tracking-wider mb-3 flex items-center gap-1.5">
                            <MdFastfood className="text-teal-500" /> Items ({order.items?.length || 0})
                          </p>
                          <div className="space-y-2">
                            {(order.items || []).map((item) => (
                              <div key={`${order.orderId}-${item.itemId}`} className="flex justify-between items-start bg-gray-50 rounded-xl px-4 py-3">
                                <div className="min-w-0">
                                  <p className="text-sm font-semibold text-gray-800 truncate">{item.itemName}</p>
                                  {item.specialInstructions && item.specialInstructions !== "No special instructions" && (
                                    <p className="text-xs text-gray-400 mt-0.5">Note: {item.specialInstructions}</p>
                                  )}
                                </div>
                                <div className="text-right shrink-0 ml-4">
                                  <p className="text-sm font-bold text-gray-900">₹{((item.quantity || 0) * (item.unitPrice || 0)).toFixed(0)}</p>
                                  <p className="text-xs text-gray-400">{item.quantity} × ₹{(item.unitPrice || 0).toFixed(0)}</p>
                                </div>
                              </div>
                            ))}
                          </div>
                        </div>

                        {/* Delivery + Payment row */}
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                          <div className="bg-gray-50 rounded-xl p-4 space-y-2">
                            <p className="text-xs font-bold text-gray-400 uppercase tracking-wider flex items-center gap-1.5 mb-3">
                              <Truck size={12} className="text-teal-500" /> Delivery
                            </p>
                            {[
                              ["City", stationData[order.deliveryStationId]?.stationName || `#${order.deliveryStationId}`],
                              ["Address", `${order.coachNumber} / ${order.seatNumber}`],
                              ["Vendor", order.vendorName || `#${order.vendorId}`],
                              ["Time", formatDate(order.deliveryTime)],
                              ...(order.deliveryInstructions ? [["Note", order.deliveryInstructions]] : []),
                            ].map(([label, value]) => (
                              <div key={label} className="flex justify-between gap-2">
                                <span className="text-xs text-gray-400 shrink-0">{label}</span>
                                <span className="text-xs font-medium text-gray-700 text-right">{value}</span>
                              </div>
                            ))}
                          </div>

                          <div className="bg-gray-50 rounded-xl p-4 space-y-2">
                            <p className="text-xs font-bold text-gray-400 uppercase tracking-wider flex items-center gap-1.5 mb-3">
                              <MdPayment className="text-teal-500" /> Payment
                            </p>
                            {[
                              ["Method", pmc.label],
                              ["Status", pc.label],
                              ...(order.razorpayOrderID ? [["Txn ID", order.razorpayOrderID]] : []),
                            ].map(([label, value]) => (
                              <div key={label} className="flex justify-between gap-2">
                                <span className="text-xs text-gray-400 shrink-0">{label}</span>
                                <span className="text-xs font-medium text-gray-700 text-right truncate">{value}</span>
                              </div>
                            ))}
                          </div>
                        </div>

                        {/* Price breakdown */}
                        <div className="bg-teal-50 rounded-xl p-4">
                          <p className="text-xs font-bold text-gray-400 uppercase tracking-wider mb-3 flex items-center gap-1.5">
                            <FaReceipt className="text-teal-500" /> Bill Summary
                          </p>
                          <div className="space-y-1.5">
                            {[
                              ["Subtotal", `₹${(order.totalAmount || 0).toFixed(2)}`],
                              ["Delivery", `₹${(order.deliveryCharges || 0).toFixed(2)}`],
                              [`GST (${order.taxPercentage || 5}%)`, `₹${(order.taxAmount || 0).toFixed(2)}`],
                              ...(order.discountAmount && order.discountAmount > 0
                                ? [["Discount", `-₹${order.discountAmount.toFixed(2)}`]]
                                : []),
                            ].map(([label, value]) => (
                              <div key={label} className="flex justify-between text-sm text-gray-600">
                                <span>{label}</span>
                                <span className={label === "Discount" ? "text-green-600 font-medium" : ""}>{value}</span>
                              </div>
                            ))}
                            <div className="flex justify-between pt-2 mt-1 border-t border-teal-200">
                              <span className="text-sm font-extrabold text-gray-900">Total</span>
                              <span className="text-base font-extrabold text-teal-600">₹{(order.finalAmount || 0).toFixed(2)}</span>
                            </div>
                          </div>
                        </div>

                        {/* Actions */}
                        {canDownloadInvoice(order) && (
                          <button
                            onClick={() => generateInvoice(order)}
                            className="w-full flex items-center justify-center gap-2 py-3 rounded-xl bg-teal-600 text-white text-sm font-bold hover:bg-teal-700 transition-colors"
                          >
                            <FaDownload className="w-3.5 h-3.5" /> Download Invoice
                          </button>
                        )}
                      </div>
                    </motion.div>
                  )}
                </AnimatePresence>
              </motion.div>
            );
          })
        )}
      </div>
    </div>
  );
};

export default OrderHistory;