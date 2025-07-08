import { FC, useEffect, useState, useCallback, useRef } from "react";
import api from "../utils/axios";
import LoaderModal from "../components/LoaderModal";
import { Edit, Plus, Search, Trash2, X } from "lucide-react";
import Pagination from "../components/Pagination";
import { Button } from "@/components/ui/button";
import { Box, Modal, Typography, IconButton } from "@mui/material";
import AddStation from "@/components/AddStation";
import { useMediaQuery } from "@mui/material";
import { useTheme } from "@mui/material/styles";
import AddCSVStation from "@/components/AddCSVStation";
import debounce from "lodash.debounce";

const style = {
  position: "absolute",
  top: "50%",
  left: "50%",
  transform: "translate(-50%, -50%)",
  width: "90%",
  maxWidth: 600,
  bgcolor: "background.paper",
  borderRadius: 2,
  p: 4,
};

const Station: FC = () => {
  const [listData, setListData] = useState([]);
  const [loading, setLoading] = useState(false);
  const [open, setOpen] = useState(false);
  const [selectedId, setSelectedId] = useState<number | null>(null);
  const [refresh, setRefresh] = useState<boolean>(false);
  const [openModal, setOpenModal] = useState(false);
  const [openCSV, setOpenCSV] = useState(false);
  const [mode, setMode] = useState<"add" | "edit">("add");
  const [stationCodeInput, setStationCodeInput] = useState("");
  const [cityInput, setCityInput] = useState("");
  const [stationCodeFilter, setStationCodeFilter] = useState("");
  const [cityFilter, setCityFilter] = useState("");
  const [page, setPage] = useState({
    current_page: 1,
    to: 0,
    total: 0,
    from: 0,
    per_page: 10,
    remainingPages: 0,
    last_page: 0,
  });

  // Refs for input elements to manage focus
  const stationCodeInputRef = useRef<HTMLInputElement>(null);
  const cityInputRef = useRef<HTMLInputElement>(null);
  const activeInputRef = useRef<"stationCode" | "city" | null>(null);

  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down("sm"));

  const handleOpenAddModal = () => {
    setMode("add");
    setSelectedId(null);
    setOpenModal(true);
  };

  const handleOpenEditModal = (id: number) => {
    setMode("edit");
    setSelectedId(id);
    setOpenModal(true);
  };

  const handleClose = () => {
    setSelectedId(null);
    setOpen(false);
  };

  const handleDelete = async () => {
    setLoading(true);
    try {
      const res = await api.delete(`/stations/${selectedId}`);
      if (res.status === 204) {
        setRefresh(!refresh);
      }
    } catch (error) {
      console.error("Failed to delete data:", error);
    } finally {
      setLoading(false);
      handleClose();
    }
  };

  const getData = async (
    pageNumber = 1,
    pageSize = 10,
    filters = { stationCode: "", city: "" }
  ) => {
    setLoading(true);
    try {
      const queryParams = new URLSearchParams({
        page: (pageNumber - 1).toString(),
        size: pageSize.toString(),
      });
      if (filters.stationCode) queryParams.append("stationCode", filters.stationCode);
      if (filters.city) queryParams.append("stationName", filters.city);

      const res = await api.get(`/stations?${queryParams.toString()}`);

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
      console.error("Failed to fetch data:", error);
      setListData([]);
    } finally {
      setLoading(false);
    }
  };

  // Debounced functions for applying filters
  const debouncedStationCodeFilter = useCallback(
    debounce((value: string) => {
      setStationCodeFilter(value);
      setPage((prev) => ({ ...prev, current_page: 1 }));
      getData(1, page.per_page, { stationCode: value, city: cityFilter });
    }, 300),
    [cityFilter, page.per_page]
  );

  const debouncedCityFilter = useCallback(
    debounce((value: string) => {
      setCityFilter(value);
      setPage((prev) => ({ ...prev, current_page: 1 }));
      getData(1, page.per_page, { stationCode: stationCodeFilter, city: value });
    }, 300),
    [stationCodeFilter, page.per_page]
  );

  const handleStationCodeChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value;
    setStationCodeInput(value);
    activeInputRef.current = "stationCode";
    debouncedStationCodeFilter(value);
  };

  const handleCityChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value;
    setCityInput(value);
    activeInputRef.current = "city";
    debouncedCityFilter(value);
  };

  // Restore focus after re-render
  useEffect(() => {
    if (activeInputRef.current === "stationCode" && stationCodeInputRef.current) {
      stationCodeInputRef.current.focus();
      const length = stationCodeInputRef.current.value.length;
      stationCodeInputRef.current.setSelectionRange(length, length);
    } else if (activeInputRef.current === "city" && cityInputRef.current) {
      cityInputRef.current.focus();
      const length = cityInputRef.current.value.length;
      cityInputRef.current.setSelectionRange(length, length);
    }
  }, [listData, page]);

  useEffect(() => {
    getData(page.current_page, page.per_page, { stationCode: stationCodeFilter, city: cityFilter });
  }, [refresh]);

  const handlePageClick = (e: any) => {
    if (!loading) {
      const newPage = e.selected + 1;
      if (newPage !== page.current_page) {
        setPage((prev) => ({ ...prev, current_page: newPage }));
        getData(newPage, page.per_page, { stationCode: stationCodeFilter, city: cityFilter });
      }
    }
  };

  const handlePageSizeChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const newSize = parseInt(e.target.value, 10);
    if (newSize !== page.per_page) {
      setPage((prev) => ({ ...prev, per_page: newSize, current_page: 1 }));
      getData(1, newSize, { stationCode: stationCodeFilter, city: cityFilter });
    }
  };

  return (
    <div className="overflow-x-auto">
      {loading ? (
        <LoaderModal />
      ) : (
        <div className="h-full w-full">
          {/* Header Section - Improved for mobile */}
          <div className="flex flex-col sm:flex-row justify-between items-center bg-white px-4 py-4 gap-4 sm:gap-0 sm:py-0 sm:h-16">
            <div className="w-full sm:w-auto">
              <div className="flex flex-col sm:flex-row gap-3 sm:gap-2 w-full">
                <div className="relative w-full sm:w-48">
                  <div className="absolute inset-y-0 left-1 flex items-center ps-3 pointer-events-none">
                    <Search className="size-5 text-gray-400" />
                  </div>
                  <input
                    type="text"
                    id="stationCodeFilter"
                    ref={stationCodeInputRef}
                    className="w-full p-2 ps-10 text-sm text-gray-900 border border-gray-300 rounded-3xl outline-none"
                    placeholder="Station Code"
                    value={stationCodeInput}
                    onChange={handleStationCodeChange}
                    onFocus={() => (activeInputRef.current = "stationCode")}
                  />
                </div>
                <div className="relative w-full sm:w-48">
                  <div className="absolute inset-y-0 left-1 flex items-center ps-3 pointer-events-none">
                    <Search className="size-5 text-gray-400" />
                  </div>
                  <input
                    type="text"
                    id="cityFilter"
                    ref={cityInputRef}
                    className="w-full p-2 ps-10 text-sm text-gray-900 border border-gray-300 rounded-3xl outline-none"
                    placeholder="Staion Name"
                    value={cityInput}
                    onChange={handleCityChange}
                    onFocus={() => (activeInputRef.current = "city")}
                  />
                </div>
                <select
                  value={page.per_page}
                  onChange={handlePageSizeChange}
                  className="border border-gray-300 rounded-lg px-4 py-2 text-sm w-full sm:w-auto"
                >
                  <option value={10}>10 Records</option>
                  <option value={25}>25 Records</option>
                  <option value={50}>50 Records</option>
                </select>
              </div>
            </div>
            <div className="w-full sm:w-auto">
              <div className="flex gap-2 flex-col lg:flex-row">
                <Button
                  onClick={handleOpenAddModal}
                  className="w-full sm:w-auto flex justify-center items-center gap-2 bg-[#303fe8] hover:bg-[#303fe8]/90 text-white"
                >
                  <Plus className="h-4 w-4" />
                  <span>Add Station</span>
                </Button>
                <Button
                  onClick={() => {
                    setOpenCSV(true);
                  }}
                  className="w-full sm:w-auto flex justify-center items-center gap-2 bg-[#303fe8] hover:bg-[#303fe8]/90 text-white"
                >
                  <Plus className="h-4 w-4" />
                  <span>Upload File</span>
                </Button>
              </div>
            </div>
          </div>

          {/* Main Content Area */}
          <div className="bg-gray-50 p-3">
            {listData.length > 0 ? (
              <div className="p-4 bg-white overflow-x-auto">
                {isMobile ? (
                  // Mobile view - card layout with better spacing
                  <div className="space-y-4">
                    {listData.map((item: any, index) => (
                      <div
                        key={index}
                        className="p-4 bg-white shadow-md rounded-lg border border-gray-100"
                      >
                        <div className="grid grid-cols-2 gap-4 mb-3">
                          <div>
                            <p className="text-xs text-gray-500">Sr. No.</p>
                            <p className="font-medium text-sm">
                              {(page.current_page - 1) * page.per_page +
                                index +
                                1}
                            </p>
                          </div>
                          <div>
                            <p className="text-xs text-gray-500">
                              Station Code
                            </p>
                            <p className="font-medium text-sm">
                              {item.stationCode}
                            </p>
                          </div>
                          <div>
                            <p className="text-xs text-gray-500">
                              Station Name
                            </p>
                            <p className="font-medium text-sm">
                              {item.stationName}
                            </p>
                          </div>
                          <div>
                            <p className="text-xs text-gray-500">City</p>
                            <p className="font-medium text-sm">{item.city}</p>
                          </div>
                          <div className="col-span-2">
                            <p className="text-xs text-gray-500">State</p>
                            <p className="font-medium text-sm">{item.state}</p>
                          </div>
                        </div>
                        <div className="flex gap-2 justify-end pt-2 border-t border-gray-100">
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => handleOpenEditModal(item.stationId)}
                            className="h-8 px-2"
                          >
                            <Edit className="w-4 h-4" />
                          </Button>
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => {
                              setSelectedId(item.stationId);
                              setOpen(true);
                            }}
                            className="h-8 px-2 text-red-600 hover:text-red-800 border-red-100 hover:border-red-200"
                          >
                            <Trash2 className="w-4 h-4" />
                          </Button>
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  // Desktop view - table layout
                  <table className="min-w-full border-separate border-spacing-y-2">
                    <thead className="w-full">
                      <tr className="rounded-md w-full text-center py-4">
                        <th className="px-2 text-sm py-3 font-medium text-black">
                          Sr. No.
                        </th>
                        <th className="px-2 text-sm py-3 font-medium text-black tracking-wider">
                          Station Code
                        </th>
                        <th className="px-2 text-sm py-3 font-medium text-black tracking-wider">
                          Station Name
                        </th>
                        <th className="px-2 text-sm py-3 font-medium text-black tracking-wider">
                          City Name
                        </th>
                        <th className="px-2 text-sm py-3 font-medium text-black tracking-wider">
                          State Name
                        </th>
                        <th className="px-2 text-sm py-3 text-center font-medium text-black tracking-wider">
                          Action
                        </th>
                      </tr>
                    </thead>
                    <tbody>
                      {listData.map((item: any, index) => (
                        <tr
                          key={index}
                          className="text-center bg-white shadow-md text-sm"
                        >
                          <td className="px-2 py-4 font-medium text-black rounded-tl-lg rounded-bl-lg">
                            {(page.current_page - 1) * page.per_page +
                              index +
                              1}
                          </td>
                          <td className="px-2 py-4 font-medium text-black">
                            {item.stationCode}
                          </td>
                          <td className="px-2 py-4 font-medium text-black">
                            {item.stationName}
                          </td>
                          <td className="px-2 py-4 font-medium text-black">
                            {item.city}
                          </td>
                          <td className="px-2 py-4 font-medium text-black">
                            {item.state}
                          </td>
                          <td className="px-2 py-4 font-medium rounded-tr-lg rounded-br-lg">
                            <div className="flex gap-2 justify-center items-center">
                              <Button
                                size="sm"
                                variant="outline"
                                onClick={() =>
                                  handleOpenEditModal(item.stationId)
                                }
                                className="p-2"
                              >
                                <Edit className="w-4 h-4" />
                              </Button>
                              <Button
                                size="sm"
                                variant="outline"
                                onClick={() => {
                                  setSelectedId(item.stationId);
                                  setOpen(true);
                                }}
                                className="p-2 text-red-600 hover:text-red-800"
                              >
                                <Trash2 className="w-4 h-4" />
                              </Button>
                            </div>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                )}
                <div className="w-full mt-6">
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
              <div className="flex flex-col items-center justify-center mt-12">
                <h2 className="text-xl font-semibold mb-4">No Data Found</h2>
              </div>
            )}
          </div>
        </div>
      )}
      <Modal open={open} onClose={handleClose}>
        <Box sx={style}>
          <IconButton
            onClick={handleClose}
            sx={{
              position: "absolute",
              top: 8,
              right: 8,
              color: "grey.500",
            }}
          >
            <X />
          </IconButton>

          <Typography variant="h6" component="h2" mb={2} fontFamily={"Nunito"}>
            Delete Station
          </Typography>

          <Typography variant="body1" mb={4} fontFamily={"Nunito"}>
            Are you sure you want to delete this record?
          </Typography>

          <Box display="flex" justifyContent="flex-end" gap={2}>
            <Button variant="destructive" onClick={handleDelete}>
              Yes, Delete
            </Button>
            <Button className="bg-gray-600" onClick={handleClose}>
              No
            </Button>
          </Box>
        </Box>
      </Modal>

      <AddStation
        open={openModal}
        setOpen={setOpenModal}
        id={selectedId}
        setId={setSelectedId}
        mode={mode}
        setRefresh={setRefresh}
        refresh={refresh}
      />

      <AddCSVStation
        open={openCSV}
        setOpen={setOpenCSV}
        setRefresh={setRefresh}
        refresh={refresh}
      />
    </div>
  );
};

export default Station;