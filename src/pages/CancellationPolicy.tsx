import { XCircle, Clock, RefreshCw, CheckCircle } from "lucide-react";

const CancellationPolicy = () => {
  return (
    <div className="p-4 md:p-6 max-w-4xl mx-auto">
      <h1 className="text-2xl font-bold text-gray-800 mb-6">Cancellation Policy</h1>
      
      <div className="bg-white rounded-xl shadow-md p-6">
        <div className="flex items-center gap-3 mb-6">
          <XCircle className="w-8 h-8 text-red-500" />
          <h2 className="text-xl font-semibold text-gray-800">Order Cancellation Guidelines</h2>
        </div>

        <div className="space-y-6">
          <div className="flex gap-4">
            <div className="flex-shrink-0">
              <Clock className="w-6 h-6 text-gray-500 mt-0.5" />
            </div>
            <div>
              <h3 className="text-lg font-medium text-gray-800 mb-2">Before Preparation</h3>
              <p className="text-gray-600">
                Orders can be cancelled free of charge if cancelled before the restaurant begins preparation. 
                This is typically within 5-10 minutes of placing your order. You will receive a full refund.
              </p>
            </div>
          </div>

          <div className="flex gap-4">
            <div className="flex-shrink-0">
              <RefreshCw className="w-6 h-6 text-gray-500 mt-0.5" />
            </div>
            <div>
              <h3 className="text-lg font-medium text-gray-800 mb-2">During Preparation</h3>
              <p className="text-gray-600">
                Once preparation has begun, cancellation may incur a partial charge depending on the 
                progress. We'll make every effort to accommodate your request and minimize charges.
              </p>
            </div>
          </div>

          <div className="flex gap-4">
            <div className="flex-shrink-0">
              <CheckCircle className="w-6 h-6 text-gray-500 mt-0.5" />
            </div>
            <div>
              <h3 className="text-lg font-medium text-gray-800 mb-2">After Dispatch</h3>
              <p className="text-gray-600">
                Orders cannot be cancelled after being dispatched for delivery. In exceptional circumstances, 
                please contact our customer support team immediately.
              </p>
            </div>
          </div>

          <div className="pt-4">
            <h3 className="text-lg font-medium text-gray-800 mb-2">Refund Processing</h3>
            <p className="text-gray-600">
              Refunds for cancelled orders are processed within 3-5 business days. The refund will be 
              credited to your original payment method. For wallet payments, the amount will be 
              credited back to your Relswad wallet immediately.
            </p>
          </div>

          <div className="pt-4 text-sm text-gray-500">
            <p>Last updated: June 15, 2023</p>
          </div>
        </div>
      </div>
    </div>
  );
};

export default CancellationPolicy;