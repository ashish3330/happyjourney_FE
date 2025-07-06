import { FC, useEffect, useState, useCallback } from "react";
import api from "../utils/axios";
import LoaderModal from "../components/LoaderModal";
import { Edit, Plus, Trash2, X } from "lucide-react";
import Pagination from "../components/Pagination";
import { Button } from "@/components/ui/button";
import { Box, Modal, Typography, IconButton } from "@mui/material";
import AddStation from "@/components/AddStation";
import { useMediaQuery } from "@mui/material";
import { useTheme } from "@mui/material/styles";
import AddCSVStation from "@/components/AddCSVStation";
import debounce from "lodash.debounce";
import Select from "react-select";

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
  const [selectedStation, setSelectedStation] = useState<string>("");
  const [selectedVendor, setSelectedVendor] = useState<string>("");
  const [page, setPage] = useState({
    current_page: 1,
    to: 0,
    total: 0,
    from: 0,
    per_page: 10,
    remainingPages: 0,
    last_page: 0,
  });

  // Mock stationOptions (replace with actual data source)
  const stationOptions = listData.map((item: any) => ({
    value: item.stationCode,
    label: `${item.stationCode} - ${item.stationName}`,
  }));

  // Options for records dropdown
  const recordOptions = [
    { value: 10, label: "10 Records" },
    { value: 25, label: "25 Records" },
    { value: 50, label: "50 Records" },
  ];

  // Custom styles for react-select to match the original dropdown
  const selectStyles = {
    control: (provided: any, state: any) => ({
      ...provided,
      minHeight: "38px",
      border: "1px solid #d1d5db", // Matches border border-gray-300
      borderRadius: "0.5rem", // Matches rounded-lg
      padding: "0.5rem 1rem", // Matches px-4 py-2
      fontSize: "0.875rem", // Matches text-sm
      backgroundColor: "#fff",
      boxShadow: state.isFocused ? "0 0 0 1px #303fe8" : "none", // Blue outline on focus
      "&:hover": {
        borderColor: "#9ca3af", // Matches hover border-gray-400
      },
    }),
    placeholder: (provided: any) => ({
      ...provided,
      color: "#9ca3af", // Matches placeholder text-gray-400
    }),
    singleValue: (provided: any) => ({
      ...provided,
      color: "#111827", // Matches text-gray-900
    }),
    menu: (provided: any) => ({
      ...provided,
      zIndex: 9999,
      borderRadius: "0.5rem", // Consistent rounded corners
    }),
    option: (provided: any, state: any) => ({
      ...provided,
      backgroundColor: state.isSelected ? "#303fe8" : state.isFocused ? "#f3f4f6" : "#fff",
      color: state.isSelected ? "#fff" : "#111827",
      "&:hover": {
        backgroundColor: "#f3f4f6", // Matches hover:bg-gray-100
      },
    }),
  };

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
    stationCode = ""
  ) => {
    setLoading(true);
    try {
      const queryParams = new URLSearchParams({
        page: (pageNumber - 1).toString(),
        size: pageSize.toString(),
      });
      if (stationCode) queryParams.append("stationCode", stationCode);

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

  // Debounced function for applying station filter
  const debouncedStationFilter = useCallback(
    debounce((value: string) => {
      setPage((prev) => ({ ...prev, current_page: 1 }));
      getData(1, page.per_page, value);
    }, 300),
    [page.per_page]
  );

  const handleStationChange = (option: { value: string; label: string } | null) => {
    const value = option?.value || "";
    setSelectedStation(value);
    setSelectedVendor(""); // Reset vendor as per your logic
    debouncedStationFilter(value);
  };

  const handlePageSizeChange = (option: { value: number; label: string } | null) => {
    const newSize = option?.value || 10; // Default to 10 if cleared
    if (newSize !== page.per_page) {
      setPage((prev) => ({ ...prev, per_page: newSize, current_page: 1 }));
      getData(1, newSize, selectedStation);
    }
  };

  useEffect(() => {
    getData(page.current_page, page.per_page, selectedStation);
  }, [refresh]);

  const handlePageClick = (e: any) => {
    if (!loading) {
      const newPage = e.selected + 1;
      if (newPage !== page.current_page) {
        setPage((prev) => ({ ...prev, current_page: newPage }));
        getData(newPage, page.per_page, selectedStation);
      }
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
                <div className="w-full sm:w-64">
                  <Select
                    options={stationOptions}
                    value={stationOptions.find((option) => option.value === selectedStation) || null}
                    onChange={handleStationChange}
                    placeholder="Select a station"
                    styles={selectStyles}
                    isClearable
                    className="mt-1"
                  />
                </div>
                <div className="w-full sm:w-40">
                  <Select
                    options={recordOptions}
                    value={recordOptions.find((option) => option.value === page.per_page) || null}
                    onChange={handlePageSizeChange}
                    placeholder="Select records"
                    styles={selectStyles}
                    isClearable={false}
                    className="mt-1"
                  />
                </div>
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