import { Truck, Clock, Package, RefreshCcw } from "lucide-react";

const ShippingPolicy = () => {
  return (
    <div className="p-4 md:p-6 max-w-4xl mx-auto">
      <h1 className="text-2xl font-bold text-gray-800 mb-6">Shipping Policy</h1>
      
      <div className="bg-white rounded-xl shadow-md p-6">
        <div className="flex items-center gap-3 mb-6">
          <Truck className="w-8 h-8 text-blue-600" />
          <h2 className="text-xl font-semibold text-gray-800">Food Delivery to Trains</h2>
        </div>

        <div className="space-y-6">
          <div className="flex gap-4">
            <div className="flex-shrink-0">
              <Package className="w-6 h-6 text-gray-500 mt-0.5" />
            </div>
            <div>
              <h3 className="text-lg font-medium text-gray-800 mb-2">Order Placement</h3>
              <p className="text-gray-600">
                Orders for food delivery to trains must be placed at least 1 hour before the train's scheduled 
                arrival at the selected station. Provide accurate train details (train number, coach, and seat) 
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
                We deliver fresh food directly to your train at the specified station. Our team coordinates with 
                station staff to ensure timely delivery during the train's stoppage. Delivery is available only 
                at major stations listed on our platform. Delays due to train schedule changes are beyond our 
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
                Cancellations are accepted up to 2 hours before the train's scheduled arrival. Full refunds are 
                processed within 5-7 business days for cancelled orders. No refunds are available for orders 
                cancelled after this window or if the train departs before delivery due to early departure.
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