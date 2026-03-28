import React, { useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { FaStar } from 'react-icons/fa';
import { Check, ArrowRight, Quote } from 'lucide-react';

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

const WhyChoose: React.FC<WhyChooseProps> = React.memo(({ config }) => {
  const navigate = useNavigate();
  const howItWorksRef = useRef<HTMLDivElement>(null);

  const scrollToHowItWorks = () => {
    howItWorksRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' });
  };

  // Extract initials for testimonial avatars
  const getInitials = (name: string) =>
    name.split(' ').map((n) => n[0]).join('').toUpperCase().slice(0, 2);

  return (
    <div className="bg-[#f8f9fb]" aria-label={`${config.brandName} Why Choose Us`}>

      {/* ── Hero ─────────────────────────────────────────── */}
      <section className="bg-white border-b border-gray-100">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-20 text-center">
          <span className="inline-flex items-center gap-2 mb-5 px-5 py-2 text-xs font-bold text-teal-700 bg-teal-50 border border-teal-100 rounded-full tracking-widest uppercase">
            WHY CHOOSE {config.brandName.toUpperCase()}
          </span>
          <h1 className="text-4xl sm:text-5xl font-extrabold text-gray-900 mb-5 leading-tight tracking-tight">
            {config.tagline}
          </h1>
          <p className="text-lg text-gray-500 mb-10 max-w-2xl mx-auto leading-relaxed">
            {config.heroDescription}
          </p>
          <div className="flex flex-col sm:flex-row justify-center gap-4">
            <button
              onClick={() => navigate('/bulk-order')}
              className="inline-flex items-center justify-center gap-2 px-7 py-3.5 bg-teal-600 hover:bg-teal-700 text-white font-semibold rounded-xl shadow-sm transition-all duration-200 text-sm"
            >
              Order Now &amp; Save
              <ArrowRight size={16} />
            </button>
            <button
              onClick={scrollToHowItWorks}
              className="inline-flex items-center justify-center gap-2 px-7 py-3.5 border border-gray-200 hover:border-teal-300 bg-white text-gray-700 hover:text-teal-700 font-semibold rounded-xl shadow-sm transition-all duration-200 text-sm"
            >
              How It Works
            </button>
          </div>
        </div>
      </section>

      {/* ── Benefits Cards ───────────────────────────────── */}
      <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-20">
        <div className="text-center mb-14">
          <span className="inline-flex items-center gap-2 text-teal-600 text-xs font-bold bg-teal-50 px-4 py-2 rounded-full mb-4 uppercase tracking-widest">
            Our Advantages
          </span>
          <h2 className="text-3xl sm:text-4xl font-extrabold text-gray-900 mb-3 tracking-tight">
            Why {config.brandName} Stands Out
          </h2>
          <p className="text-gray-500 max-w-xl mx-auto text-base leading-relaxed">
            Discover unparalleled convenience, quality, and reliability for your dining needs on the go.
          </p>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
          {config.benefits.map((item, index) => (
            <div
              key={index}
              className="group bg-white rounded-2xl border border-gray-100 p-7 hover:shadow-lg hover:-translate-y-0.5 transition-all duration-300"
            >
              {/* Icon badge */}
              <div className="w-12 h-12 bg-teal-50 rounded-xl flex items-center justify-center mb-5 group-hover:bg-teal-100 transition-colors">
                <span className="[&>svg]:w-5 [&>svg]:h-5 [&>svg]:text-teal-600">{item.icon}</span>
              </div>

              <h3 className="text-base font-extrabold text-gray-900 mb-2">{item.title}</h3>
              <p className="text-sm text-gray-500 leading-relaxed mb-5">{item.description}</p>

              <ul className="space-y-2.5">
                {item.highlights.map((highlight, i) => (
                  <li key={i} className="flex items-start gap-2.5 text-sm text-gray-600">
                    <span className="mt-0.5 w-4 h-4 rounded-full bg-teal-50 flex items-center justify-center flex-shrink-0">
                      <Check size={10} className="text-teal-600 stroke-[3]" />
                    </span>
                    {highlight}
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>
      </section>

      {/* ── Steps ────────────────────────────────────────── */}
      <section ref={howItWorksRef} className="bg-white border-y border-gray-100">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-20">
          <div className="text-center mb-14">
            <span className="inline-flex items-center gap-2 text-teal-600 text-xs font-bold bg-teal-50 px-4 py-2 rounded-full mb-4 uppercase tracking-widest">
              How It Works
            </span>
            <h2 className="text-3xl sm:text-4xl font-extrabold text-gray-900 mb-3 tracking-tight">
              Seamless Ordering in Three Steps
            </h2>
            <p className="text-gray-500 max-w-xl mx-auto text-base leading-relaxed">
              Experience hassle-free meal delivery with real-time updates and exceptional service.
            </p>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-6 relative">
            {/* Connector (desktop) */}
            <div className="hidden sm:block absolute top-8 left-[calc(33.33%+8px)] right-[calc(33.33%+8px)] h-px bg-gradient-to-r from-teal-200 via-teal-300 to-teal-200" />

            {config.steps.map((item, index) => (
              <div
                key={index}
                className="group bg-[#f8f9fb] rounded-2xl border border-gray-100 p-7 hover:bg-white hover:shadow-lg hover:-translate-y-0.5 transition-all duration-300 text-center"
              >
                {/* Step number */}
                <div className="w-14 h-14 bg-teal-600 rounded-2xl flex items-center justify-center mx-auto mb-5 shadow-md shadow-teal-100 group-hover:bg-teal-700 transition-colors relative">
                  <span className="[&>svg]:w-6 [&>svg]:h-6 [&>svg]:text-white">{item.icon}</span>
                  <span className="absolute -top-2 -right-2 w-5 h-5 bg-yellow-400 text-gray-900 text-[10px] font-extrabold rounded-full flex items-center justify-center shadow-sm">
                    {item.step}
                  </span>
                </div>

                <h3 className="text-base font-extrabold text-gray-900 mb-2">{item.title}</h3>
                <p className="text-sm text-gray-500 leading-relaxed mb-5">{item.description}</p>

                <ul className="space-y-2 text-left">
                  {item.highlights.map((detail, i) => (
                    <li key={i} className="flex items-start gap-2.5 text-sm text-gray-600">
                      <span className="mt-0.5 w-4 h-4 rounded-full bg-teal-50 flex items-center justify-center flex-shrink-0">
                        <Check size={10} className="text-teal-600 stroke-[3]" />
                      </span>
                      {detail}
                    </li>
                  ))}
                </ul>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── Group / Bulk Order ───────────────────────────── */}
      <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-20">
        <div className="rounded-3xl overflow-hidden bg-gradient-to-br from-teal-600 to-teal-800 flex flex-col sm:flex-row shadow-xl">
          <div className="sm:w-1/2 p-8 lg:p-14 flex flex-col justify-center">
            <span className="inline-flex w-fit items-center gap-2 text-teal-200 text-xs font-bold bg-white/10 border border-white/20 px-4 py-2 rounded-full mb-6 uppercase tracking-widest">
              Group Orders
            </span>
            <h2 className="text-3xl sm:text-4xl font-extrabold text-white mb-4 leading-tight">
              {config.groupTravel.title}
            </h2>
            <p className="text-teal-100 text-base leading-relaxed mb-8">
              {config.groupTravel.description}
            </p>
            <ul className="space-y-3 mb-8">
              {config.groupTravel.highlights.map((item, i) => (
                <li key={i} className="flex items-center gap-3">
                  <span className="w-8 h-8 bg-white/15 rounded-lg flex items-center justify-center flex-shrink-0 [&>svg]:w-4 [&>svg]:h-4 [&>svg]:text-white">
                    {item.icon}
                  </span>
                  <span className="text-sm text-teal-100">{item.text}</span>
                </li>
              ))}
            </ul>
            <button
              onClick={() => navigate('/bulk-order')}
              className="inline-flex w-fit items-center gap-2 px-7 py-3.5 bg-white text-teal-700 font-bold rounded-xl shadow-sm hover:bg-teal-50 transition-all duration-200 text-sm"
            >
              Secure Your Group Discount
              <ArrowRight size={16} />
            </button>
          </div>
          <div className="sm:w-1/2 min-h-[280px]">
            <img
              src={config.groupTravel.image}
              alt={`${config.brandName} group dining`}
              className="w-full h-full object-cover"
            />
          </div>
        </div>
      </section>

      {/* ── Testimonials ─────────────────────────────────── */}
      <section className="bg-white border-t border-gray-100">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-20">
          <div className="text-center mb-14">
            <span className="inline-flex items-center gap-2 text-teal-600 text-xs font-bold bg-teal-50 px-4 py-2 rounded-full mb-4 uppercase tracking-widest">
              Testimonials
            </span>
            <h2 className="text-3xl sm:text-4xl font-extrabold text-gray-900 mb-3 tracking-tight">
              Loved by Millions
            </h2>
            <p className="text-gray-500 max-w-xl mx-auto text-base leading-relaxed">
              Join over 1.5 million customers who trust {config.brandName} for exceptional dining.
            </p>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-6">
            {config.testimonials.map((testimonial, index) => (
              <div
                key={index}
                className="bg-[#f8f9fb] rounded-2xl border border-gray-100 p-7 hover:bg-white hover:shadow-lg hover:-translate-y-0.5 transition-all duration-300 flex flex-col"
              >
                {/* Quote icon + stars */}
                <div className="flex items-center justify-between mb-5">
                  <Quote size={28} className="text-teal-100 fill-teal-100" />
                  <div className="flex gap-0.5">
                    {[...Array(testimonial.rating)].map((_, i) => (
                      <FaStar key={i} className="w-3.5 h-3.5 text-yellow-400" />
                    ))}
                  </div>
                </div>

                <blockquote className="text-sm text-gray-600 leading-relaxed flex-1 mb-6">
                  "{testimonial.quote}"
                </blockquote>

                {/* Author */}
                <div className="flex items-center gap-3 pt-5 border-t border-gray-100">
                  <div className="w-9 h-9 rounded-full bg-teal-600 flex items-center justify-center flex-shrink-0">
                    <span className="text-white text-xs font-bold">{getInitials(testimonial.author)}</span>
                  </div>
                  <div>
                    <p className="text-sm font-bold text-gray-900 leading-none">{testimonial.author}</p>
                    <p className="text-xs text-gray-500 mt-0.5">{testimonial.role}</p>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>
    </div>
  );
});

export default WhyChoose;
