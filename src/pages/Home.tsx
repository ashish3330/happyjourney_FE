// import { useState } from "react";
// import { Search, Star, MapPin, Clock, Utensils } from "lucide-react";
// // import { Button } from "@/components/ui/button";
// // import { Input } from "@/components/ui/input";
// // import { Card, CardContent } from "@/components/ui/card";
// // import { Badge } from "@/components/ui/badge";

// export default function Component() {
//   const [searchQuery, setSearchQuery] = useState("");

//   const offers = [
//     { discount: "20%", code: "SAVE20" },
//     { discount: "30%", code: "SAVE30" },
//     { discount: "15%", code: "FIRST15" },
//     { discount: "25%", code: "WEEKEND25" },
//     { discount: "40%", code: "MEGA40" },
//     { discount: "35%", code: "SUPER35" },
//   ];

//   const categories = [
//     "SOUTH INDIAN",
//     "ITALIAN",
//     "INDIAN",
//     "CHINESE",
//     "SOUTH INDIAN",
//     "ITALIAN",
//     "INDIAN",
//   ];

//   const restaurants = [
//     {
//       name: "Spice Garden",
//       rating: 4.5,
//       cuisine: "Indian",
//       time: "30-45 min",
//       image: "/placeholder.svg?height=200&width=300",
//     },
//     {
//       name: "Pizza Corner",
//       rating: 4.2,
//       cuisine: "Italian",
//       time: "25-35 min",
//       image: "/placeholder.svg?height=200&width=300",
//     },
//     {
//       name: "Dragon Palace",
//       rating: 4.7,
//       cuisine: "Chinese",
//       time: "35-50 min",
//       image: "/placeholder.svg?height=200&width=300",
//     },
//     {
//       name: "Burger Hub",
//       rating: 4.3,
//       cuisine: "Fast Food",
//       time: "20-30 min",
//       image: "/placeholder.svg?height=200&width=300",
//     },
//     {
//       name: "Sushi Master",
//       rating: 4.6,
//       cuisine: "Japanese",
//       time: "40-55 min",
//       image: "/placeholder.svg?height=200&width=300",
//     },
//     {
//       name: "Taco Fiesta",
//       rating: 4.4,
//       cuisine: "Mexican",
//       time: "25-40 min",
//       image: "/placeholder.svg?height=200&width=300",
//     },
//     {
//       name: "Pasta Paradise",
//       rating: 4.1,
//       cuisine: "Italian",
//       time: "30-45 min",
//       image: "/placeholder.svg?height=200&width=300",
//     },
//     {
//       name: "Curry House",
//       rating: 4.8,
//       cuisine: "Indian",
//       time: "35-50 min",
//       image: "/placeholder.svg?height=200&width=300",
//     },
//   ];

//   const cities = [
//     "KOLHAPUR",
//     "BELGAUM",
//     "SOLAPUR",
//     "SANGLI",
//     "SATARA",
//     "PUNE",
//     "CHITRADURGA",
//     "SURAT",
//     "JALGAON",
//     "BEED",
//     "PUNE",
//     "GULBARGA",
//     "BIDAR",
//     "SHOLAPUR",
//     "AHMEDNAGAR",
//     "LATUR",
//     "OSMANABAD",
//     "NANDED",
//     "HINGOLI",
//     "PARBHANI",
//     "JALNA",
//     "AURANGABAD",
//     "NASHIK",
//     "DHULE",
//     "NANDURBAR",
//     "JALGAON",
//     "BULDHANA",
//     "AKOLA",
//     "WASHIM",
//     "AMRAVATI",
//     "WARDHA",
//     "NAGPUR",
//     "BHANDARA",
//     "GONDIA",
//     "CHANDRAPUR",
//     "GADCHIROLI",
//     "YAVATMAL",
//     "THANE",
//     "MUMBAI",
//     "RAIGAD",
//     "RATNAGIRI",
//     "SINDHUDURG",
//     "KOLHAPUR",
//     "SANGLI",
//     "SATARA",
//     "SOLAPUR",
//     "PUNE",
//     "AHMEDNAGAR",
//   ];

