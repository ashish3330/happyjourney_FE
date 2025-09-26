import React, { FC, useEffect, useState, useCallback, useMemo } from "react";
import { Download, Loader2, DollarSign, TrendingUp, TrendingDown } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";
import { format, startOfDay, endOfDay } from "date-fns";
import DatePicker from "react-datepicker";
import "react-datepicker/dist/react-datepicker.css";
import Select from "react-select";
import api from "@/utils/axios";
import { useAuth } from "@/contexts/AuthContext";
import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";

interface StationDTO {
  stationId: number;
  stationName: string;
  stationCode: string;
  city: string;
  state: string;
}

interface VendorDTO {
  vendorId: number;
  businessName: string;
}

interface VendorLedgerSummaryDTO {
  vendorId: number;
  vendorName: string;
  businessName: string;
  gstNumber: string;
  totalCredits: number;
  totalDebits: number;
  netBalance: number;
}

interface VendorDetailsDTO {
  vendorId: number;
  vendorName: string;
  businessName: string;
  gstNumber: string;
  email: string | null;
  phoneNumber: string | null;
  address: string | null;
  ledgerSummary: VendorLedgerSummaryDTO;
}

interface VendorLedgerDTO {
  ledgerId: number;
  vendorId: number;
  orderId: string;
  amount: number;
  transactionType: "CREDIT" | "DEBIT";
  description: string;
  createdAt: string;
  systemBalance: number;
  vendorBalance: number;
}

