import React, { useRef } from "react";
import { useNavigate } from "react-router-dom";
import { FaTrain, FaUtensils, FaShieldAlt, FaMapMarkerAlt, FaShoppingCart, FaUser, FaThumbsUp, FaUsers, FaPlayCircle, FaCheck, FaStar } from "react-icons/fa";

const WhyChooseHappyJourney: React.FC = () => {
  const navigate = useNavigate();
  const howItWorksRef = useRef<HTMLDivElement>(null);

  const scrollToHowItWorks = () => {
    howItWorksRef.current?.scrollIntoView({ behavior: "smooth", block: "start" });
  };

  return (
    <div className="container mx-auto px-4 py-10 sm:py-14 lg:py-20 bg-gray-50 min-h-screen">
      {/* Hero Section */}
      <section className="text-center mb-14 sm:mb-20 lg:mb-28">
        <div className="max-w-5xl mx-auto">
          <span className="inline-block mb-5 px-5 py-2 text-sm font-medium text-amber-700 bg-amber-100 rounded-full shadow-md">
            WHY US
          </span>
          <h1 className="text-4xl sm:text-5xl lg:text-6xl font-extrabold text-gray-900 mb-6 leading-snug">
            Elevate Your Street Num Dining Experience
          </h1>
          <p className="text-lg sm:text-xl lg:text-2xl text-gray-700 mb-8 max-w-3xl mx-auto">
            Savor high-quality meals delivered directly to your street num with ease and excellence.
          </p>
          <div className="flex flex-col sm:flex-row justify-center gap-6">
            <button
              onClick={() => navigate("/bulk-order")}
              className="px-8 py-3 bg-amber-600 hover:bg-amber-700 text-white font-semibold rounded-lg shadow-lg hover:shadow-xl transition-all duration-300"
            >
              Place a Group Order
            </button>
            <button
              onClick={scrollToHowItWorks}
              className="flex items-center gap-3 px-8 py-3 border-2 border-amber-600 hover:border-amber-700 text-amber-700 font-semibold rounded-lg shadow-md hover:shadow-lg transition-all duration-300 bg-white"
            >
              <FaPlayCircle className="w-6 h-6" />
              Discover How It Works
            </button>
          </div>
        </div>
      </section>

      {/* Benefits Cards */}
      <section className="mb-14 sm:mb-20 lg:mb-28">
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6 place-content-center mx-auto max-w-6xl">
          {[
            {
              icon: <FaTrain className="w-6 h-6 text-amber-600 mr-2" />,
              title: "Extensive Reach",
              description: "Order meals at over 500+ cities across India, available round-the-clock.",
              highlights: [
                "Coverage across all railway zones",
                "Live order tracking",
                "Support in multiple languages"
              ],
              color: "bg-amber-50"
            },
            {
              icon: <FaUtensils className="w-6 h-6 text-emerald-600 mr-2" />,
              title: "Top-Tier Dining Options",
              description: "Select from 1000+ FSSAI-verified restaurants offering a variety of cuisines.",
              highlights: [
                "Premium dining partners",
                "Special dietary choices",
                "Exclusive daily specials"
              ],
              color: "bg-emerald-50"
            },
            {
              icon: <FaShieldAlt className="w-6 h-6 text-blue-600 mr-2" />,
              title: "Priority on Hygiene",
              description: "Enjoy secure deliveries with safe, tamper-evident packaging.",
              highlights: [
                "No-contact delivery",
                "Temperature-regulated packaging",
                "Street Numed delivery personnel"
              ],
              color: "bg-blue-50"
            }
          ].map((item, index) => (
            <div
              key={index}
              className="bg-white p-6 rounded-2xl shadow-lg hover:shadow-xl transition-all duration-300 border border-gray-200 w-full"
            >
              <div className={`${item.color} p-4 rounded-xl mb-4`}>
                <h3 className="text-lg sm:text-xl font-semibold text-gray-900 flex items-center">{item.icon}{item.title}</h3>
              </div>
              <p className="text-sm sm:text-base text-gray-700 mb-4">{item.description}</p>
              <ul className="space-y-3">
                {item.highlights.map((highlight, i) => (
                  <li key={i} className="flex items-center text-sm sm:text-base text-gray-700">
                    <FaCheck className="w-5 h-5 text-emerald-600 mr-2" />
                    {highlight}
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>
      </section>

      {/* How It Works Section */}
      <section ref={howItWorksRef} className="mb-14 sm:mb-20 lg:mb-28">
        <div className="text-center mb-10 sm:mb-14">
          <h2 className="text-3xl sm:text-4xl lg:text-5xl font-extrabold text-gray-900 mb-4">
            Effortless Ordering Steps
          </h2>
          <p className="text-lg sm:text-xl lg:text-2xl text-gray-700 max-w-3xl mx-auto">
            Get your meal in three simple steps with live updates.
          </p>
        </div>
        <div className="relative">
          <div className="hidden lg:block absolute top-1/2 left-0 right-0 h-px bg-gray-300 -translate-y-1/2"></div>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-6 place-content-center mx-auto max-w-6xl">
            {[
              {
                icon: <FaMapMarkerAlt className="w-6 h-6 text-amber-600 mr-2" />,
                title: "Choose Your Station",
                description: "Select your station and browse available menus.",
                highlights: [
                  "Search by station name or code",
                  "Check ratings and images",
                  "Sort by cuisine type"
                ],
                step: "1"
              },
              {
                icon: <FaShoppingCart className="w-6 h-6 text-emerald-600 mr-2" />,
                title: "Tailor Your Meal",
                description: "Customize your order to suit your preferences.",
                highlights: [
                  "Specify dietary needs",
                  "Add extra items",
                  "Review order details"
                ],
                step: "2"
              },
              {
                icon: <FaUser className="w-6 h-6 text-blue-600 mr-2" />,
                title: "Dine on Your Journey",
                description: "Get your meal delivered to your seat with tracking.",
                highlights: [
                  "Live delivery updates",
                  "Hygienic, contactless service",
                  "Customer support access"
                ],
                step: "3"
              }
            ].map((item, index) => (
              <div
                key={index}
                className="relative bg-white p-6 rounded-2xl shadow-lg hover:shadow-xl transition-all duration-300 border border-gray-200 w-full"
              >
                <div className="absolute -top-5 left-1/2 transform -translate-x-1/2 bg-amber-600 text-white rounded-full w-10 h-10 flex items-center justify-center font-semibold text-base shadow-md">
                  {item.step}
                </div>
                <div className="text-center pt-5">
                  <div className="p-4 rounded-xl mb-4">
                    <h3 className="text-lg sm:text-xl font-semibold text-gray-900 flex items-center justify-center">{item.icon}{item.title}</h3>
                  </div>
                  <p className="text-sm sm:text-base text-gray-700 mb-4">{item.description}</p>
                  <ul className="space-y-3">
                    {item.highlights.map((detail, i) => (
                      <li key={i} className="flex items-center text-sm sm:text-base text-gray-700">
                        <FaCheck className="w-5 h-5 text-emerald-600 mr-2" />
                        {detail}
                      </li>
                    ))}
                  </ul>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Bulk Order Section */}
      <section className="bg-gradient-to-r from-amber-100 to-blue-100 rounded-2xl overflow-hidden mb-14 sm:mb-20 lg:mb-28">
        <div className="flex flex-col sm:flex-row">
          <div className="sm:w-1/2 p-6 sm:p-8 lg:p-12">
            <h2 className="text-3xl sm:text-4xl lg:text-5xl font-extrabold text-gray-900 mb-5">Seamless Group Dining</h2>
            <p className="text-lg sm:text-xl lg:text-2xl text-gray-700 mb-6">
              Streamline meal planning for group travel with customized bulk orders.
            </p>
            <ul className="space-y-4 mb-6">
              <li className="flex items-center">
                <FaThumbsUp className="w-6 h-6 text-emerald-600 mr-3" />
                <span className="text-sm sm:text-base text-gray-700">10% off for orders of 10+ meals</span>
              </li>
              <li className="flex items-center">
                <FaUsers className="w-6 h-6 text-blue-600 mr-3" />
                <span className="text-sm sm:text-base text-gray-700">Personalized group coordinator</span>
              </li>
              <li className="flex items-center">
                <FaUser className="w-6 h-6 text-amber-600 mr-3" />
                <span className="text-sm sm:text-base text-gray-700">Tailored group menus</span>
              </li>
            </ul>
            <button
              onClick={() => navigate("/bulk-order")}
              className="px-8 py-3 bg-amber-600 hover:bg-amber-700 text-white font-semibold rounded-lg shadow-lg hover:shadow-xl transition-all duration-300 flex items-center gap-3"
            >
              Unlock Group Savings
              <FaPlayCircle className="w-6 h-6" />
            </button>
          </div>
          <div className="sm:w-1/2">
            <img 
              src="https://images.unsplash.com/photo-1606787366850-de6330128bfc?ixlib=rb-4.0.3&ixid=M3wxMjA3fDB8MHxwaG90by1wYWdlfHx8fGVufDB8fHx8fA%3D%3D&auto=format&fit=crop&w=800&q=80" 
              alt="Group dining experience" 
              className="w-full h-64 sm:h-full object-cover"
            />
          </div>
        </div>
      </section>

      {/* Testimonials */}
      <section className="mb-14 sm:mb-20 lg:mb-28">
        <div className="text-center mb-10 sm:mb-14">
          <h2 className="text-3xl sm:text-4xl lg:text-5xl font-extrabold text-gray-900 mb-4">
            Loved by Our Customers
          </h2>
          <p className="text-lg sm:text-xl lg:text-2xl text-gray-700 max-w-3xl mx-auto">
            More than 1 million travelers trust our meal delivery service.
          </p>
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-6 place-content-center mx-auto max-w-6xl">
          {[
            {
              quote: "Made our train journeys delightful with tasty meals!",
              author: "Vikram S.",
              role: "Regular Commuter",
              rating: 5
            },
            {
              quote: "Reliable and punctual, ideal for work trips.",
              author: "Ananya R.",
              role: "Business Professional",
              rating: 5
            },
            {
              quote: "Perfect for our group tour's meal needs.",
              author: "Suresh P.",
              role: "Tour Organizer",
              rating: 5
            }
          ].map((testimonial, index) => (
            <div
              key={index}
              className="bg-white p-6 rounded-2xl shadow-lg hover:shadow-xl transition-all duration-300 border border-gray-200 w-full"
            >
              <div className="flex mb-4">
                {[...Array(testimonial.rating)].map((_, i) => (
                  <FaStar key={i} className="w-5 h-5 fill-amber-500 text-amber-500 mr-1" />
                ))}
              </div>
              <blockquote className="text-sm sm:text-base text-gray-700 mb-4 italic">
                "{testimonial.quote}"
              </blockquote>
              <div className="font-medium text-gray-900 text-base sm:text-lg">{testimonial.author}</div>
              <div className="text-xs sm:text-sm text-gray-600">{testimonial.role}</div>
            </div>
          ))}
        </div>
      </section>
    </div>
  );
};

export default WhyChooseHappyJourney;