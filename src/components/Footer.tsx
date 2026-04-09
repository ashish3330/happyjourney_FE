import React from 'react';
import { Facebook, Instagram, Phone, Mail, MapPin, ChevronRight } from 'lucide-react';
import HappyJourneyLogoDark from '../assets/Happy_Journey_Logo.jpg';

interface FooterLink {
  label: string;
  path: string;
}

interface FooterConfig {
  brandName: string;
  description: string;
  socialMedia: {
    facebook: string;
    twitter: string;
    instagram: string;
  };
}

interface FooterProps {
  config: FooterConfig;
}

const QUICK_LINKS: FooterLink[] = [
  { label: 'Home',             path: '/home'             },
  { label: 'Order History',    path: '/order-history'    },
  { label: 'Help & Support',   path: '/help'             },
  { label: 'Privacy Policy',   path: '/privacy-policy'   },
  { label: 'Terms & Conditions', path: '/terms'          },
  { label: 'Cancellation Policy', path: '/cancellation-policy' },
];

const CONTACT_INFO = {
  phone:   '+91 98262 62660',
  email:   'support@happyjourneyy.com',
  address: 'Laxmandas Marg, Haryana Dairy, Bhagwanganj Ward, Saugor, Madhya Pradesh – 470002',
};

const Footer: React.FC<FooterProps> = React.memo(({ config }) => {
  const year = new Date().getFullYear();

  return (
    <footer className="bg-gray-950 text-white" aria-label={`${config.brandName} Footer`}>

      {/* Top teal rule */}
      <div className="h-px bg-gradient-to-r from-transparent via-teal-500/40 to-transparent" />

      <div className="max-w-7xl mx-auto px-6 lg:px-8 pt-14 pb-8">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-12 gap-10 lg:gap-8">

          {/* ── Brand ─────────────────────────────── */}
          <div className="lg:col-span-5 space-y-5">
            <img
              src={HappyJourneyLogoDark}
              alt={config.brandName}
              className="h-12 w-auto object-contain"
            />
            <p className="text-gray-400 text-sm leading-relaxed max-w-sm">
              {config.description}
            </p>

            {/* Social icons */}
            <div className="flex gap-3 pt-1">
              <a
                href={config.socialMedia.facebook}
                target="_blank" rel="noopener noreferrer"
                aria-label="Facebook"
                className="w-10 h-10 rounded-xl bg-white/10 flex items-center justify-center transition-colors hover:bg-white/20"
              >
                <Facebook className="w-[18px] h-[18px] text-white" />
              </a>
              <a
                href={config.socialMedia.twitter}
                target="_blank" rel="noopener noreferrer"
                aria-label="X (formerly Twitter)"
                className="w-10 h-10 rounded-xl bg-white/10 flex items-center justify-center transition-colors hover:bg-white/20"
              >
                <svg viewBox="0 0 24 24" className="w-[17px] h-[17px] fill-white">
                  <path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-4.714-6.231-5.401 6.231H2.747l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z" />
                </svg>
              </a>
              <a
                href={config.socialMedia.instagram}
                target="_blank" rel="noopener noreferrer"
                aria-label="Instagram"
                className="w-10 h-10 rounded-xl bg-white/10 flex items-center justify-center transition-colors hover:bg-white/20"
              >
                <Instagram className="w-[18px] h-[18px] text-white" />
              </a>
            </div>
          </div>

          {/* ── Quick Links ───────────────────────── */}
          <div className="lg:col-span-3">
            <h3 className="text-[11px] font-bold text-gray-400 uppercase tracking-widest mb-5">
              Quick Links
            </h3>
            <ul className="space-y-3">
              {QUICK_LINKS.map((link) => (
                <li key={link.path}>
                  <a
                    href={link.path}
                    className="group flex items-center gap-1.5 text-gray-400 hover:text-white text-sm transition-colors duration-200"
                  >
                    <ChevronRight className="w-3.5 h-3.5 text-teal-500 opacity-0 group-hover:opacity-100 -ml-1 transition-opacity duration-200" />
                    {link.label}
                  </a>
                </li>
              ))}
            </ul>
          </div>

          {/* ── Contact ───────────────────────────── */}
          <div className="lg:col-span-4">
            <h3 className="text-[11px] font-bold text-gray-400 uppercase tracking-widest mb-5">
              Get in Touch
            </h3>
            <div className="space-y-4">

              <div className="flex items-start gap-3">
                <div className="w-8 h-8 rounded-lg bg-green-500/15 flex items-center justify-center shrink-0 mt-0.5">
                  <Phone className="w-4 h-4 text-green-400" />
                </div>
                <div>
                  <p className="text-[10px] font-semibold text-gray-500 uppercase tracking-wider mb-0.5">Phone</p>
                  <a href={`tel:${CONTACT_INFO.phone}`} className="text-sm text-gray-300 hover:text-white transition-colors">
                    {CONTACT_INFO.phone}
                  </a>
                </div>
              </div>

              <div className="flex items-start gap-3">
                <div className="w-8 h-8 rounded-lg bg-teal-500/15 flex items-center justify-center shrink-0 mt-0.5">
                  <Mail className="w-4 h-4 text-teal-400" />
                </div>
                <div>
                  <p className="text-[10px] font-semibold text-gray-500 uppercase tracking-wider mb-0.5">Email</p>
                  <a href={`mailto:${CONTACT_INFO.email}`} className="text-sm text-gray-300 hover:text-white transition-colors">
                    {CONTACT_INFO.email}
                  </a>
                </div>
              </div>

              <div className="flex items-start gap-3">
                <div className="w-8 h-8 rounded-lg bg-orange-500/15 flex items-center justify-center shrink-0 mt-0.5">
                  <MapPin className="w-4 h-4 text-orange-400" />
                </div>
                <div>
                  <p className="text-[10px] font-semibold text-gray-500 uppercase tracking-wider mb-0.5">Address</p>
                  <p className="text-sm text-gray-400 leading-relaxed">
                    {CONTACT_INFO.address}
                  </p>
                </div>
              </div>

            </div>
          </div>
        </div>

        {/* ── Bottom bar ────────────────────────── */}
        <div className="mt-12 pt-6 border-t border-gray-800/60 flex flex-col sm:flex-row items-center justify-between gap-3">
          <p className="text-gray-500 text-xs">
            &copy; {year} {config.brandName} · The Chintoo's Restaurant. All Rights Reserved.
          </p>
          <a
            href="https://www.thehappyjourneyy.com"
            target="_blank" rel="noopener noreferrer"
            className="text-gray-600 text-xs hover:text-gray-400 transition-colors"
          >
            www.thehappyjourneyy.com
          </a>
        </div>
      </div>
    </footer>
  );
});

export default Footer;
