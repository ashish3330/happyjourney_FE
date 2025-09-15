import React, { useState, useEffect, useMemo } from "react";
import {
  FaRupeeSign,
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
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
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
  paymentMethod: "COD" | "UPI" | "CARD" | "NETBANKING";
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
    color: "bg-blue-50 text-blue-800",
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
    color: "bg-orange-50 text-orange-800",
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
    color: "text-blue-600",
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

  useEffect(() => {
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

        const activeOrdersData = activeResponse.data.content || [];
        const historicalOrdersData = historicalResponse.data.content || [];
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
          items: order.items.map((item) => ({
            ...item,
            itemName: itemsData[item.itemId]?.itemName || `Item #${item.itemId}`,
            category: itemsData[item.itemId]?.category,
            imageUrl: itemsData[item.itemId]?.imageUrl,
            specialInstructions: item.specialInstructions || "No special instructions",
          })),
          vendorName: vendorsData[order.vendorId]?.businessName || `Vendor #${order.vendorId}`,
          trainNumber: order.trainNumber || `Train #${order.trainId}`,
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
        console.error("Failed to fetch some stations:", err);
        return stationData;
      }
    };

    const fetchItemData = async (orders: OrderDTO[]) => {
      const itemIds = [...new Set(orders.flatMap((o) => o.items.map((i) => i.itemId)))];
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

    fetchOrdersAndData();
  }, [userId, accessToken]);

  const generateInvoice = (order: OrderDTO) => {
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
    const labelColumnWidth = 100; // Width for labels (e.g., "Subtotal")
    let currentY = 20;

    // Header
    doc.setFontSize(22);
    doc.setTextColor(30, 64, 175);
    doc.setFont("helvetica", "bold");
    doc.text("RelSwad", pageWidth / 2, currentY, { align: "center" });
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
    doc.text(`PNR: ${order.pnrNumber || "N/A"}`, marginLeft, currentY);
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
      `Station: ${station ? `${station.stationName} (${station.stationCode})` : `Station #${order.deliveryStationId}`}`,
      marginLeft,
      currentY
    );
    currentY += 4;
    doc.text(`Train: ${order.trainNumber || `Train #${order.trainId}`}`, marginLeft, currentY);
    currentY += 4;
    doc.text(`Coach/Seat: ${order.coachNumber}/${order.seatNumber}`, marginLeft, currentY);
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
    const data = order.items.map((item, index) => [
      index + 1,
      item.itemName || `Item #${item.itemId}`,
      item.quantity,
      `₹${item.unitPrice.toFixed(2)}`,
      `₹${(item.quantity * item.unitPrice).toFixed(2)}`,
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
    // Label column (left-aligned)
    doc.text("Subtotal:", pageWidth - marginRight - labelColumnWidth, currentY);
    doc.text(`₹${order.totalAmount.toFixed(2)}`, pageWidth - marginRight, currentY, { align: "right" });
    currentY += 6;
    doc.text("Delivery Charges:", pageWidth - marginRight - labelColumnWidth, currentY);
    doc.text(`₹${order.deliveryCharges.toFixed(2)}`, pageWidth - marginRight, currentY, { align: "right" });
    currentY += 6;
    doc.text(`IGST (${order.taxPercentage || 5}%):`, pageWidth - marginRight - labelColumnWidth, currentY);
    doc.text(`₹${order.taxAmount.toFixed(2)}`, pageWidth - marginRight, currentY, { align: "right" });
    currentY += 6;
    if (order.discountAmount && order.discountAmount > 0) {
      doc.text("Discount:", pageWidth - marginRight - labelColumnWidth, currentY);
      doc.text(`-₹${order.discountAmount.toFixed(2)}`, pageWidth - marginRight, currentY, { align: "right" });
      currentY += 6;
    }
    doc.setFont("helvetica", "bold");
    doc.text("Total Amount:", pageWidth - marginRight - labelColumnWidth, currentY);
    doc.text(`₹${order.finalAmount.toFixed(2)}`, pageWidth - marginRight, currentY, { align: "right" });
    currentY += 10;

    // Payment Information
    doc.setFont("helvetica", "normal");
    doc.setFontSize(12);
    doc.setTextColor(30, 64, 175);
    doc.text("Payment Information", marginLeft, currentY);
    currentY += 6;

    doc.setFontSize(10);
    doc.setTextColor(0, 0, 0);
    doc.text(`Method: ${paymentMethodConfig[order.paymentMethod].label}`, marginLeft, currentY);
    currentY += 4;
    doc.text(`Status: ${paymentConfig[order.paymentStatus].label}`, marginLeft, currentY);
    currentY += 4;
    if (order.razorpayOrderID) {
      doc.text(`Transaction ID: ${order.razorpayOrderID}`, marginLeft, currentY);
      currentY += 4;
    }

    // Footer
    doc.setFontSize(8);
    doc.setTextColor(100, 116, 139);
    doc.text("Thank you for choosing RelSwad!", pageWidth / 2, 280, { align: "center" });
    doc.text("For any queries, please contact support@railway.com", pageWidth / 2, 284, { align: "center" });

    doc.save(`RelSwad_Invoice_${order.orderId}.pdf`);
  };

  const currentOrders = useMemo(
    () => (activeTab === "active" ? activeOrders : historicalOrders),
    [activeTab, activeOrders, historicalOrders]
  );

  const toggleOrderDetails = (orderId: number) => {
    setExpandedOrderId(expandedOrderId === orderId ? null : orderId);
  };

  const formatDate = (dateString: string, forPdf = false) => {
    const date = new Date(dateString);
    if (forPdf) {
      return format(date, "dd MMM yyyy, hh:mm a");
    }
    return format(date, "PPPp");
  };

  const getOrderProgress = (status: OrderDTO["orderStatus"]) => {
    switch (status) {
      case "PLACED":
        return 20;
      case "PENDING":
        return 40;
      case "PREPARING":
        return 70;
      case "DISPATCHED":
        return 85;
      case "DELIVERED":
        return 100;
      case "CANCELLED":
        return 0;
      default:
        return 0;
    }
  };

  const canDownloadInvoice = (order: OrderDTO) => {
    return order.orderStatus === "DELIVERED" || order.paymentStatus === "COMPLETED";
  };

  if (loading) {
    return (
      <div className="p-4 sm:p-6 lg:p-8 max-w-7xl mx-auto space-y-6">
        <div className="flex justify-between items-center">
          <Skeleton className="h-8 w-48" />
          <div className="flex space-x-2">
            <Skeleton className="h-10 w-24" />
            <Skeleton className="h-10 w-24" />
          </div>
        </div>
        <div className="space-y-4">
          {[1, 2, 3].map((i) => (
            <div key={i} className="bg-white rounded-lg shadow-sm p-6 space-y-4">
              <div className="flex justify-between">
                <Skeleton className="h-6 w-32" />
                <Skeleton className="h-6 w-24" />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <Skeleton className="h-4 w-full" />
                <Skeleton className="h-4 w-full" />
                <Skeleton className="h-4 w-full" />
                <Skeleton className="h-4 w-full" />
              </div>
              <div className="flex justify-end space-x-2">
                <Skeleton className="h-9 w-20" />
                <Skeleton className="h-9 w-20" />
              </div>
            </div>
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="p-4 sm:p-6 lg:p-8 max-w-7xl mx-auto">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center mb-6 gap-4">
        <div>
          <h1 className="text-2xl sm:text-3xl font-bold text-gray-900">My Orders</h1>
          <p className="text-sm text-gray-500 mt-1">
            {activeTab === "active" ? "Your current and upcoming orders" : "Your completed order"}
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="outline" size="sm" onClick={() => { /* fetchOrdersAndData is not defined */ }} disabled={loading}>
            {loading ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : "Refresh"}
          </Button>
          <div className="inline-flex rounded-lg border border-gray-200 bg-white">
            <button
              onClick={() => setActiveTab("active")}
              className={`px-4 py-2 text-sm font-medium ${
                activeTab === "active"
                  ? "bg-blue-50 text-blue-600 border-blue-500 border-t-2 border-b-2"
                  : "text-gray-500 hover:text-gray-700"
              }`}
            >
              Active ({activeOrders.length})
            </button>
            <button
              onClick={() => setActiveTab("completed")}
              className={`px-4 py-2 text-sm font-medium ${
                activeTab === "completed"
                  ? "bg-blue-50 text-blue-600 border-blue-500 border-t-2 border-b-2"
                  : "text-gray-500 hover:text-gray-700"
              }`}
            >
              Completed ({historicalOrders.length})
            </button>
          </div>
        </div>
      </div>

      {error ? (
        <div className="bg-white rounded-xl shadow-sm p-6 text-center border border-red-100">
          <div className="mx-auto flex items-center justify-center h-12 w-12 rounded-full bg-red-50">
            <XCircle className="h-6 w-6 text-red-600" />
          </div>
          <h3 className="mt-3 text-lg font-medium text-gray-900">Error loading orders</h3>
          <p className="mt-2 text-sm text-gray-500">{error}</p>
          <Button variant="outline" className="mt-4" onClick={() => { /* fetchOrdersAndData is not defined */ }} disabled={loading}>
            {loading ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : "Try Again"}
          </Button>
        </div>
      ) : currentOrders.length === 0 ? (
        <div className="bg-white rounded-xl shadow-sm p-6 text-center border border-gray-100">
          <div className="mx-auto flex items-center justify-center h-12 w-12 rounded-full bg-blue-50">
            <FaBoxOpen className="h-6 w-6 text-blue-600" />
          </div>
          <h3 className="mt-3 text-lg font-medium text-gray-900">
            No {activeTab === "active" ? "active" : "completed"} orders found
          </h3>
          <p className="mt-2 text-sm text-gray-500">
            {activeTab === "active" ? "Your upcoming orders will appear here" : "Your completed orders will appear here"}
          </p>
        </div>
      ) : (
        <div className="space-y-4">
          {currentOrders.map((order) => (
            <motion.div
              key={order.orderId}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.3 }}
              className="bg-white rounded-xl shadow-sm overflow-hidden border border-gray-100"
            >
              <div className="p-4 sm:p-6">
                <div className="flex flex-col sm:flex-row justify-between gap-4">
                  <div>
                    <div className="flex items-center gap-3">
                      <h2 className="text-lg font-semibold text-gray-900">Order #{order.orderId}</h2>
                      <Badge variant="outline" className={`${statusConfig[order.orderStatus].color} py-1 px-2.5`}>
                        <div className="flex items-center gap-1.5">
                          {statusConfig[order.orderStatus].icon}
                          <span>{statusConfig[order.orderStatus].label}</span>
                        </div>
                      </Badge>
                    </div>
                    <p className="text-sm text-gray-500 mt-1 flex items-center">
                      <IoTime className="mr-1.5" />
                      {formatDate(order.deliveryTime)}
                    </p>
                    <p className="text-sm text-gray-500 mt-1 flex items-center">
                      <FaMapMarkerAlt className="mr-1.5" />
                      {stationData[order.deliveryStationId]
                        ? `${stationData[order.deliveryStationId].stationName} (${stationData[order.deliveryStationId].stationCode})`
                        : `Station #${order.deliveryStationId}`}
                    </p>
                  </div>
                  <div className="flex items-center gap-2 sm:gap-3">
                    <div className="text-right">
                      <p className="text-sm text-gray-500">Total Amount</p>
                      <p className="text-lg font-semibold flex items-center justify-end">
                        <FaRupeeSign className="mr-1" size={14} />
                        {order.finalAmount.toFixed(2)}
                      </p>
                    </div>
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={() => toggleOrderDetails(order.orderId)}
                      className="rounded-full"
                    >
                      {expandedOrderId === order.orderId ? (
                        <IoChevronUp className="w-5 h-5" />
                      ) : (
                        <IoChevronDown className="w-5 h-5" />
                      )}
                    </Button>
                  </div>
                </div>
                {activeTab === "active" && order.orderStatus !== "CANCELLED" && (
                  <div className="mt-4">
                    <div className="flex justify-between text-xs text-gray-500 mb-1">
                      <span>Order Placed</span>
                      <span>{order.orderStatus === "DELIVERED" ? "Delivered" : "In Progress"}</span>
                    </div>
                    <div className="w-full bg-gray-200 rounded-full h-2">
                      <div
                        className="bg-blue-600 h-2 rounded-full"
                        style={{ width: `${getOrderProgress(order.orderStatus)}%` }}
                      ></div>
                    </div>
                  </div>
                )}
              </div>
              <AnimatePresence>
                {expandedOrderId === order.orderId && (
                  <motion.div
                    initial={{ opacity: 0, height: 0 }}
                    animate={{ opacity: 1, height: "auto" }}
                    exit={{ opacity: 0, height: 0 }}
                    transition={{ duration: 0.3 }}
                    className="border-t border-gray-100 overflow-hidden"
                  >
                    <div className="p-4 sm:p-6 grid grid-cols-1 md:grid-cols-2 gap-6">
                      <div className="space-y-4">
                        <h3 className="text-lg font-semibold flex items-center gap-2">
                          <Truck className="w-5 h-5 text-blue-600" />
                          Delivery Information
                        </h3>
                        <div className="space-y-3">
                          <div className="flex justify-between">
                            <span className="text-sm text-gray-500">Station</span>
                            <span className="text-sm font-medium text-right">
                              {stationData[order.deliveryStationId] ? (
                                <Tooltip>
                                  <TooltipTrigger className="text-left">
                                    {stationData[order.deliveryStationId].stationName}
                                  </TooltipTrigger>
                                  <TooltipContent>
                                    {stationData[order.deliveryStationId].city}, {stationData[order.deliveryStationId].state}
                                  </TooltipContent>
                                </Tooltip>
                              ) : (
                                `Station #${order.deliveryStationId}`
                              )}
                            </span>
                          </div>
                          <div className="flex justify-between">
                            <span className="text-sm text-gray-500">Train</span>
                            <span className="text-sm font-medium">{order.trainNumber || `Train #${order.trainId}`}</span>
                          </div>
                          <div className="flex justify-between">
                            <span className="text-sm text-gray-500">Coach/Seat</span>
                            <span className="text-sm font-medium">
                              {order.coachNumber}/{order.seatNumber}
                            </span>
                          </div>
                          <div className="flex justify-between">
                            <span className="text-sm text-gray-500">Vendor</span>
                            <span className="text-sm font-medium">{order.vendorName || `Vendor #${order.vendorId}`}</span>
                          </div>
                          <div className="flex justify-between">
                            <span className="text-sm text-gray-500">Delivery Time</span>
                            <span className="text-sm font-medium">{formatDate(order.deliveryTime)}</span>
                          </div>
                          {order.deliveryInstructions && (
                            <div className="flex justify-between">
                              <span className="text-sm text-gray-500">Instructions</span>
                              <span className="text-sm font-medium text-right max-w-xs">{order.deliveryInstructions}</span>
                            </div>
                          )}
                        </div>
                      </div>
                      <div className="space-y-4">
                        <h3 className="text-lg font-semibold flex items-center gap-2">
                          <MdFastfood className="w-5 h-5 text-blue-600" />
                          Order Items ({order.items.length})
                        </h3>
                        <div className="border rounded-lg divide-y">
                          {order.items.map((item) => (
                            <div key={`${order.orderId}-${item.itemId}`} className="p-3">
                              <div className="flex justify-between">
                                <div>
                                  <p className="font-medium">
                                    {item.itemName}
                                    {item.category && (
                                      <span className="ml-2 text-xs text-gray-500 bg-gray-100 px-2 py-0.5 rounded-full">
                                        {item.category}
                                      </span>
                                    )}
                                  </p>
                                  {item.specialInstructions && (
                                    <p className="text-xs text-gray-500 mt-1">Note: {item.specialInstructions}</p>
                                  )}
                                </div>
                                <div className="text-right">
                                  <p className="font-medium flex items-center justify-end">
                                    <FaRupeeSign className="mr-1" size={10} />
                                    {(item.quantity * item.unitPrice).toFixed(2)}
                                  </p>
                                  <p className="text-xs text-gray-500">
                                    {item.quantity} × ₹{item.unitPrice.toFixed(2)}
                                  </p>
                                </div>
                              </div>
                            </div>
                          ))}
                        </div>
                      </div>
                      <div className="space-y-4">
                        <h3 className="text-lg font-semibold flex items-center gap-2">
                          <MdPayment className="w-5 h-5 text-blue-600" />
                          Payment Information
                        </h3>
                        <div className="space-y-3">
                          <div className="flex justify-between">
                            <span className="text-sm text-gray-500">Method</span>
                            <span className="text-sm font-medium flex items-center gap-1.5">
                              <span className={paymentMethodConfig[order.paymentMethod].color}>
                                {paymentMethodConfig[order.paymentMethod].icon}
                              </span>
                              {paymentMethodConfig[order.paymentMethod].label}
                            </span>
                          </div>
                          <div className="flex justify-between">
                            <span className="text-sm text-gray-500">Status</span>
                            <Badge variant="outline" className={`${paymentConfig[order.paymentStatus].color} py-1 px-2.5`}>
                              <div className="flex items-center gap-1.5">
                                {paymentConfig[order.paymentStatus].icon}
                                <span>{paymentConfig[order.paymentStatus].label}</span>
                              </div>
                            </Badge>
                          </div>
                          {order.razorpayOrderID && (
                            <div className="flex justify-between">
                              <span className="text-sm text-gray-500">Transaction ID</span>
                              <span className="text-sm font-medium font-mono">{order.razorpayOrderID}</span>
                            </div>
                          )}
                        </div>
                      </div>
                      <div className="space-y-4">
                        <h3 className="text-lg font-semibold flex items-center gap-2">
                          <FaReceipt className="w-5 h-5 text-blue-600" />
                          Order Summary
                        </h3>
                        <div className="space-y-2">
                          <div className="flex justify-between">
                            <span className="text-sm text-gray-500">Subtotal</span>
                            <span className="text-sm font-medium">₹{order.totalAmount.toFixed(2)}</span>
                          </div>
                          <div className="flex justify-between">
                            <span className="text-sm text-gray-500">Delivery Charges</span>
                            <span className="text-sm font-medium">₹{order.deliveryCharges.toFixed(2)}</span>
                          </div>
                          <div className="flex justify-between">
                            <span className="text-sm text-gray-500">Tax ({order.taxPercentage || 5}%)</span>
                            <span className="text-sm font-medium">₹{order.taxAmount.toFixed(2)}</span>
                          </div>
                          {order.discountAmount && order.discountAmount > 0 && (
                            <div className="flex justify-between">
                              <span className="text-sm text-gray-500">Discount</span>
                              <span className="text-sm font-medium text-green-600">
                                -₹{order.discountAmount.toFixed(2)}
                              </span>
                            </div>
                          )}
                          <div className="pt-2 border-t border-gray-200 flex justify-between">
                            <span className="text-base font-semibold">Total Amount</span>
                            <span className="text-base font-semibold">₹{order.finalAmount.toFixed(2)}</span>
                          </div>
                        </div>
                        <div className="pt-4 flex justify-end gap-3">
                          <Button variant="outline" onClick={() => toggleOrderDetails(order.orderId)}>
                            Close Details
                          </Button>
                          {canDownloadInvoice(order) && (
                            <Button onClick={() => generateInvoice(order)} className="gap-2">
                              <FaDownload className="w-4 h-4" />
                              Download Invoice
                            </Button>
                          )}
                        </div>
                      </div>
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>
            </motion.div>
          ))}
        </div>
      )}
    </div>
  );
};

export default OrderHistory;