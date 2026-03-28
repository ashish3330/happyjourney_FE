import React, { useState } from "react";
import api from "@/utils/axios";
import { useNavigate } from "react-router-dom";
import { CheckCircleIcon, ExclamationCircleIcon } from "@heroicons/react/24/outline";


const ComplaintForm: React.FC = () => {
  const navigate = useNavigate();
  const [formData, setFormData] = useState({
    orderId: "",
    name: "",
    email: "",
    mobileNumber: "",
    description: "",
  });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<{ show: boolean; complaintId?: string }>({ show: false });

  const handleChange = (
    e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>
  ) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);
    setSuccess({ show: false });

    try {
      const payload = {
        orderId: formData.orderId ? Number(formData.orderId) : null,
        name: formData.name,
        email: formData.email,
        mobileNumber: formData.mobileNumber,
        description: formData.description
      };

      const response = await api.post("/complaints", payload);
      if (response.status === 200 || response.status === 201) {
        setSuccess({ show: true, complaintId: response.data.id });
        setFormData({
          orderId: "",
          name: "",
          email: "",
          mobileNumber: "",
          description: "",    
        });
        setTimeout(() => navigate("/"), 3000);
      }
    } catch (err: any) {
      let errorMessage = "Failed to submit complaint. Please try again.";
      
      // Handle different error response formats
      if (err.response) {
        // Axios error with response
        const data = err.response.data;
        
        if (typeof data === 'string') {
          // Handle string responses
          errorMessage = data;
        } else if (data?.message) {
          // Handle { message: "error" } format
          errorMessage = data.message;
        } else if (data?.error) {
          // Handle { error: "error" } format
          errorMessage = data.error;
        } else if (err.response.statusText) {
          // Use status text if no body
          errorMessage = err.response.statusText;
        }
      } else if (err.message) {
        // Other JavaScript errors
        errorMessage = err.message;
      }

      setError(errorMessage);
      console.error("Error details:", err);
    } finally {
      setLoading(false);
    }
  };

  if (success.show) {
    return (
      <div className="fixed inset-0 bg-gray-100 flex items-center justify-center p-4">
        <div className="bg-white rounded-xl shadow-xl p-8 max-w-md w-full text-center">
          <div className="mx-auto flex items-center justify-center h-12 w-12 rounded-full bg-green-100">
            <CheckCircleIcon className="h-8 w-8 text-green-600" />
          </div>
          <h2 className="mt-3 text-2xl font-bold text-gray-900">
            Complaint Submitted Successfully!
          </h2>
          <div className="mt-4">
            <p className="text-gray-600">
              We've received your complaint
              {success.complaintId && ` (ID: ${success.complaintId})`} and our team will review it shortly.
            </p>
            <p className="mt-2 text-gray-500 text-sm">
              You'll receive a confirmation email with your complaint details.
            </p>
            <p className="mt-2 text-gray-500 text-sm">
              Redirecting to home page...
            </p>
          </div>
          <div className="mt-6">
            <div className="w-full bg-gray-200 rounded-full h-2.5">
              <div
                className="bg-green-600 h-2.5 rounded-full animate-[progress_3s_linear_forwards]"
                style={{ animationFillMode: 'forwards' }}
              ></div>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="flex min-h-screen bg-gray-100 justify-center items-center p-4 sm:p-6">
      <div className="bg-white rounded-xl shadow-lg p-6 sm:p-8 w-full max-w-md">
        <h2 className="text-2xl sm:text-3xl font-bold text-black-600 mb-6">
          Submit a Complaint
        </h2>
        <form onSubmit={handleSubmit} className="space-y-5">
          <div>
            <label
              htmlFor="orderId"
              className="block text-sm font-medium text-gray-700"
            >
              Order ID (Optional)
            </label>
            <input
              type="number"
              id="orderId"
              name="orderId"
              value={formData.orderId}
              onChange={handleChange}
              className="mt-1 w-full p-3 border border-gray-300 rounded-lg text-gray-900 placeholder-gray-400 focus:ring-2 focus:ring-teal-500 focus:border-teal-500 outline-none transition"
              placeholder="e.g. 12345"
              min="1"
            />
          </div>
          
          <div>
            <label htmlFor="name" className="block text-sm font-medium text-gray-700">
              Your Name *
            </label>
            <input
              type="text"
              id="name"
              name="name"
              value={formData.name}
              onChange={handleChange}
              required
              className="mt-1 w-full p-3 border border-gray-300 rounded-lg text-gray-900 placeholder-gray-400 focus:ring-2 focus:ring-teal-500 focus:border-teal-500 outline-none transition"
              placeholder="John Doe"
            />
          </div>
          
          <div>
            <label htmlFor="email" className="block text-sm font-medium text-gray-700">
              Email Address *
            </label>
            <input
              type="email"
              id="email"
              name="email"
              value={formData.email}
              onChange={handleChange}
              required
              className="mt-1 w-full p-3 border border-gray-300 rounded-lg text-gray-900 placeholder-gray-400 focus:ring-2 focus:ring-teal-500 focus:border-teal-500 outline-none transition"
              placeholder="your@email.com"
            />
          </div>
          
          <div>
            <label htmlFor="mobileNumber" className="block text-sm font-medium text-gray-700">
              Mobile Number *
            </label>
            <input
              type="tel"
              id="mobileNumber"
              name="mobileNumber"
              value={formData.mobileNumber}
              onChange={handleChange}
              required
              className="mt-1 w-full p-3 border border-gray-300 rounded-lg text-gray-900 placeholder-gray-400 focus:ring-2 focus:ring-teal-500 focus:border-teal-500 outline-none transition"
              placeholder="9876543210"
              pattern="[0-9]{10}"
              title="Please enter a 10-digit mobile number"
            />
          </div>
          
          <div>
            <label
              htmlFor="description"
              className="block text-sm font-medium text-gray-700"
            >
              Complaint Details *
            </label>
            <textarea
              id="description"
              name="description"
              value={formData.description}
              onChange={handleChange}
              required
              className="mt-1 w-full p-3 border border-gray-300 rounded-lg text-gray-900 placeholder-gray-400 focus:ring-2 focus:ring-teal-500 focus:border-teal-500 outline-none transition"
              placeholder="Please describe your complaint in detail..."
              rows={5}
            />
          </div>
          
          {error && (
            <div className="p-4 bg-red-50 rounded-lg flex items-start">
              <ExclamationCircleIcon className="h-5 w-5 text-red-500 mt-0.5 mr-2 flex-shrink-0" />
              <div>
                <h3 className="text-sm font-medium text-red-800">There was an error</h3>
                <p className="text-sm text-red-700 mt-1">{error}</p>
              </div>
            </div>
          )}
          
          <button
            type="submit"
            disabled={loading}
            className={`w-full bg-teal-600 text-white py-3 rounded-lg font-medium hover:bg-teal-700 focus:ring-2 focus:ring-teal-500 focus:ring-offset-2 transition duration-200 ${
              loading ? "opacity-50 cursor-not-allowed" : ""
            }`}
          >
            {loading ? (
              <div className="flex justify-center items-center">
                <svg
                  className="animate-spin h-5 w-5 text-white"
                  xmlns="http://www.w3.org/2000/svg"
                  fill="none"
                  viewBox="0 0 24 24"
                >
                  <circle
                    className="opacity-25"
                    cx="12"
                    cy="12"
                    r="10"
                    stroke="currentColor"
                    strokeWidth="4"
                  ></circle>
                  <path
                    className="opacity-75"
                    fill="currentColor"
                    d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
                  ></path>
                </svg>
                <span className="ml-2">Submitting...</span>
              </div>
            ) : (
              "Submit Complaint"
            )}
          </button>
        </form>
      </div>
    </div>
  );
};

export default ComplaintForm;