//   return (
//     <div className="min-h-screen bg-gray-50">
//       {/* Header */}
//       <header className="bg-white shadow-sm border-b">
//         <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
//           <div className="flex items-center justify-between h-16">
//             <div className="flex items-center space-x-2">
//               <Utensils className="h-8 w-8 text-teal-500" />
//               <span className="text-xl font-bold text-gray-900">FoodHub</span>
//             </div>
//             <nav className="hidden md:flex space-x-8">
//               <a
//                 href="#"
//                 className="text-gray-700 hover:text-teal-500 font-medium"
//               >
//                 Home
//               </a>
//               <a
//                 href="#"
//                 className="text-gray-700 hover:text-teal-500 font-medium"
//               >
//                 Restaurants
//               </a>
//               <a
//                 href="#"
//                 className="text-gray-700 hover:text-teal-500 font-medium"
//               >
//                 About
//               </a>
//               <a
//                 href="#"
//                 className="text-gray-700 hover:text-teal-500 font-medium"
//               >
//                 Contact
//               </a>
//             </nav>
//           </div>
//         </div>
//       </header>

//       {/* Hero Section */}
//       <section className="relative bg-gradient-to-r from-teal-400 to-red-500 py-16 lg:py-24">
//         <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
//           <div className="grid lg:grid-cols-2 gap-8 items-center">
//             <div className="text-white">
//               <h1 className="text-3xl md:text-4xl lg:text-5xl font-bold mb-4">
//                 Find Awesome Deals on Food
//               </h1>
//               <p className="text-lg md:text-xl mb-8 opacity-90">
//                 Order your favorite meals online and get them delivered to your
//                 doorstep
//               </p>

//               {/* Search Bar */}
//               <div className="flex flex-col sm:flex-row gap-4 mb-8">
//                 <div className="relative flex-1">
//                   <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-5 w-5" />
//                   <Input
//                     type="text"
//                     placeholder="Search for restaurants, cuisines..."
//                     value={searchQuery}
//                     onChange={(e) => setSearchQuery(e.target.value)}
//                     className="pl-10 h-12 text-gray-900"
//                   />
//                 </div>
//                 <Button
//                   size="lg"
//                   className="bg-white text-teal-500 hover:bg-gray-100 h-12 px-8"
//                 >
//                   Search
//                 </Button>
//               </div>

//               <p className="text-sm opacity-80">Available Offers Right Now</p>
//             </div>

//             <div className="relative">
//               <div className="bg-white rounded-lg p-6 shadow-xl">
//                 <div className="flex items-center justify-between mb-4">
//                   <Badge className="bg-green-500 text-white">
//                     Special Offer
//                   </Badge>
//                   <span className="text-2xl font-bold text-teal-500">
//                     20% OFF
//                   </span>
//                 </div>
//                 <h3 className="text-lg font-semibold text-gray-900 mb-2">
//                   Get 20% Off From Special Junk Food
//                 </h3>
//                 <p className="text-gray-600 text-sm mb-4">
//                   Order now and save on your favorite fast food items
//                 </p>
//                 <Button className="w-full bg-teal-500 hover:bg-teal-700">
//                   Order Now
//                 </Button>
//               </div>
//             </div>
//           </div>
//         </div>
//       </section>

//       {/* Available Offers */}
//       <section className="py-12 bg-white">
//         <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
//           <h2 className="text-2xl font-bold text-gray-900 mb-8">
//             Available Offers Right Now
//           </h2>
//           <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4">
//             {offers.map((offer, index) => (
//               <Card
//                 key={index}
//                 className="text-center hover:shadow-lg transition-shadow cursor-pointer"
//               >
//                 <CardContent className="p-6">
//                   <div className="text-3xl font-bold text-teal-500 mb-2">
//                     {offer.discount}
//                   </div>
//                   <div className="text-sm text-gray-600">OFF</div>
//                   <div className="text-xs text-gray-500 mt-2">
//                     Code: {offer.code}
//                   </div>
//                 </CardContent>
//               </Card>
//             ))}
//           </div>
//         </div>
//       </section>

//       {/* Browse By Category */}
//       <section className="py-12 bg-gray-50">
//         <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
//           <h2 className="text-2xl font-bold text-gray-900 mb-8">
//             Browse By Category
//           </h2>
//           <div className="flex flex-wrap gap-4 justify-center lg:justify-start">
//             {categories.map((category, index) => (
//               <Button
//                 key={index}
//                 variant="outline"
//                 className="hover:bg-teal-500 hover:text-white hover:border-teal-500 transition-colors"
//               >
//                 {category}
//               </Button>
//             ))}
//           </div>
//         </div>
//       </section>

