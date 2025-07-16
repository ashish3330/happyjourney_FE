
import { FileText, ClipboardList, AlertTriangle, BookOpen, Truck, CreditCard, Phone, Users, Ticket, Ban } from "lucide-react";

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
              <h3 className="text-lg font-medium text-gray-800 mb-2">A. Introduction</h3>
              <p className="text-gray-600 mb-3">
                Welcome to HappyJourney, a brand of HappyJourney Services Private Limited, registered under the Indian Companies Act. By using our services, website (happyjourney.com), mobile apps, or call center, you agree to these Terms and Conditions. We are committed to transparent and ethical practices. Some services may have additional terms, which will be provided and become part of your agreement if used.
              </p>
            </div>
          </div>

          <div className="flex gap-4">
            <div className="flex-shrink-0">
              <BookOpen className="w-6 h-6 text-gray-500 mt-0.5" />
            </div>
            <div>
              <h3 className="text-lg font-medium text-gray-800 mb-2">B. Definitions</h3>
              <ul className="list-disc pl-5 space-y-2 text-gray-600">
                <li><strong>HappyJourney</strong>: HappyJourney Services Private Limited, registered under the Indian Companies Act.</li>
                <li><strong>Website</strong>: http://happyjourney.com, where we offer products and services.</li>
                <li><strong>Services</strong>: Services requested via our website or apps, including e-Catering.</li>
                <li><strong>Restaurants/Vendors</strong>: Entities preparing and delivering ordered products.</li>
                <li><strong>Customer/You</strong>: The person ordering products or services.</li>
                <li><strong>Food Delivery</strong>: Perishable goods and delivery by selected restaurants.</li>
                <li><strong>e-Catering</strong>: Pre-ordered meal delivery on trains via IRCTC services.</li>
                <li><strong>Charges</strong>: Fees for e-Catering, including taxes and delivery fees.</li>
                <li><strong>IRCTC</strong>: Indian Railways Catering and Tourism Corporation.</li>
              </ul>
            </div>
          </div>

          <div className="flex gap-4">
            <div className="flex-shrink-0">
              <Ticket className="w-6 h-6 text-gray-500 mt-0.5" />
            </div>
            <div>
              <h3 className="text-lg font-medium text-gray-800 mb-2">C. Formation of Contract</h3>
              <p className="text-gray-600 mb-3">
                HappyJourney provides e-Catering as an authorized IRCTC aggregator. By booking and paying for services, you accept these terms. No representative can modify these terms, and they supersede any customer-proposed terms.
              </p>
            </div>
          </div>

          <div className="flex gap-4">
            <div className="flex-shrink-0">
              <BookOpen className="w-6 h-6 text-gray-500 mt-0.5" />
            </div>
            <div>
              <h3 className="text-lg font-medium text-gray-800 mb-2">D. e-Catering Services</h3>
              <p className="text-gray-600 mb-3">
                Meal descriptions and images on our website or apps are indicative and may not match delivered items. We strive to deliver pre-ordered meals to your train but may cancel orders for technical reasons, with refunds at our discretion. We may share your information with restaurant partners for seamless delivery.
              </p>
            </div>
          </div>

          <div className="flex gap-4">
            <div className="flex-shrink-0">
              <AlertTriangle className="w-6 h-6 text-gray-500 mt-0.5" />
            </div>
            <div>
              <h3 className="text-lg font-medium text-gray-800 mb-2">E. Customer Obligations</h3>
              <ul className="list-disc pl-5 space-y-2 text-gray-600">
                <li>Pre-order meals up to 2 hours before train arrival, ensuring accurate details (e.g., PNR, seat/berth).</li>
                <li>Be a bona fide rail passenger with a valid ticket.</li>
                <li>Be present at the confirmed seat/berth during the train’s stop at the selected station.</li>
                <li>Avoid abusive behavior toward delivery personnel to ensure delivery.</li>
                <li>No delivery to alternate stations if you detrain early.</li>
                <li>No refunds for "No-Show" customers or if you do not board the train.</li>
              </ul>
            </div>
          </div>

          <div className="flex gap-4">
            <div className="flex-shrink-0">
              <Users className="w-6 h-6 text-gray-500 mt-0.5" />
            </div>
            <div>
              <h3 className="text-lg font-medium text-gray-800 mb-2">F. Our Role</h3>
              <p className="text-gray-600 mb-3">
                HappyJourney connects customers with restaurants for food delivery. Our call center assists with feedback and order issues. We may contact you via SMS, WhatsApp, or email. Restaurants are solely responsible for food preparation and delivery, and we act only as an aggregator.
              </p>
              <p className="text-gray-600">
                Website access implies acceptance of these terms. We may update terms without notice, and continued use constitutes acceptance. Users must ensure compliance by others accessing the website via their connection.
              </p>
            </div>
          </div>

          <div className="flex gap-4">
            <div className="flex-shrink-0">
              <ClipboardList className="w-6 h-6 text-gray-500 mt-0.5" />
            </div>
            <div>
              <h3 className="text-lg font-medium text-gray-800 mb-2">G. Order Booking and Processing</h3>
              <p className="text-gray-600 mb-3">
                Orders form a contract between you and the restaurant. Verify details before clicking "Book Order," as errors cannot be corrected post-submission. COD orders are processed upon booking; online payments require authorization. Confirmations are sent via SMS/WhatsApp/email. We are not liable for train delays or unauthorized payments.
              </p>
            </div>
          </div>

          <div className="flex gap-4">
            <div className="flex-shrink-0">
              <CreditCard className="w-6 h-6 text-gray-500 mt-0.5" />
            </div>
            <div>
              <h3 className="text-lg font-medium text-gray-800 mb-2">H. Charges, Price, and Payments</h3>
              <p className="text-gray-600 mb-3">
                Charges include GST, taxes, packing, and delivery fees. Pricing errors may occur; we will contact you to confirm the correct price. Payments are made at booking via accepted methods. No discounts unless agreed in writing.
              </p>
            </div>
          </div>

          <div className="flex gap-4">
            <div className="flex-shrink-0">
              <Truck className="w-6 h-6 text-gray-500 mt-0.5" />
            </div>
            <div>
              <h3 className="text-lg font-medium text-gray-800 mb-2">I. Delivery</h3>
              <p className="text-gray-600 mb-3">
                Restaurants handle delivery with proper packaging and hygiene. We coordinate but are not liable for failed deliveries. Contact us if delivery fails, and we’ll attempt delivery at the next station. No refunds for unavailability at the specified seat or for late deliveries.
              </p>
            </div>
          </div>

          <div className="flex gap-4">
            <div className="flex-shrink-0">
              <Ban className="w-6 h-6 text-gray-500 mt-0.5" />
            </div>
            <div>
              <h3 className="text-lg font-medium text-gray-800 mb-2">J. Cancellation Policy</h3>
              <ul className="list-disc pl-5 space-y-2 text-gray-600">
                <li>Cancel orders up to 2 hours before delivery; bulk orders require 12 hours or by 6 PM the previous day.</li>
                <li>Cancellations require registered mobile number/user ID verification.</li>
                <li>No refunds for "No-Show" customers or cancellations within 2 hours.</li>
                <li>Refunds for train cancellations within 72 hours; claim non-delivery refunds within 5 days.</li>
                <li>Delivery not guaranteed post-10:00 PM; full refunds if undelivered.</li>
                <li>Contact our helpline for cancellation confirmations.</li>
              </ul>
            </div>
          </div>

          <div className="pt-4 text-sm text-gray-500">
            <p>Last updated: July 16, 2025</p>
          </div>
        </div>
      </div>
    </div>
  );
};

export default TermsAndConditions;