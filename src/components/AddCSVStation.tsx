import React, { useState } from "react";
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
  width: { xs: "90vw", sm: "80vw", md: 600 },
  maxHeight: { xs: "85vh", sm: "75vh" },
  backgroundColor: "background.paper",
  borderRadius: 2,
  border: "none",
  boxShadow: "none",
  padding: { xs: 2, sm: 4 },
  overflowY: "auto",
} as const;

interface FormData {
  file: FileList;
}

interface IndiProps {
  open: boolean;
  setOpen: React.Dispatch<React.SetStateAction<boolean>>;
  setRefresh: React.Dispatch<React.SetStateAction<boolean>>;
  refresh: boolean;
}

const validationSchema = yup.object().shape({
  file: yup
    .mixed<FileList>()
    .required("A file is required")
    .test("fileType", "Only CSV or Excel files are allowed", (value) => {
      return (
        value &&
        value[0] &&
        [
          "text/csv",
          "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
          "application/vnd.ms-excel",
        ].includes(value[0].type)
      );
    })
    .test("fileSize", "File size must be less than 5MB", (value) => {
      return value && value[0] && value[0].size <= 5 * 1024 * 1024;
    }),
});

export default function AddCSVStation({
  open,
  setOpen,
  setRefresh,
  refresh,
}: IndiProps) {
  const [isLoading, setIsLoading] = useState<boolean>(false);

  const {
    handleSubmit,
    control,
    reset,
    formState: { errors },
  } = useForm<FormData>({
    resolver: yupResolver(validationSchema),
    defaultValues: {
      file: undefined,
    },
  });

  const handleClose = () => {
    reset({ file: undefined });
    setOpen(false);
  };

  const onSubmit: SubmitHandler<FormData> = async (data) => {
    setIsLoading(true);
    const formData = new FormData();
    if (data.file && data.file[0]) {
      formData.append("file", data.file[0]);
    }

    try {
      const res = await api.post("/stations/bulk-upload", formData, {
        headers: { "Content-Type": "multipart/form-data" },
      });
      if (res.status === 200 || res.status === 201) {
        setRefresh(!refresh);
        handleClose();
      }
    } catch (error) {
      console.error("Error uploading file:", error);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <Modal open={open} onClose={handleClose}>
      <Box sx={style}>
        <div className="font-medium text-lg sm:text-xl mb-4">Upload Cities via CSV/Excel</div>
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
          <div className="mb-4 w-full">
            <label
              className="block text-sm font-medium text-gray-700"
              htmlFor="file"
            >
              Upload CSV or Excel File
            </label>
            
            <Controller
              name="file"
              control={control}
              render={({ field: { onChange } }) => (
                <>
                  <input
                    type="file"
                    id="file"
                    accept=".csv,application/vnd.openxmlformats-officedocument.spreadsheetml.sheet,application/vnd.ms-excel"
                    onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
                      onChange(e.target.files)
                    }
                    className={`mt-1 block w-full px-3 py-2.5 border ${
                      errors.file ? "border-red-500" : "border-gray-300"
                    } bg-white rounded-md shadow-sm focus:outline-none focus:ring-teal-500 focus:border-teal-500 text-sm sm:text-base`}
                  />
                  {errors.file && (
                    <p className="text-sm text-gray-500">
                      {errors.file.message}
                    </p>
                  )}
                </>
              )}
            />
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
              {isLoading ? "Processing..." : "Upload"}
            </Button>
          </div>
        </form>
      </Box>
    </Modal>
  );
}