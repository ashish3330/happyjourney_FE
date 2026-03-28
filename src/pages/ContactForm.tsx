import { FC } from "react";
import { useForm, SubmitHandler } from "react-hook-form";
import { useNavigate } from "react-router-dom";
import { z } from "zod";
import { zodResolver } from "@hookform/resolvers/zod";
import { CheckCircle, AlertCircle, Loader } from "lucide-react";
import sanitizeHtml from "sanitize-html";
import api from "@/utils/axios";
import React from "react";

// Define the form schema with Zod
const formSchema = z.object({
  name: z
    .string()
    .min(2, "Name must be at least 2 characters")
    .max(50, "Name cannot exceed 50 characters")
    .regex(/^[a-zA-Z\s]*$/, "Name can only contain letters and spaces")
    .transform((val) => sanitizeHtml(val)),
  email: z
    .string()
    .email("Please enter a valid email address")
    .max(100, "Email cannot exceed 100 characters")
    .transform((val) => sanitizeHtml(val)),
  mobileNumber: z
    .string()
    .regex(/^[0-9]{10}$/, "Please enter a valid 10-digit mobile number")
    .transform((val) => sanitizeHtml(val)),
  message: z
    .string()
    .min(10, "Message must be at least 10 characters")
    .max(500, "Message cannot exceed 500 characters")
    .transform((val) => sanitizeHtml(val)),
});

// Infer the form data type from the schema
type FormData = z.infer<typeof formSchema>;

