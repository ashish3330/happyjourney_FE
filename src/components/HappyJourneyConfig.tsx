import {
  FaTrain,
  FaUtensils,
  FaShieldAlt,
  FaMapMarkerAlt,
  FaShoppingCart,
  FaUser,
  FaThumbsUp,
  FaUsers
} from 'react-icons/fa';

export const HappyJourneyConfig = {
  brandName: 'Happy Journey',
  tagline: 'Delicious Meals, Delivered Onboard',
  heroDescription:
    'Enjoy fresh, hygienic meals delivered right to your doorstep. With Happy Journey, your trip becomes tastier, safer, and more convenient — making every mile memorable.',
  heroImage: 'https://images.unsplash.com/photo-1516108317508-a8a590b68d3e?auto=format&fit=crop&w=1200&q=80',
  benefits: [
    {
      icon: <FaTrain className="w-6 h-6 text-teal-600 mr-2" />,
      title: 'Serving Pan-India',
      description: 'We deliver food at 500+ cities across India — anytime, anywhere, while you travel.',
      highlights: [
        'Covers all 17 City',
        'Track your order live via GPS',
        'Support in multiple Indian languages',
        'Get food delivered in under 30 minutes',
      ],
      color: 'bg-teal-50',
    },
    {
      icon: <FaUtensils className="w-6 h-6 text-teal-600 mr-2" />,
      title: 'Top-Rated Restaurants',
      description: 'Choose from 1000+ FSSAI-approved partners offering tasty and diverse meal options.',
      highlights: [
        'Trusted restaurant partners',
        'Special meals: Jain, vegan, gluten-free',
        'Chef-curated menus updated daily',
        'Fresh, quality ingredients only',
      ],
      color: 'bg-teal-50',
    },
    {
      icon: <FaShieldAlt className="w-6 h-6 text-teal-600 mr-2" />,
      title: 'Safety You Can Trust',
      description: 'All meals come with sealed, hygienic packaging and are delivered by trained staff.',
      highlights: [
        'Contactless deliveries',
        'Temperature-safe packaging',
        'FSSAI-certified kitchens',
        'Regular health checks for delivery team',
      ],
      color: 'bg-teal-50',
    },
  ],
  steps: [
    {
      icon: <FaMapMarkerAlt className="w-6 h-6 text-teal-600 mr-2" />,
      title: 'Choose Your City',
      description: 'Pick your boarding city and explore restaurants and meals available for your route.',
      highlights: [
        'Search by city name or code',
        'Photos and reviews of every dish',
        'Filter by cuisine or dietary needs',
      ],
      step: '1',
    },
    {
      icon: <FaShoppingCart className="w-6 h-6 text-teal-600 mr-2" />,
      title: 'Place Your Order',
      description: 'Customize your meal and place your order with just a few clicks.',
      highlights: [
        'Mention dietary preferences (e.g., Jain, vegan)',
        'Add drinks, snacks, or extras',
        'Review and confirm before checkout',
      ],
      step: '2',
    },
    {
      icon: <FaUser className="w-6 h-6 text-teal-600 mr-2" />,
      title: 'Enjoy Onboard Delivery',
      description: 'Sit back and relax — your meal will be delivered hot and fresh to your doorstep.',
      highlights: [
        'Live tracking from kitchen your doorstep',
        'Safe and hygienic handover',
        '24/7 support if you need help',
      ],
      step: '3',
    },
  ],
  groupTravel: {
    title: 'Delicious Group Meals, Hassle-Free',
    description:
      'Traveling with family, friends, or a tour group? We offer discounted bulk orders and smooth coordination to make group dining easier than ever.',
    highlights: [
      { icon: <FaThumbsUp className="w-6 h-6 text-teal-600 mr-3" />, text: '15% off on orders of 10+ meals' },
      { icon: <FaUsers className="w-6 h-6 text-teal-600 mr-3" />, text: 'Dedicated group order coordinator' },
      { icon: <FaUser className="w-6 h-6 text-teal-600 mr-3" />, text: 'Custom menus for your group’s needs' },
    ],
    image: 'https://images.unsplash.com/photo-1414235077428-338989a2e8c0?auto=format&fit=crop&w=800&q=80',
  },
  testimonials: [
    {
      quote: 'Happy Journey made our trip so much better! Fresh, hot food delivered right to our seat.',
      author: 'Rajesh K.',
      role: 'Frequent Customer',
      rating: 5,
    },
    {
      quote: 'Great experience during my business trips — always clean, always on time.',
      author: 'Priya M.',
      role: 'Corporate Customer',
      rating: 5,
    },
    {
      quote: 'Our group of 50 people was served perfectly! Highly recommended for group travel.',
      author: 'Amit S.',
      role: 'Tour Organizer',
      rating: 5,
    },
  ],
};