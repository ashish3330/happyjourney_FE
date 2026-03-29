import { FC, useEffect, useState, useCallback, useRef } from "react";
import api from "../utils/axios";
import { Search } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import Select from "react-select";
import Pagination from "../components/Pagination";
import PageSizeSelect from "../components/PageSizeSelect";
import { useMediaQuery } from "@mui/material";
import { useTheme } from "@mui/material/styles";
import debounce from "lodash.debounce";

interface Callback {
  callbackId: number;
  name: string;
  email: string | null;
  mobileNumber: string | null;
  message: string;
  status: string;
  createdAt: string;
  updatedAt: string | null;
}

const statusOptions = [
  { value: "", label: "All Statuses" },
  { value: "OPEN", label: "open" },
  { value: "IN_PROGRESS", label: "In Progress" },
  { value: "COMPLETED", label: "Completed" },
];

const pageSizeOptions = [
  { value: 10, label: "10 Records" },
  { value: 25, label: "25 Records" },
  { value: 50, label: "50 Records" },
];

const CallbacksDashboard: FC = () => {
  const [listData, setListData] = useState<Callback[]>([]);
  const [loading, setLoading] = useState(false);
  const [open, setOpen] = useState(false);
  const [selectedId, setSelectedId] = useState<number | null>(null);
  const [selectedStatus, setSelectedStatus] = useState<string>("");
  const [refresh, setRefresh] = useState<boolean>(false);
  const [nameFilter, setNameFilter] = useState("");
  const [statusFilter, setStatusFilter] = useState("");
  const [nameInput, setNameInput] = useState("");
  const [page, setPage] = useState({
    current_page: 1,
    to: 0,
    total: 0,
    from: 0,
    per_page: 10,
    remainingPages: 0,
    last_page: 0,
  });

  const nameInputRef = useRef<HTMLInputElement>(null);
  const activeInputRef = useRef<"name" | null>(null);
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down("sm"));

  const handleOpenStatusModal = (id: number, currentStatus: string) => {
    setSelectedId(id);
    setSelectedStatus(currentStatus);
    setOpen(true);
  };

  const handleClose = () => {
    setSelectedId(null);
    setSelectedStatus("");
    setOpen(false);
  };

  const handleUpdateStatus = async () => {
    if (!selectedId || !selectedStatus) return;
    setLoading(true);
    try {
      const token = localStorage.getItem("token");
      await api.put(
        `/callbacks/${selectedId}/status`,
        { status: selectedStatus },
        { headers: { Authorization: `Bearer ${token}` } }
      );
      setRefresh(!refresh);
    } catch (error) {
      console.error("Failed to update status:", error);
    } finally {
      setLoading(false);
      handleClose();
    }
  };

  const getData = async (
    pageNumber = 1,
    pageSize = 10,
    filters = { name: "", status: "" }
  ) => {
    setLoading(true);
    try {
      const queryParams = new URLSearchParams({
        page: (pageNumber - 1).toString(),
        size: pageSize.toString(),
      });
      if (filters.name) queryParams.append("name", filters.name);
      if (filters.status) queryParams.append("status", filters.status);

      const token = localStorage.getItem("token");
      const res = await api.get(`/callbacks?${queryParams.toString()}`, {
        headers: { Authorization: `Bearer ${token}` },
      });

      setListData(res.data.content || []);

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
    } catch (error) {
      console.error("Failed to fetch callbacks:", error);
      setListData([]);
    } finally {
      setLoading(false);
    }
  };

  const debouncedNameFilter = useCallback(
    debounce((value: string) => {
      setNameFilter(value);
      setPage((prev) => ({ ...prev, current_page: 1 }));
      getData(1, page.per_page, { name: value, status: statusFilter });
    }, 300),
    [statusFilter, page.per_page]
  );

  const handleNameChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value;
    setNameInput(value);
    activeInputRef.current = "name";
    debouncedNameFilter(value);
  };

  const handleStatusChange = (selectedOption: any) => {
    const value = selectedOption ? selectedOption.value : "";
    setStatusFilter(value);
    setPage((prev) => ({ ...prev, current_page: 1 }));
    getData(1, page.per_page, { name: nameFilter, status: value });
  };

  const handlePageSizeChange = (newSize: number) => {
    setPage((prev) => ({ ...prev, per_page: newSize, current_page: 1 }));
    getData(1, newSize, { name: nameFilter, status: statusFilter });
  };

  useEffect(() => {
    if (activeInputRef.current === "name" && nameInputRef.current) {
      nameInputRef.current.focus();
      const length = nameInputRef.current.value.length;
      nameInputRef.current.setSelectionRange(length, length);
    }
  }, [listData, page]);

  useEffect(() => {
    getData(page.current_page, page.per_page, { name: nameFilter, status: statusFilter });
  }, [refresh]);

  const handlePageClick = (e: any) => {
    if (!loading) {
      const newPage = e.selected + 1;
      if (newPage !== page.current_page) {
        setPage((prev) => ({ ...prev, current_page: newPage }));
        getData(newPage, page.per_page, { name: nameFilter, status: statusFilter });
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
            <CardTitle className="text-xl sm:text-2xl font-bold text-teal-800">Callbacks Dashboard</CardTitle>
          </CardHeader>
          <CardContent className="p-3 sm:p-6">
            <div className="flex flex-col sm:flex-row gap-3 sm:gap-4 mb-4 sm:mb-6">
              <div className="relative flex-1 sm:max-w-[200px]">
                <Search className="absolute left-2 top-1/2 transform -translate-y-1/2 text-teal-400 h-4 w-4" />
                <Input
                  ref={nameInputRef}
                  type="text"
                  placeholder="Search by name..."
                  value={nameInput}
                  onChange={handleNameChange}
                  onFocus={() => (activeInputRef.current = "name")}
                  className="pl-8 w-full text-sm border-teal-300 focus:border-teal-500 focus:ring-teal-500"
                  aria-label="Search callbacks by name"
                />
              </div>
              <Select
                options={statusOptions}
                value={statusOptions.find((option) => option.value === statusFilter)}
                onChange={handleStatusChange}
                placeholder="Filter by status"
                className="w-full sm:w-[160px] text-sm"
                classNamePrefix="select"
                isClearable
                aria-label="Filter callbacks by status"
              />
              <PageSizeSelect value={page.per_page} options={[10, 25, 50]} onChange={handlePageSizeChange} label="records" />
            </div>

            {listData.length > 0 ? (
              <div className="overflow-x-auto">
                {isMobile ? (
                  <div className="space-y-3">
                    {listData.map((item, index) => (
                      <Card key={item.callbackId} className="p-3 border border-teal-100">
                        <div className="grid grid-cols-2 gap-2">
                          <div>
                            <p className="text-xs text-teal-600">Sr. No.</p>
                            <p className="font-medium text-sm truncate">{(page.current_page - 1) * page.per_page + index + 1}</p>
                          </div>
                          <div>
                            <p className="text-xs text-teal-600">Name</p>
                            <p className="font-medium text-sm truncate">{item.name}</p>
                          </div>
                          <div>
                            <p className="text-xs text-teal-600">Email</p>
                            <p className="font-medium text-sm truncate">{item.email || "N/A"}</p>
                          </div>
                          <div>
                            <p className="text-xs text-teal-600">Mobile</p>
                            <p className="font-medium text-sm truncate">{item.mobileNumber || "N/A"}</p>
                          </div>
                          <div className="col-span-2">
                            <p className="text-xs text-teal-600">Message</p>
                            <p className="font-medium text-sm truncate">{item.message}</p>
                          </div>
                          <div>
                            <p className="text-xs text-teal-600">Status</p>
                            <p className="font-medium text-sm truncate">{item.status}</p>
                          </div>
                        </div>
                        <div className="flex justify-end mt-3">
                          <Button
                            variant="outline"
                            size="sm"
                            className="border-teal-300 text-teal-700 hover:bg-teal-50"
                            onClick={() => handleOpenStatusModal(item.callbackId, item.status)}
                            aria-label={`Update status for callback ${item.callbackId}`}
                          >
                            Update Status
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
                        <th className="px-3 py-2 text-sm font-medium text-teal-900 text-left">Name</th>
                        <th className="px-3 py-2 text-sm font-medium text-teal-900 text-left">Email</th>
                        <th className="px-3 py-2 text-sm font-medium text-teal-900 text-left">Mobile</th>
                        <th className="px-3 py-2 text-sm font-medium text-teal-900 text-left">Message</th>
                        <th className="px-3 py-2 text-sm font-medium text-teal-900 text-left">Status</th>
                        <th className="px-3 py-2 text-sm font-medium text-teal-900 text-left">Action</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-teal-200">
                      {listData.map((item, index) => (
                        <tr key={item.callbackId} className="hover:bg-teal-50 transition-colors">
                          <td className="px-3 py-3 text-sm">{(page.current_page - 1) * page.per_page + index + 1}</td>
                          <td className="px-3 py-3 text-sm truncate max-w-[150px]">{item.name}</td>
                          <td className="px-3 py-3 text-sm truncate max-w-[200px]">{item.email || "N/A"}</td>
                          <td className="px-3 py-3 text-sm truncate max-w-[150px]">{item.mobileNumber || "N/A"}</td>
                          <td className="px-3 py-3 text-sm truncate max-w-[250px]">{item.message}</td>
                          <td className="px-3 py-3 text-sm truncate">{item.status}</td>
                          <td className="px-3 py-3">
                            <Button
                              variant="outline"
                              size="sm"
                              className="border-teal-300 text-teal-700 hover:bg-teal-50"
                              onClick={() => handleOpenStatusModal(item.callbackId, item.status)}
                              aria-label={`Update status for callback ${item.callbackId}`}
                            >
                              Update Status
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
                <h2 className="text-lg sm:text-xl font-semibold text-teal-600">No Callbacks Found</h2>
                <p className="text-sm text-teal-500 mt-2">Try adjusting your filters or adding new callbacks.</p>
              </div>
            )}
          </CardContent>
        </Card>
      )}

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="sm:max-w-sm p-4">
          <DialogHeader>
            <DialogTitle className="text-teal-800">Update Callback Status</DialogTitle>
          </DialogHeader>
          <Select
            options={statusOptions.filter((option) => option.value !== "")}
            value={statusOptions.find((option) => option.value === selectedStatus)}
            onChange={(option) => setSelectedStatus(option ? option.value : "")}
            className="w-full text-sm"
            classNamePrefix="select"
            aria-label="Select callback status"
          />
          <DialogFooter className="mt-4">
            <Button
              variant="outline"
              onClick={handleClose}
              className="border-teal-300 text-teal-700 hover:bg-teal-50"
            >
              Cancel
            </Button>
            <Button
              onClick={handleUpdateStatus}
              disabled={!selectedStatus}
              className="bg-teal-600 text-white hover:bg-teal-700"
            >
              Update
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default CallbacksDashboard;