const ContactForm: FC = () => {
  const navigate = useNavigate();
  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
    reset,
  } = useForm<FormData>({
    resolver: zodResolver(formSchema) as any,
    mode: "onChange", // Real-time validation
  });

  const [success, setSuccess] = React.useState<{ show: boolean; callbackId?: string }>({ show: false });
  const [apiError, setApiError] = React.useState<string | null>(null);

  const onSubmit: SubmitHandler<FormData> = async (data) => {
    setApiError(null);
    try {
      const response = await api.post("/callbacks", data);
      if (response.status === 200 || response.status === 201) {
        setSuccess({ show: true, callbackId: response.data.callbackId });
        reset();
        setTimeout(() => navigate("/"), 3000);
      }
    } catch (err: any) {
      let errorMessage = "Failed to submit callback request. Please try again.";
      if (err.response) {
        const data = err.response.data;
        errorMessage =
          typeof data === "string"
            ? data
            : data?.message || data?.error || err.response.statusText || errorMessage;
      } else if (err.message) {
        errorMessage = err.message;
      }
      setApiError(errorMessage);
    }
  };

  if (success.show) {
    return (
      <div className="p-4 md:p-6 max-w-4xl mx-auto">
        <div className="bg-white rounded-xl shadow-md overflow-hidden p-6 text-center">
          <div className="flex items-center justify-center gap-3 mb-3">
            <CheckCircle className="w-5 h-5 text-teal-600" />
            <h2 className="text-xl font-semibold text-gray-800">Callback Request Submitted!</h2>
          </div>
          <div className="space-y-2">
            <p className="text-gray-600">
              We've received your request
              {success.callbackId && (
                <span className="font-medium"> (ID: {success.callbackId})</span>
              )}.
              Our team will contact you shortly.
            </p>
            <p className="text-gray-600 text-sm">
              You'll receive a confirmation email with your request details.
            </p>
            <p className="text-gray-600 text-sm animate-pulse">Redirecting to home...</p>
          </div>
          <div className="mt-6">
            <div className="w-full bg-gray-200 rounded-full h-2.5">
              <div
                className="bg-teal-600 h-2.5 rounded-full animate-[progress_3s_linear_forwards]"
                style={{ animationFillMode: "forwards" }}
              ></div>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="p-4 md:p-6 max-w-4xl mx-auto">
      <div className="bg-white rounded-xl shadow-md overflow-hidden p-6">
        <div className="flex items-start gap-3 mb-6">
          <AlertCircle className="w-5 h-5 text-teal-600 mt-0.5 flex-shrink-0" />
          <h2 className="text-xl font-semibold text-gray-800">Request a Callback</h2>
        </div>
        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4" noValidate>
          <div>
            <label
              htmlFor="name"
              className="block text-sm font-medium text-gray-800"
            >
              Your Name *
            </label>
            <input
              type="text"
              id="name"
              {...register("name")}
              className={`mt-1 w-full p-3 border rounded-lg text-gray-800 placeholder-gray-400 focus:ring-2 focus:ring-teal-500 focus:border-teal-500 outline-none transition-all duration-200 ${
                errors.name ? "border-red-500" : "border-gray-300"
              }`}
              placeholder="John Doe"
              aria-invalid={errors.name ? "true" : "false"}
              aria-describedby={errors.name ? "name-error" : undefined}
            />
            {errors.name && (
              <p id="name-error" className="mt-1 text-sm text-red-600">
                {errors.name.message}
              </p>
            )}
          </div>
          <div>
            <label
              htmlFor="email"
              className="block text-sm font-medium text-gray-800"
            >
              Email Address *
            </label>
            <input
              type="email"
              id="email"
              {...register("email")}
              className={`mt-1 w-full p-3 border rounded-lg text-gray-800 placeholder-gray-400 focus:ring-2 focus:ring-teal-500 focus:border-teal-500 outline-none transition-all duration-200 ${
                errors.email ? "border-red-500" : "border-gray-300"
              }`}
              placeholder="your@email.com"
              aria-invalid={errors.email ? "true" : "false"}
              aria-describedby={errors.email ? "email-error" : undefined}
            />
            {errors.email && (
              <p id="email-error" className="mt-1 text-sm text-red-600">
                {errors.email.message}
              </p>
            )}
          </div>
          <div>
            <label
              htmlFor="mobileNumber"
              className="block text-sm font-medium text-gray-800"
            >
              Mobile Number *
            </label>
            <input
              type="tel"
              id="mobileNumber"
              {...register("mobileNumber")}
              className={`mt-1 w-full p-3 border rounded-lg text-gray-800 placeholder-gray-400 focus:ring-2 focus:ring-teal-500 focus:border-teal-500 outline-none transition-all duration-200 ${
                errors.mobileNumber ? "border-red-500" : "border-gray-300"
              }`}
              placeholder="9876543210"
              aria-invalid={errors.mobileNumber ? "true" : "false"}
              aria-describedby={errors.mobileNumber ? "mobileNumber-error" : undefined}
            />
            {errors.mobileNumber && (
              <p id="mobileNumber-error" className="mt-1 text-sm text-red-600">
                {errors.mobileNumber.message}
              </p>
            )}
          </div>
          <div>
            <label
              htmlFor="message"
              className="block text-sm font-medium text-gray-800"
            >
              Message *
            </label>
            <textarea
              id="message"
              {...register("message")}
              className={`mt-1 w-full p-3 border rounded-lg text-gray-800 placeholder-gray-400 focus:ring-2 focus:ring-teal-500 focus:border-teal-500 outline-none transition-all duration-200 ${
                errors.message ? "border-red-500" : "border-gray-300"
              }`}
              placeholder="Please provide details for your callback request..."
              rows={5}
              aria-invalid={errors.message ? "true" : "false"}
              aria-describedby={errors.message ? "message-error" : undefined}
            />
            {errors.message && (
              <p id="message-error" className="mt-1 text-sm text-red-600">
                {errors.message.message}
              </p>
            )}
          </div>
          {apiError && (
            <div className="p-4 bg-red-50 rounded-lg flex items-start">
              <AlertCircle
                className="h-5 w-5 text-red-500 mt-0.5 mr-2 flex-shrink-0"
                aria-hidden="true"
              />
              <p className="text-sm text-red-600">{apiError}</p>
            </div>
          )}
          <button
            type="submit"
            disabled={isSubmitting}
            className={`w-full bg-teal-600 text-white py-3 rounded-lg font-medium hover:bg-teal-700 focus:ring-2 focus:ring-teal-500 focus:ring-offset-2 transition duration-200 ${
              isSubmitting ? "opacity-50 cursor-not-allowed" : ""
            }`}
            aria-label="Submit callback request"
          >
            {isSubmitting ? (
              <div className="flex justify-center items-center">
                <Loader
                  className="animate-spin h-5 w-5 text-white"
                  aria-hidden="true"
                />
                <span className="ml-2">Submitting...</span>
              </div>
            ) : (
              "Submit Callback Request"
            )}
          </button>
        </form>
      </div>
    </div>
  );
};

export default ContactForm;