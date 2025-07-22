import  { useState } from "react";
import { HelpCircle, Phone, Mail, MessageSquare, Clock } from "lucide-react";

const HelpAndSupport = () => {
  const [activeTab, setActiveTab] = useState("faq");

  const faqs = [
    {
      question: "How do I track my order?",
      answer: "You can track your order in real-time through the 'My Orders' section of the app. We'll also send you SMS updates at key stages of your order's journey."
    },
    {
      question: "What if my train is delayed?",
      answer: "If your train is delayed by more than 30 minutes, please contact our customer support immediately. We'll coordinate with the restaurant to adjust delivery timing."
    },
    {
      question: "Can I modify my order after placing it?",
      answer: "Order modifications are possible only if the restaurant hasn't started preparation. Please contact us immediately if you need to change your order."
    }
  ];

  return (
    <div className="p-4 md:p-6 max-w-4xl mx-auto">
      <h1 className="text-2xl font-bold text-gray-800 mb-6">Help & Support</h1>
      
      <div className="bg-white rounded-xl shadow-md overflow-hidden">
        <div className="flex border-b">
          <button
            onClick={() => setActiveTab("faq")}
            className={`px-4 py-3 font-medium ${activeTab === "faq" ? "text-blue-600 border-b-2 border-blue-600" : "text-gray-600"}`}
          >
            FAQs
          </button>
          <button
            onClick={() => setActiveTab("contact")}
            className={`px-4 py-3 font-medium ${activeTab === "contact" ? "text-blue-600 border-b-2 border-blue-600" : "text-gray-600"}`}
          >
            Contact Us
          </button>
        </div>

        <div className="p-6">
          {activeTab === "faq" ? (
            <div className="space-y-4">
              <div className="flex items-start gap-3">
                <HelpCircle className="w-5 h-5 text-blue-600 mt-0.5 flex-shrink-0" />
                <h2 className="text-xl font-semibold text-gray-800">Frequently Asked Questions</h2>
              </div>
              
              <div className="space-y-4 mt-6">
                {faqs.map((faq, index) => (
                  <div key={index} className="border rounded-lg overflow-hidden">
                    <button className="w-full text-left p-4 font-medium text-gray-800 hover:bg-gray-50 flex justify-between items-center">
                      {faq.question}
                      <svg
                        className="w-5 h-5 text-gray-500"
                        fill="none"
                        viewBox="0 0 24 24"
                        stroke="currentColor"
                      >
                        <path
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          strokeWidth={2}
                          d="M19 9l-7 7-7-7"
                        />
                      </svg>
                    </button>
                    <div className="p-4 bg-gray-50 text-gray-600">
                      {faq.answer}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          ) : (
            <div className="space-y-6">
              <div className="flex items-start gap-3">
                <MessageSquare className="w-5 h-5 text-blue-600 mt-0.5 flex-shrink-0" />
                <h2 className="text-xl font-semibold text-gray-800">Contact Options</h2>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="border rounded-lg p-4 hover:shadow-md transition-shadow">
                  <div className="flex items-center gap-3 mb-3">
                    <Phone className="w-5 h-5 text-blue-600" />
                    <h3 className="font-medium text-gray-800">Phone Support</h3>
                  </div>
                  <p className="text-gray-600 mb-3">Available 24/7 for urgent order issues</p>
                  <a href="tel:+917000496695" className="text-blue-600 font-medium">
                  +91 9826262660
                  </a>
                </div>

                <div className="border rounded-lg p-4 hover:shadow-md transition-shadow">
                  <div className="flex items-center gap-3 mb-3">
                    <Mail className="w-5 h-5 text-blue-600" />
                    <h3 className="font-medium text-gray-800">Email Support</h3>
                  </div>
                  <p className="text-gray-600 mb-3">Typically responds within 4 hours</p>
                  <a href="mailto:support@happyjourney.com" className="text-blue-600 font-medium">
                    support@happyjourneyy.in
                  </a>
                </div>
              </div>

              <div className="border rounded-lg p-4 bg-blue-50">
                <div className="flex items-center gap-3 mb-3">
                  <Clock className="w-5 h-5 text-blue-600" />
                  <h3 className="font-medium text-gray-800">Support Hours</h3>
                </div>
                <p className="text-gray-600">
                  <span className="font-medium">Phone:</span> 24/7<br />
                  <span className="font-medium">Chat/Email:</span> 7AM-11PM daily
                </p>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default HelpAndSupport;