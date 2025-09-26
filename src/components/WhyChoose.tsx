import React, { useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { FaPlayCircle, FaCheck, FaStar } from 'react-icons/fa';

// Define interfaces for type safety
interface Benefit {
  icon: React.ReactNode;
  title: string;
  description: string;
  highlights: string[];
  color: string;
}

interface Step {
  icon: React.ReactNode;
  title: string;
  description: string;
  highlights: string[];
  step: string;
}

interface Testimonial {
  quote: string;
  author: string;
  role: string;
  rating: number;
}

interface WhyChooseConfig {
  brandName: string;
  tagline: string;
  heroDescription: string;
  heroImage: string;
  benefits: Benefit[];
  steps: Step[];
  groupTravel: {
    title: string;
    description: string;
    highlights: { icon: React.ReactNode; text: string }[];
    image: string;
  };
  testimonials: Testimonial[];
}

interface WhyChooseProps {
  config: WhyChooseConfig;
}

// Reusable WhyChoose component
const WhyChoose: React.FC<WhyChooseProps> = React.memo(({ config }) => {
  const navigate = useNavigate();
  const howItWorksRef = useRef<HTMLDivElement>(null);

  const scrollToHowItWorks = () => {
    howItWorksRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' });
  };

  return (
    <div
      className="container mx-auto px-4 py-10 sm:py-14 lg:py-20 bg-gray-50 min-h-screen"
      aria-label={`${config.brandName} Why Choose Us`}
    >
      {/* Hero Section */}
      <section className="text-center mb-14 sm:mb-20 lg:mb-28 relative">
        <div className="max-w-6xl mx-auto">
          <span className="inline-block mb-5 px-6 py-2 text-sm font-medium text-amber-700 bg-amber-100 rounded-full shadow-md animate-pulse">
            WHY CHOOSE {config.brandName.toUpperCase()}
          </span>
          <h1 className="text-4xl sm:text-5xl lg:text-6xl font-extrabold text-gray-900 mb-6 leading-snug">
            {config.tagline}
          </h1>
          <p className="text-lg sm:text-xl lg:text-2xl text-gray-700 mb-8 max-w-4xl mx-auto">
            {config.heroDescription}
          </p>
          <div className="flex flex-col sm:flex-row justify-center gap-6">
            <button
              onClick={() => navigate('/bulk-order')}
              className="px-8 py-3 bg-amber-600 hover:bg-amber-700 text-white font-semibold rounded-lg shadow-lg hover:shadow-xl transition-all duration-300"
              aria-label={`Place a bulk order with ${config.brandName}`}
            >
              Order Now & Save
            </button>
            <button
              onClick={scrollToHowItWorks}
              className="flex items-center gap-3 px-8 py-3 border-2 border-amber-600 hover:border-amber-700 text-amber-700 font-semibold rounded-lg shadow-md hover:shadow-lg transition-all duration-300 bg-white"
              aria-label={`Learn how ${config.brandName} works`}
            >
              <FaPlayCircle className="w-6 h-6" />
              How It Works
            </button>
          </div>
        </div>
        <img
          src={config.heroImage}
          alt={`${config.brandName} train dining`}
          className="hidden lg:block absolute inset-0 w-full h-full object-cover opacity-10 z-[-1]"
        />
      </section>

      {/* Benefits Cards */}
      <section className="mb-14 sm:mb-20 lg:mb-28">
        <div className="text-center mb-10 sm:mb-14">
          <h2 className="text-3xl sm:text-4xl lg:text-5xl font-extrabold text-gray-900 mb-4">
            Why {config.brandName} Stands Out
          </h2>
          <p className="text-lg sm:text-xl lg:text-2xl text-gray-700 max-w-4xl mx-auto">
            Discover unparalleled convenience, quality, and reliability for your doorstep dining needs.
          </p>
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6 place-content-center mx-auto max-w-6xl">
          {config.benefits.map((item, index) => (
            <div
              key={index}
              className="bg-white p-6 rounded-2xl shadow-lg hover:shadow-xl transition-all duration-300 border border-gray-200 w-full hover:scale-105"
              aria-labelledby={`benefit-${index}`}
            >
              <div className={`${item.color} p-4 rounded-xl mb-4`}>
                <h3
                  id={`benefit-${index}`}
                  className="text-lg sm:text-xl font-semibold text-gray-900 flex items-center"
                >
                  {item.icon}
                  {item.title}
                </h3>
              </div>
              <p className="text-sm sm:text-base text-gray-700 mb-4">{item.description}</p>
              <ul className="space-y-3">
                {item.highlights.map((highlight, i) => (
                  <li key={i} className="flex items-center text-sm sm:text-base text-gray-700">
                    <FaCheck className="w-5 h-5 text-emerald-600 mr-2" aria-hidden="true" />
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
            Seamless Ordering in Three Steps
          </h2>
          <p className="text-lg sm:text-xl lg:text-2xl text-gray-700 max-w-4xl mx-auto">
            Experience hassle-free meal delivery with real-time updates and exceptional service.
          </p>
        </div>
        <div className="relative">
          <div className="hidden lg:block absolute top-1/2 left-0 right-0 h-px bg-gray-300 -translate-y-1/2"></div>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-6 place-content-center mx-auto max-w-6xl">
            {config.steps.map((item, index) => (
              <div
                key={index}
                className="relative bg-white p-6 rounded-2xl shadow-lg hover:shadow-xl transition-all duration-300 border border-gray-200 w-full hover:scale-105"
                aria-labelledby={`step-${index}`}
              >
                <div className="absolute -top-5 left-1/2 transform -translate-x-1/2 bg-amber-600 text-white rounded-full w-10 h-10 flex items-center justify-center font-semibold text-base shadow-md">
                  {item.step}
                </div>
                <div className="text-center pt-5">
                  <div className="p-4 rounded-xl mb-4">
                    <h3
                      id={`step-${index}`}
                      className="text-lg sm:text-xl font-semibold text-gray-900 flex items-center justify-center"
                    >
                      {item.icon}
                      {item.title}
                    </h3>
                  </div>
                  <p className="text-sm sm:text-base text-gray-700 mb-4">{item.description}</p>
                  <ul className="space-y-3">
                    {item.highlights.map((detail, i) => (
                      <li key={i} className="flex items-center text-sm sm:text-base text-gray-700">
                        <FaCheck className="w-5 h-5 text-emerald-600 mr-2" aria-hidden="true" />
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
            <h2 className="text-3xl sm:text-4xl lg:text-5xl font-extrabold text-gray-900 mb-5">
              {config.groupTravel.title}
            </h2>
            <p className="text-lg sm:text-xl lg:text-2xl text-gray-700 mb-6">
              {config.groupTravel.description}
            </p>
            <ul className="space-y-4 mb-6">
              {config.groupTravel.highlights.map((item, i) => (
                <li key={i} className="flex items-center">
                  {item.icon}
                  <span className="text-sm sm:text-base text-gray-700">{item.text}</span>
                </li>
              ))}
            </ul>
            <button
              onClick={() => navigate('/bulk-order')}
              className="px-8 py-3 bg-amber-600 hover:bg-amber-700 text-white font-semibold rounded-lg shadow-lg hover:shadow-xl transition-all duration-300 flex items-center gap-3"
              aria-label={`Get group discount with ${config.brandName}`}
            >
              Secure Your Group Discount
              <FaPlayCircle className="w-6 h-6" />
            </button>
          </div>
          <div className="sm:w-1/2">
            <img
              src={config.groupTravel.image}
              alt={`${config.brandName} group dining`}
              className="w-full h-64 sm:h-full object-cover"
            />
          </div>
        </div>
      </section>

      {/* Testimonials */}
      <section className="mb-14 sm:mb-20 lg:mb-28">
        <div className="text-center mb-10 sm:mb-14">
          <h2 className="text-3xl sm:text-4xl lg:text-5xl font-extrabold text-gray-900 mb-4">
            Loved by Millions
          </h2>
          <p className="text-lg sm:text-xl lg:text-2xl text-gray-700 max-w-4xl mx-auto">
            Join over 1.5 million travelers who trust {config.brandName} for exceptional dining.
          </p>
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-6 place-content-center mx-auto max-w-6xl">
          {config.testimonials.map((testimonial, index) => (
            <div
              key={index}
              className="bg-white p-6 rounded-2xl shadow-lg hover:shadow-xl transition-all duration-300 border border-gray-200 w-full hover:scale-105"
              aria-labelledby={`testimonial-${index}`}
            >
              <div className="flex mb-4">
                {[...Array(testimonial.rating)].map((_, i) => (
                  <FaStar
                    key={i}
                    className="w-5 h-5 fill-amber-500 text-amber-500 mr-1"
                    aria-hidden="true"
                  />
                ))}
              </div>
              <blockquote
                id={`testimonial-${index}`}
                className="text-sm sm:text-base text-gray-700 mb-4 italic"
              >
                &quot;{testimonial.quote}&quot;
              </blockquote>
              <div className="font-medium text-gray-900 text-base sm:text-lg">{testimonial.author}</div>
              <div className="text-xs sm:text-sm text-gray-600">{testimonial.role}</div>
            </div>
          ))}
        </div>
      </section>
    </div>
  );
});

export default WhyChoose;