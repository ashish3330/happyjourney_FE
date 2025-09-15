import React from 'react';
import { Facebook, Twitter, Instagram, Phone, Mail } from 'lucide-react';

// Define interfaces for type safety
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

// Shared constants
const QUICK_LINKS: FooterLink[] = [
  { label: 'Home', path: '/home' },
  { label: 'Order History', path: '/order-history' },
  { label: 'Privacy Policy', path: '/privacy-policy' },
  { label: 'Payment Policy', path: '/payment-policy' },
];

const CONTACT_INFO = {
  phone: '+91 98262 62660',
  email: 'support@happyjourneyy.com', // Placeholder, can be customized per brand
};

// Reusable Footer component
const Footer: React.FC<FooterProps> = React.memo(({ config }) => {
  const currentYear = new Date().getFullYear();

  return (
    <footer className="bg-gray-900 text-white py-12" aria-label={`${config.brandName} Footer`}>
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-8">
          {/* Company Info */}
          <div className="space-y-4">
            <h3 className="text-lg font-semibold">{config.brandName}</h3>
            <p className="text-gray-400 text-sm">{config.description}</p>
          </div>

          {/* Quick Links */}
          <nav aria-label="Quick Links">
            <h3 className="text-lg font-semibold mb-4">Quick Links</h3>
            <ul className="space-y-2">
              {QUICK_LINKS.map((link) => (
                <li key={link.path}>
                  <a
                    href={link.path}
                    className="text-gray-400 hover:text-white transition-colors duration-200"
                    aria-label={`Navigate to ${link.label}`}
                  >
                    {link.label}
                  </a>
                </li>
              ))}
            </ul>
          </nav>

          {/* Contact Info */}
          <div>
            <h3 className="text-lg font-semibold mb-4">Contact Us</h3>
            <ul className="space-y-2 text-gray-400">
              <li className="flex items-center">
                <Phone className="h-5 w-5 mr-2" aria-hidden="true" />
                <a
                  href={`tel:${CONTACT_INFO.phone}`}
                  className="hover:text-white transition-colors duration-200"
                  aria-label={`Call ${CONTACT_INFO.phone}`}
                >
                  {CONTACT_INFO.phone}
                </a>
              </li>
              <li className="flex items-center">
                <Mail className="h-5 w-5 mr-2" aria-hidden="true" />
                <a
                  href={`mailto:${CONTACT_INFO.email}`}
                  className="hover:text-white transition-colors duration-200"
                  aria-label={`Email ${CONTACT_INFO.email}`}
                >
                  {CONTACT_INFO.email}
                </a>
              </li>
            </ul>
          </div>

          {/* Social Media */}
          <div>
            <h3 className="text-lg font-semibold mb-4">Follow Us</h3>
            <div className="flex space-x-4">
              <a
                href={config.socialMedia.facebook}
                target="_blank"
                rel="noopener noreferrer"
                className="text-gray-400 hover:text-white transition-colors duration-200"
                aria-label={`Follow ${config.brandName} on Facebook`}
              >
                <Facebook className="h-6 w-6" />
                <span className="sr-only">Facebook</span>
              </a>
              <a
                href={config.socialMedia.twitter}
                target="_blank"
                rel="noopener noreferrer"
                className="text-gray-400 hover:text-white transition-colors duration-200"
                aria-label={`Follow ${config.brandName} on Twitter`}
              >
                <Twitter className="h-6 w-6" />
                <span className="sr-only">Twitter</span>
              </a>
              <a
                href={config.socialMedia.instagram}
                target="_blank"
                rel="noopener noreferrer"
                className="text-gray-400 hover:text-white transition-colors duration-200"
                aria-label={`Follow ${config.brandName} on Instagram`}
              >
                <Instagram className="h-6 w-6" />
                <span className="sr-only">Instagram</span>
              </a>
            </div>
          </div>
        </div>

        {/* Bottom Bar */}
        <div className="mt-8 pt-8 border-t border-gray-700 text-center text-gray-400 text-sm">
  <p>
    S/o Sachchanand Rajpoot Laxmandas Marg, Haryana Dairy, Bhagwanganj Ward Saugor, PO:Saugor City Dist: Saugor Madhya Pradesh - 470002 | &copy; {currentYear}{' '}
    <a 
      href="https://www.thehappyjourneyy.com" 
      target="_blank" 
      rel="noopener noreferrer" 
      className="text-blue-400 hover:text-blue-300 transition-colors duration-200"
    >
      www.thehappyjourneyy.com
    </a>{' '}
    | All Rights Reserved. The Chintoo's Restaurant
  </p>
</div>
      </div>
    </footer>
  );
});

export default Footer;