import { FC, useEffect, useState, useCallback, useRef } from "react";
import api from "../utils/axios";
import { Search } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import Select from "react-select";
import Pagination from "../components/Pagination";
import { useMediaQuery } from "@mui/material";
import { useTheme } from "@mui/material/styles";
import debounce from "lodash.debounce";

interface BulkOrder {
  id: number;
  name: string;
  email: string;
  phone: string;
  deliveryStation: string;
  orderDetails: string;
  quantity: number;
  createdAt: string;
  updatedAt?: string | null;
}

const pageSizeOptions = [
  { value: 10, label: "10 Records" },
  { value: 25, label: "25 Records" },
  { value: 50, label: "50 Records" },
];

const BulkOrdersDashboard: FC = () => {
  const [listData, setListData] = useState<BulkOrder[]>([]);
  const [loading, setLoading] = useState(false);
  const [open, setOpen] = useState(false);
  const [selectedOrder, setSelectedOrder] = useState<BulkOrder | null>(null);
  const [idFilter, setIdFilter] = useState("");
  const [idInput, setIdInput] = useState("");
  const [page, setPage] = useState({
    current_page: 1,
    to: 0,
    total: 0,
    from: 0,
    per_page: 10,
    remainingPages: 0,
    last_page: 0,
  });

  const idInputRef = useRef<HTMLInputElement>(null);
  const activeInputRef = useRef<"id" | null>(null);
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down("sm"));

  const handleOpenDetailsModal = async (id: number) => {
    setLoading(true);
    try {
      const token = localStorage.getItem("token");
      const res = await api.get(`/bulk-orders/${id}`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      setSelectedOrder(res.data);
      setOpen(true);
    } catch (error) {
      console.error("Failed to fetch order details:", error);
    } finally {
      setLoading(false);
    }
  };

  const handleClose = () => {
    setSelectedOrder(null);
    setOpen(false);
  };

  const getData = async (
    pageNumber = 1,
    pageSize = 10,
    filters = { id: "" }
  ) => {
    setLoading(true);
    try {
      const queryParams = new URLSearchParams({
        page: (pageNumber - 1).toString(),
        size: pageSize.toString(),
      });
      if (filters.id) queryParams.append("id", filters.id);

      const token = localStorage.getItem("token");
      const res = await api.get(`/bulk-orders?${queryParams.toString()}`, {
        headers: { Authorization: `Bearer ${token}` },
      });

      const data = res.data.content || res.data;
      setListData(Array.isArray(data) ? data : []);

      if (res.data.pageable) {
        const { pageable, numberOfElements, totalElements, totalPages } = res.data;
        setPage((prev) => {
          const newPage = {
            current_page: pageNumber,
            from: pageable.offset + 1,
            to: pageable.offset + numberOfElements,
            total: totalElements,
            per_page: pageable.pageSize,
            remainingPages: totalPages - pageNumber,
            last_page: totalPages,
          };
          if (
            prev.current_page === newPage.current_page &&
            prev.per_page === newPage.per_page &&
            prev.total === newPage.total &&
            prev.last_page === newPage.last_page &&
            prev.from === newPage.from &&
            prev.to === newPage.to &&
            prev.remainingPages === newPage.remainingPages
          ) {
            return prev;
          }
          return newPage;
        });
      } else {
        setPage((prev) => ({
          ...prev,
          current_page: 1,
          from: 1,
          to: data.length,
          total: data.length,
          per_page: data.length,
          remainingPages: 0,
          last_page: 1,
        }));
      }
    } catch (error) {
      console.error("Failed to fetch bulk orders:", error);
      setListData([]);
    } finally {
      setLoading(false);
    }
  };

  const debouncedIdFilter = useCallback(
    debounce((value: string) => {
      setIdFilter(value);
      setPage((prev) => ({ ...prev, current_page: 1 }));
      getData(1, page.per_page, { id: value });
    }, 300),
    [page.per_page]
  );

  const handleIdChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value;
    setIdInput(value);
    activeInputRef.current = "id";
    debouncedIdFilter(value);
  };

  const handlePageSizeChange = (selectedOption: any) => {
    const newSize = selectedOption ? selectedOption.value : 10;
    setPage((prev) => ({ ...prev, per_page: newSize, current_page: 1 }));
    getData(1, newSize, { id: idFilter });
  };

  useEffect(() => {
    if (activeInputRef.current === "id" && idInputRef.current) {
      idInputRef.current.focus();
      const length = idInputRef.current.value.length;
      idInputRef.current.setSelectionRange(length, length);
    }
  }, [listData, page]);

  useEffect(() => {
    getData(page.current_page, page.per_page, { id: idFilter });
  }, []);

  const handlePageClick = (e: any) => {
    if (!loading) {
      const newPage = e.selected + 1;
      if (newPage !== page.current_page) {
        setPage((prev) => ({ ...prev, current_page: newPage }));
        getData(newPage, page.per_page, { id: idFilter });
      }
    }
  };

  return (
    <div className="container mx-auto px-2 sm:px-4 py-4 sm:py-6">
      {loading ? (
        <div className="fixed inset-0 flex items-center justify-center bg-black/50">
          <div className="animate-spin rounded-full h-10 w-10 border-t-4 border-b-4 border-teal-600"></div>
        </div>
      ) : (
        <Card className="w-full shadow-md border border-teal-100">
          <CardHeader className="bg-teal-50">
            <CardTitle className="text-xl sm:text-2xl font-bold text-teal-800">Bulk Orders Dashboard</CardTitle>
          </CardHeader>
          <CardContent className="p-3 sm:p-6">
            <div className="flex flex-col sm:flex-row gap-3 sm:gap-4 mb-4 sm:mb-6">
              <div className="relative flex-1 sm:max-w-[200px]">
                <Search className="absolute left-2 top-1/2 transform -translate-y-1/2 text-teal-400 h-4 w-4" />
                <Input
                  ref={idInputRef}
                  type="text"
                  placeholder="Search by order ID..."
                  value={idInput}
                  onChange={handleIdChange}
                  onFocus={() => (activeInputRef.current = "id")}
                  className="pl-8 w-full text-sm border-teal-300 focus:border-teal-500 focus:ring-teal-500"
                  aria-label="Search bulk orders by ID"
                />
              </div>
              <Select
                options={pageSizeOptions}
                value={pageSizeOptions.find((option) => option.value === page.per_page)}
                onChange={handlePageSizeChange}
                placeholder="Records per page"
                className="w-full sm:w-[160px] text-sm"
                classNamePrefix="select"
                aria-label="Select records per page"
              />
            </div>

            {listData.length > 0 ? (
              <div className="overflow-x-auto">
                {isMobile ? (
                  <div className="space-y-3">
                    {listData.map((item, index) => (
                      <Card key={item.id} className="p-3 border border-teal-100">
                        <div className="grid grid-cols-2 gap-2">
                          <div>
                            <p className="text-xs text-teal-600">Sr. No.</p>
                            <p className="font-medium text-sm truncate">{(page.current_page - 1) * page.per_page + index + 1}</p>
                          </div>
                          <div>
                            <p className="text-xs text-teal-600">Order ID</p>
                            <p className="font-medium text-sm truncate">{item.id}</p>
                          </div>
                          <div>
                            <p className="text-xs text-teal-600">Name</p>
                            <p className="font-medium text-sm truncate">{item.name}</p>
                          </div>
                          <div>
                            <p className="text-xs text-teal-600">Email</p>
                            <p className="font-medium text-sm truncate">{item.email}</p>
                          </div>
                          <div>
                            <p className="text-xs text-teal-600">Phone</p>
                            <p className="font-medium text-sm truncate">{item.phone}</p>
                          </div>
                          <div>
                            <p className="text-xs text-teal-600">Delivery City</p>
                            <p className="font-medium text-sm truncate">{item.deliveryStation}</p>
                          </div>
                          <div className="col-span-2">
                            <p className="text-xs text-teal-600">Order Details</p>
                            <p className="font-medium text-sm truncate">{item.orderDetails}</p>
                          </div>
                          <div>
                            <p className="text-xs text-teal-600">Quantity</p>
                            <p className="font-medium text-sm truncate">{item.quantity}</p>
                          </div>
                        </div>
                        <div className="flex justify-end mt-3">
                          <Button
                            variant="outline"
                            size="sm"
                            className="border-teal-300 text-teal-700 hover:bg-teal-50"
                            onClick={() => handleOpenDetailsModal(item.id)}
                            aria-label={`View details for bulk order ${item.id}`}
                          >
                            View Details
                          </Button>
                        </div>
                      </Card>
                    ))}
                  </div>
                ) : (
                  <table className="min-w-full divide-y divide-teal-200">
                    <thead className="bg-teal-50">
                      <tr>
                        <th className="px-3 py-2 text-sm font-medium text-teal-900 text-left">Sr. No.</th>
                        <th className="px-3 py-2 text-sm font-medium text-teal-900 text-left">Order ID</th>
                        <th className="px-3 py-2 text-sm font-medium text-teal-900 text-left">Name</th>
                        <th className="px-3 py-2 text-sm font-medium text-teal-900 text-left">Email</th>
                        <th className="px-3 py-2 text-sm font-medium text-teal-900 text-left">Phone</th>
                        <th className="px-3 py-2 text-sm font-medium text-teal-900 text-left">Delivery City</th>
                        <th className="px-3 py-2 text-sm font-medium text-teal-900 text-left">Order Details</th>
                        <th className="px-3 py-2 text-sm font-medium text-teal-900 text-left">Quantity</th>
                        <th className="px-3 py-2 text-sm font-medium text-teal-900 text-left">Created At</th>
                        <th className="px-3 py-2 text-sm font-medium text-teal-900 text-left">Action</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-teal-200">
                      {listData.map((item, index) => (
                        <tr key={item.id} className="hover:bg-teal-50 transition-colors">
                          <td className="px-3 py-3 text-sm">{(page.current_page - 1) * page.per_page + index + 1}</td>
                          <td className="px-3 py-3 text-sm truncate max-w-[100px]">{item.id}</td>
                          <td className="px-3 py-3 text-sm truncate max-w-[150px]">{item.name}</td>
                          <td className="px-3 py-3 text-sm truncate max-w-[200px]">{item.email}</td>
                          <td className="px-3 py-3 text-sm truncate max-w-[150px]">{item.phone}</td>
                          <td className="px-3 py-3 text-sm truncate max-w-[150px]">{item.deliveryStation}</td>
                          <td className="px-3 py-3 text-sm truncate max-w-[250px]">{item.orderDetails}</td>
                          <td className="px-3 py-3 text-sm truncate">{item.quantity}</td>
                          <td className="px-3 py-3 text-sm truncate max-w-[150px]">{item.createdAt}</td>
                          <td className="px-3 py-3">
                            <Button
                              variant="outline"
                              size="sm"
                              className="border-teal-300 text-teal-700 hover:bg-teal-50"
                              onClick={() => handleOpenDetailsModal(item.id)}
                              aria-label={`View details for bulk order ${item.id}`}
                            >
                              View Details
                            </Button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                )}
                <div className="mt-4">
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
            ) : (
              <div className="flex flex-col items-center justify-center py-10">
                <h2 className="text-lg sm:text-xl font-semibold text-teal-600">No Bulk Orders Found</h2>
                <p className="text-sm text-teal-500 mt-2">Try adjusting your filter or adding new bulk orders.</p>
              </div>
            )}
          </CardContent>
        </Card>
      )}

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="sm:max-w-sm p-4">
          <DialogHeader>
            <DialogTitle className="text-teal-800">Bulk Order Details</DialogTitle>
          </DialogHeader>
          {selectedOrder && (
            <div className="space-y-2 text-sm">
              <p><strong>ID:</strong> {selectedOrder.id}</p>
              <p><strong>Name:</strong> {selectedOrder.name}</p>
              <p><strong>Email:</strong> {selectedOrder.email}</p>
              <p><strong>Phone:</strong> {selectedOrder.phone}</p>
              <p><strong>Delivery Station:</strong> {selectedOrder.deliveryStation}</p>
              <p><strong>Order Details:</strong> {selectedOrder.orderDetails}</p>
              <p><strong>Quantity:</strong> {selectedOrder.quantity}</p>
              <p><strong>Created At:</strong> {selectedOrder.createdAt}</p>
              <p><strong>Updated At:</strong> {selectedOrder.updatedAt || "N/A"}</p>
            </div>
          )}
          <DialogFooter className="mt-4">
            <Button
              variant="outline"
              onClick={handleClose}
              className="border-teal-300 text-teal-700 hover:bg-teal-50"
            >
              Close
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default BulkOrdersDashboard;