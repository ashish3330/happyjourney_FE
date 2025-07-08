import { FaTrain, FaUtensils, FaShieldAlt, FaMapMarkerAlt, FaShoppingCart, FaUser, FaThumbsUp, FaUsers } from 'react-icons/fa';

export const HappyJourneyConfig = {
  brandName: 'HappyJourney',
  tagline: 'Savor Your Train Journey with Ease',
  heroDescription:
    'Experience delightful, hygienic meals delivered straight to your train seat. HappyJourney ensures every trip is filled with delicious moments, crafted for your comfort and satisfaction.',
  heroImage: 'https://images.unsplash.com/photo-1600585154340-be6161a56a0c?auto=format&fit=crop&w=1200&q=80',
  benefits: [
    {
      icon: <FaTrain className="w-6 h-4 text-indigo-600 mr-2" />,
      title: 'Pan-India Reach',
      description: 'Enjoy meal delivery at 600+ railway stations across India, available round-the-clock for your convenience.',
      highlights: [
        'Covering all major railway routes',
        'Live order tracking via app',
        'Support in multiple regional languages',
        'Swift delivery within 25 minutes',
      ],
      color: 'bg-indigo-50',
    },
    {
      icon: <FaUtensils className="w-6 h-4 text-orange-600 mr-2" />,
      title: 'Top-Tier Eateries',
      description: 'Relish cuisines from 1200+ FSSAI-approved restaurants, offering a variety of fresh and flavorful dishes.',
      highlights: [
        'Collaborations with premium dining brands',
        'Options for vegan, Jain, and keto diets',
        'Daily specials curated by expert chefs',
        'Ingredients sourced fresh daily',
      ],
      color: 'bg-orange-50',
    },
    {
      icon: <FaShieldAlt className="w-6 h-4 text-teal-600 mr-2" />,
      title: 'Trusted Hygiene',
      description: 'Dine worry-free with secure, tamper-evident packaging and verified delivery personnel.',
      highlights: [
        'Zero-contact delivery standards',
        'Food packed in temperature-safe containers',
        'Kitchens adhering to FSSAI guidelines',
        'Frequent health screenings for staff',
      ],
      color: 'bg-teal-50',
    },
  ],
  steps: [
    {
      icon: <FaMapMarkerAlt className="w-6 h-4 text-indigo-600 mr-2" />,
      title: 'Pick Your Station',
      description: 'Select your train station and explore a range of restaurant menus customized for your route.',
      highlights: [
        'Search by station name or code',
        'Browse dishes with photos and ratings',
        'Filter by cuisine or dietary preferences',
      ],
      step: '1',
    },
    {
      icon: <FaShoppingCart className="w-6 h-4 text-orange-600 mr-2" />,
      title: 'Personalize Your Meal',
      description: 'Customize your order to match your tastes for a truly satisfying dining experience.',
      highlights: [
        'Specify dietary needs (e.g., gluten-free, Jain)',
        'Add extras like drinks or sides',
        'Review your order before confirming',
      ],
      step: '2',
    },
    {
      icon: <FaUser className="w-6 h-4 text-teal-600 mr-2" />,
      title: 'Dine on Board',
      description: 'Get your meal delivered to your seat with live updates and top-notch service.',
      highlights: [
        'Real-time delivery tracking',
        'Hygienic, contactless handover',
        '24/7 support for any queries',
      ],
      step: '3',
    },
  ],
  groupTravel: {
    title: 'Group Trips, Tastier Together',
    description:
      'Make group travel memorable with bulk meal orders, special discounts, and hassle-free coordination for a joyful dining experience on the move.',
    highlights: [
      { icon: <FaThumbsUp className="w-6 h-4 text-orange-600 mr-3" />, text: '20% off on orders of 8+ meals' },
      { icon: <FaUsers className="w-6 h-4 text-teal-600 mr-3" />, text: 'Personalized group support' },
      { icon: <FaUser className="w-6 h-4 text-indigo-600 mr-3" />, text: 'Tailored menus for large groups' },
    ],
    image: 'https://images.unsplash.com/photo-1556911220-bff31c812dba?auto=format&fit=crop&w=800&q=80',
  },
  testimonials: [
    {
      quote: 'HappyJourney made our train trips unforgettable with fresh, timely meals delivered to our seats!',
      author: 'Sneha R.',
      role: 'Regular Commuter',
      rating: 5,
    },
    {
      quote: 'Reliable and hygienic—perfect for my frequent travels. Highly recommend HappyJourney!',
      author: 'Vikram T.',
      role: 'Business Traveler',
      rating: 5,
    },
    {
      quote: 'Seamless service for our 40-person group tour. HappyJourney is exceptional!',
      author: 'Neha P.',
      role: 'Tour Organizer',
      rating: 5,
    },
  ],
};