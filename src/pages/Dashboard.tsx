import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { DollarSign, ShoppingCart, Utensils, TrendingUp } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Label } from '@/components/ui/label';
import { toast } from 'sonner';
import DatePicker from 'react-datepicker';
import 'react-datepicker/dist/react-datepicker.css';
import Select from 'react-select';
import { Chart as ChartJS, CategoryScale, Filler, LinearScale, BarElement, LineElement, PointElement, Title, Tooltip, Legend, LineController, BarController } from 'chart.js';
import { Chart } from 'react-chartjs-2';
import api from '@/utils/axios';
import { useAuth } from '@/contexts/AuthContext';
import { format, startOfDay, endOfDay } from 'date-fns';

// Register Chart.js components
ChartJS.register(Filler, CategoryScale, LinearScale, BarElement, LineElement, PointElement, Title, Tooltip, Legend, LineController, BarController);

// Define interfaces for DTOs based on Java backend
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

interface VendorSalesOverviewDTO {
  vendorId: number;
  businessName: string;
  orderCount: number;
  totalAmount: number;
}

interface StationSalesSummaryDTO {
  stationId: number;
  stationName: string;
  orderCount: number;
  totalAmount: number;
}

interface TopSellingItemDTO {
  itemId: number;
  itemName: string;
  category: string;
  quantitySold: number;
  totalRevenue: number;
}

interface MonthlySalesDTO {
  month: string;
  totalOrders: number;
  totalRevenue: number;
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

interface ApiParams {
  startDate?: string;
  endDate?: string;
  limit?: number;
  sortBy?: string;
  stationId?: string;
  vendorId?: string;
}

// Define interface for react-select options
// interface SelectOption {
//   value: string;
//   label: string;
// }

// AdminDashboard Component
const AdminDashboard: React.FC = () => {
  const { accessToken } = useAuth();
  const [stations, setStations] = useState<StationDTO[]>([]);
  const [vendors, setVendors] = useState<VendorDTO[]>([]);
  const [selectedStation, setSelectedStation] = useState<string>('');
  const [selectedVendor, setSelectedVendor] = useState<string>('');
  const [vendorSales, setVendorSales] = useState<VendorSalesOverviewDTO[]>([]);
  const [stationSales, setStationSales] = useState<StationSalesSummaryDTO[]>([]);
  const [topItems, setTopItems] = useState<TopSellingItemDTO[]>([]);
  const [monthlySales, setMonthlySales] = useState<MonthlySalesDTO[]>([]);
  const [startDate, setStartDate] = useState<Date | null>(null);
  const [endDate, setEndDate] = useState<Date | null>(null);
  const [loading, setLoading] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);

  // Get current date for max date validation
  const today = useMemo(() => new Date(), []);

  // Validate dates
  const validateDates = useCallback((start: Date | null, end: Date | null): boolean => {
    if (!start || !end) {
      setError('Please select both start and end dates');
      toast.error('Please select both start and end dates');
      return false;
    }
    if (end < start) {
      setError('End date must be after start date');
      toast.error('End date must be after start date');
      return false;
    }
    setError(null);
    return true;
  }, []);

