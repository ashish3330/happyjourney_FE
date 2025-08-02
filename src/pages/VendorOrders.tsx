import React, { useState, useEffect, useMemo, useCallback } from "react";
import {
  FaRupeeSign,
  FaDownload,
  FaMapMarkerAlt,
  FaReceipt,
  FaBoxOpen,
} from "react-icons/fa";
import { MdPayment, MdFastfood } from "react-icons/md";
import { IoTime, IoChevronDown, IoChevronUp } from "react-icons/io5";
import {
  CheckCircle,
  XCircle,
  Clock,
  Loader2,
  CreditCard,
  Wallet,
  Truck,
  ChefHat,
} from "lucide-react";
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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import { toast } from "sonner";

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
  taxPercentage?: number;
  discountAmount: number | null;
  finalAmount: number;
  paymentStatus: "PENDING" | "CAPTURED" | "COMPLETED" | "FAILED" | "PROCESSING";
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
    color: "bg-amber-50 text-amber-800",
    icon: <Clock className="w-4 h-4" />,
    label: "Order Placed",
  },
  PENDING: {
    color: "bg-amber-50 text-amber-800",
    icon: <Clock className="w-4 h-4" />,
    label: "Pending Confirmation",
  },
  PREPARING: {
    color: "bg-blue-50 text-blue-800",
    icon: <ChefHat className="w-4 h-4" />,
    label: "Preparing Your Meal",
  },
  DISPATCHED: {
    color: "bg-indigo-50 text-indigo-800",
    icon: <Truck className="w-4 h-4" />,
    label: "Dispatched",
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
  PENDING: {
    color: "bg-amber-50 text-amber-800",
    icon: <Clock className="w-4 h-4" />,
    label: "Payment Pending",
  },
  CAPTURED: {
    color: "bg-blue-50 text-blue-800",
    icon: <CheckCircle className="w-4 h-4" />,
    label: "Payment Captured",
  },
  COMPLETED: {
    color: "bg-green-50 text-green-800",
    icon: <CheckCircle className="w-4 h-4" />,
    label: "Payment Completed",
  },
  FAILED: {
    color: "bg-red-50 text-red-800",
    icon: <XCircle className="w-4 h-4" />,
    label: "Payment Failed",
  },
  PROCESSING: {
    color: "bg-gray-50 text-gray-800",
    icon: <Loader2 className="w-4 h-4 animate-spin" />,
    label: "Payment Processing",
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

const VendorOrders: React.FC = () => {
  const { userId, accessToken } = useAuth();
  const [activeOrders, setActiveOrders] = useState<OrderDTO[]>([]);
  const [historicalOrders, setHistoricalOrders] = useState<OrderDTO[]>([]);
  const [stationData, setStationData] = useState<{ [key: number]: StationDTO }>({});
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [expandedOrderId, setExpandedOrderId] = useState<number | null>(null);
  const [activeTab, setActiveTab] = useState<"active" | "completed">("active");
  const [statusRemarks, setStatusRemarks] = useState<{ [key: number]: string }>({});
  const [codRemarks, setCodRemarks] = useState<{ [key: number]: string }>({});

  const fetchOrdersAndData = useCallback(async () => {
    if (!userId || !accessToken) {
      setError("Authentication required. Please log in as a vendor.");
      setLoading(false);
      return;
    }

    setLoading(true);
    setError(null);

    try {
      // Fetch active and historical orders
      const [activeResponse, historicalResponse] = await Promise.all([
        api.get<PageResponse<OrderDTO>>("/orders/vendor/active", {
          params: { page: 0, size: 100 },
          headers: { Authorization: `Bearer ${accessToken}` },
        }).catch((err) => {
          console.error("Failed to fetch active orders:", err);
          return { data: { content: [], pageable: { pageNumber: 0, pageSize: 100 }, totalElements: 0, totalPages: 0 } };
        }),
        api.get<PageResponse<OrderDTO>>("/orders/vendor/historical", {
          params: { page: 0, size: 100 },
          headers: { Authorization: `Bearer ${accessToken}` },
        }).catch((err) => {
          console.error("Failed to fetch historical orders:", err);
          return { data: { content: [], pageable: { pageNumber: 0, pageSize: 100 }, totalElements: 0, totalPages: 0 } };
        }),
      ]);

      const activeOrdersData = activeResponse.data.content || [];
      const historicalOrdersData = historicalResponse.data.content || [];
      const allOrders = [...activeOrdersData, ...historicalOrdersData];

      console.log("Active Orders:", activeOrdersData);
      console.log("Historical Orders:", historicalOrdersData);

      if (allOrders.length === 0) {
        setActiveOrders([]);
        setHistoricalOrders([]);
        setLoading(false);
        return;
      }

      // Fetch additional data
      const stationIds = [...new Set(allOrders.map((o) => o.deliveryStationId))];
      const itemIds = [...new Set(allOrders.flatMap((o) => o.items.map((i) => i.itemId)))];
      const vendorIds = [...new Set(allOrders.map((o) => o.vendorId))];

      const [stations, items, vendors] = await Promise.all([
        Promise.all(
          stationIds.map((id) =>
            api
              .get<StationDTO>(`/stations/${id}`, { headers: { Authorization: `Bearer ${accessToken}` } })
              .then((res) => {
                console.log(`Fetched station ${id}:`, res.data);
                return { [id]: res.data };
              })
              .catch((err) => {
                console.error(`Failed to fetch station ${id}:`, err);
                return {
                  [id]: {
                    stationId: id,
                    stationName: `Station #${id}`,
                    stationCode: "Unknown",
                    city: "Unknown",
                    state: "Unknown",
                  },
                };
              })
          )
        ).then((results) => Object.assign({}, ...results)),
        Promise.all(
          itemIds.map((id) =>
            api
              .get<MenuItemDTO>(`/menu/items/${id}`, { headers: { Authorization: `Bearer ${accessToken}` } })
              .then((res) => {
                console.log(`Fetched item ${id}:`, res.data);
                return { [id]: res.data };
              })
              .catch((err) => {
                console.error(`Failed to fetch item ${id}:`, err);
                return {
                  [id]: {
                    itemId: id,
                    itemName: `Item #${id}`,
                    description: "Unknown",
                    category: "Unknown",
                    imageUrl: null,
                  },
                };
              })
          )
        ).then((results) => Object.assign({}, ...results)),
        Promise.all(
          vendorIds.map((id) =>
            api
              .get<VendorDTO>(`/vendors/${id}`, { headers: { Authorization: `Bearer ${accessToken}` } })
              .then((res) => {
                console.log(`Fetched vendor ${id}:`, res.data);
                return { [id]: res.data };
              })
              .catch((err) => {
                console.error(`Failed to fetch vendor ${id}:`, err);
                return { [id]: { vendorId: id, businessName: `Vendor #${id}` } };
              })
          )
        ).then((results) => Object.assign({}, ...results)),
      ]);

      console.log("Fetched Stations:", stations);
      console.log("Fetched Items:", items);
      console.log("Fetched Vendors:", vendors);

      // Update state with fetched data
      setStationData((prev) => ({ ...prev, ...stations }));

      // Transform orders
      const transformedOrders = allOrders.map((order) => ({
        ...order,
        vendorName: vendors[order.vendorId]?.businessName || `Vendor #${order.vendorId}`,
        trainNumber: order.trainNumber || `Train #${order.trainId}`,
        items: order.items.map((item) => ({
          ...item,
          itemName: items[item.itemId]?.itemName || `Item #${item.itemId}`,
          category: items[item.itemId]?.category || "Unknown",
          imageUrl: items[item.itemId]?.imageUrl || null,
          specialInstructions: item.specialInstructions || "No special instructions",
        })),
      }));

      console.log("Transformed Orders:", transformedOrders);

      setActiveOrders(
        transformedOrders.filter((o) =>
          ["PLACED", "PENDING", "PREPARING", "DISPATCHED"].includes(o.orderStatus)
        )
      );
      setHistoricalOrders(
        transformedOrders.filter((o) => ["DELIVERED", "CANCELLED"].includes(o.orderStatus))
      );
    } catch (err: any) {
      console.error("Order fetch error:", err);
      setError(
        err.response?.data?.message ||
          err.message ||
          "Failed to fetch orders. Please check your connection or try again later."
      );
    } finally {
      setLoading(false);
    }
  }, [userId, accessToken]);

  useEffect(() => {
    fetchOrdersAndData();
  }, [fetchOrdersAndData]);

  const updateOrderStatus = async (
    orderId: number,
    status: OrderDTO["orderStatus"],
    remarks: string
  ) => {
    if (!userId || !accessToken) {
      toast.error("Authentication required. Please log in as a vendor.");
      return;
    }

    try {
      const response = await api.put<OrderDTO>(
        `/orders/${orderId}/status`,
        {},
        {
          params: {
            status,
            remarks: remarks || "",
            updatedById: userId,
          },
          headers: { Authorization: `Bearer ${accessToken}` },
        }
      );

      console.log(`Updated order ${orderId} status:`, response.data);

      // Update state
      setActiveOrders((prev) =>
        prev.map((order) =>
          order.orderId === orderId
            ? { ...order, orderStatus: response.data.orderStatus }
            : order
        )
      );
      setHistoricalOrders((prev) =>
        prev.map((order) =>
          order.orderId === orderId
            ? { ...order, orderStatus: response.data.orderStatus }
            : order
        )
      );

      // Move to historical if DELIVERED
      if (status === "DELIVERED") {
        setActiveOrders((prev) =>
          prev.filter((order) => order.orderId !== orderId)
        );
        setHistoricalOrders((prev) => [
          ...prev,
          {
            ...activeOrders.find((o) => o.orderId === orderId)!,
            orderStatus: "DELIVERED",
          },
        ]);
      }

      toast.success(`Status for order ${orderId} updated to ${status}.`);
    } catch (err: any) {
      console.error(`Failed to update status for order ${orderId}:`, err);
      toast.error(
        err.response?.data?.message || "Failed to update order status."
      );
    }
  };

  const markCodPaymentCompleted = async (orderId: number, remarks: string) => {
    if (!userId || !accessToken) {
      toast.error("Authentication required. Please log in as a vendor.");
      return;
    }

    try {
      await api.post(
        `/orders/${orderId}/cod/complete`,
        {},
        {
          params: {
            updatedById: userId,
            remarks: remarks || "",
          },
          headers: { Authorization: `Bearer ${accessToken}` },
        }
      );

      console.log(`Marked COD payment for order ${orderId} as completed`);

      // Update state
      setActiveOrders((prev) =>
        prev.map((order) =>
          order.orderId === orderId
            ? { ...order, paymentStatus: "COMPLETED" }
            : order
        )
      );
      setHistoricalOrders((prev) =>
        prev.map((order) =>
          order.orderId === orderId
            ? { ...order, paymentStatus: "COMPLETED" }
            : order
        )
      );

      toast.success(`COD payment for order ${orderId} marked as completed.`);
    } catch (err: any) {
      console.error(`Failed to mark COD payment for order ${orderId}:`, err);
      toast.error(
        err.response?.data?.message || "Failed to mark COD payment as completed."
      );
    }
  };

  const generateInvoice = (order: OrderDTO) => {
    const doc = new jsPDF({
      orientation: "portrait",
      unit: "mm",
      format: "a4",
    });

    doc.setFontSize(22);
    doc.setTextColor(30, 64, 175);
    doc.setFont("helvetica", "bold");
    doc.text("RAILWAY EATS", 105, 20, { align: "center" });

    doc.setFontSize(10);
    doc.setTextColor(100, 116, 139);
    doc.setFont("helvetica", "normal");
    doc.text("Food Delivery On The Go", 105, 26, { align: "center" });

    doc.setFontSize(16);
    doc.setTextColor(0, 0, 0);
    doc.text(`INVOICE #${order.orderId}`, 14, 40);

    doc.setFontSize(10);
    doc.text(`Date: ${formatDate(order.deliveryTime, true)}`, 14, 48);
    doc.text(`Customer ID: ${order.customerId}`, 14, 52);

    doc.setFontSize(12);
    doc.setTextColor(30, 64, 175);
    doc.text("Delivery Information", 14, 62);

    doc.setFontSize(10);
    doc.setTextColor(0, 0, 0);
    const station = stationData[order.deliveryStationId];
    doc.text(
      `Station: ${
        station
          ? `${station.stationName} (${station.stationCode})`
          : `Station #${order.deliveryStationId}`
      }`,
      14,
      68
    );
    doc.text(
      `Train: ${order.trainNumber || `Train #${order.trainId}`}`,
      14,
      72
    );
    doc.text(
      `Coach/Seat: ${order.coachNumber}/${order.seatNumber}`,
      14,
      76
    );
    doc.text(`Delivery Time: ${formatDate(order.deliveryTime, true)}`, 14, 80);
    doc.text(
      `Vendor: ${order.vendorName || `Vendor #${order.vendorId}`}`,
      14,
      84
    );

    if (order.deliveryInstructions) {
      doc.text(`Instructions: ${order.deliveryInstructions}`, 14, 88);
    }

    doc.setFontSize(12);
    doc.setTextColor(30, 64, 175);
    doc.text("Order Items", 14, 98);

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
      startY: 102,
      head: headers,
      body: data,
      theme: "grid",
      headStyles: {
        fillColor: [30, 64, 175],
        textColor: 255,
        fontStyle: "bold",
      },
      columnStyles: {
        0: { cellWidth: 10 },
        1: { cellWidth: 50 },
        2: { cellWidth: 15 },
        3: { cellWidth: 25 },
        4: { cellWidth: 25 },
        5: { cellWidth: 50 },
      },
      styles: {
        fontSize: 9,
        cellPadding: 3,
        overflow: "linebreak",
      },
    });

    const finalY = (doc as any).lastAutoTable.finalY + 10;
    doc.setFontSize(12);
    doc.setTextColor(30, 64, 175);
    doc.text("Order Summary", 14, finalY);

    doc.setFontSize(10);
    doc.setTextColor(0, 0, 0);
    doc.text(
      `Subtotal: ₹${order.totalAmount.toFixed(2)}`,
      150,
      finalY + 6,
      { align: "right" }
    );
    doc.text(
      `Delivery Charges: ₹${order.deliveryCharges.toFixed(2)}`,
      150,
      finalY + 12,
      { align: "right" }
    );
    doc.text(
      `Tax (${order.taxPercentage || 5}%): ₹${order.taxAmount.toFixed(2)}`,
      150,
      finalY + 18,
      { align: "right" }
    );

    if (order.discountAmount && order.discountAmount > 0) {
      doc.text(
        `Discount: -₹${order.discountAmount.toFixed(2)}`,
        150,
        finalY + 24,
        { align: "right" }
      );
      doc.setFont("helvetica", "bold");
      doc.text(
        `Total Amount: ₹${order.finalAmount.toFixed(2)}`,
        150,
        finalY + 32,
        { align: "right" }
      );
    } else {
      doc.setFont("helvetica", "bold");
      doc.text(
        `Total Amount: ₹${order.finalAmount.toFixed(2)}`,
        150,
        finalY + 24,
        { align: "right" }
      );
    }

    doc.setFont("helvetica", "normal");
    doc.setTextColor(30, 64, 175);
    doc.text("Payment Information", 14, finalY + 42);

    doc.setFontSize(10);
    doc.setTextColor(0, 0, 0);
    doc.text(
      `Method: ${paymentMethodConfig[order.paymentMethod].label}`,
      14,
      finalY + 48
    );
    doc.text(
      `Status: ${paymentConfig[order.paymentStatus].label}`,
      14,
      finalY + 52
    );

    if (order.razorpayOrderID) {
      doc.text(`Transaction ID: ${order.razorpayOrderID}`, 14, finalY + 56);
    }

    doc.setFontSize(8);
    doc.setTextColor(100, 116, 139);
    doc.text(
      "Thank you for choosing Railway Eats!",
      105,
      280,
      { align: "center" }
    );
    doc.text(
      "For any queries, please contact support@railwayeats.com",
      105,
      284,
      { align: "center" }
    );

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
    try {
      const date = new Date(dateString);
      if (isNaN(date.getTime())) {
        return "Invalid Date";
      }
      return format(date, forPdf ? "dd MMM yyyy, hh:mm a" : "PPPp");
    } catch {
      return "Invalid Date";
    }
  };

  const getOrderProgress = (status: OrderDTO["orderStatus"]) => {
    switch (status) {
      case "PLACED":
      case "PENDING":
        return 40;
      case "PREPARING":
        return 60;
      case "DISPATCHED":
        return 80;
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

  const canUpdateStatus = (order: OrderDTO) => {
    return ["PLACED", "PENDING", "PREPARING", "DISPATCHED"].includes(
      order.orderStatus
    );
  };

  const getAvailableStatuses = (currentStatus: OrderDTO["orderStatus"]) => {
    const statuses: OrderDTO["orderStatus"][] = [
      "PREPARING",
      "DISPATCHED",
      "DELIVERED",
    ];
    if (currentStatus === "PLACED" || currentStatus === "PENDING") {
      return statuses.filter((s) => s === "PREPARING");
    }
    if (currentStatus === "PREPARING") {
      return statuses.filter((s) => s === "DISPATCHED");
    }
    if (currentStatus === "DISPATCHED") {
      return statuses.filter((s) => s === "DELIVERED");
    }
    return [];
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
            <div
              key={i}
              className="bg-white rounded-lg shadow-sm p-6 space-y-4"
            >
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
          <h1 className="text-2xl sm:text-3xl font-bold text-gray-900">
            Vendor Orders
          </h1>
          <p className="text-sm text-gray-500 mt-1">
            {activeTab === "active"
              ? "Your current and upcoming orders"
              : "Your completed order history"}
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={fetchOrdersAndData}
            disabled={loading}
          >
            {loading ? (
              <Loader2 className="w-4 h-4 mr-2 animate-spin" />
            ) : (
              "Refresh"
            )}
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
          <h3 className="mt-3 text-lg font-medium text-gray-900">
            Error loading orders
          </h3>
          <p className="mt-2 text-sm text-gray-500">{error}</p>
          <Button
            variant="outline"
            className="mt-4"
            onClick={fetchOrdersAndData}
            disabled={loading}
          >
            {loading ? (
              <Loader2 className="w-4 h-4 mr-2 animate-spin" />
            ) : (
              "Try Again"
            )}
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
            {activeTab === "active"
              ? "Your upcoming orders will appear here"
              : "Your completed orders will appear here"}
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
                      <h2 className="text-lg font-semibold text-gray-900">
                        Order #{order.orderId}
                      </h2>
                      <Badge
                        variant="outline"
                        className={`${
                          statusConfig[order.orderStatus].color
                        } py-1 px-2.5`}
                      >
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
                      {stationData[order.deliveryStationId] ? (
                        <Tooltip>
                          <TooltipTrigger>
                            {stationData[order.deliveryStationId].stationName} (
                            {stationData[order.deliveryStationId].stationCode})
                          </TooltipTrigger>
                          <TooltipContent>
                            {stationData[order.deliveryStationId].city},{" "}
                            {stationData[order.deliveryStationId].state}
                          </TooltipContent>
                        </Tooltip>
                      ) : (
                        <span className="flex items-center gap-1">
                          <Badge
                            variant="destructive"
                            className="py-0.5 px-1 text-xs"
                          >
                            Missing
                          </Badge>
                          Station #{order.deliveryStationId}
                        </span>
                      )}
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
                      <span>
                        {order.orderStatus === "DELIVERED"
                          ? "Delivered"
                          : "In Progress"}
                      </span>
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
                                  <TooltipTrigger>
                                    {stationData[order.deliveryStationId]
                                      .stationName}{" "}
                                    (
                                    {
                                      stationData[order.deliveryStationId]
                                        .stationCode
                                    }
                                    )
                                  </TooltipTrigger>
                                  <TooltipContent>
                                    {stationData[order.deliveryStationId].city},{" "}
                                    {stationData[order.deliveryStationId].state}
                                  </TooltipContent>
                                </Tooltip>
                              ) : (
                                <span className="flex items-center gap-1">
                                  <Badge
                                    variant="destructive"
                                    className="py-0.5 px-1 text-xs"
                                  >
                                    Missing
                                  </Badge>
                                  Station #{order.deliveryStationId}
                                </span>
                              )}
                            </span>
                          </div>
                          <div className="flex justify-between">
                            <span className="text-sm text-gray-500">Train</span>
                            <span className="text-sm font-medium">
                              {order.trainNumber || `Train #${order.trainId}`}
                            </span>
                          </div>
                          <div className="flex justify-between">
                            <span className="text-sm text-gray-500">
                              Coach/Seat
                            </span>
                            <span className="text-sm font-medium">
                              {order.coachNumber}/{order.seatNumber}
                            </span>
                          </div>
                          <div className="flex justify-between">
                            <span className="text-sm text-gray-500">Vendor</span>
                            <span className="text-sm font-medium flex items-center gap-1">
                              {order.vendorName?.includes("Vendor #") ? (
                                <Tooltip>
                                  <TooltipTrigger>
                                    <Badge
                                      variant="destructive"
                                      className="py-0.5 px-1 text-xs"
                                    >
                                      Missing
                                    </Badge>
                                    {order.vendorName}
                                  </TooltipTrigger>
                                  <TooltipContent>
                                    Vendor data not found
                                  </TooltipContent>
                                </Tooltip>
                              ) : (
                                order.vendorName
                              )}
                            </span>
                          </div>
                          <div className="flex justify-between">
                            <span className="text-sm text-gray-500">
                              Delivery Time
                            </span>
                            <span className="text-sm font-medium">
                              {formatDate(order.deliveryTime)}
                            </span>
                          </div>
                          {order.deliveryInstructions && (
                            <div className="flex justify-between">
                              <span className="text-sm text-gray-500">
                                Instructions
                              </span>
                              <span className="text-sm font-medium text-right max-w-xs">
                                {order.deliveryInstructions}
                              </span>
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
                            <div
                              key={`${order.orderId}-${item.itemId}`}
                              className="p-3"
                            >
                              <div className="flex justify-between">
                                <div>
                                  <p className="font-medium flex items-center gap-2">
                                    {item.itemName?.includes("Item #") ? (
                                      <Tooltip>
                                        <TooltipTrigger>
                                          <Badge
                                            variant="destructive"
                                            className="py-0.5 px-1 text-xs"
                                          >
                                            Missing
                                          </Badge>
                                          {item.itemName}
                                        </TooltipTrigger>
                                        <TooltipContent>
                                          Item data not found
                                        </TooltipContent>
                                      </Tooltip>
                                    ) : (
                                      item.itemName
                                    )}
                                    {item.category &&
                                      item.category !== "Unknown" && (
                                        <span className="ml-2 text-xs text-gray-500 bg-gray-100 px-2 py-0.5 rounded-full">
                                          {item.category}
                                        </span>
                                      )}
                                  </p>
                                  {item.specialInstructions &&
                                    item.specialInstructions !==
                                      "No special instructions" && (
                                      <p className="text-xs text-gray-500 mt-1">
                                        Note: {item.specialInstructions}
                                      </p>
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
                              <span
                                className={
                                  paymentMethodConfig[order.paymentMethod].color
                                }
                              >
                                {paymentMethodConfig[order.paymentMethod].icon}
                              </span>
                              {paymentMethodConfig[order.paymentMethod].label}
                            </span>
                          </div>
                          <div className="flex justify-between">
                            <span className="text-sm text-gray-500">Status</span>
                            <Badge
                              variant="outline"
                              className={`${
                                paymentConfig[order.paymentStatus].color
                              } py-1 px-2.5`}
                            >
                              <div className="flex items-center gap-1.5">
                                {paymentConfig[order.paymentStatus].icon}
                                <span>
                                  {paymentConfig[order.paymentStatus].label}
                                </span>
                              </div>
                            </Badge>
                          </div>
                          {order.razorpayOrderID && (
                            <div className="flex justify-between">
                              <span className="text-sm text-gray-500">
                                Transaction ID
                              </span>
                              <span className="text-sm font-medium font-mono">
                                {order.razorpayOrderID}
                              </span>
                            </div>
                          )}
                          {order.paymentMethod === "COD" &&
                            order.paymentStatus === "PENDING" &&
                            activeTab === "active" && (
                              <div className="mt-4">
                                <h4 className="text-sm font-medium text-gray-700">
                                  Mark COD Payment
                                </h4>
                                <div className="flex gap-2 mt-2">
                                  <Input
                                    placeholder="Optional remarks"
                                    value={codRemarks[order.orderId] || ""}
                                    onChange={(e) =>
                                      setCodRemarks((prev) => ({
                                        ...prev,
                                        [order.orderId]: e.target.value,
                                      }))
                                    }
                                    className="max-w-xs"
                                  />
                                  <Button
                                    onClick={() =>
                                      markCodPaymentCompleted(
                                        order.orderId,
                                        codRemarks[order.orderId] || ""
                                      )
                                    }
                                    className="gap-2"
                                  >
                                    <CheckCircle className="w-4 h-4" />
                                    Mark Completed
                                  </Button>
                                </div>
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
                            <span className="text-sm text-gray-500">
                              Subtotal
                            </span>
                            <span className="text-sm font-medium">
                              ₹{order.totalAmount.toFixed(2)}
                            </span>
                          </div>
                          <div className="flex justify-between">
                            <span className="text-sm text-gray-500">
                              Delivery Charges
                            </span>
                            <span className="text-sm font-medium">
                              ₹{order.deliveryCharges.toFixed(2)}
                            </span>
                          </div>
                          <div className="flex justify-between">
                            <span className="text-sm text-gray-500">
                              Tax ({order.taxPercentage || 5}%)
                            </span>
                            <span className="text-sm font-medium">
                              ₹{order.taxAmount.toFixed(2)}
                            </span>
                          </div>
                          {order.discountAmount && order.discountAmount > 0 && (
                            <div className="flex justify-between">
                              <span className="text-sm text-gray-500">
                                Discount
                              </span>
                              <span className="text-sm font-medium text-green-600">
                                -₹{order.discountAmount.toFixed(2)}
                              </span>
                            </div>
                          )}
                          <div className="pt-2 border-t border-gray-200 flex justify-between">
                            <span className="text-base font-semibold">
                              Total Amount
                            </span>
                            <span className="text-base font-semibold">
                              ₹{order.finalAmount.toFixed(2)}
                            </span>
                          </div>
                        </div>
                        {activeTab === "active" && canUpdateStatus(order) && (
                          <div className="mt-4">
                            <h4 className="text-sm font-medium text-gray-700">
                              Update Order Status
                            </h4>
                            <div className="flex gap-2 mt-2">
                              <Select
                                onValueChange={(value) =>
                                  updateOrderStatus(
                                    order.orderId,
                                    value as OrderDTO["orderStatus"],
                                    statusRemarks[order.orderId] || ""
                                  )
                                }
                              >
                                <SelectTrigger className="w-[180px]">
                                  <SelectValue placeholder="Select status" />
                                </SelectTrigger>
                                <SelectContent>
                                  {getAvailableStatuses(order.orderStatus).map(
                                    (status) => (
                                      <SelectItem key={status} value={status}>
                                        {statusConfig[status].label}
                                      </SelectItem>
                                    )
                                  )}
                                </SelectContent>
                              </Select>
                              <Input
                                placeholder="Optional remarks"
                                value={statusRemarks[order.orderId] || ""}
                                onChange={(e) =>
                                  setStatusRemarks((prev) => ({
                                    ...prev,
                                    [order.orderId]: e.target.value,
                                  }))
                                }
                                className="max-w-xs"
                              />
                            </div>
                          </div>
                        )}
                        <div className="pt-4 flex justify-end gap-3">
                          <Button
                            variant="outline"
                            onClick={() => toggleOrderDetails(order.orderId)}
                          >
                            Close Details
                          </Button>
                          {canDownloadInvoice(order) && (
                            <Button
                              onClick={() => generateInvoice(order)}
                              className="gap-2"
                            >
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

export default VendorOrders