//       {/* Best Rated Restaurants */}
//       <section className="py-12 bg-white">
//         <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
//           <h2 className="text-2xl font-bold text-gray-900 mb-8">
//             Best Rated Restaurant
//           </h2>
//           <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
//             {restaurants.map((restaurant, index) => (
//               <Card
//                 key={index}
//                 className="overflow-hidden hover:shadow-lg transition-shadow cursor-pointer"
//               >
//                 <div className="aspect-video bg-gray-200 relative">
//                   <img
//                     src={restaurant.image || "/placeholder.svg"}
//                     alt={restaurant.name}
//                     className="w-full h-full object-cover"
//                   />
//                   <Badge className="absolute top-2 right-2 bg-green-500">
//                     <Star className="h-3 w-3 mr-1" />
//                     {restaurant.rating}
//                   </Badge>
//                 </div>
//                 <CardContent className="p-4">
//                   <h3 className="font-semibold text-gray-900 mb-1">
//                     {restaurant.name}
//                   </h3>
//                   <p className="text-sm text-gray-600 mb-2">
//                     {restaurant.cuisine}
//                   </p>
//                   <div className="flex items-center text-sm text-gray-500">
//                     <Clock className="h-4 w-4 mr-1" />
//                     {restaurant.time}
//                   </div>
//                 </CardContent>
//               </Card>
//             ))}
//           </div>
//         </div>
//       </section>

//       {/* Cities Section */}
//       <section className="py-12 bg-gray-50">
//         <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
//           <h2 className="text-2xl font-bold text-gray-900 mb-8">
//             Find us in these cities and many more!
//           </h2>
//           <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 xl:grid-cols-8 gap-4">
//             {cities.map((city, index) => (
//               <Card
//                 key={index}
//                 className="text-center hover:shadow-md transition-shadow cursor-pointer"
//               >
//                 <CardContent className="p-4">
//                   <div className="aspect-square bg-gray-200 rounded-lg mb-3 flex items-center justify-center">
//                     <MapPin className="h-8 w-8 text-gray-400" />
//                   </div>
//                   <p className="text-sm font-medium text-gray-900">{city}</p>
//                 </CardContent>
//               </Card>
//             ))}
//           </div>
//         </div>
//       </section>

//       {/* Footer */}
//       <footer className="bg-gray-900 text-white py-12">
//         <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
//           <div className="grid grid-cols-1 md:grid-cols-4 gap-8">
//             <div>
//               <div className="flex items-center space-x-2 mb-4">
//                 <Utensils className="h-8 w-8 text-teal-500" />
//                 <span className="text-xl font-bold">FoodHub</span>
//               </div>
//               <p className="text-gray-400">
//                 Your favorite food delivery platform. Order from the best
//                 restaurants near you.
//               </p>
//             </div>
//             <div>
//               <h3 className="font-semibold mb-4">Company</h3>
//               <ul className="space-y-2 text-gray-400">
//                 <li>
//                   <a href="#" className="hover:text-white">
//                     About Us
//                   </a>
//                 </li>
//                 <li>
//                   <a href="#" className="hover:text-white">
//                     Careers
//                   </a>
//                 </li>
//                 <li>
//                   <a href="#" className="hover:text-white">
//                     Contact
//                   </a>
//                 </li>
//               </ul>
//             </div>
//             <div>
//               <h3 className="font-semibold mb-4">Support</h3>
//               <ul className="space-y-2 text-gray-400">
//                 <li>
//                   <a href="#" className="hover:text-white">
//                     Help Center
//                   </a>
//                 </li>
//                 <li>
//                   <a href="#" className="hover:text-white">
//                     Safety
//                   </a>
//                 </li>
//                 <li>
//                   <a href="#" className="hover:text-white">
//                     Terms
//                   </a>
//                 </li>
//               </ul>
//             </div>
//             <div>
//               <h3 className="font-semibold mb-4">Connect</h3>
//               <ul className="space-y-2 text-gray-400">
//                 <li>
//                   <a href="#" className="hover:text-white">
//                     Facebook
//                   </a>
//                 </li>
//                 <li>
//                   <a href="#" className="hover:text-white">
//                     Twitter
//                   </a>
//                 </li>
//                 <li>
//                   <a href="#" className="hover:text-white">
//                     Instagram
//                   </a>
//                 </li>
//               </ul>
//             </div>
//           </div>
//           <div className="border-t border-gray-800 mt-8 pt-8 text-center text-gray-400">
//             <p>&copy; 2024 FoodHub. All rights reserved.</p>
//           </div>
//         </div>
//       </footer>
//     </div>
//   );
// }


const Home = () => {
  return <div>Home</div>;
};

export default Home;
