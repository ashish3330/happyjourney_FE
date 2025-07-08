
import { FileText, ClipboardList, AlertTriangle, BookOpen } from "lucide-react";

const TermsAndConditions = () => {
  return (
    <div className="p-4 md:p-6 max-w-4xl mx-auto">
      <h1 className="text-2xl font-bold text-gray-800 mb-6">Terms & Conditions</h1>
      
      <div className="bg-white rounded-xl shadow-md p-6">
        <div className="flex items-center gap-3 mb-6">
          <FileText className="w-8 h-8 text-blue-600" />
          <h2 className="text-xl font-semibold text-gray-800">Terms of Service</h2>
        </div>

        <div className="space-y-6">
          <div className="flex gap-4">
            <div className="flex-shrink-0">
              <ClipboardList className="w-6 h-6 text-gray-500 mt-0.5" />
            </div>
            <div>
              <h3 className="text-lg font-medium text-gray-800 mb-2">General Terms</h3>
              <p className="text-gray-600 mb-3">
                By using HappyJourney services, you agree to these terms. Our platform connects you with 
                restaurants for food delivery to train stations. You must be at least 18 years old to 
                place orders.
              </p>
              <p className="text-gray-600">
                We reserve the right to refuse service, terminate accounts, or cancel orders at our 
                discretion if these terms are violated.
              </p>
            </div>
          </div>

          <div className="flex gap-4">
            <div className="flex-shrink-0">
              <AlertTriangle className="w-6 h-6 text-gray-500 mt-0.5" />
            </div>
            <div>
              <h3 className="text-lg font-medium text-gray-800 mb-2">User Responsibilities</h3>
              <ul className="list-disc pl-5 space-y-2 text-gray-600">
                <li>Provide accurate delivery information including train details</li>
                <li>Ensure someone is available to receive the order at the specified station</li>
                <li>Verify all order details before submission</li>
                <li>Pay all applicable charges including taxes and delivery fees</li>
              </ul>
            </div>
          </div>

          <div className="flex gap-4">
            <div className="flex-shrink-0">
              <BookOpen className="w-6 h-6 text-gray-500 mt-0.5" />
            </div>
            <div>
              <h3 className="text-lg font-medium text-gray-800 mb-2">Service Limitations</h3>
              <p className="text-gray-600">
                While we strive for accuracy, menu items, prices, and availability may change. We're not 
                responsible for restaurant errors or train delays affecting delivery. Delivery times are 
                estimates only.
              </p>
            </div>
          </div>

          <div className="pt-4 text-sm text-gray-500">
            <p>Last updated: June 15, 2023</p>
          </div>
        </div>
      </div>
    </div>
  );
};

export default TermsAndConditions;