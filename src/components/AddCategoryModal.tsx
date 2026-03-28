import { useState, useEffect } from "react";
import { Modal, Box, IconButton, Button } from "@mui/material";
import { X } from "lucide-react";
import { Controller, SubmitHandler, useForm } from "react-hook-form";
import * as yup from "yup";
import { yupResolver } from "@hookform/resolvers/yup";
import api from "@/utils/axios";
import LoaderModal from "@/components/LoaderModal";

const style = {
  position: "absolute" as const,
  top: "50%",
  left: "50%",
  transform: "translate(-50%, -50%)",
  width: 400,
  maxHeight: "67vh",
  bgcolor: "background.paper",
  borderRadius: 2,
  border: "none",
  boxShadow: "none",
  p: 4,
  overflowY: "auto",
};

interface FormData {
  categoryName: string;
  displayOrder?: number;
}

interface Props {
  open: boolean;
  setOpen: (open: boolean) => void;
  id: number | null;
  setId: (id: number | null) => void;
  mode: "add" | "edit";
  setRefresh: (refresh: boolean) => void;
  refresh: boolean;
  vendorId: number;
}

const validationSchema = yup.object().shape({
  categoryName: yup.string().required("Category name is required"),
  displayOrder: yup.number().optional().nullable(),
});

const AddCategoryModal = ({ open, setOpen, id, setId, mode, setRefresh, refresh, vendorId }: Props) => {
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const {
    handleSubmit,
    control,
    reset,
    formState: { errors },
  } = useForm<FormData>({
    resolver: yupResolver(validationSchema) as any,
    defaultValues: {
      categoryName: "",
      displayOrder: 0,
    },
  });

  useEffect(() => {
    const fetchCategoryData = async () => {
      if (mode === "edit" && id) {
        try {
          setIsLoading(true);
          const res = await api.get(`/menu/categories/${id}`);
          if (res.status === 200 && res.data) {
            reset({ 
              categoryName: res.data.categoryName || "",
              displayOrder: res.data.displayOrder || 0,
            });
          }
        } catch (error: any) {
          console.error("Error fetching category data:", error);
          setError(error.response?.data?.message || "Failed to load category details.");
        } finally {
          setIsLoading(false);
        }
      }
    };
    fetchCategoryData();
  }, [id, mode, reset]);

  const onSubmit: SubmitHandler<FormData> = async (data) => {
    setIsLoading(true);
    setError(null);
    const payload = {
      categoryName: data.categoryName,
      vendorId,
      displayOrder: data.displayOrder || 0,
      ...(mode === "edit" && id ? { categoryId: id } : {}),
    };

    try {
      const endpoint = mode === "edit" && id ? `/menu/categories/${id}` : "/menu/categories";
      const method = mode === "edit" ? api.put : api.post;
      const res = await method(endpoint, payload);
      if (res.status === 200 || res.status === 201) {
        setRefresh(!refresh);
        handleClose();
      }
    } catch (error: any) {
      console.error("Error submitting form:", error);
      setError(error.response?.data?.message || "Failed to save category.");
    } finally {
      setIsLoading(false);
    }
  };

  const handleClose = () => {
    setId(null);
    reset();
    setOpen(false);
    setError(null);
  };

  return (
    <Modal open={open} onClose={handleClose}>
      <Box sx={style}>
        <div className="font-medium text-xl mb-4">{mode === "add" ? "Add Category" : "Update Category"}</div>
        <IconButton
          onClick={handleClose}
          sx={{ position: "absolute", top: 8, right: 8, color: "grey.500" }}
        >
          <X />
        </IconButton>
        {isLoading && <LoaderModal />}
        {error && <div className="text-red-500 text-sm mb-4">{error}</div>}
        <form onSubmit={handleSubmit(onSubmit as any)}>
          <div className="grid md:grid-cols-1 gap-4 mb-2">
            <div className="mb-4 w-full">
              <label className="block text-sm font-medium text-gray-700" htmlFor="categoryName">
                Category Name
              </label>
              <Controller
                name="categoryName"
                control={control}
                render={({ field }) => (
                  <>
                    <input
                      {...field}
                      type="text"
                      id="categoryName"
                      className={`mt-1 block w-full px-3 py-2 border ${
                        errors.categoryName ? "border-red-500" : "border-gray-300"
                      } bg-white rounded-md shadow-sm focus:outline-none focus:ring-teal-500 focus:border-teal-500`}
                      placeholder="Enter category name"
                    />
                    {errors.categoryName && (
                      <p className="mt-1 text-sm text-red-600">{errors.categoryName.message}</p>
                    )}
                  </>
                )}
              />
            </div>
            <div className="mb-4 w-full">
              <label className="block text-sm font-medium text-gray-700" htmlFor="displayOrder">
                Display Order
              </label>
              <Controller
                name="displayOrder"
                control={control}
                render={({ field }) => (
                  <>
                    <input
                      {...field}
                      type="number"
                      id="displayOrder"
                      value={field.value ?? ""}
                      onChange={(e) => field.onChange(e.target.value ? Number(e.target.value) : null)}
                      className={`mt-1 block w-full px-3 py-2 border ${
                        errors.displayOrder ? "border-red-500" : "border-gray-300"
                      } bg-white rounded-md shadow-sm focus:outline-none focus:ring-teal-500 focus:border-teal-500`}
                      placeholder="Enter display order"
                    />
                    {errors.displayOrder && (
                      <p className="mt-1 text-sm text-red-600">{errors.displayOrder.message}</p>
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
            >
              {isLoading ? "Processing..." : "Save"}
            </Button>
          </div>
        </form>
      </Box>
    </Modal>
  );
};

export default AddCategoryModal;