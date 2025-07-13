import React, { useEffect, useState, useCallback } from "react";
import { useNavigate } from "react-router-dom";

import { Button } from "@/components/ui/button";
import { Search, Star, Clock } from "lucide-react";
import api from "@/utils/axios";
import Pagination from "@/components/Pagination";
import { SparklesIcon, FireIcon } from "@heroicons/react/20/solid";
import WhyChoose from "@/components/WhyChoose";
import { HappyJourneyConfig } from "@/components/HappyJourneyConfig";

// Define interfaces
interface Station {
  stationId: number;
  stationCode: string;
  stationName: string;
}

interface Category {
  categoryId: number;
  vendorId: number;
  categoryName: string;
  displayOrder: number;
}

interface Vendor {
  vendorId: number;
  businessName: string;
  description: string;
  fssaiLicense: string;
  activeStatus: boolean;
  logoUrl?: string;
  veg: boolean;
  preparationTimeMin: number;
  rating: number;
  address: string;
  categories?: Category[];
  minOrderAmount?: number;
}

interface PaginationData {
  current_page: number;
  to: number;
  total: number;
  from: number;
  per_page: number;
  remainingPages: number;
  last_page: number;
}

const OrderFood = () => {
  const [searchType, setSearchType] = useState<"stationCode" | "city">("city");
  const [searchQuery, setSearchQuery] = useState<string>("");
  const [stations, setStations] = useState<Station[]>([]);
  const [vendors, setVendors] = useState<Vendor[]>([]);
  const [loading, setLoading] = useState<boolean>(false);
  const [page, setPage] = useState<PaginationData>({
    current_page: 1,
    to: 0,
    total: 0,
    from: 0,
    per_page: 10,
    remainingPages: 0,
    last_page: 0,
  });
  const [imageUrls, setImageUrls] = useState<{ [key: string]: string }>({});
  const navigate = useNavigate();

  // Fetch image for vendor logo
  const fetchImage = async (logoUrl: string) => {
    if (!logoUrl || imageUrls[logoUrl]) return;

    try {
      const response = await api.get(
        `/files/download?systemFileName=${logoUrl}`,
        { responseType: "blob" }
      );
      if (response.status === 200) {
        const blob = response.data;
        const url = URL.createObjectURL(blob);
        setImageUrls((prev) => ({ ...prev, [logoUrl]: url }));
      }
    } catch (error) {
      setImageUrls((prev) => ({
        ...prev,
        [logoUrl]: "https://images.unsplash.com/photo-1512621776951-a57141f2eefd?q=80&w=150&auto=format&fit=crop",
      }));
    }
  };

  // Debounce function
  const debounce = <F extends (...args: any[]) => void>(
    func: F,
    wait: number
  ) => {
    let timeout: ReturnType<typeof setTimeout>;
    return (...args: Parameters<F>) => {
      clearTimeout(timeout);
      timeout = setTimeout(() => func(...args), wait);
    };
  };

  // Fetch stations
  const fetchStations = useCallback(
    async (query: string, type: "stationCode" | "city") => {
      if (!query.trim()) {
        setStations([]);
        setVendors([]);
        return;
      }

      setLoading(true);
      try {
        const params = type === "stationCode" ? { stationCode: query } : { city: query };
        const res = await api.get<Station[]>("/stations/all", { params });
        if (Array.isArray(res.data)) {
          setStations(res.data);
          if (res.data.length > 0) {
            setPage((prev) => ({ ...prev, current_page: 1 }));
            fetchVendors(res.data[0].stationId, 1, page.per_page);
          }
        }
      } catch (err) {
        console.error("Error fetching stations", err);
        setStations([]);
        setVendors([]);
      } finally {
        setLoading(false);
      }
    },
    [page.per_page]
  );

  const debouncedFetchStations = useCallback(
    debounce((query: string, type: "stationCode" | "city") => {
      fetchStations(query, type);
    }, 500),
    [fetchStations]
  );

  // Fetch vendors
  const fetchVendors = async (stationId: number, pageNumber = 1, pageSize = 10) => {
    if (!stationId) return;
    setLoading(true);
    try {
      const res = await api.get<{
        content: Vendor[];
        pageable: { offset: number; pageSize: number };
        numberOfElements: number;
        totalElements: number;
        totalPages: number;
      }>(`/vendors/stations/${stationId}?page=${pageNumber - 1}&size=${pageSize}`);

      const vendorsData = res.data.content || [];
      
      setVendors(vendorsData.map(vendor => ({
        ...vendor,
        categories: []
      })));

      vendorsData.forEach((vendor) => {
        if (vendor.logoUrl) {
          fetchImage(vendor.logoUrl);
        }
      });

      const vendorsWithCategories = await Promise.all(
        vendorsData.map(async (vendor) => {
          try {
            const categoriesRes = await api.get<{
              content: Category[];
            }>(`/menu/vendors/${vendor.vendorId}/categories`);
            return { 
              ...vendor, 
              categories: categoriesRes.data.content || [] 
            };
          } catch (error) {
            console.error(`Failed to fetch categories for vendor ${vendor.vendorId}:`, error);
            return { ...vendor, categories: [] };
          }
        })
      );

      setVendors(vendorsWithCategories);

      const { pageable, numberOfElements, totalElements, totalPages } = res.data;
      setPage({
        current_page: pageNumber,
        from: pageable.offset + 1,
        to: pageable.offset + numberOfElements,
        total: totalElements,
        per_page: pageable.pageSize,
        remainingPages: totalPages - pageNumber,
        last_page: totalPages,
      });
    } catch (error) {
      console.error("Failed to fetch vendors:", error);
      setVendors([]);
    } finally {
      setLoading(false);
    }
  };

  const handleSearchInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const query = e.target.value;
    setSearchQuery(query);
    debouncedFetchStations(query, searchType);
  };

  const handlePageClick = (e: { selected: number }) => {
    if (!loading) {
      const newPage = e.selected + 1;
      if (newPage !== page.current_page && stations.length > 0) {
        setPage((prev) => ({ ...prev, current_page: newPage }));
        fetchVendors(stations[0].stationId, newPage, page.per_page);
      }
    }
  };

  const handlePageSizeChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const newSize = parseInt(e.target.value, 10);
    setPage((prev) => ({ ...prev, per_page: newSize, current_page: 1 }));
    if (stations.length > 0) {
      fetchVendors(stations[0].stationId, 1, newSize);
    }
  };

  useEffect(() => {
    return () => {
      Object.values(imageUrls).forEach((url) => {
        if (!url.includes("unsplash.com")) {
          URL.revokeObjectURL(url);
        }
      });
    };
  }, [imageUrls]);



  return (
    <div className="flex min-h-screen bg-gray-50">
      <div className="flex-1 p-4 md:p-6">
        {/* Enhanced Search Section with Perfect Image Alignment */}
        <div className="flex flex-col lg:flex-row items-center justify-between gap-6 mb-8">
          <div className="w-full lg:w-1/2 flex flex-col space-y-4">
            <div className="flex flex-col">
              <h1 className="text-2xl md:text-3xl font-bold text-gray-800 mb-2">Find Food on Your Train Journey</h1>
              <p className="text-gray-600">Order from top restaurants and get delivery at your station</p>
            </div>
            
            <div className="flex items-center gap-2">
              <Button
                onClick={() => setSearchType("stationCode")}
                className={`px-4 py-2 rounded-full text-sm font-medium transition-all ${
                  searchType === "stationCode" 
                    ? "bg-blue-600 text-white shadow-md" 
                    : "bg-gray-100 text-gray-700 hover:bg-gray-200"
                }`}
              >
                Station Code
              </Button>
              <Button
                onClick={() => setSearchType("city")}
                className={`px-4 py-2 rounded-full text-sm font-medium transition-all ${
                  searchType === "city" 
                    ? "bg-blue-600 text-white shadow-md" 
                    : "bg-gray-100 text-gray-700 hover:bg-gray-200"
                }`}
              >
                City
              </Button>
            </div>
            
            <div className="relative w-full">
              <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                <Search className="h-5 w-5 text-gray-400" />
              </div>
              <input
                type="text"
                value={searchQuery}
                onChange={handleSearchInputChange}
                placeholder={`Search by ${searchType === "stationCode" ? "station code (e.g. NDLS)" : "city (e.g. Delhi)"}`}
                className="block w-full pl-10 pr-3 py-3 border border-gray-300 rounded-lg bg-white shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-base"
              />
            </div>
          </div>

          {/* Responsive Image Container */}
          <div className="w-full lg:w-1/2 h-full">
            <div className="relative w-full h-48 md:h-64 lg:h-80 rounded-xl overflow-hidden shadow-lg">
              <img
                src="https://plus.unsplash.com/premium_photo-1673108852141-e8c3c22a4a22?q=80&w=1170&auto=format&fit=crop&ixlib=rb-4.1.0&ixid=M3wxMjA3fDB8MHxwaG90by1wYWdlfHx8fGVufDB8fHx8fA%3D%3D"
                alt="Delicious food on train"
                className="absolute inset-0 w-full h-full object-cover object-center transition-transform duration-500 hover:scale-105"
              />
              <div className="absolute inset-0 bg-gradient-to-t from-black/60 to-transparent flex items-end p-6">
                <div>
                  <h2 className="text-xl font-bold text-white">Fresh Meals Delivered to Your Seat</h2>
                  <p className="text-gray-200 mt-1">Enjoy restaurant-quality food during your journey</p>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Vendor Cards */}
        {vendors.length > 0 && (
          <div className="mb-8">
            <div className="flex flex-col sm:flex-row justify-between items-center mb-6">
              <h2 className="text-xl font-bold text-gray-800 mb-2 sm:mb-0">
                Available Restaurants ({page.total})
              </h2>
              <div className="flex items-center gap-4">
                <select
                  value={page.per_page}
                  onChange={handlePageSizeChange}
                  className="border border-gray-300 rounded-lg px-3 py-2 text-sm text-gray-600 shadow-sm focus:ring-2 focus:ring-blue-500 focus:outline-none bg-white"
                >
                  <option value={10}>Show 10</option>
                  <option value={25}>Show 25</option>
                  <option value={50}>Show 50</option>
                </select>
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
              {vendors.map((vendor) => (
                <div
                  key={vendor.vendorId}
                  className="bg-white rounded-xl overflow-hidden shadow-md hover:shadow-lg transition-all duration-300 cursor-pointer border border-gray-200"
                  onClick={() => navigate(`/order/${vendor.vendorId}`)}
                >
                  <div className="relative h-48 w-full">
                    {vendor.logoUrl && imageUrls[vendor.logoUrl] ? (
                      <img
                        src={imageUrls[vendor.logoUrl]}
                        className="w-full h-full object-cover"
                        alt={vendor.businessName}
                        onError={(e) => {
                          (e.target as HTMLImageElement).src =
                            "https://images.unsplash.com/photo-1512621776951-a57141f2eefd?q=80&w=150&auto=format&fit=crop";
                        }}
                      />
                    ) : (
                      <div className="w-full h-full bg-gradient-to-br from-gray-100 to-gray-200 flex items-center justify-center">
                        <span className="text-gray-400 text-sm">Loading image...</span>
                      </div>
                    )}
                  </div>
                  <div className="p-4">
                    <div className="flex justify-between items-start mb-2">
                      <h3 className="text-lg font-bold text-gray-800 line-clamp-1">
                        {vendor.businessName}
                      </h3>
                      <div className="flex items-center bg-blue-50 px-2 py-1 rounded-full">
                        <Star className="w-4 h-4 fill-yellow-400 text-yellow-400" />
                        <span className="text-xs font-semibold text-blue-800 ml-1">
                          {vendor.rating?.toFixed(1) || "New"}
                        </span>
                      </div>
                    </div>
                    <p className="text-sm text-gray-600 line-clamp-2 mb-3">
                      {vendor.description || "No description available"}
                    </p>
                    <div className="grid grid-cols-2 gap-x-4 gap-y-2 text-xs text-gray-600 mb-4">
                      <div className="flex items-center">
                        <Clock className="w-3 h-3 mr-1" />
                        {vendor.preparationTimeMin || 15} min
                      </div>
                      <div className="text-right">
                        <div>
                          <span className="font-medium">Min:</span> ₹{vendor.minOrderAmount || 99}
                        </div>
                        <div
                          className="flex items-center justify-end mt-1"
                          aria-label={vendor.veg ? "Vegetarian" : "Non-Vegetarian"}
                        >
                          {vendor.veg ? (
                            <>
                              <SparklesIcon className="w-3 h-3 text-green-500 mr-1" />
                              <span className="text-green-600">Veg</span>
                            </>
                          ) : (
                            <>
                              <FireIcon className="w-3 h-3 text-red-500 mr-1" />
                              <span className="text-red-600">Non-Veg</span>
                            </>
                          )}
                        </div>
                      </div>
                      <div className="col-span-2">
                        <span className="font-medium">Cuisines:</span>{" "}
                        {vendor.categories?.slice(0, 3).map((c) => c.categoryName).join(", ")}
                        {vendor.categories && vendor.categories.length > 3 && "..."}
                      </div>
                    </div>
                    <Button
                      className="w-full bg-blue-600 hover:bg-blue-700 text-white rounded-lg py-2 text-sm font-medium transition-colors"
                      onClick={(e) => {
                        e.stopPropagation();
                        navigate(`/user-order/${vendor.vendorId}`);
                      }}
                    >
                      View Menu
                    </Button>
                  </div>
                </div>
              ))}
            </div>

            <div className="mt-8">
              <Pagination
                numOfPages={page.last_page}
                pageNo={page.current_page}
                pageSize={page.per_page}
                handlePageClick={handlePageClick}
                totalItems={page.total}
                from={page.from}
                to={page.to}
              />
            </div>
          </div>
        )}

        {searchQuery && vendors.length === 0 && !loading && (
          <div className="flex flex-col items-center justify-center py-12">
            <div className="bg-gray-100 p-6 rounded-full mb-4">
              <Search className="w-8 h-8 text-gray-400" />
            </div>
            <h2 className="text-xl font-semibold text-gray-700">No restaurants found</h2>
            <p className="text-gray-500 mt-2">
              Try searching for a different {searchType === "stationCode" ? "station" : "city"}
            </p>
          </div>
        )}

    <WhyChoose config={HappyJourneyConfig} />      </div>
    </div>
  );
};

export default OrderFood;