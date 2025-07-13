import { CreditCard, Truck, ShieldCheck, Receipt } from "lucide-react";

const PaymentPolicy = () => {
  return (
    <div className="p-4 md:p-6 max-w-4xl mx-auto">
      <h1 className="text-2xl font-bold text-gray-800 mb-6">Payment Policy</h1>
      
      <div className="bg-white rounded-xl shadow-md p-6">
        <div className="flex items-center gap-3 mb-6">
          <ShieldCheck className="w-8 h-8 text-blue-600" />
          <h2 className="text-xl font-semibold text-gray-800">Our Payment Commitment</h2>
        </div>

        <div className="space-y-6">
          <div className="flex gap-4">
            <div className="flex-shrink-0">
              <CreditCard className="w-6 h-6 text-gray-500 mt-0.5" />
            </div>
            <div>
              <h3 className="text-lg font-medium text-gray-800 mb-2">Online Payments via Razorpay</h3>
              <p className="text-gray-600">
                We offer secure online payments through Razorpay, a PCI-DSS compliant payment gateway. 
                You can pay using UPI, credit/debit cards, net banking, or digital wallets. All transactions 
                are encrypted and processed instantly, ensuring a seamless and secure checkout experience. 
                Automated receipts are generated for all online payments.
              </p>
            </div>
          </div>

          <div className="flex gap-4">
            <div className="flex-shrink-0">
              <Truck className="w-6 h-6 text-gray-500 mt-0.5" />
            </div>
            <div>
              <h3 className="text-lg font-medium text-gray-800 mb-2">Cash on Delivery (COD)</h3>
              <p className="text-gray-600">
                We offer Cash on Delivery (COD) for customers who prefer to pay upon receiving their order. 
                Payment can be made in cash or via digital methods (e.g., UPI) at the time of delivery. 
                COD is subject to availability based on your location and order value. A small COD fee may 
                apply to cover handling costs.
              </p>
            </div>
          </div>

          <div className="flex gap-4">
            <div className="flex-shrink-0">
              <Receipt className="w-6 h-6 text-gray-500 mt-0.5" />
            </div>
            <div>
              <h3 className="text-lg font-medium text-gray-800 mb-2">Refunds and Cancellations</h3>
              <p className="text-gray-600">
                For online payments, refunds are processed to the original payment method within 5-7 business 
                days upon approval. For COD orders, refunds require submission of bank account details and 
                may take 7-10 business days. Cancellations are accepted before order dispatch. Please review 
                our return and refund policy for detailed timelines and conditions.
              </p>
            </div>
          </div>

          <div className="pt-4">
            <h3 className="text-lg font-medium text-gray-800 mb-2">Payment Security and Compliance</h3>
            <p className="text-gray-600">
              All online payments are processed through Razorpay’s secure, PCI-DSS compliant platform. 
              We do not store your payment details. For COD, our trusted logistics partners ensure secure 
              payment collection. We comply with all applicable payment regulations, including the Payment 
              Aggregator Guidelines.
            </p>
          </div>

          <div className="pt-4">
            <h3 className="text-lg font-medium text-gray-800 mb-2">Policy Updates</h3>
            <p className="text-gray-600">
              This payment policy may be updated periodically to reflect changes in our services or 
              regulations. Significant changes will be communicated via our platform or email. Continued 
              use of our services constitutes acceptance of the updated policy.
            </p>
          </div>

          <div className="pt-4 text-sm text-gray-500">
            <p>Last updated: July 7, 2025</p>
          </div>
        </div>
      </div>
    </div>
  );
};

export default PaymentPolicy;