import { Truck, Clock, Package, RefreshCcw } from "lucide-react";

const ShippingPolicy = () => {
  return (
    <div className="p-4 md:p-6 max-w-4xl mx-auto">
      <h1 className="text-2xl font-bold text-gray-800 mb-6">Shipping Policy</h1>
      
      <div className="bg-white rounded-xl shadow-md p-6">
        <div className="flex items-center gap-3 mb-6">
          <Truck className="w-8 h-8 text-blue-600" />
          <h2 className="text-xl font-semibold text-gray-800">Food Delivery to Your Doorstep</h2>
        </div>

        <div className="space-y-6">
          <div className="flex gap-4">
            <div className="flex-shrink-0">
              <Package className="w-6 h-6 text-gray-500 mt-0.5" />
            </div>
            <div>
              <h3 className="text-lg font-medium text-gray-800 mb-2">Order Placement</h3>
              <p className="text-gray-600">
                Orders for food delivery must be placed at least 1 hour before the scheduled 
                delivery time at the selected city. Provide accurate delivery details 
                to ensure smooth delivery. Orders can be placed via our website or mobile app.
              </p>
            </div>
          </div>

          <div className="flex gap-4">
            <div className="flex-shrink-0">
              <Clock className="w-6 h-6 text-gray-500 mt-0.5" />
            </div>
            <div>
              <h3 className="text-lg font-medium text-gray-800 mb-2">Delivery Process</h3>
              <p className="text-gray-600">
                We deliver fresh food directly to your doorstep at the specified city. Our team coordinates with 
                local partners to ensure timely delivery. Delivery is available only 
                in major cities listed on our platform. Delays due to unforeseen circumstances are beyond our 
                control, but we strive to accommodate where possible.
              </p>
            </div>
          </div>

          <div className="flex gap-4">
            <div className="flex-shrink-0">
              <RefreshCcw className="w-6 h-6 text-gray-500 mt-0.5" />
            </div>
            <div>
              <h3 className="text-lg font-medium text-gray-800 mb-2">Cancellations & Refunds</h3>
              <p className="text-gray-600">
                Cancellations are accepted up to 2 hours before the scheduled delivery time. Full refunds are 
                processed within 5-7 business days for cancelled orders. No refunds are available for orders 
                cancelled after this window or if the delivery cannot be completed due to incorrect address or unavailability.
              </p>
            </div>
          </div>

          <div className="pt-4">
            <h3 className="text-lg font-medium text-gray-800 mb-2">Policy Updates</h3>
            <p className="text-gray-600">
              This shipping policy may be updated periodically to reflect changes in our services. Significant 
              updates will be communicated via our platform or email. Continued use of our services constitutes 
              acceptance of the updated policy.
            </p>
          </div>

          <div className="pt-4 text-sm text-gray-500">
            <p>Last updated: July 13, 2025</p>
          </div>
        </div>
      </div>
    </div>
  );
};

export default ShippingPolicy;