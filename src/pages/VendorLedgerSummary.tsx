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

const VendorLedgerSummary: FC = () => {
  const { accessToken } = useAuth();
  const [stations, setStations] = useState<StationDTO[]>([]);
  const [vendors, setVendors] = useState<VendorDTO[]>([]);
  const [selectedStation, setSelectedStation] = useState<string>("");
  const [selectedVendor, setSelectedVendor] = useState<string>("");
  const [startDate, setStartDate] = useState<Date | null>(null);
  const [endDate, setEndDate] = useState<Date | null>(null);
  const [vendorDetails, setVendorDetails] = useState<VendorDetailsDTO | null>(null);
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
      console.error("Failed to fetch stations:", err);
      setError(err.response?.data?.message || "Failed to load stations");
      toast.error("Failed to load stations.");
    } finally {
      setLoading(false);
    }
  }, [accessToken]);

  // Fetch vendors based on selected station from /vendors/stations/{stationId}
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

  // Fetch vendor details and summary
  const fetchVendorDetails = useCallback(async () => {
    if (!selectedVendor) {
      setVendorDetails(null);
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

      const response = await api.get<VendorDetailsDTO>(
        `/admin/vendor-ledger/${selectedVendor}/details?${queryParams.toString()}`,
        {
          headers: { Authorization: `Bearer ${accessToken}` },
        }
      );
      setVendorDetails(response.data);
    } catch (err: any) {
      console.error("Failed to fetch vendor details:", err);
      setError(err.response?.data?.message || "Failed to load vendor details");
      toast.error("Failed to load vendor details.");
    } finally {
      setLoading(false);
    }
  }, [accessToken, selectedVendor, startDate, endDate, validateDates]);

  // Handle Excel export
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

      // Trigger file download
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

  // Handle filter submission
  const handleFilterSubmit = (e: React.MouseEvent<HTMLButtonElement>) => {
    e.preventDefault();
    if (validateDates(startDate, endDate)) {
      fetchVendorDetails();
    }
  };

  // Load stations on mount
  useEffect(() => {
    fetchStations();
  }, [fetchStations]);

  // Fetch vendors when station changes
  useEffect(() => {
    fetchVendors(selectedStation);
  }, [selectedStation, fetchVendors]);

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

  // Stats cards for ledger summary
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

  // StatCard Component
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
          <p className="text-sm text-blue-600">View and export vendor ledger details</p>
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
          </div>
        </CardContent>
      </Card>
      {vendorDetails && (
        <Card className="shadow-md border border-blue-100">
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
      )}
      {!vendorDetails && (
        <div className="flex flex-col items-center justify-center py-10">
          <h2 className="text-lg sm:text-xl font-semibold text-blue-600">Vendor Ledger Summary</h2>
          <p className="text-sm text-blue-500 mt-2">
            Select a vendor and date range to view the ledger summary.
          </p>
        </div>
      )}
    </div>
  );
};

export default VendorLedgerSummary;