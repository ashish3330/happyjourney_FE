import React from 'react';
import Footer from './Footer';

// Brand-specific configurations
const relswadConfig = {
  brandName: 'Relswad',
  description: 'Train Food Delivery Redefined. Enjoy delicious meals on your journey with Relswad.',
  socialMedia: {
    facebook: 'https://facebook.com/relswad', // Placeholder, replace with actual
    twitter: 'https://twitter.com/relswad',
    instagram: 'https://instagram.com/relswad',
  },
};

const happyJourneyConfig = {
  brandName: 'HappyJourney',
  description: 'Savor the Journey. Delicious train meals delivered with HappyJourney.',
  socialMedia: {
    facebook: 'https://facebook.com/happyjourney', // Placeholder, replace with actual
    twitter: 'https://twitter.com/happyjourney',
    instagram: 'https://instagram.com/happyjourney',
  },
};

const bhCateringConfig = {
  brandName: 'BHCatering',
  description: 'Taste the Difference. Premium train dining with BHCatering.',
  socialMedia: {
    facebook: 'https://facebook.com/bhcatering', // Placeholder, replace with actual
    twitter: 'https://twitter.com/bhcatering',
    instagram: 'https://instagram.com/bhcatering',
  },
};

const swadExpressConfig = {
  brandName: 'SwadExpress',
  description: 'Fast. Fresh. Flavorful. Train meals delivered by SwadExpress.',
  socialMedia: {
    facebook: 'https://facebook.com/swadexpress', // Placeholder, replace with actual
    twitter: 'https://twitter.com/swadexpress',
    instagram: 'https://instagram.com/swadexpress',
  },
};

// Individual Footer Components
export const RelswadFooter: React.FC = () => <Footer config={relswadConfig} />;
export const HappyJourneyFooter: React.FC = () => <Footer config={happyJourneyConfig} />;
export const BHCateringFooter: React.FC = () => <Footer config={bhCateringConfig} />;
export const SwadExpressFooter: React.FC = () => <Footer config={swadExpressConfig} />;