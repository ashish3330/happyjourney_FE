import React, { useEffect, useState } from "react";
import { X } from "lucide-react";
import {
  Box,
  Button,
  Modal,
  MenuItem,
  Select,
  InputLabel,
  FormControl,
  SelectChangeEvent,
  TextField,
  Checkbox,
  FormControlLabel,
  Typography,
  Divider,
  IconButton,
  Avatar,
  CircularProgress,
} from "@mui/material";
import { Visibility, VisibilityOff } from "@mui/icons-material";
import { Controller, SubmitHandler, useForm } from "react-hook-form";
import * as yup from "yup";
import { yupResolver } from "@hookform/resolvers/yup";
import api from "@/utils/axios";

type FormData = {
  email: string;
  username: string;
  phone: string; // Changed from phoneNumber to match VendorCreationDTO
  secondaryPhoneNumber: string | null;
  password: string;
  businessName: string;
  description: string;
  logoUrl: string;
  fssaiLicense: string;
  gstNumber: string | null;
  panNumber: string | null;
  stationId: number;
  address: string;
  preparationTimeMin: number;
  minOrderAmount: number;
  rating: number;
  activeStatus: boolean;
  veg: boolean;
  availableStartTime: string;
  availableEndTime: string;
  verified: boolean;
};

interface IndiProps {
  open: boolean;
  setOpen: React.Dispatch<React.SetStateAction<boolean>>;
  id: number | null;
  mode: "add" | "edit";
  setRefresh: React.Dispatch<React.SetStateAction<boolean>>;
  refresh: boolean;
  setId: React.Dispatch<React.SetStateAction<number | null>>;
}

interface Station {
  stationId: number;
  stationName: string;
}

const validationSchema = yup.object().shape({
  email: yup.string().email("Invalid email").required("Email is required"),
  username: yup.string().required("Username is required"),
  phone: yup
    .string()
    .required("Phone number is required")
    .matches(/^[0-9]+$/, "Phone number must be numeric")
    .min(10, "Phone number must be at least 10 digits")
    .max(15, "Phone number must be at most 15 digits"),
  secondaryPhoneNumber: yup
    .string()
    .nullable()
    .matches(/^[0-9]*$/, { message: "Secondary phone must be numeric", excludeEmptyString: true })
    .min(10, "Secondary phone must be at least 10 digits")
    .max(15, "Secondary phone must be at most 15 digits")
    .optional(),
  password: yup.string().when("mode", {
    is: "add",
    then: (schema) => schema.required("Password is required").min(6, "Password must be at least 6 characters"),
    otherwise: (schema) => schema.notRequired(),
  }),
  businessName: yup.string().required("Business name is required"),
  description: yup.string().required("Description is required"),
  logoUrl: yup.string().when("mode", {
    is: "add",
    then: (schema) => schema.required("Logo URL is required"),
    otherwise: (schema) => schema.notRequired(),
  }),
  fssaiLicense: yup.string().required("FSSAI License is required"),
  gstNumber: yup.string().nullable(),
  panNumber: yup.string().nullable(),
  stationId: yup
    .number()
    .required("Station ID is required")
    .min(1, "Select a station"),
  address: yup.string().required("Address is required"),
  preparationTimeMin: yup
    .number()
    .required("Preparation time is required")
    .min(0, "Preparation time cannot be negative"),
  minOrderAmount: yup
    .number()
    .required("Minimum order amount is required")
    .min(0, "Minimum order amount cannot be negative"),
  rating: yup
    .number()
    .required("Rating is required")
    .min(0, "Rating cannot be less than 0")
    .max(5, "Rating cannot be more than 5"),
  activeStatus: yup.boolean().required("Active status is required"),
  veg: yup.boolean().required("Vegetarian status is required"),
  availableStartTime: yup
    .string()
    .required("Available start time is required")
    .matches(/^([0-1]?[0-9]|2[0-3]):[0-5][0-9]$/, "Invalid time format (HH:mm)"),
  availableEndTime: yup
    .string()
    .required("Available end time is required")
    .matches(/^([0-1]?[0-9]|2[0-3]):[0-5][0-9]$/, "Invalid time format (HH:mm)")
    .test("is-after-start", "End time must be after start time", function (value) {
      const startTime = this.parent.availableStartTime;
      if (!startTime || !value) return true;
      return value > startTime;
    }),
  verified: yup.boolean().default(true),
});

