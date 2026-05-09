import React, { useEffect, useState } from "react";
import IconButton from "@mui/material/IconButton";
import { X } from "lucide-react";
import { Box, Button, Modal } from "@mui/material";
import { Controller, SubmitHandler, useForm } from "react-hook-form";
import * as yup from "yup";
import { yupResolver } from "@hookform/resolvers/yup";
import api from "@/utils/axios";
import LoaderModal from "./LoaderModal";

const style = {
  position: "absolute",
  top: "50%",
  left: "50%",
  transform: "translate(-50%, -50%)",
  width: { xs: "90vw", sm: "80vw", md: 900 }, // Responsive width
  maxHeight: { xs: "85vh", sm: "75vh" }, // Adaptive max height
  bgcolor: "background.paper",
  borderRadius: 2,
  border: "none",
  boxShadow: "none",
  p: { xs: 2, sm: 4 }, // Reduced padding on mobile
  overflowY: "auto", // Scrollable content
};

type FormData = {
  stationCode: string;
  stationName: string;
  city: string;
  state: string;
  pincode: string;
  latitude: number;
  longitude: number;
};

interface Payload {
  stationId?: number | null;
  stationCode?: string;
  stationName?: string;
  city?: string;
  state?: string;
  pincode?: string;
  latitude?: number;
  longitude?: number;
}

interface IndiProps {
  open: boolean;
  setOpen: React.Dispatch<React.SetStateAction<boolean>>;
  id: number | null;
  mode: "add" | "edit";
  setRefresh: React.Dispatch<React.SetStateAction<boolean>>;
  refresh: boolean;
  setId: React.Dispatch<React.SetStateAction<number | null>>;
}

const validationSchema = yup.object().shape({
  stationCode: yup.string().required("City code is required"),
  stationName: yup.string().required("City name is required"),
  city: yup.string().required("City is required"),
  state: yup.string().required("State is required"),
  pincode: yup
    .string()
    .required("Pincode is required")
    .matches(/^[0-9]+$/, "Pincode must be numeric")
    .length(6, "Pincode must be 6 digits"),
  latitude: yup
    .number()
    .required("Latitude is required")
    .min(-90, "Latitude must be between -90 and 90")
    .max(90, "Latitude must be between -90 and 90"),
  longitude: yup
    .number()
    .required("Longitude is required")
    .min(-180, "Longitude must be between -180 and 180")
    .max(180, "Longitude must be between -180 and 180"),
});

