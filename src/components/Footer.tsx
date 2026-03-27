import React from 'react';
import { Facebook, Twitter, Instagram, Phone, Mail, MapPin } from 'lucide-react';

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
  { label: 'Home', path: '/home' },
  { label: 'Order History', path: '/order-history' },
  { label: 'Track Order', path: '/track-order' },
  { label: 'Privacy Policy', path: '/privacy-policy' },
  { label: 'Terms & Conditions', path: '/terms' },
];

const CONTACT_INFO = {
  phone: '+91 98262 62660',
  email: 'support@happyjourneyy.com',
  address: 'S/o Sachchanand Rajpoot, Laxmandas Marg, Haryana Dairy, Bhagwanganj Ward, Saugor, Madhya Pradesh - 470002',
};

const Footer: React.FC<FooterProps> = React.memo(({ config }) => {
  const currentYear = new Date().getFullYear();

  return (
    <footer className="bg-gray-950 text-white pt-16 pb-8" aria-label={`${config.brandName} Footer`}>
      <div className="max-w-7xl mx-auto px-6 lg:px-8">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-12 gap-10 lg:gap-8">
          
          {/* Brand Section */}
          <div className="lg:col-span-5 space-y-6">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-orange-500 rounded-xl flex items-center justify-center">
                <span className="text-white font-bold text-2xl">🍛</span>
              </div>
              <h2 className="text-3xl font-bold tracking-tight">{config.brandName}</h2>
            </div>
            
            <p className="text-gray-400 text-[15px] leading-relaxed max-w-md">
              {config.description}
            </p>

            <div className="flex gap-4">
              <a
                href={config.socialMedia.facebook}
                target="_blank"
                rel="noopener noreferrer"
                className="w-10 h-10 bg-gray-900 hover:bg-gray-800 rounded-2xl flex items-center justify-center transition-all duration-300 hover:scale-110"
                aria-label="Facebook"
              >
                <Facebook className="h-5 w-5" />
              </a>
              <a
                href={config.socialMedia.twitter}
                target="_blank"
                rel="noopener noreferrer"
                className="w-10 h-10 bg-gray-900 hover:bg-gray-800 rounded-2xl flex items-center justify-center transition-all duration-300 hover:scale-110"
                aria-label="Twitter"
              >
                <Twitter className="h-5 w-5" />
              </a>
              <a
                href={config.socialMedia.instagram}
                target="_blank"
                rel="noopener noreferrer"
                className="w-10 h-10 bg-gray-900 hover:bg-gray-800 rounded-2xl flex items-center justify-center transition-all duration-300 hover:scale-110"
                aria-label="Instagram"
              >
                <Instagram className="h-5 w-5" />
              </a>
            </div>
          </div>

          {/* Quick Links */}
          <div className="lg:col-span-3">
            <h3 className="text-lg font-semibold mb-6 text-white">Quick Links</h3>
            <ul className="space-y-3 text-gray-400">
              {QUICK_LINKS.map((link) => (
                <li key={link.path}>
                  <a
                    href={link.path}
                    className="hover:text-white transition-colors duration-200 hover:translate-x-1 inline-block"
                  >
                    {link.label}
                  </a>
                </li>
              ))}
            </ul>
          </div>

          {/* Contact Information */}
          <div className="lg:col-span-4">
            <h3 className="text-lg font-semibold mb-6 text-white">Get in Touch</h3>
            
            <div className="space-y-5 text-gray-400">
              <div className="flex gap-4">
                <div className="mt-1">
                  <Phone className="h-5 w-5 text-orange-500" />
                </div>
                <div>
                  <p className="text-sm text-gray-500">Call Us</p>
                  <a 
                    href={`tel:${CONTACT_INFO.phone}`} 
                    className="hover:text-white transition-colors"
                  >
                    {CONTACT_INFO.phone}
                  </a>
                </div>
              </div>

              <div className="flex gap-4">
                <div className="mt-1">
                  <Mail className="h-5 w-5 text-orange-500" />
                </div>
                <div>
                  <p className="text-sm text-gray-500">Email Us</p>
                  <a 
                    href={`mailto:${CONTACT_INFO.email}`} 
                    className="hover:text-white transition-colors"
                  >
                    {CONTACT_INFO.email}
                  </a>
                </div>
              </div>

              <div className="flex gap-4">
                <div className="mt-1">
                  <MapPin className="h-5 w-5 text-orange-500" />
                </div>
                <div>
                  <p className="text-sm text-gray-500">Visit Us</p>
                  <p className="text-sm leading-relaxed">
                    {CONTACT_INFO.address}
                  </p>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Bottom Bar */}
        <div className="mt-16 pt-8 border-t border-gray-800 text-center">
          <p className="text-gray-500 text-sm">
            &copy; {currentYear} {config.brandName} • The Chintoo's Restaurant. 
            All Rights Reserved.
          </p>
          <p className="text-gray-600 text-xs mt-2">
            <a 
              href="https://www.thehappyjourneyy.com" 
              target="_blank" 
              rel="noopener noreferrer"
              className="hover:text-gray-400 transition-colors"
            >
              www.thehappyjourneyy.com
            </a>
          </p>
        </div>
      </div>
    </footer>
  );
});

export default Footer;