const VendorLedgerSummary: FC = () => {
  const { accessToken } = useAuth();
  const [stations, setStations] = useState<StationDTO[]>([]);
  const [vendors, setVendors] = useState<VendorDTO[]>([]);
  const [selectedStation, setSelectedStation] = useState<string>("");
  const [selectedVendor, setSelectedVendor] = useState<string>("");
  const [startDate, setStartDate] = useState<Date | null>(null);
  const [endDate, setEndDate] = useState<Date | null>(null);
  const [vendorDetails, setVendorDetails] = useState<VendorDetailsDTO | null>(null);
  const [ledgerRecords, setLedgerRecords] = useState<VendorLedgerDTO[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const today = useMemo(() => new Date(), []);

  const validateDates = useCallback((start: Date | null, end: Date | null): boolean => {
    if (!start || !end) {
      setError("Please select both start and end dates");
      toast.error("Please select both start and end dates");
      return false;
    }
    if (end < start) {
      setError("End date must be after start date");
      toast.error("End date must be after start date");
      return false;
    }
    setError(null);
    return true;
  }, []);

  const fetchStations = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      if (!accessToken) throw new Error("No authentication token found");
      const response = await api.get<StationDTO[]>("/stations/all", {
        headers: { Authorization: `Bearer ${accessToken}` },
      });
      setStations(response.data || []);
    } catch (err: any) {
      console.error("Failed to fetch stations:", err);
      setError(err.response?.data?.message || "Failed to load stations");
      toast.error("Failed to load stations.");
    } finally {
      setLoading(false);
    }
  }, [accessToken]);

  const fetchVendors = useCallback(
    async (stationId: string) => {
      if (!stationId) {
        setVendors([]);
        setSelectedVendor("");
        return;
      }
      setLoading(true);
      setError(null);
      try {
        if (!accessToken) throw new Error("No authentication token found");
        const response = await api.get<{ content: VendorDTO[] }>(
          `/vendors/stations/${stationId}`,
          {
            headers: { Authorization: `Bearer ${accessToken}` },
            params: { page: 0, size: 1000 },
          }
        );
        setVendors(response.data.content || []);
      } catch (err: any) {
        console.error("Failed to fetch vendors:", err);
        setError(err.response?.data?.message || "Failed to load vendors");
        toast.error("Failed to load vendors.");
      } finally {
        setLoading(false);
      }
    },
    [accessToken]
  );

  const fetchVendorDetails = useCallback(async () => {
    if (!selectedVendor) {
      setVendorDetails(null);
      setLedgerRecords([]);
      return;
    }
    if (!validateDates(startDate, endDate)) {
      return;
    }

    setLoading(true);
    setError(null);
    try {
      if (!accessToken) throw new Error("No authentication token found");
      const queryParams = new URLSearchParams();
      if (startDate)
        queryParams.append("startDate", format(startOfDay(startDate), "yyyy-MM-dd'T'HH:mm:ss"));
      if (endDate)
        queryParams.append("endDate", format(endOfDay(endDate), "yyyy-MM-dd'T'HH:mm:ss"));

      const [detailsResponse, recordsResponse] = await Promise.all([
        api.get<VendorDetailsDTO>(
          `/admin/vendor-ledger/${selectedVendor}/details?${queryParams.toString()}`,
          {
            headers: { Authorization: `Bearer ${accessToken}` },
          }
        ),
        api.get<{ content: VendorLedgerDTO[] }>(
          `/admin/vendor-ledger/${selectedVendor}/records?${queryParams.toString()}`,
          {
            headers: { Authorization: `Bearer ${accessToken}` },
            params: { page: 0, size: 1000 },
          }
        ),
      ]);

      setVendorDetails(detailsResponse.data);
      setLedgerRecords(recordsResponse.data.content || []);
    } catch (err: any) {
      console.error("Failed to fetch vendor details or records:", err);
      setError(err.response?.data?.message || "Failed to load vendor details and records");
      toast.error("Failed to load vendor details and records.");
    } finally {
      setLoading(false);
    }
  }, [accessToken, selectedVendor, startDate, endDate, validateDates]);

  const handleExport = async () => {
    if (!selectedVendor) {
      setError("Please select a vendor");
      toast.error("Please select a vendor");
      return;
    }
    if (!validateDates(startDate, endDate)) {
      return;
    }

    setLoading(true);
    setError(null);
    try {
      if (!accessToken) throw new Error("No authentication token found");
      const queryParams = new URLSearchParams();
      if (startDate)
        queryParams.append("startDate", format(startOfDay(startDate), "yyyy-MM-dd'T'HH:mm:ss"));
      if (endDate)
        queryParams.append("endDate", format(endOfDay(endDate), "yyyy-MM-dd'T'HH:mm:ss"));

      const response = await api.get(`/admin/vendor-ledger/${selectedVendor}/export-excel?${queryParams.toString()}`, {
        headers: { Authorization: `Bearer ${accessToken}` },
        responseType: "blob",
      });

      const url = window.URL.createObjectURL(new Blob([response.data]));
      const link = document.createElement("a");
      link.href = url;
      link.setAttribute("download", `vendor_ledger_export_${selectedVendor}_${format(new Date(), "yyyyMMdd_HHmmss")}.xlsx`);
      document.body.appendChild(link);
      link.click();
      link.remove();
      window.URL.revokeObjectURL(url);
      toast.success("Vendor ledger exported successfully!");
    } catch (err: any) {
      console.error("Failed to export vendor ledger:", err);
      setError(err.response?.data?.message || "Failed to export vendor ledger.");
      toast.error("Failed to export vendor ledger.");
    } finally {
      setLoading(false);
    }
  };

  const handlePdfExport = () => {
    if (!selectedVendor || !vendorDetails) {
      setError("Please select a vendor");
      toast.error("Please select a vendor");
      return;
    }
    if (!validateDates(startDate, endDate)) {
      return;
    }
  
    setLoading(true);
    setError(null);
    try {
      const doc = new jsPDF({ orientation: "portrait", unit: "mm", format: "a4" });
      const pageWidth = doc.internal.pageSize.getWidth();
      const pageHeight = doc.internal.pageSize.getHeight();
      const margin = 15;
      let y = margin;
  
      // Header
      doc.setFillColor(33, 150, 243);
      doc.rect(0, 0, pageWidth, 30, "F");
      doc.setFontSize(18);
      doc.setTextColor(255, 255, 255);
      doc.setFont("helvetica", "bold");
      doc.text("TheHappJjourney", margin, y + 10);
      doc.setFontSize(10);
      doc.text("Street Num Food Delivery Redefined", margin, y + 18);
      doc.setFontSize(12);
      doc.text("Vendor Ledger Invoice", pageWidth - margin - 60, y + 10);
      doc.setFontSize(8);
      doc.text(`Invoice ID: INV-${selectedVendor}-${format(new Date(), "yyyyMMdd")}`, pageWidth - margin - 60, y + 18);
      doc.setFillColor(255, 111, 0);
      doc.rect(0, 30, pageWidth, 2, "F");
      y += 35;
  
      // Company Details
      doc.setFontSize(10);
      doc.setTextColor(50, 50, 50);
      doc.setFont("helvetica", "normal");
      doc.text("TheHappJjourney", margin, y);
      doc.text("Railway Station Road Bhagwan Ganj Ward, Sagar  Madhya Pradesh-470002", margin, y + 5);
      doc.text("Email: support@thehappyjourneyy.in", margin, y + 10);
      doc.text("Phone: +91 9826262660", margin, y + 15);
      y += 25;
  
      // Timeframe (Period)
      doc.setFontSize(14);
      doc.setTextColor(33, 150, 243);
      doc.setFont("helvetica", "bold");
      doc.text("Period", margin, y);
      doc.setLineWidth(0.5);
      doc.setDrawColor(33, 150, 243);
      doc.line(margin, y + 2, margin + 50, y + 2);
      y += 10;
      doc.setFontSize(10);
      doc.setTextColor(50, 50, 50);
      doc.setFont("helvetica", "normal");
      const periodText = `From: ${startDate ? format(startDate, "yyyy-MM-dd") : "N/A"} To: ${endDate ? format(endDate, "yyyy-MM-dd") : "N/A"}`;
      doc.text(periodText, margin, y);
      y += 15;
  
      // Vendor Details
      doc.setFontSize(14);
      doc.setTextColor(33, 150, 243);
      doc.setFont("helvetica", "bold");
      doc.text("Vendor Details", margin, y);
      doc.line(margin, y + 2, margin + 50, y + 2);
      y += 10;
  
      const vendorInfo = [
        { label: "Vendor Name", value: vendorDetails.vendorName || "N/A" },
        { label: "Business Name", value: vendorDetails.businessName || "N/A" },
        { label: "GST Number", value: vendorDetails.gstNumber || "N/A" },
        { label: "Email", value: vendorDetails.email || "N/A" },
        { label: "Phone", value: vendorDetails.phoneNumber || "N/A" },
        { label: "Address", value: vendorDetails.address || "N/A" },
      ];
  
      const maxWidth = (pageWidth - 2 * margin) / 2 - 5;
      const vendorInfoTable = vendorInfo.map((info) => {
        const splitValue = doc.splitTextToSize(info.value, maxWidth);
        return [info.label, splitValue];
      });
  
      autoTable(doc, {
        startY: y,
        head: [['Field', 'Details']],
        body: vendorInfoTable,
        theme: 'grid',
        headStyles: {
          fillColor: [33, 150, 243],
          textColor: [255, 255, 255],
          fontSize: 10,
          fontStyle: 'bold',
          halign: 'left',
        },
        bodyStyles: {
          fontSize: 9,
          textColor: [50, 50, 50],
          cellPadding: 3,
          minCellHeight: 0,
        },
        columnStyles: {
          0: { cellWidth: 40, halign: 'left', fontStyle: 'bold' },
          1: { cellWidth: pageWidth - margin - 40 - 15, halign: 'left' },
        },
        margin: { left: margin, right: margin },
        didDrawPage: (data: any) => {
          // Footer on each page
          doc.setFontSize(8);
          doc.setTextColor(100, 100, 100);
          // Use doc.internal.getNumberOfPages() directly
          const pageCount = (doc as any).internal.getNumberOfPages();
          // Access pageNumber from data (provided by autoTable)
          doc.text(`Page ${data.pageNumber} of ${pageCount}`, pageWidth - margin - 30, pageHeight - 10);
          doc.text("TheHappJjourney - Jhansi, India", margin, pageHeight - 10);
        },
      });
      y = (doc as any).lastAutoTable.finalY + 15;
  
      // Ledger Summary
      doc.setFontSize(14);
      doc.setTextColor(33, 150, 243);
      doc.setFont("helvetica", "bold");
      doc.text("Ledger Summary", margin, y);
      doc.line(margin, y + 2, margin + 50, y + 2);
      y += 10;
  
      if (vendorDetails.ledgerSummary) {
        const summaryData = [
          ["Total Credits", `₹${vendorDetails.ledgerSummary.totalCredits.toFixed(2)}`],
          ["Total Debits", `₹${vendorDetails.ledgerSummary.totalDebits.toFixed(2)}`],
          ["Net Balance", `₹${vendorDetails.ledgerSummary.netBalance.toFixed(2)}`],
        ];
  
        autoTable(doc, {
          startY: y,
          head: [['Description', 'Amount']],
          body: summaryData,
          theme: 'grid',
          headStyles: {
            fillColor: [33, 150, 243],
            textColor: [255, 255, 255],
            fontSize: 10,
            fontStyle: 'bold',
            halign: 'left',
          },
          bodyStyles: {
            fontSize: 9,
            textColor: [50, 50, 50],
            cellPadding: 3,
          },
          columnStyles: {
            0: { cellWidth: 60, halign: 'left' },
            1: { cellWidth: 60, halign: 'right' },
          },
          margin: { left: margin, right: margin },
        });
        y = (doc as any).lastAutoTable.finalY + 15;
      }
  
      // Ledger Records
      doc.setFontSize(14);
      doc.setTextColor(33, 150, 243);
      doc.setFont("helvetica", "bold");
      doc.text("Ledger Records", margin, y);
      doc.line(margin, y + 2, margin + 50, y + 2);
      y += 10;
  
      if (ledgerRecords.length > 0) {
        const recordsData = ledgerRecords.map(record => {
          let formattedDate = "Invalid Date";
          try {
            formattedDate = format(new Date(record.createdAt), "yyyy-MM-dd HH:mm:ss");
          } catch (e) {
            console.warn(`Invalid date format for record ${record.ledgerId}: ${record.createdAt}`);
          }
          const description = doc.splitTextToSize(record.description || "N/A", 50);
          return [
            record.orderId || "N/A",
            `₹${(record.amount || 0).toFixed(2)}`,
            record.transactionType || "N/A",
            description,
            `₹${(record.systemBalance || 0).toFixed(2)}`,
            `₹${(record.vendorBalance || 0).toFixed(2)}`,
            formattedDate,
          ];
        });
  
        autoTable(doc, {
          startY: y,
          head: [["Order ID", "Amount", "Type", "Description", "System Balance", "Vendor Balance", "Created At"]],
          body: recordsData,
          theme: "striped",
          headStyles: {
            fillColor: [33, 150, 243],
            textColor: [255, 255, 255],
            fontSize: 10,
            fontStyle: "bold",
            halign: "left",
          },
          bodyStyles: {
            fontSize: 9,
            textColor: [50, 50, 50],
            cellPadding: 3,
            minCellHeight: 0,
          },
          columnStyles: {
            0: { cellWidth: 25, halign: 'left' },
            1: { cellWidth: 25, halign: 'right' },
            2: { cellWidth: 20, halign: 'left' },
            3: { cellWidth: 50, halign: 'left' },
            4: { cellWidth: 25, halign: 'right' },
            5: { cellWidth: 25, halign: 'right' },
            6: { cellWidth: 30, halign: 'left' },
          },
          margin: { left: margin, right: margin },
          pageBreak: 'auto',
          didDrawPage: (data: any) => {
            // Footer
            doc.setFontSize(8);
            doc.setTextColor(100, 100, 100);
            const pageCount = (doc as any).internal.getNumberOfPages();
            doc.text(`Page ${data.pageNumber} of ${pageCount}`, pageWidth - margin - 30, pageHeight - 10);
            doc.text("TheHappJjourney - Jhansi, India", margin, pageHeight - 10);
          },
        });
      } else {
        doc.setFontSize(10);
        doc.setTextColor(100, 100, 100);
        doc.text("No ledger records found for the selected vendor and date range.", margin, y + 5);
      }
  
      // Save PDF
      doc.save(`vendor_ledger_${selectedVendor}_${format(new Date(), "yyyyMMdd_HHmmss")}.pdf`);
      toast.success("Vendor ledger PDF exported successfully!");
    } catch (err: any) {
      console.error("PDF generation failed:", err);
      setError(`Failed to generate PDF: ${err.message}`);
      toast.error(`Failed to generate PDF: ${err.message}`);
    } finally {
      setLoading(false);
    }
  };

  const handleFilterSubmit = (e: React.MouseEvent<HTMLButtonElement>) => {
    e.preventDefault();
    if (validateDates(startDate, endDate)) {
      fetchVendorDetails();
    }
  };

  useEffect(() => {
    fetchStations();
  }, [fetchStations]);

  useEffect(() => {
    fetchVendors(selectedStation);
  }, [selectedStation, fetchVendors]);

  const stationOptions = useMemo(
    () =>
      stations.map((station) => ({
        value: station.stationId.toString(),
        label: `${station.stationName} (${station.stationCode})`,
      })),
    [stations]
  );

  const vendorOptions = useMemo(
    () =>
      vendors.map((vendor) => ({
        value: vendor.vendorId.toString(),
        label: vendor.businessName,
      })),
    [vendors]
  );

  const selectStyles = {
    control: (provided: any) => ({
      ...provided,
      borderColor: "#93c5fd",
      boxShadow: "none",
      "&:hover": { borderColor: "#3b82f6" },
      minHeight: "2.5rem",
      fontSize: "0.875rem",
    }),
    menu: (provided: any) => ({ ...provided, zIndex: 9999 }),
    option: (provided: any, state: any) => ({
      ...provided,
      backgroundColor: state.isSelected ? "#3b82f6" : state.isFocused ? "#e0f2fe" : "white",
      color: state.isSelected ? "white" : "#1f2937",
      "&:hover": { backgroundColor: "#e0f2fe", color: "#1f2937" },
    }),
    singleValue: (provided: any) => ({ ...provided, color: "#1f2937" }),
    placeholder: (provided: any) => ({ ...provided, color: "#9ca3af" }),
  };

  const statsCards = useMemo(() => {
    if (!vendorDetails) return [];
    return [
      {
        title: "Total Credits",
        value: `₹${vendorDetails.ledgerSummary.totalCredits.toFixed(2)}`,
        icon: TrendingUp,
        color: "bg-gradient-to-r from-green-600 to-green-700",
        textColor: "text-green-600",
      },
      {
        title: "Total Debits",
        value: `₹${vendorDetails.ledgerSummary.totalDebits.toFixed(2)}`,
        icon: TrendingDown,
        color: "bg-gradient-to-r from-red-600 to-red-700",
        textColor: "text-red-600",
      },
      {
        title: "Net Balance",
        value: `₹${vendorDetails.ledgerSummary.netBalance.toFixed(2)}`,
        icon: DollarSign,
        color: "bg-gradient-to-r from-blue-600 to-blue-700",
        textColor: "text-blue-600",
      },
    ];
  }, [vendorDetails]);

  interface StatCardProps {
    title: string;
    value: string;
    icon: React.ComponentType<{ size?: number | string; className?: string }>;
    color: string;
    textColor: string;
  }

  const StatCard: React.FC<StatCardProps> = ({ title, value, icon: Icon, color, textColor }) => (
    <Card className="shadow-lg transform hover:scale-105 transition-transform duration-300 border border-blue-100">
      <CardContent className="p-6">
        <div className="flex items-center space-x-4">
          <div className={`p-3 rounded-full ${color}`}>
            <Icon size={24} className="text-white" />
          </div>
          <div>
            <p className="text-sm font-medium text-gray-600">{title}</p>
            <p className={`text-2xl font-bold ${textColor}`}>{value}</p>
          </div>
        </div>
      </CardContent>
    </Card>
  );

  return (
    <div className="container mx-auto px-2 sm:px-4 py-4 sm:py-6 bg-gradient-to-br from-gray-100 to-gray-200">
      {loading && (
        <div className="fixed inset-0 flex items-center justify-center bg-black/50">
          <div className="animate-spin rounded-full h-10 w-10 border-t-4 border-b-4 border-blue-600"></div>
        </div>
      )}
      <Card className="mb-6 shadow-md border border-blue-100">
        <CardHeader className="bg-blue-50">
          <CardTitle className="text-xl sm:text-2xl font-bold text-blue-800">
            Vendor Ledger Summary
          </CardTitle>
          <p className="text-sm text-blue-600">View, export, and download vendor ledger details</p>
        </CardHeader>
      </Card>
      <Card className="mb-6 shadow-md border border-blue-100">
        <CardHeader className="bg-blue-50">
          <CardTitle className="text-lg font-semibold text-blue-800">Filter Vendor Ledger</CardTitle>
        </CardHeader>
        <CardContent className="p-3 sm:p-6">
          {error && (
            <div className="mb-4 p-3 bg-red-100 text-red-700 rounded-md text-sm border-l-4 border-red-500">
              {error}
            </div>
          )}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
            <div>
              <Label htmlFor="station" className="text-sm font-medium text-blue-700">
                Select Station
              </Label>
              <Select
                options={stationOptions}
                value={stationOptions.find((option) => option.value === selectedStation) || null}
                onChange={(option) => {
                  setSelectedStation(option?.value || "");
                  setSelectedVendor("");
                }}
                placeholder="Select a station"
                styles={selectStyles}
                isClearable
                className="mt-1"
              />
            </div>
            <div>
              <Label htmlFor="vendor" className="text-sm font-medium text-blue-700">
                Select Vendor
              </Label>
              <Select
                options={vendorOptions}
                value={vendorOptions.find((option) => option.value === selectedVendor) || null}
                onChange={(option) => setSelectedVendor(option?.value || "")}
                placeholder="Select a vendor"
                styles={selectStyles}
                isClearable
                isDisabled={!selectedStation}
                className="mt-1"
              />
            </div>
            <div>
              <Label htmlFor="startDate" className="text-sm font-medium text-blue-700">
                Start Date
              </Label>
              <div className="mt-1">
                <DatePicker
                  id="startDate"
                  selected={startDate}
                  onChange={(date: Date | null) => setStartDate(date)}
                  maxDate={today}
                  dateFormat="yyyy-MM-dd"
                  className="w-full text-sm border-blue-300 focus:border-blue-500 focus:ring-blue-500 rounded-md h-10 px-3"
                  placeholderText="Select start date"
                  showYearDropdown
                  showMonthDropdown
                  dropdownMode="select"
                  popperPlacement="bottom-start"
                  wrapperClassName="w-full"
                />
              </div>
            </div>
            <div>
              <Label htmlFor="endDate" className="text-sm font-medium text-blue-700">
                End Date
              </Label>
              <div className="mt-1">
                <DatePicker
                  id="endDate"
                  selected={endDate}
                  onChange={(date: Date | null) => setEndDate(date)}
                  maxDate={today}
                  minDate={startDate || undefined}
                  dateFormat="yyyy-MM-dd"
                  className="w-full text-sm border-blue-300 focus:border-blue-500 focus:ring-blue-500 rounded-md h-10 px-3"
                  placeholderText="Select end date"
                  showYearDropdown
                  showMonthDropdown
                  dropdownMode="select"
                  popperPlacement="bottom-start"
                  wrapperClassName="w-full"
                />
              </div>
            </div>
          </div>
          <div className="mt-4 flex justify-end space-x-3">
            <Button
              onClick={handleFilterSubmit}
              className="bg-blue-600 text-white hover:bg-blue-700"
              disabled={loading}
            >
              Apply Filters
            </Button>
            <Button
              onClick={handleExport}
              className="bg-blue-600 text-white hover:bg-blue-700 flex items-center gap-2"
              disabled={loading || !selectedVendor}
              aria-label="Export vendor ledger to Excel"
            >
              {loading ? (
                <Loader2 className="w-4 h-4 animate-spin" />
              ) : (
                <Download className="h-4 w-4" />
              )}
              Export Excel
            </Button>
            <Button
              onClick={handlePdfExport}
              className="bg-orange-600 text-white hover:bg-orange-700 flex items-center gap-2"
              disabled={loading || !selectedVendor}
              aria-label="Download vendor ledger as PDF"
            >
              {loading ? (
                <Loader2 className="w-4 h-4 animate-spin" />
              ) : (
                <Download className="h-4 w-4" />
              )}
              Download PDF
            </Button>
          </div>
        </CardContent>
      </Card>
      {vendorDetails && (
        <div>
          <Card className="mb-6 shadow-md border border-blue-100">
            <CardHeader className="bg-blue-50">
              <CardTitle className="text-lg font-semibold text-blue-800">Vendor Details</CardTitle>
            </CardHeader>
            <CardContent className="p-3 sm:p-6">
              <div className="mb-6">
                <h2 className="text-lg font-semibold text-blue-800 mb-4">Vendor Information</h2>
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                  <div className="bg-white p-4 rounded-lg shadow-sm border border-blue-100 hover:shadow-md transition-shadow duration-300">
                    <p className="text-sm font-medium text-blue-700">Vendor Name</p>
                    <p className="text-sm text-blue-600 font-semibold">{vendorDetails.vendorName}</p>
                  </div>
                  <div className="bg-white p-4 rounded-lg shadow-sm border border-blue-100 hover:shadow-md transition-shadow duration-300">
                    <p className="text-sm font-medium text-blue-700">Business Name</p>
                    <p className="text-sm text-blue-600 font-semibold">{vendorDetails.businessName}</p>
                  </div>
                  <div className="bg-white p-4 rounded-lg shadow-sm border border-blue-100 hover:shadow-md transition-shadow duration-300">
                    <p className="text-sm font-medium text-blue-700">GST Number</p>
                    <p className="text-sm text-blue-600 font-semibold">{vendorDetails.gstNumber}</p>
                  </div>
                  <div className="bg-white p-4 rounded-lg shadow-sm border border-blue-100 hover:shadow-md transition-shadow duration-300">
                    <p className="text-sm font-medium text-blue-700">Email</p>
                    <p className="text-sm text-blue-600">{vendorDetails.email || "N/A"}</p>
                  </div>
                  <div className="bg-white p-4 rounded-lg shadow-sm border border-blue-100 hover:shadow-md transition-shadow duration-300">
                    <p className="text-sm font-medium text-blue-700">Phone Number</p>
                    <p className="text-sm text-blue-600">{vendorDetails.phoneNumber || "N/A"}</p>
                  </div>
                  <div className="bg-white p-4 rounded-lg shadow-sm border border-blue-100 hover:shadow-md transition-shadow duration-300">
                    <p className="text-sm font-medium text-blue-700">Address</p>
                    <p className="text-sm text-blue-600">{vendorDetails.address || "N/A"}</p>
                  </div>
                </div>
              </div>
              <div>
                <h2 className="text-lg font-semibold text-blue-800 mb-4">Ledger Summary</h2>
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3 sm:gap-4">
                  {statsCards.map((card, index) => (
                    <StatCard
                      key={index}
                      title={card.title}
                      value={card.value}
                      icon={card.icon}
                      color={card.color}
                      textColor={card.textColor}
                    />
                  ))}
                </div>
              </div>
            </CardContent>
          </Card>
          <Card className="shadow-md border border-blue-100">
            <CardHeader className="bg-blue-50">
              <CardTitle className="text-lg font-semibold text-blue-800">Ledger Records</CardTitle>
            </CardHeader>
            <CardContent className="p-3 sm:p-6">
              {ledgerRecords.length > 0 ? (
                <div className="overflow-x-auto">
                  <table className="min-w-full divide-y divide-blue-200">
                    <thead className="bg-blue-50">
                      <tr>
                        <th className="px-6 py-3 text-left text-xs font-medium text-blue-700 uppercase tracking-wider">
                          Order ID
                        </th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-blue-700 uppercase tracking-wider">
                          Amount
                        </th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-blue-700 uppercase tracking-wider">
                          Transaction Type
                        </th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-blue-700 uppercase tracking-wider">
                          Description
                        </th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-blue-700 uppercase tracking-wider">
                          System Balance
                        </th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-blue-700 uppercase tracking-wider">
                          Vendor Balance
                        </th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-blue-700 uppercase tracking-wider">
                          Created At
                        </th>
                      </tr>
                    </thead>
                    <tbody className="bg-white divide-y divide-blue-200">
                      {ledgerRecords.map((record) => (
                        <tr key={record.ledgerId} className="hover:bg-blue-50">
                          <td className="px-6 py-4 whitespace-nowrap text-sm text-blue-600">
                            {record.orderId}
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm text-blue-600">
                            ₹{record.amount.toFixed(2)}
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm">
                            <span
                              className={
                                record.transactionType === "CREDIT"
                                  ? "text-green-600 font-semibold"
                                  : "text-red-600 font-semibold"
                              }
                            >
                              {record.transactionType}
                            </span>
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm text-blue-600">
                            {record.description}
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm text-blue-600">
                            ₹{record.systemBalance.toFixed(2)}
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm text-blue-600">
                            ₹{record.vendorBalance.toFixed(2)}
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm text-blue-600">
                            {format(new Date(record.createdAt), "yyyy-MM-dd HH:mm:ss")}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              ) : (
                <p className="text-sm text-blue-500 text-center">
                  No ledger records found for the selected vendor and date range.
                </p>
              )}
            </CardContent>
          </Card>
        </div>
      )}
      {!vendorDetails && (
        <div className="flex flex-col items-center justify-center py-10">
          <h2 className="text-lg sm:text-xl font-semibold text-blue-600">Vendor Ledger Summary</h2>
          <p className="text-sm text-blue-500 mt-2">
            Select a vendor and date range to view the ledger summary and records.
          </p>
        </div>
      )}
    </div>
  );
};

export default VendorLedgerSummary;