export default function AddStation({
  open,
  setOpen,
  id,
  setId,
  mode,
  setRefresh,
  refresh,
}: IndiProps) {
  const [isLoading, setIsLoading] = useState(false);

  const {
    handleSubmit,
    control,
    reset,
    formState: { errors },
  } = useForm<FormData>({
    resolver: yupResolver(validationSchema),
    defaultValues: {
      stationCode: "",
      stationName: "",
      city: "",
      state: "",
      pincode: "",
      latitude: 0,
      longitude: 0,
    },
  });

  const handleClose = () => {
    setId(null);
    reset({
      stationCode: "",
      stationName: "",
      city: "",
      state: "",
      pincode: "",
      latitude: 0,
      longitude: 0,
    });
    setOpen(false);
  };

  useEffect(() => {
    const fetchStationData = async () => {
      if (mode === "edit" && id) {
        try {
          setIsLoading(true);
          const res = await api.get(`/stations/${id}`);
          if (res.status === 200 && res.data) {
            reset({
              stationCode: res.data.stationCode || "",
              stationName: res.data.stationName || "",
              city: res.data.city || "",
              state: res.data.state || "",
              pincode: res.data.pincode || "",
              latitude: res.data.latitude || 0,
              longitude: res.data.longitude || 0,
            });
          }
        } catch (error) {
          console.error("Error fetching station data:", error);
        } finally {
          setIsLoading(false);
        }
      }
    };

    fetchStationData();
  }, [id, mode, reset]);

  const onSubmit: SubmitHandler<FormData> = async (data) => {
    setIsLoading(true);
    const payload: Payload = {
      stationCode: data.stationCode,
      stationName: data.stationName,
      city: data.city,
      state: data.state,
      pincode: data.pincode,
      latitude: data.latitude,
      longitude: data.longitude,
    };

    try {
      const endpoint = mode === "edit" && id ? `/stations/${id}` : "/stations";
      const method = mode === "edit" ? api.put : api.post;
      if (mode === "edit" && id) {
        payload.stationId = id;
      }

      const res = await method(endpoint, payload);
      if (res.status === 200 || res.status === 201) {
        setRefresh(!refresh);
        handleClose();
      }
    } catch (error) {
      console.error("Error submitting form:", error);
    } finally {
      setIsLoading(false);
    }
  };

  const getTitle = () => {
    switch (mode) {
      case "add":
        return "Add City";
      case "edit":
        return "Update City";
      default:
        return "";
    }
  };

  return (
    <Modal open={open} onClose={handleClose}>
      <Box sx={style}>
        <div className="font-medium text-lg sm:text-xl mb-4">{getTitle()}</div>
        <IconButton
          onClick={handleClose}
          sx={{
            position: "absolute",
            top: 8,
            right: 8,
            color: "grey.500",
          }}
        >
          <X size={20} />
        </IconButton>
        {isLoading && <LoaderModal />}
        <form onSubmit={handleSubmit(onSubmit)}>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-2">
            <div className="mb-4 w-full">
              <label
                className="block text-sm font-medium text-gray-700"
                htmlFor="stationCode"
              >
                City Code
              </label>
              <Controller
                name="stationCode"
                control={control}
                render={({ field }) => (
                  <>
                    <input
                      {...field}
                      type="text"
                      id="stationCode"
                      className={`mt-1 block w-full px-3 py-2.5 border ${
                        errors.stationCode
                          ? "border-red-500"
                          : "border-gray-300"
                      } bg-white rounded-md shadow-sm focus:outline-none focus:ring-teal-500 focus:border-teal-500 text-sm sm:text-base`}
                      placeholder="Enter City code"
                    />
                    {errors.stationCode && (
                      <p className="mt-1 text-xs sm:text-sm text-red-600">
                        {errors.stationCode.message}
                      </p>
                    )}
                  </>
                )}
              />
            </div>

            <div className="mb-4 w-full">
              <label
                className="block text-sm font-medium text-gray-700"
                htmlFor="stationName"
              >
                City Name
              </label>
              <Controller
                name="stationName"
                control={control}
                render={({ field }) => (
                  <>
                    <input
                      {...field}
                      type="text"
                      id="stationName"
                      className={`mt-1 block w-full px-3 py-2.5 border ${
                        errors.stationName
                          ? "border-red-500"
                          : "border-gray-300"
                      } bg-white rounded-md shadow-sm focus:outline-none focus:ring-teal-500 focus:border-teal-500 text-sm sm:text-base`}
                      placeholder="Enter City name"
                    />
                    {errors.stationName && (
                      <p className="mt-1 text-xs sm:text-sm text-red-600">
                        {errors.stationName.message}
                      </p>
                    )}
                  </>
                )}
              />
            </div>

            <div className="mb-4 w-full">
              <label
                className="block text-sm font-medium text-gray-700"
                htmlFor="city"
              >
                City
              </label>
              <Controller
                name="city"
                control={control}
                render={({ field }) => (
                  <>
                    <input
                      {...field}
                      type="text"
                      id="city"
                      className={`mt-1 block w-full px-3 py-2.5 border ${
                        errors.city ? "border-red-500" : "border-gray-300"
                      } bg-white rounded-md shadow-sm focus:outline-none focus:ring-teal-500 focus:border-teal-500 text-sm sm:text-base`}
                      placeholder="Enter city"
                    />
                    {errors.city && (
                      <p className="mt-1 text-xs sm:text-sm text-red-600">
                        {errors.city.message}
                      </p>
                    )}
                  </>
                )}
              />
            </div>

            <div className="mb-4 w-full">
              <label
                className="block text-sm font-medium text-gray-700"
                htmlFor="state"
              >
                State
              </label>
              <Controller
                name="state"
                control={control}
                render={({ field }) => (
                  <>
                    <input
                      {...field}
                      type="text"
                      id="state"
                      className={`mt-1 block w-full px-3 py-2.5 border ${
                        errors.state ? "border-red-500" : "border-gray-300"
                      } bg-white rounded-md shadow-sm focus:outline-none focus:ring-teal-500 focus:border-teal-500 text-sm sm:text-base`}
                      placeholder="Enter state"
                    />
                    {errors.state && (
                      <p className="mt-1 text-xs sm:text-sm text-red-600">
                        {errors.state.message}
                      </p>
                    )}
                  </>
                )}
              />
            </div>

            <div className="mb-4 w-full">
              <label
                className="block text-sm font-medium text-gray-700"
                htmlFor="pincode"
              >
                Pincode
              </label>
              <Controller
                name="pincode"
                control={control}
                render={({ field }) => (
                  <>
                    <input
                      {...field}
                      type="text"
                      id="pincode"
                      className={`mt-1 block w-full px-3 py-2.5 border ${
                        errors.pincode ? "border-red-500" : "border-gray-300"
                      } bg-white rounded-md shadow-sm focus:outline-none focus:ring-teal-500 focus:border-teal-500 text-sm sm:text-base`}
                      placeholder="Enter pincode"
                      maxLength={6}
                    />
                    {errors.pincode && (
                      <p className="mt-1 text-xs sm:text-sm text-red-600">
                        {errors.pincode.message}
                      </p>
                    )}
                  </>
                )}
              />
            </div>

            <div className="mb-4 w-full">
              <label
                className="block text-sm font-medium text-gray-700"
                htmlFor="latitude"
              >
                Latitude
              </label>
              <Controller
                name="latitude"
                control={control}
                render={({ field }) => (
                  <>
                    <input
                      {...field}
                      type="number"
                      id="latitude"
                      className={`mt-1 block w-full px-3 py-2.5 border ${
                        errors.latitude ? "border-red-500" : "border-gray-300"
                      } bg-white rounded-md shadow-sm focus:outline-none focus:ring-teal-500 focus:border-teal-500 text-sm sm:text-base`}
                      placeholder="Enter latitude"
                      value={field.value || ""}
                      onChange={(e) =>
                        field.onChange(
                          e.target.value ? Number(e.target.value) : 0
                        )
                      }
                      step="0.000001"
                    />
                    {errors.latitude && (
                      <p className="mt-1 text-xs sm:text-sm text-red-600">
                        {errors.latitude.message}
                      </p>
                    )}
                  </>
                )}
              />
            </div>

            <div className="mb-4 w-full">
              <label
                className="block text-sm font-medium text-gray-700"
                htmlFor="longitude"
              >
                Longitude
              </label>
              <Controller
                name="longitude"
                control={control}
                render={({ field }) => (
                  <>
                    <input
                      {...field}
                      type="number"
                      id="longitude"
                      className={`mt-1 block w-full px-3 py-2.5 border ${
                        errors.longitude ? "border-red-500" : "border-gray-300"
                      } bg-white rounded-md shadow-sm focus:outline-none focus:ring-teal-500 focus:border-teal-500 text-sm sm:text-base`}
                      placeholder="Enter longitude"
                      value={field.value || ""}
                      onChange={(e) =>
                        field.onChange(
                          e.target.value ? Number(e.target.value) : 0
                        )
                      }
                      step="0.000001"
                    />
                    {errors.longitude && (
                      <p className="mt-1 text-xs sm:text-sm text-red-600">
                        {errors.longitude.message}
                      </p>
                    )}
                  </>
                )}
              />
            </div>
          </div>

          <div className="w-full flex justify-center items-center mt-4 mb-6">
            <Button
              type="submit"
              variant="outlined"
              size="medium"
              color="primary"
              disabled={isLoading}
              sx={{ px: 4, py: 1.5 }}
            >
              {isLoading ? "Processing..." : "Save"}
            </Button>
          </div>
        </form>
      </Box>
    </Modal>
  );
}