  // Fetch stations
  const fetchStations = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      if (!accessToken) throw new Error('No authentication token found');
      const response = await api.get<StationDTO[]>('/stations/all', {
        headers: { Authorization: `Bearer ${accessToken}` },
      });
      setStations(response.data || []);
    } catch (err: any) {
      console.error('Failed to fetch stations:', err);
      setError(err.response?.data?.message || 'Failed to load stations');
      toast.error('Failed to load stations.');
    } finally {
      setLoading(false);
    }
  }, [accessToken]);

  // Fetch vendors based on selected station
  const fetchVendors = useCallback(
    async (stationId: string) => {
      if (!stationId) {
        setVendors([]);
        setSelectedVendor('');
        return;
      }
      setLoading(true);
      setError(null);
      try {
        if (!accessToken) throw new Error('No authentication token found');
        const response = await api.get<PageResponse<VendorDTO>>(
          `/vendors/stations/${stationId}`,
          {
            headers: { Authorization: `Bearer ${accessToken}` },
            params: { page: 0, size: 1000 },
          }
        );
        setVendors(response.data.content || []);
      } catch (err: any) {
        console.error('Failed to fetch vendors:', err);
        setError(err.response?.data?.message || 'Failed to load vendors');
        toast.error('Failed to load vendors.');
      } finally {
        setLoading(false);
      }
    },
    [accessToken]
  );

  // Fetch vendor sales overview
  const fetchVendorsSales = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      if (!accessToken) throw new Error('No authentication token found');
      const params: ApiParams = {};
      if (startDate) params.startDate = format(startOfDay(startDate), "yyyy-MM-dd'T'HH:mm:ss");
      if (endDate) params.endDate = format(endOfDay(endDate), "yyyy-MM-dd'T'HH:mm:ss");
      if (selectedStation) params.stationId = selectedStation;
      if (selectedVendor) params.vendorId = selectedVendor;
      const response = await api.get<VendorSalesOverviewDTO[]>('/admin/analytics/vendors/sales', {
        headers: { Authorization: `Bearer ${accessToken}` },
        params,
      });
      setVendorSales(response.data || []);
    } catch (err: any) {
      console.error('Error fetching vendors sales:', err);
      setError(err.response?.data?.message || 'Failed to fetch vendor sales data.');
      toast.error('Failed to fetch vendor sales data.');
    } finally {
      setLoading(false);
    }
  }, [accessToken, startDate, endDate, selectedStation, selectedVendor]);

  // Fetch station sales for last month
  const fetchStationsSales = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      if (!accessToken) throw new Error('No authentication token found');
      const response = await api.get<StationSalesSummaryDTO[]>('/admin/analytics/stations/sales/last-month', {
        headers: { Authorization: `Bearer ${accessToken}` },
      });
      setStationSales(response.data || []);
    } catch (err: any) {
      console.error('Error fetching stations sales:', err);
      setError(err.response?.data?.message || 'Failed to fetch station sales data.');
      toast.error('Failed to fetch station sales data.');
    } finally {
      setLoading(false);
    }
  }, [accessToken]);

  // Fetch top selling items for a vendor
  const fetchTopItems = useCallback(async (vendorId: string) => {
    setLoading(true);
    setError(null);
    try {
      if (!accessToken) throw new Error('No authentication token found');
      const params: ApiParams = { limit: 5, sortBy: 'quantity' };
      if (startDate) params.startDate = format(startOfDay(startDate), "yyyy-MM-dd'T'HH:mm:ss");
      if (endDate) params.endDate = format(endOfDay(endDate), "yyyy-MM-dd'T'HH:mm:ss");
      const response = await api.get<TopSellingItemDTO[]>(`/admin/analytics/vendors/${vendorId}/favorite-items`, {
        headers: { Authorization: `Bearer ${accessToken}` },
        params,
      });
      setTopItems(response.data || []);
    } catch (err: any) {
      console.error('Error fetching top items:', err);
      setError(err.response?.data?.message || 'Failed to fetch top items data.');
      toast.error('Failed to fetch top items data.');
    } finally {
      setLoading(false);
    }
  }, [accessToken, startDate, endDate]);

  // Fetch monthly sales for a vendor
  const fetchMonthlySales = useCallback(async (vendorId: string) => {
    setLoading(true);
    setError(null);
    try {
      if (!accessToken) throw new Error('No authentication token found');
      const params: ApiParams = {};
      if (startDate) params.startDate = format(startOfDay(startDate), "yyyy-MM-dd'T'HH:mm:ss");
      if (endDate) params.endDate = format(endOfDay(endDate), "yyyy-MM-dd'T'HH:mm:ss");
      const response = await api.get<MonthlySalesDTO[]>(`/admin/analytics/vendors/${vendorId}/sales/monthly`, {
        headers: { Authorization: `Bearer ${accessToken}` },
        params,
      });
      setMonthlySales(response.data || []);
    } catch (err: any) {
      console.error('Error fetching monthly sales:', err);
      setError(err.response?.data?.message || 'Failed to fetch monthly sales data.');
      toast.error('Failed to fetch monthly sales data.');
    } finally {
      setLoading(false);
    }
  }, [accessToken, startDate, endDate]);

  // Initial data fetch
  useEffect(() => {
    fetchStations();
    fetchStationsSales();
  }, [fetchStations, fetchStations]);

  // Fetch vendors and sales when station or filters change
  useEffect(() => {
    fetchVendors(selectedStation);
    fetchVendorsSales();
  }, [selectedStation, startDate, endDate, selectedVendor, fetchVendors, fetchVendorsSales]);

  // Fetch vendor-specific data when vendor is selected
  useEffect(() => {
    if (selectedVendor) {
      fetchTopItems(selectedVendor);
      fetchMonthlySales(selectedVendor);
    } else {
      setTopItems([]);
      setMonthlySales([]);
    }
  }, [selectedVendor, startDate, endDate, fetchTopItems, fetchMonthlySales]);

  // Handle filter submission
  const handleFilterSubmit = (e: React.MouseEvent<HTMLButtonElement>) => {
    e.preventDefault();
    if (!startDate || !endDate) {
      setError('Please select both start and end dates');
      toast.error('Please select both start and end dates');
      return;
    }
    if (validateDates(startDate, endDate)) {
      fetchVendorsSales();
      if (selectedVendor) {
        fetchTopItems(selectedVendor);
        fetchMonthlySales(selectedVendor);
      }
    }
  };

  // Calculate stats for cards
  const totalEarnings = useMemo(() => vendorSales.reduce((sum, v) => sum + (v.totalAmount || 0), 0), [vendorSales]);
  const totalOrders = useMemo(() => vendorSales.reduce((sum, v) => sum + (v.orderCount || 0), 0), [vendorSales]);
  const totalRestaurants = vendorSales.length;
  const avgOrderValue = useMemo(() => (totalOrders ? (totalEarnings / totalOrders).toFixed(2) : '0.00'), [totalEarnings, totalOrders]);
  const formattedTotalEarnings = useMemo(() => totalEarnings.toFixed(2), [totalEarnings]);

  const statsCards = useMemo(
    () => [
      {
        title: 'Total Earnings',
        value: `₹${formattedTotalEarnings}`,
        icon: DollarSign,
        color: 'bg-gradient-to-r from-blue-600 to-blue-700',
        textColor: 'text-blue-600',
      },
      {
        title: 'Total Orders',
        value: totalOrders,
        icon: ShoppingCart,
        color: 'bg-gradient-to-r from-green-600 to-green-700',
        textColor: 'text-green-600',
      },
      {
        title: 'Total Restaurants',
        value: totalRestaurants,
        icon: Utensils,
        color: 'bg-gradient-to-r from-orange-600 to-orange-700',
        textColor: 'text-orange-600',
      },
      {
        title: 'Avg Order Value',
        value: `₹${avgOrderValue}`,
        icon: TrendingUp,
        color: 'bg-gradient-to-r from-purple-600 to-purple-700',
        textColor: 'text-purple-600',
      },
    ],
    [formattedTotalEarnings, totalOrders, totalRestaurants, avgOrderValue]
  );

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
      borderColor: '#93c5fd',
      boxShadow: 'none',
      '&:hover': {
        borderColor: '#3b82f6',
      },
      minHeight: '2.5rem',
      fontSize: '0.875rem',
    }),
    menu: (provided: any) => ({
      ...provided,
      zIndex: 9999,
    }),
    option: (provided: any, state: any) => ({
      ...provided,
      backgroundColor: state.isSelected ? '#3b82f6' : state.isFocused ? '#e0f2fe' : 'white',
      color: state.isSelected ? 'white' : '#1f2937',
      '&:hover': {
        backgroundColor: '#e0f2fe',
        color: '#1f2937',
      },
    }),
    singleValue: (provided: any) => ({
      ...provided,
      color: '#1f2937',
    }),
    placeholder: (provided: any) => ({
      ...provided,
      color: '#9ca3af',
    }),
  };

  // Chart data for Monthly Sales
  const chartData = useMemo(
    () => ({
      labels: monthlySales.map((sale) => sale.month),
      datasets: [
        {
          label: 'Total Revenue (₹)',
          data: monthlySales.map((sale) => sale.totalRevenue),
          type: 'line' as const,
          borderColor: 'rgba(59, 130, 246, 1)',
          backgroundColor: 'rgba(59, 130, 246, 0.2)',
          fill: true,
          tension: 0.4,
          yAxisID: 'y',
        },
        {
          label: 'Total Orders',
          data: monthlySales.map((sale) => sale.totalOrders),
          type: 'bar' as const,
          backgroundColor: 'rgba(34, 197, 94, 0.5)',
          borderColor: 'rgba(34, 197, 94, 1)',
          borderWidth: 1,
          yAxisID: 'y1',
        },
      ],
    }),
    [monthlySales]
  );

  // StatCard Component
  interface StatCardProps {
    title: string;
    value: string | number;
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
      {/* Loading and Error States */}
      {loading && (
        <div className="fixed inset-0 flex items-center justify-center bg-black/50">
          <div className="animate-spin rounded-full h-10 w-10 border-t-4 border-b-4 border-blue-600"></div>
        </div>
      )}
      {error && (
        <div className="mb-4 p-3 bg-red-100 text-red-700 rounded-md text-sm border-l-4 border-red-500">
          {error}
        </div>
      )}

      {/* Header */}
      <Card className="mb-6 border border-blue-100">
        <CardHeader className="bg-blue-50">
          <CardTitle className="text-xl sm:text-2xl font-bold text-blue-800">
            Admin Dashboard
          </CardTitle>
          <p className="text-sm text-blue-600">Monitor and analyze vendor and station performance</p>
        </CardHeader>
      </Card>

      {/* Filter Section */}
      <Card className="mb-6 shadow-md border border-blue-100">
        <CardHeader className="bg-blue-50">
          <CardTitle className="text-lg font-semibold text-blue-800">Filter Analytics</CardTitle>
        </CardHeader>
        <CardContent className="p-3 sm:p-6">
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
            <div>
              <Label htmlFor="station" className="text-sm font-medium text-blue-700">
                Select Station
              </Label>
              <Select
                options={stationOptions}
                value={stationOptions.find((option) => option.value === selectedStation) || null}
                onChange={(option) => {
                  setSelectedStation(option?.value || '');
                  setSelectedVendor('');
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
                onChange={(option) => setSelectedVendor(option?.value || '')}
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
          <div className="mt-4 flex justify-end">
            <Button
              onClick={handleFilterSubmit}
              className="bg-blue-600 text-white hover:bg-blue-700"
              disabled={loading}
            >
              Apply Filters
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4 mb-6">
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

      {/* Monthly Sales Chart */}
      {selectedVendor && monthlySales.length > 0 && (
        <Card className="mb-6 shadow-md border border-blue-100">
          <CardHeader className="bg-blue-50">
            <CardTitle className="text-lg font-semibold text-blue-800">Monthly Sales Overview</CardTitle>
          </CardHeader>
          <CardContent className="p-3 sm:p-6">
            <div className="h-96">
              <Chart
                type="bar"
                data={chartData}
                options={{
                  responsive: true,
                  maintainAspectRatio: false,
                  scales: {
                    y: {
                      beginAtZero: true,
                      title: { display: true, text: 'Revenue (₹)' },
                      grid: { color: 'rgba(0, 0, 0, 0.1)' },
                    },
                    y1: {
                      beginAtZero: true,
                      position: 'right',
                      title: { display: true, text: 'Orders' },
                      grid: { drawOnChartArea: false },
                    },
                    x: {
                      title: { display: true, text: 'Month' },
                      grid: { color: 'rgba(0, 0, 0, 0.1)' },
                    },
                  },
                  plugins: {
                    legend: { position: 'top', labels: { font: { size: 12 } } },
                    title: { display: false },
                    tooltip: {
                      backgroundColor: 'rgba(0, 0, 0, 0.8)',
                      titleFont: { size: 14 },
                      bodyFont: { size: 12 },
                    },
                  },
                }}
              />
            </div>
          </CardContent>
        </Card>
      )}

      {/* Vendors Sales Overview */}
      <Card className="mb-6 shadow-md border border-blue-100">
        <CardHeader className="bg-blue-50">
          <CardTitle className="text-lg font-semibold text-blue-800">Vendors Sales Overview</CardTitle>
        </CardHeader>
        <CardContent className="p-3 sm:p-6">
          <div className="overflow-x-auto">
            <table className="w-full text-sm text-left text-gray-500">
              <thead className="text-xs text-gray-700 uppercase bg-gray-50">
                <tr>
                  <th className="px-3 sm:px-6 py-3">Vendor</th>
                  <th className="px-3 sm:px-6 py-3">Orders</th>
                  <th className="px-3 sm:px-6 py-3">Revenue (₹)</th>
                </tr>
              </thead>
              <tbody>
                {vendorSales.length > 0 ? (
                  vendorSales.map((vendor) => (
                    <tr key={vendor.vendorId} className="hover:bg-gray-50 transition-colors">
                      <td className="px-3 sm:px-6 py-4 font-medium text-gray-900">{vendor.businessName}</td>
                      <td className="px-3 sm:px-6 py-4">{vendor.orderCount}</td>
                      <td className="px-3 sm:px-6 py-4">₹{vendor.totalAmount.toFixed(2)}</td>
                    </tr>
                  ))
                ) : (
                  <tr>
                    <td colSpan={3} className="px-3 sm:px-6 py-4 text-center text-gray-500">
                      No vendor data available
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>

      {/* Stations Last Month Sales */}
      <Card className="mb-6 shadow-md border border-blue-100">
        <CardHeader className="bg-blue-50">
          <CardTitle className="text-lg font-semibold text-blue-800">Stations Last Month Sales</CardTitle>
        </CardHeader>
        <CardContent className="p-3 sm:p-6">
          <div className="overflow-x-auto">
            <table className="w-full text-sm text-left text-gray-500">
              <thead className="text-xs text-gray-700 uppercase bg-gray-50">
                <tr>
                  <th className="px-3 sm:px-6 py-3">City</th>
                  <th className="px-3 sm:px-6 py-3">Orders</th>
                  <th className="px-3 sm:px-6 py-3">Revenue (₹)</th>
                </tr>
              </thead>
              <tbody>
                {stationSales.length > 0 ? (
                  stationSales.map((station) => (
                    <tr key={station.stationId} className="hover:bg-gray-50 transition-colors">
                      <td className="px-3 sm:px-6 py-4 font-medium text-gray-900">{station.stationName}</td>
                      <td className="px-3 sm:px-6 py-4">{station.orderCount}</td>
                      <td className="px-3 sm:px-6 py-4">₹{station.totalAmount.toFixed(2)}</td>
                    </tr>
                  ))
                ) : (
                  <tr>
                    <td colSpan={3} className="px-3 sm:px-6 py-4 text-center text-gray-500">
                      No station data available
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>

      {/* Top Selling Items */}
      {selectedVendor && (
        <Card className="shadow-md border border-blue-100">
          <CardHeader className="bg-blue-50">
            <CardTitle className="text-lg font-semibold text-blue-800">Top Selling Items</CardTitle>
          </CardHeader>
          <CardContent className="p-3 sm:p-6">
            <div className="overflow-x-auto">
              <table className="w-full text-sm text-left text-gray-500">
                <thead className="text-xs text-gray-700 uppercase bg-gray-50">
                  <tr>
                    <th className="px-3 sm:px-6 py-3">Item</th>
                    <th className="px-3 sm:px-6 py-3">Category</th>
                    <th className="px-3 sm:px-6 py-3">Quantity Sold</th>
                    <th className="px-3 sm:px-6 py-3">Revenue (₹)</th>
                  </tr>
                </thead>
                <tbody>
                  {topItems.length > 0 ? (
                    topItems.map((item) => (
                      <tr key={item.itemId} className="hover:bg-gray-50 transition-colors">
                        <td className="px-3 sm:px-6 py-4 font-medium text-gray-900">{item.itemName}</td>
                        <td className="px-3 sm:px-6 py-4">{item.category}</td>
                        <td className="px-3 sm:px-6 py-4">{item.quantitySold}</td>
                        <td className="px-3 sm:px-6 py-4">₹{item.totalRevenue.toFixed(2)}</td>
                      </tr>
                    ))
                  ) : (
                    <tr>
                      <td colSpan={4} className="px-3 sm:px-6 py-4 text-center text-gray-500">
                        No top items data available
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
};

export default AdminDashboard;