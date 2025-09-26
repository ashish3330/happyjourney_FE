import { FC, useEffect, useState, useCallback, useMemo } from "react";
import { Download, Loader2, Save } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { toast } from "sonner";
import { format, startOfDay, endOfDay } from "date-fns";
import DatePicker from "react-datepicker";
import "react-datepicker/dist/react-datepicker.css";
import Select from "react-select";
import api from "@/utils/axios";
import { useAuth } from "@/contexts/AuthContext";

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

interface VendorInvoiceDTO {
  id: number;
  invoiceNumber: string;
  vendorId: number;
  generatedDate: string;
  periodStart: string;
  periodEnd: string;
  totalAmount: number;
  paidAmount: number;
  remainingAmount: number;
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

const VendorInvoiceDashboard: FC = () => {
  const { accessToken } = useAuth();
  const [stations, setStations] = useState<StationDTO[]>([]);
  const [vendors, setVendors] = useState<VendorDTO[]>([]);
  const [invoices, setInvoices] = useState<VendorInvoiceDTO[]>([]);
  const [selectedStation, setSelectedStation] = useState<string>("");
  const [selectedVendor, setSelectedVendor] = useState<string>("");
  const [startDate, setStartDate] = useState<Date | null>(null);
  const [endDate, setEndDate] = useState<Date | null>(null);
  const [paymentAmounts, setPaymentAmounts] = useState<{ [key: number]: string }>({});
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Get current date for max date validation
  const today = useMemo(() => new Date(), []);

  // Validate dates
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

  // Validate vendor
  const validateVendor = useCallback((): boolean => {
    if (!selectedVendor) {
      setError("Please select a vendor");
      toast.error("Please select a vendor");
      return false;
    }
    return true;
  }, [selectedVendor]);

  // Fetch stations from /stations/all
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
      console.error("Failed to fetch cities:", err);
      setError(err.response?.data?.message || "Failed to load cities");
      toast.error("Failed to load cities.");
    } finally {
      setLoading(false);
    }
  }, [accessToken]);

  // Fetch vendors based on selected station from /vendors/stations/{stationId}
  const fetchVendors = useCallback(async (stationId: string) => {
    if (!stationId) {
      setVendors([]);
      setSelectedVendor("");
      setInvoices([]);
      return;
    }
    setLoading(true);
    setError(null);
    try {
      if (!accessToken) throw new Error("No authentication token found");
      const response = await api.get<PageResponse<VendorDTO>>(
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
  }, [accessToken]);

  // Fetch invoices for selected vendor
  const fetchInvoices = useCallback(async (vendorId: string) => {
    if (!vendorId) {
      setInvoices([]);
      return;
    }
    setLoading(true);
    setError(null);
    try {
      if (!accessToken) throw new Error("No authentication token found");
      const response = await api.get<VendorInvoiceDTO[]>(
        `/admin/orders/vendor-invoices?vendorId=${vendorId}`,
        {
          headers: { Authorization: `Bearer ${accessToken}` },
        }
      );
      setInvoices(response.data || []);
    } catch (err: any) {
      console.error("Failed to fetch invoices:", err);
      setError(err.response?.data?.message || "Failed to load invoices");
      toast.error("Failed to load invoices.");
    } finally {
      setLoading(false);
    }
  }, [accessToken]);

  // Handle PDF invoice generation
  const handleGenerateInvoice = async () => {
    if (!validateDates(startDate, endDate) || !validateVendor()) {
      return;
    }

    setLoading(true);
    setError(null);
    try {
      if (!accessToken) throw new Error("No authentication token found");
      const queryParams = new URLSearchParams();
      queryParams.append("vendorId", selectedVendor);
      if (selectedStation) queryParams.append("stationId", selectedStation);
      queryParams.append("startDate", format(startOfDay(startDate!), "yyyy-MM-dd'T'HH:mm:ss"));
      queryParams.append("endDate", format(endOfDay(endDate!), "yyyy-MM-dd'T'HH:mm:ss"));

      const response = await api.get(`/admin/orders/export-pdf?${queryParams.toString()}`, {
        headers: { Authorization: `Bearer ${accessToken}` },
        responseType: "blob",
      });

      // Trigger file download
      const url = window.URL.createObjectURL(new Blob([response.data], { type: "application/pdf" }));
      const link = document.createElement("a");
      link.href = url;
      link.setAttribute("download", `invoice_${format(new Date(), "yyyyMMdd_HHmmss")}.pdf`);
      document.body.appendChild(link);
      link.click();
      link.remove();
      window.URL.revokeObjectURL(url);
      toast.success("Invoice generated successfully!");
      // Refresh invoice list
      await fetchInvoices(selectedVendor);
    } catch (err: any) {
      console.error("Failed to generate invoice:", err);
      setError(err.response?.data?.message || "Failed to generate invoice. Please try again.");
      toast.error(err.response?.data?.message || "Failed to generate invoice.");
    } finally {
      setLoading(false);
    }
  };

  // Handle payment update
  const handleUpdatePayment = async (invoiceId: number) => {
    const paymentAmount = parseFloat(paymentAmounts[invoiceId] || "0");
    if (isNaN(paymentAmount) || paymentAmount <= 0) {
      setError("Please enter a valid payment amount");
      toast.error("Please enter a valid payment amount");
      return;
    }

    setLoading(true);
    setError(null);
    try {
      if (!accessToken) throw new Error("No authentication token found");
      const response = await api.post(
        `/admin/orders/vendor-invoices/${invoiceId}/pay`,
        { paymentAmount },
        {
          headers: { Authorization: `Bearer ${accessToken}` },
        }
      );
      toast.success("Payment updated successfully!");
      // Clear payment input and refresh invoices
      setPaymentAmounts((prev) => ({ ...prev, [invoiceId]: "" }));
      setInvoices((prev) =>
        prev.map((invoice) =>
          invoice.id === invoiceId ? { ...invoice, ...response.data } : invoice
        )
      );
    } catch (err: any) {
      console.error("Failed to update payment:", err);
      setError(err.response?.data?.message || "Failed to update payment. Please try again.");
      toast.error(err.response?.data?.message || "Failed to update payment.");
    } finally {
      setLoading(false);
    }
  };

  // Handle payment input change
  const handlePaymentInputChange = (invoiceId: number, value: string) => {
    setPaymentAmounts((prev) => ({ ...prev, [invoiceId]: value }));
  };

  // Load stations on mount
  useEffect(() => {
    fetchStations();
  }, [fetchStations]);

  // Fetch vendors when station changes
  useEffect(() => {
    fetchVendors(selectedStation);
  }, [selectedStation, fetchVendors]);

  // Fetch invoices when vendor changes
  useEffect(() => {
    fetchInvoices(selectedVendor);
  }, [selectedVendor, fetchInvoices]);

  // Options for react-select
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

  // Custom styles for react-select to match Tailwind theme
  const selectStyles = {
    control: (provided: any) => ({
      ...provided,
      borderColor: "#93c5fd",
      boxShadow: "none",
      "&:hover": {
        borderColor: "#3b82f6",
      },
      minHeight: "2.5rem",
      fontSize: "0.875rem",
    }),
    menu: (provided: any) => ({
      ...provided,
      zIndex: 9999,
    }),
    option: (provided: any, state: any) => ({
      ...provided,
      backgroundColor: state.isSelected ? "#3b82f6" : state.isFocused ? "#e0f2fe" : "white",
      color: state.isSelected ? "white" : "#1f2937",
      "&:hover": {
        backgroundColor: "#e0f2fe",
        color: "#1f2937",
      },
    }),
    singleValue: (provided: any) => ({
      ...provided,
      color: "#1f2937",
    }),
    placeholder: (provided: any) => ({
      ...provided,
      color: "#9ca3af",
    }),
  };

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
            Vendor Invoice Dashboard
          </CardTitle>
          <p className="text-sm text-blue-600">Manage and generate invoices for vendors</p>
        </CardHeader>
      </Card>
      <Card className="shadow-md border border-blue-100">
        <CardHeader className="bg-blue-50">
          <CardTitle className="text-lg font-semibold text-blue-800">Invoice Management</CardTitle>
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
          <div className="mt-4 flex justify-end gap-3">
            <Button
              onClick={handleGenerateInvoice}
              className="bg-green-600 text-white hover:bg-green-700 flex items-center gap-2"
              disabled={loading || !selectedVendor}
              aria-label="Generate new invoice"
            >
              {loading ? (
                <Loader2 className="w-4 h-4 animate-spin" />
              ) : (
                <Download className="h-4 w-4" />
              )}
              Generate Invoice
            </Button>
          </div>
        </CardContent>
      </Card>
      {selectedVendor && (
        <Card className="mt-6 shadow-md border border-blue-100">
          <CardHeader className="bg-blue-50">
            <CardTitle className="text-lg font-semibold text-blue-800">Invoice History</CardTitle>
          </CardHeader>
          <CardContent className="p-3 sm:p-6">
            {invoices.length === 0 ? (
              <p className="text-sm text-gray-500">No invoices found for the selected vendor.</p>
            ) : (
              <div className="overflow-x-auto">
                <table className="min-w-full divide-y divide-gray-200">
                  <thead className="bg-gray-50">
                    <tr>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Invoice No.</th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Generated Date</th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Period</th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Total Amount</th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Paid Amount</th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Remaining Amount</th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Update Payment</th>
                    </tr>
                  </thead>
                  <tbody className="bg-white divide-y divide-gray-200">
                    {invoices.map((invoice) => (
                      <tr key={invoice.id}>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">{invoice.invoiceNumber}</td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">{format(new Date(invoice.generatedDate), "yyyy-MM-dd")}</td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                          {format(new Date(invoice.periodStart), "yyyy-MM-dd")} to {format(new Date(invoice.periodEnd), "yyyy-MM-dd")}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">{invoice.totalAmount.toFixed(2)}</td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">{invoice.paidAmount.toFixed(2)}</td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">{invoice.remainingAmount.toFixed(2)}</td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                          <div className="flex items-center gap-2">
                            <Input
                              type="number"
                              placeholder="Enter payment"
                              value={paymentAmounts[invoice.id] || ""}
                              onChange={(e) => handlePaymentInputChange(invoice.id, e.target.value)}
                              className="w-32"
                              min="0"
                              step="0.01"
                            />
                            <Button
                              onClick={() => handleUpdatePayment(invoice.id)}
                              className="bg-blue-600 text-white hover:bg-blue-700"
                              disabled={loading}
                              aria-label={`Update payment for invoice ${invoice.invoiceNumber}`}
                            >
                              <Save className="h-4 w-4" />
                            </Button>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </CardContent>
        </Card>
      )}
      <div className="flex flex-col items-center justify-center py-10">
        <h2 className="text-lg sm:text-xl font-semibold text-blue-600">Manage Invoices</h2>
        <p className="text-sm text-blue-500 mt-2">
          Select a vendor and date range to generate a new invoice, or update payments for existing invoices.
        </p>
      </div>
    </div>
  );
};

export default VendorInvoiceDashboard;