export default function AddVendor({
  open,
  setOpen,
  id,
  mode,
  setRefresh,
  refresh,
  setId,
}: IndiProps) {
  const [isLoading, setIsLoading] = useState(false);
  const [logoUrlPreview, setLogoUrlPreview] = useState<string | null>(null);
  const [stationsList, setStationsList] = useState<Station[]>([]);
  const [showPassword, setShowPassword] = useState(false);

  const {
    handleSubmit,
    control,
    reset,
    setValue,
    getValues,
    formState: { errors },
  } = useForm<FormData>({
    resolver: yupResolver(validationSchema as any, { context: { mode } }),
    defaultValues: {
      email: "",
      username: "",
      phone: "",
      secondaryPhoneNumber: null,
      password: "",
      businessName: "",
      description: "",
      logoUrl: "",
      fssaiLicense: "",
      gstNumber: null,
      panNumber: null,
      stationId: 0,
      address: "",
      preparationTimeMin: 0,
      minOrderAmount: 0,
      rating: 0,
      activeStatus: true,
      veg: false,
      availableStartTime: "",
      availableEndTime: "",
      verified: true,
    },
  });

  const handleClose = () => {
    setId(null);
    if (logoUrlPreview) {
      URL.revokeObjectURL(logoUrlPreview);
    }
    setLogoUrlPreview(null);
    setShowPassword(false);
    reset();
    setOpen(false);
  };

  // Helper function to convert HH:mm:ss to HH:mm for form display
  const formatTimeForForm = (time: string | null | undefined): string => {
    if (!time) return "";
    return time.split(":").slice(0, 2).join(":"); // Convert HH:mm:ss to HH:mm
  };

  // Helper function to convert HH:mm to HH:mm:ss for API payload
  const formatTimeForApi = (time: string): string => {
    if (!time) return "";
    return `${time}:00`; // Append :00 to convert HH:mm to HH:mm:ss
  };

  useEffect(() => {
    const getData = async () => {
      setIsLoading(true);
      try {
        const res = await api.get("/stations/all");
        const stations: Station[] = res.data || [];
        setStationsList(stations);
        if (mode === "add" && stations.length > 0 && !getValues("stationId")) {
          setValue("stationId", stations[0].stationId, { shouldDirty: true });
        }
      } catch (error) {
        console.error("Failed to fetch stations:", error);
      } finally {
        setIsLoading(false);
      }
    };
    getData();
  }, [mode, setValue, getValues]);

  useEffect(() => {
    const fetchVendorData = async () => {
      if (mode === "edit" && id) {
        try {
          setIsLoading(true);
          const res = await api.get(`/vendors/${id}`);
          if (res.status === 200 && res.data) {
            const fileUrl = res.data.logoUrl || "";
            if (fileUrl) {
              try {
                const response = await api.get(`/files/download?systemFileName=${fileUrl}`, {
                  responseType: "blob",
                });
                if (response.status === 200) {
                  const blobUrl = URL.createObjectURL(response.data);
                  setLogoUrlPreview(blobUrl);
                }
              } catch (fetchError) {
                console.warn("Error fetching logo image:", fetchError);
                setLogoUrlPreview(null);
              }
            }
            const formData: FormData = {
              email: res.data.email || "",
              username: res.data.username || "",
              phone: res.data.phoneNumber || "", // Map phoneNumber from API to phone in form
              secondaryPhoneNumber: res.data.secondaryPhoneNumber || null,
              password: "",
              businessName: res.data.businessName || "",
              description: res.data.description || "",
              logoUrl: fileUrl,
              fssaiLicense: res.data.fssaiLicense || "",
              gstNumber: res.data.gstNumber || null,
              panNumber: res.data.panNumber || null,
              stationId: Number(res.data.stationId) || 0,
              address: res.data.address || "",
              preparationTimeMin: Number(res.data.preparationTimeMin) || 0,
              minOrderAmount: Number(res.data.minOrderAmount) || 0,
              rating: Number(res.data.rating) || 0,
              activeStatus: res.data.activeStatus !== false,
              veg: res.data.veg === true,
              availableStartTime: formatTimeForForm(res.data.availableStartTime), // Convert to HH:mm
              availableEndTime: formatTimeForForm(res.data.availableEndTime), // Convert to HH:mm
              verified: res.data.verified !== false,
            };
            Object.entries(formData).forEach(([key, value]) => {
              setValue(key as keyof FormData, value, { shouldDirty: false });
            });
          }
        } catch (error) {
          console.error("Error fetching vendor data:", error);
          reset();
        } finally {
          setIsLoading(false);
        }
      }
    };
    fetchVendorData();
  }, [id, mode, reset, setValue]);

  useEffect(() => {
    return () => {
      if (logoUrlPreview) {
        URL.revokeObjectURL(logoUrlPreview);
      }
    };
  }, [logoUrlPreview]);

  const onSubmit: SubmitHandler<FormData> = async (data: FormData) => {
    setIsLoading(true);
    try {
      const endpoint = mode === "edit" && id ? `/vendors/${id}` : "/auth/create-vendor";
      const method = mode === "edit" ? api.put : api.post;
      const payload = {
        email: data.email,
        username: data.username,
        phone: data.phone, // Use phone to match VendorCreationDTO
        password: data.password || undefined,
        businessName: data.businessName,
        description: data.description,
        logoUrl: data.logoUrl,
        fssaiLicense: data.fssaiLicense,
        gstNumber: data.gstNumber || null,
        panNumber: data.panNumber || null,
        stationId: data.stationId,
        address: data.address,
        preparationTimeMin: data.preparationTimeMin,
        minOrderAmount: data.minOrderAmount,
        rating: data.rating,
        verified: data.verified,
        isVeg: data.veg, // Map to DTO field
        activeStatus: data.activeStatus,
        secondaryPhoneNumber: data.secondaryPhoneNumber || null,
        availableStartTime: formatTimeForApi(data.availableStartTime), // Convert to HH:mm:ss
        availableEndTime: formatTimeForApi(data.availableEndTime), // Convert to HH:mm:ss
      };
      const res = await method(endpoint, payload);
      if (res.status === 200 || res.status === 201) {
        setRefresh(!refresh);
        handleClose();
      } else {
        alert("Failed to submit vendor form. Please try again.");
      }
    } catch (error: any) {
      console.error("Error submitting form:", error);
      alert(error.response?.data?.message || "Failed to submit vendor form. Please try again.");
    } finally {
      setIsLoading(false);
    }
  };

  const handleFileChange = async (
    onChange: (value: string) => void,
    event: React.ChangeEvent<HTMLInputElement>
  ) => {
    const file = event.target.files?.[0];
    if (!file) {
      setLogoUrlPreview(null);
      onChange("");
      return;
    }

    const tempPreview = URL.createObjectURL(file);
    setLogoUrlPreview(tempPreview);

    try {
      const formData = new FormData();
      formData.append("file", file);
      const resp = await api.post("/files/upload", formData, {
        headers: { "Content-Type": "multipart/form-data" },
      });

      if (resp.status === 200 && resp.data.fileUrl) {
        const fileUrl = resp.data.fileUrl;
        onChange(fileUrl);
        setValue("logoUrl", fileUrl, { shouldDirty: true });
        try {
          const response = await api.get(`/files/download?systemFileName=${fileUrl}`, {
            responseType: "blob",
          });
          if (response.status === 200) {
            const blobUrl = URL.createObjectURL(response.data);
            setLogoUrlPreview(blobUrl);
            URL.revokeObjectURL(tempPreview);
          }
        } catch (fetchError) {
          console.error("Error fetching image blob:", fetchError);
          setLogoUrlPreview(tempPreview);
        }
      } else {
        setLogoUrlPreview(tempPreview);
        onChange("");
      }
    } catch (error) {
      console.error("Error uploading file:", error);
      setLogoUrlPreview(tempPreview);
      onChange("");
    }
  };

  const handleSelectChange = (
    onChange: (value: number | null) => void,
    event: SelectChangeEvent<number | null>
  ) => {
    const value = event.target.value === "" ? null : Number(event.target.value);
    onChange(value);
  };

  const handleNumberChange = (
    onChange: (value: number) => void,
    e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>
  ) => {
    const value = parseFloat(e.target.value);
    onChange(isNaN(value) ? 0 : value);
  };

  const handleTogglePasswordVisibility = () => {
    setShowPassword((prev) => !prev);
  };

  const getTitle = (): string => {
    return mode === "add" ? "Add New Vendor" : "Edit Vendor Details";
  };

  return (
    <Modal
      open={open}
      onClose={handleClose}
      aria-labelledby="vendor-modal-title"
      sx={{
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
      }}
    >
      <Box
        sx={{
          position: "relative",
          width: "90%",
          maxWidth: 900,
          maxHeight: "90vh",
          bgcolor: "background.paper",
          borderRadius: 2,
          boxShadow: 24,
          p: 4,
          overflow: "hidden",
          display: "flex",
          flexDirection: "column",
        }}
      >
        {isLoading && (
          <Box
            sx={{
              position: "absolute",
              top: 0,
              left: 0,
              right: 0,
              bottom: 0,
              backgroundColor: "rgba(255,255,255,0.7)",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              zIndex: 10,
            }}
          >
            <CircularProgress />
          </Box>
        )}

        <Box
          sx={{
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
            mb: 3,
          }}
        >
          <Typography variant="h6" component="h2" id="vendor-modal-title">
            {getTitle()}
          </Typography>
          <IconButton onClick={handleClose} sx={{ color: "text.secondary" }}>
            <X size={20} />
          </IconButton>
        </Box>

        <Box
          component="form"
          onSubmit={handleSubmit(onSubmit)}
          sx={{
            flex: 1,
            overflowY: "auto",
            pr: 1,
            "&::-webkit-scrollbar": { width: "0.4em" },
            "&::-webkit-scrollbar-track": { boxShadow: "inset 0 0 6px rgba(0,0,0,0.00)" },
            "&::-webkit-scrollbar-thumb": { backgroundColor: "rgba(0,0,0,.1)", borderRadius: 2 },
          }}
        >
          <Box sx={{ mb: 4 }}>
            <Typography variant="subtitle1" gutterBottom sx={{ fontWeight: 600 }}>
              Vendor Information
            </Typography>
            <Divider sx={{ mb: 3 }} />
            <Box
              sx={{
                display: "grid",
                gridTemplateColumns: { md: "1fr 1fr" },
                gap: 3,
                mb: 2,
              }}
            >
              <Controller
                name="email"
                control={control}
                render={({ field }) => (
                  <TextField
                    {...field}
                    label="Email Address"
                    variant="outlined"
                    fullWidth
                    error={!!errors.email}
                    helperText={errors.email?.message}
                    size="small"
                    disabled={mode === "edit"}
                  />
                )}
              />

              <Controller
                name="username"
                control={control}
                render={({ field }) => (
                  <TextField
                    {...field}
                    label="Username"
                    variant="outlined"
                    fullWidth
                    error={!!errors.username}
                    helperText={errors.username?.message}
                    size="small"
                  />
                )}
              />

              <Controller
                name="phone"
                control={control}
                render={({ field }) => (
                  <TextField
                    {...field}
                    label="Phone Number"
                    variant="outlined"
                    fullWidth
                    error={!!errors.phone}
                    helperText={errors.phone?.message}
                    size="small"
                    InputProps={{
                      startAdornment: <Typography variant="body2" sx={{ mr: 1 }}>+91</Typography>,
                    }}
                  />
                )}
              />

              <Controller
                name="secondaryPhoneNumber"
                control={control}
                render={({ field }) => (
                  <TextField
                    {...field}
                    label="Secondary Phone Number (Optional)"
                    variant="outlined"
                    fullWidth
                    error={!!errors.secondaryPhoneNumber}
                    helperText={errors.secondaryPhoneNumber?.message}
                    size="small"
                    value={field.value ?? ""}
                    onChange={(e) => field.onChange(e.target.value || null)}
                    InputProps={{
                      startAdornment: <Typography variant="body2" sx={{ mr: 1 }}>+91</Typography>,
                    }}
                  />
                )}
              />

              {mode === "add" && (
                <Controller
                  name="password"
                  control={control}
                  render={({ field }) => (
                    <TextField
                      {...field}
                      label="Password"
                      type={showPassword ? "text" : "password"}
                      variant="outlined"
                      fullWidth
                      error={!!errors.password}
                      helperText={errors.password?.message}
                      size="small"
                      InputProps={{
                        endAdornment: (
                          <IconButton onClick={handleTogglePasswordVisibility} edge="end">
                            {showPassword ? <VisibilityOff /> : <Visibility />}
                          </IconButton>
                        ),
                      }}
                    />
                  )}
                />
              )}
            </Box>
          </Box>

          <Box sx={{ mb: 4 }}>
            <Typography variant="subtitle1" gutterBottom sx={{ fontWeight: 600 }}>
              Business Details
            </Typography>
            <Divider sx={{ mb: 3 }} />
            <Box
              sx={{
                display: "grid",
                gridTemplateColumns: { md: "1fr 1fr" },
                gap: 3,
                mb: 2,
              }}
            >
              <Controller
                name="businessName"
                control={control}
                render={({ field }) => (
                  <TextField
                    {...field}
                    label="Business Name"
                    variant="outlined"
                    fullWidth
                    error={!!errors.businessName}
                    helperText={errors.businessName?.message}
                    size="small"
                  />
                )}
              />

              <Controller
                name="fssaiLicense"
                control={control}
                render={({ field }) => (
                  <TextField
                    {...field}
                    label="FSSAI License Number"
                    variant="outlined"
                    fullWidth
                    error={!!errors.fssaiLicense}
                    helperText={errors.fssaiLicense?.message}
                    size="small"
                  />
                )}
              />

              <Controller
                name="gstNumber"
                control={control}
                render={({ field }) => (
                  <TextField
                    {...field}
                    label="GST Number (Optional)"
                    variant="outlined"
                    fullWidth
                    error={!!errors.gstNumber}
                    helperText={errors.gstNumber?.message}
                    size="small"
                    value={field.value ?? ""}
                    onChange={(e) => field.onChange(e.target.value || null)}
                  />
                )}
              />

              <Controller
                name="panNumber"
                control={control}
                render={({ field }) => (
                  <TextField
                    {...field}
                    label="PAN Number (Optional)"
                    variant="outlined"
                    fullWidth
                    error={!!errors.panNumber}
                    helperText={errors.panNumber?.message}
                    size="small"
                    value={field.value ?? ""}
                    onChange={(e) => field.onChange(e.target.value || null)}
                  />
                )}
              />

              <Box sx={{ gridColumn: { md: "1 / -1" } }}>
                <Controller
                  name="description"
                  control={control}
                  render={({ field }) => (
                    <TextField
                      {...field}
                      label="Business Description"
                      variant="outlined"
                      fullWidth
                      multiline
                      rows={3}
                      error={!!errors.description}
                      helperText={errors.description?.message}
                      size="small"
                    />
                  )}
                />
              </Box>

              <Controller
                name="stationId"
                control={control}
                render={({ field }) => (
                  <FormControl fullWidth size="small" error={!!errors.stationId}>
                    <InputLabel>City Location</InputLabel>
                    <Select
                      {...field}
                      label="City Location"
                      value={field.value ?? ""}
                      onChange={(e) => handleSelectChange(field.onChange, e)}
                    >
                      <MenuItem value="" disabled>
                        Select a city
                      </MenuItem>
                      {stationsList.map((station) => (
                        <MenuItem key={station.stationId} value={station.stationId}>
                          {station.stationName}
                        </MenuItem>
                      ))}
                    </Select>
                    {errors.stationId && (
                      <Typography variant="caption" color="error">
                        {errors.stationId.message}
                      </Typography>
                    )}
                  </FormControl>
                )}
              />

              <Box>
                <Typography variant="body2" gutterBottom sx={{ mb: 1 }}>
                  Business Logo {mode === "edit" && "(Optional)"}
                </Typography>
                <Controller
                  name="logoUrl"
                  control={control}
                  render={({ field }) => (
                    <Box sx={{ display: "flex", alignItems: "center", gap: 2 }}>
                      <label htmlFor="logoUrl-upload">
                        <input
                          type="file"
                          id="logoUrl-upload"
                          accept="image/*"
                          onChange={(e) => handleFileChange(field.onChange, e)}
                          style={{ display: "none" }}
                          disabled={isLoading}
                        />
                        <Button
                          variant="outlined"
                          component="span"
                          size="small"
                          sx={{ textTransform: "none" }}
                          disabled={isLoading}
                        >
                          Choose File
                        </Button>
                      </label>
                      {logoUrlPreview ? (
                        <Avatar
                          src={logoUrlPreview}
                          alt="Logo Preview"
                          sx={{ width: 56, height: 56 }}
                          variant="rounded"
                        />
                      ) : (
                        <Typography variant="caption" color="text.secondary">
                          No file chosen
                        </Typography>
                      )}
                    </Box>
                  )}
                />
                {errors.logoUrl && (
                  <Typography variant="caption" color="error" sx={{ mt: 1 }}>
                    {errors.logoUrl.message}
                  </Typography>
                )}
              </Box>

              <Box sx={{ gridColumn: { md: "1 / -1" } }}>
                <Controller
                  name="address"
                  control={control}
                  render={({ field }) => (
                    <TextField
                      {...field}
                      label="Business Address"
                      variant="outlined"
                      fullWidth
                      multiline
                      rows={3}
                      error={!!errors.address}
                      helperText={errors.address?.message}
                      size="small"
                    />
                  )}
                />
              </Box>

              <Controller
                name="availableStartTime"
                control={control}
                render={({ field }) => (
                  <TextField
                    {...field}
                    label="Available Start Time"
                    type="time"
                    variant="outlined"
                    fullWidth
                    error={!!errors.availableStartTime}
                    helperText={errors.availableStartTime?.message}
                    size="small"
                    InputLabelProps={{ shrink: true }}
                    InputProps={{ inputProps: { step: 60 } }}
                  />
                )}
              />

              <Controller
                name="availableEndTime"
                control={control}
                render={({ field }) => (
                  <TextField
                    {...field}
                    label="Available End Time"
                    type="time"
                    variant="outlined"
                    fullWidth
                    error={!!errors.availableEndTime}
                    helperText={errors.availableEndTime?.message}
                    size="small"
                    InputLabelProps={{ shrink: true }}
                    InputProps={{ inputProps: { step: 60 } }}
                  />
                )}
              />
            </Box>
          </Box>

          <Box sx={{ mb: 4 }}>
            <Typography variant="subtitle1" gutterBottom sx={{ fontWeight: 600 }}>
              Business Settings
            </Typography>
            <Divider sx={{ mb: 3 }} />
            <Box
              sx={{
                display: "grid",
                gridTemplateColumns: { md: "1fr 1fr 1fr" },
                gap: 3,
                mb: 2,
              }}
            >
              <Controller
                name="preparationTimeMin"
                control={control}
                render={({ field }) => (
                  <TextField
                    {...field}
                    label="Preparation Time (minutes)"
                    type="number"
                    variant="outlined"
                    fullWidth
                    error={!!errors.preparationTimeMin}
                    helperText={errors.preparationTimeMin?.message}
                    size="small"
                    onChange={(e) => handleNumberChange(field.onChange, e)}
                    value={field.value}
                    InputProps={{ inputProps: { min: 0 } }}
                  />
                )}
              />

              <Controller
                name="minOrderAmount"
                control={control}
                render={({ field }) => (
                  <TextField
                    {...field}
                    label="Minimum Order Amount (₹)"
                    type="number"
                    variant="outlined"
                    fullWidth
                    error={!!errors.minOrderAmount}
                    helperText={errors.minOrderAmount?.message}
                    size="small"
                    onChange={(e) => handleNumberChange(field.onChange, e)}
                    value={field.value}
                    InputProps={{ inputProps: { min: 0, step: "0.01" } }}
                  />
                )}
              />

              <Controller
                name="rating"
                control={control}
                render={({ field }) => (
                  <TextField
                    {...field}
                    label="Rating (0-5)"
                    type="number"
                    variant="outlined"
                    fullWidth
                    error={!!errors.rating}
                    helperText={errors.rating?.message}
                    size="small"
                    onChange={(e) => handleNumberChange(field.onChange, e)}
                    value={field.value}
                    InputProps={{ inputProps: { min: 0, max: 5, step: "0.1" } }}
                  />
                )}
              />

              <Controller
                name="activeStatus"
                control={control}
                render={({ field }) => (
                  <FormControlLabel
                    control={
                      <Checkbox
                        checked={field.value}
                        onChange={(e) => field.onChange(e.target.checked)}
                        color="primary"
                      />
                    }
                    label="Active Vendor"
                    sx={{ mt: 1 }}
                  />
                )}
              />

              <Controller
                name="veg"
                control={control}
                render={({ field }) => (
                  <FormControlLabel
                    control={
                      <Checkbox
                        checked={field.value}
                        onChange={(e) => field.onChange(e.target.checked)}
                        color="primary"
                      />
                    }
                    label="Vegetarian Only"
                    sx={{ mt: 1 }}
                  />
                )}
              />
            </Box>
          </Box>

          <Box
            sx={{
              display: "flex",
              justifyContent: "flex-end",
              gap: 2,
              mt: 3,
              pt: 2,
              borderTop: "1px solid",
              borderColor: "divider",
            }}
          >
            <Button variant="outlined" onClick={handleClose} sx={{ minWidth: 100 }} disabled={isLoading}>
              Cancel
            </Button>
            <Button
              variant="contained"
              type="submit"
              disabled={isLoading}
              sx={{ minWidth: 100 }}
            >
              {isLoading ? (
                <CircularProgress size={24} color="inherit" />
              ) : mode === "add" ? (
                "Create Vendor"
              ) : (
                "Save Changes"
              )}
            </Button>
          </Box>
        </Box>
      </Box>
    </Modal>
  );
}