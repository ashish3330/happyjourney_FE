import { useState, useEffect, useRef, useCallback } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { Star, Clock, Leaf, Utensils, Trash2, Plus, Minus, ShoppingCart, Search } from "lucide-react";
import { debounce } from "lodash";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";
import api from "@/utils/axios";
import { useAuth } from "@/contexts/AuthContext";

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL;

interface Vendor {
  vendorId: number;
  businessName: string;
  description: string;
  logoUrl: string;
  preparationTimeMin: number;
  rating: number;
  veg: boolean;
  stationId?: number;
}

interface Category {
  categoryId: number;
  categoryName: string;
  vendorId: number;
  displayOrder: number;
}

interface MenuItem {
  itemId: number;
  itemName: string;
  basePrice: number;
  description: string;
  categoryId: number;
  categoryName?: string;
  vendorId: number;
  vegetarian: boolean;
  available: boolean;
}

interface CartItem {
  itemId: number;
  quantity: number;
  unitPrice: number;
  itemName?: string;
  specialInstructions?: string;
}

interface CartSummary {
  cartId: string;
  customerId: number | null;
  items: CartItem[];
  subtotal: number;
  taxAmount: number;
  deliveryCharges: number;
  finalAmount: number;
}

const UserOrder: React.FC = () => {
  const { id: urlId } = useParams<{ id: string }>();
  const { accessToken } = useAuth();
  const navigate = useNavigate();
  const [vendor, setVendor] = useState<Vendor | null>(null);
  const [categories, setCategories] = useState<Category[]>([]);
  const [menuItems, setMenuItems] = useState<MenuItem[]>([]);
  const [filteredItems, setFilteredItems] = useState<MenuItem[]>([]);
  const [cartSummary, setCartSummary] = useState<CartSummary | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isClearCartOpen, setIsClearCartOpen] = useState(false);
  const [isAddingItem, setIsAddingItem] = useState<number | null>(null);
  const [quantities, setQuantities] = useState<{ [key: number]: number }>({});
  const [cartQuantities, setCartQuantities] = useState<{ [key: number]: number }>({});
  const [isCartExpanded, setIsCartExpanded] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const cartRef = useRef<HTMLDivElement>(null);

  const effectiveVendorId = Number(urlId);
  if (isNaN(effectiveVendorId)) {
    return (
      <div className="max-w-7xl mx-auto p-4">
        <div className="text-red-600 text-lg font-medium">
          Invalid vendor ID. Please go back and try again.
        </div>
      </div>
    );
  }

  const DOWNLOAD_ENDPOINT = API_BASE_URL + "/files/download";

  const getLogoUrl = (systemFileName: string) => {
    return `${DOWNLOAD_ENDPOINT}?systemFileName=${encodeURIComponent(systemFileName)}`;
  };

  const fetchData = useCallback(async () => {
    setIsLoading(true);
    setError(null);
    try {
      const vendorRes = await api.get(`/vendors/${effectiveVendorId}`);
      setVendor(vendorRes.data);

      const categoriesRes = await api.get(`/menu/vendors/${effectiveVendorId}/categories`);
      const fetchedCategories = categoriesRes.data.content || [];
      setCategories(fetchedCategories);

      const menuItemsRes = await api.get(`/menu/vendors/${effectiveVendorId}/items`);
      const itemsWithCategory = menuItemsRes.data.map((item: MenuItem) => ({
        ...item,
        categoryName: fetchedCategories.find((cat: Category) => cat.categoryId === item.categoryId)?.categoryName || "Uncategorized",
      }));
      setMenuItems(itemsWithCategory);
      setFilteredItems(itemsWithCategory);

      await fetchCartSummary();
    } catch (error: any) {
      console.error("Error fetching data:", error);
      setError(error.response?.data?.message || "Failed to load restaurant details. Please try again later.");
    } finally {
      setIsLoading(false);
    }
  }, [effectiveVendorId]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  const debouncedSearch = useCallback(
    debounce((query: string, items: MenuItem[]) => {
      if (!query.trim()) {
        setFilteredItems(items);
        return;
      }
      const lowerQuery = query.toLowerCase().trim();
      const filtered = items.filter(
        (item) =>
          (item.itemName && item.itemName.toLowerCase().includes(lowerQuery)) ||
          (item.description && item.description.toLowerCase().includes(lowerQuery))
      );
      setFilteredItems(filtered);
    }, 300),
    []
  );

  useEffect(() => {
    debouncedSearch(searchQuery, menuItems);
    return () => debouncedSearch.cancel();
  }, [searchQuery, menuItems, debouncedSearch]);

  const fetchCartSummary = async () => {
    try {
      const response = await api.get(`/cart/summary`, { params: { vendorId: effectiveVendorId } });
      const summary: CartSummary = response.data;
      const enrichedItems = summary.items.map((item) => ({
        ...item,
        itemName: menuItems.find((menuItem) => menuItem.itemId === item.itemId)?.itemName || "Unknown Item",
      }));
      setCartSummary({ ...summary, items: enrichedItems });

      const newCartQuantities = { ...cartQuantities };
      enrichedItems.forEach((item) => {
        newCartQuantities[item.itemId] = item.quantity;
      });
      setCartQuantities(newCartQuantities);
    } catch (error: any) {
      console.error("Error fetching cart summary:", error);
      setCartSummary(null);
    }
  };

  const addItemToCart = async (itemId: number, quantity: number) => {
    if (quantity < 1) return;

    if (!accessToken) {
      const returnUrl = `/order/${effectiveVendorId}?addItem=${itemId}&quantity=${quantity}`;
      navigate(`/login?returnTo=${encodeURIComponent(returnUrl)}`);
      return;
    }

    setIsAddingItem(itemId);
    try {
      const request = {
        itemId,
        vendorId: effectiveVendorId,
        quantity,
        specialInstructions: "",
        deliveryStationId: vendor?.stationId || null,
      };
      await api.post(`/cart/add-item`, request);
      await fetchCartSummary();
      setQuantities((prev) => ({ ...prev, [itemId]: 0 }));
    } catch (error: any) {
      console.error("Error adding item to cart:", error);
      setError(error.response?.data?.message || "Failed to add item to cart");
    } finally {
      setIsAddingItem(null);
    }
  };

  const updateCartItemQuantity = async (itemId: number, newQuantity: number) => {
    if (newQuantity < 0) return;
    const currentItem = cartSummary?.items.find((item) => item.itemId === itemId);
    if (!currentItem) return;
    const currentQuantity = currentItem.quantity;
    const delta = newQuantity - currentQuantity;
    if (delta === 0) return;
    setIsAddingItem(itemId);
    try {
      const request = {
        itemId,
        vendorId: effectiveVendorId,
        quantity: delta,
        specialInstructions: "",
        deliveryStationId: vendor?.stationId || null,
      };
      await api.post(`/cart/add-item`, request);
      await fetchCartSummary();
    } catch (error: any) {
      console.error("Error updating cart item quantity:", error);
      setError(error.response?.data?.message || "Failed to update item quantity");
    } finally {
      setIsAddingItem(null);
    }
  };

  const removeItemFromCart = async (itemId: number) => {
    try {
      await api.delete(`/cart/items/${itemId}`, { params: { vendorId: effectiveVendorId } });
      await fetchCartSummary();
      setCartQuantities((prev) => ({ ...prev, [itemId]: 0 }));
    } catch (error: any) {
      console.error("Error removing item from cart:", error);
      setError(error.response?.data?.message || "Failed to remove item from cart");
    }
  };

  const clearCart = async () => {
    try {
      await api.delete(`/cart`, { params: { vendorId: effectiveVendorId } });
      setCartSummary(null);
      setIsClearCartOpen(false);
      setIsCartExpanded(false);
      setCartQuantities({});
    } catch (error: any) {
      console.error("Error clearing cart:", error);
      setError(error.response?.data?.message || "Failed to clear cart");
    }
  };

  const handleQuantityChange = (itemId: number, value: string) => {
    const numValue = parseInt(value) || 0;
    if (numValue >= 0) {
      setQuantities((prev) => ({
        ...prev,
        [itemId]: numValue,
      }));
    }
  };

  const handleCartQuantityChange = (itemId: number, delta: number) => {
    setCartQuantities((prev) => {
      const current = prev[itemId] || 0;
      const newQuantity = Math.max(0, current + delta);
      return { ...prev, [itemId]: newQuantity };
    });
  };

  const handleClickOutside = (event: MouseEvent) => {
    if (cartRef.current && !cartRef.current.contains(event.target as Node)) {
      setIsCartExpanded(false);
    }
  };

  useEffect(() => {
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const sortedCategories = [...categories].sort((a, b) => (a.displayOrder || 0) - (b.displayOrder || 0));

  const handleCheckout = () => {
    if (!accessToken) {
      navigate(`/login?returnTo=/checkout/${effectiveVendorId}`);
    } else {
      navigate(`/checkout/${effectiveVendorId}`);
    }
  };

  const renderSkeletonLoader = () => (
    <div className="max-w-7xl mx-auto p-4 space-y-8">
      <div className="relative rounded-2xl overflow-hidden shadow-xl mb-8 h-64 bg-gray-200 animate-pulse"></div>
      <div className="space-y-6">
        <div className="flex justify-between items-center">
          <Skeleton className="h-8 w-48 rounded-lg" />
          <Skeleton className="h-10 w-64 rounded-lg" />
        </div>
        {[...Array(3)].map((_, i) => (
          <div key={i} className="space-y-4">
            <Skeleton className="h-6 w-56 rounded-lg" />
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
              {[...Array(3)].map((_, j) => (
                <div key={j} className="p-4 bg-gray-50 rounded-lg space-y-3">
                  <Skeleton className="h-5 w-3/4 rounded" />
                  <Skeleton className="h-4 w-full rounded" />
                  <Skeleton className="h-4 w-1/2 rounded" />
                  <div className="flex justify-between items-center pt-2">
                    <Skeleton className="h-8 w-24 rounded" />
                    <Skeleton className="h-10 w-28 rounded-lg" />
                  </div>
                </div>
              ))}
            </div>
          </div>
        ))}
      </div>
    </div>
  );

  if (isLoading) {
    return renderSkeletonLoader();
  }

  if (error || !vendor) {
    return (
      <div className="max-w-7xl mx-auto p-4">
        <div className="text-red-600 text-lg font-medium">
          {error || "Failed to load restaurant details. Please try again later."}
        </div>
        <Button
          className="mt-4 bg-blue-600 hover:bg-blue-700 text-white"
          onClick={() => window.location.reload()}
        >
          Retry
        </Button>
      </div>
    );
  }

  return (
    <div className="max-w-7xl mx-auto p-4 sm:p-6 lg:p-8">
      <div className="relative rounded-2xl overflow-hidden shadow-xl mb-8">
        <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/50 to-transparent"></div>
        <img
          src={vendor.logoUrl ? getLogoUrl(vendor.logoUrl) : "https://via.placeholder.com/1500x500"}
          alt={vendor.businessName}
          className="w-full h-64 sm:h-80 object-cover"
          onError={(e) => { e.currentTarget.src = "https://via.placeholder.com/1500x500"; }}
        />
        <div className="absolute bottom-0 left-0 p-6 sm:p-8 text-white">
          <h1 className="text-3xl sm:text-4xl font-bold">{vendor.businessName}</h1>
          <p className="text-sm sm:text-base mt-2 max-w-md">{vendor.description}</p>
          <div className="flex flex-wrap items-center mt-4 gap-3">
            <span className="flex items-center bg-white/20 px-3 py-1 rounded-full text-sm">
              <Star className="w-4 h-4 mr-1 text-yellow-400" />
              {vendor.rating}
            </span>
            <span className="flex items-center bg-white/20 px-3 py-1 rounded-full text-sm">
              <Clock className="w-4 h-4 mr-1" />
              {vendor.preparationTimeMin} min
            </span>
            {vendor.veg && (
              <span className="flex items-center bg-white/20 px-3 py-1 rounded-full text-sm">
                <Leaf className="w-4 h-4 mr-1 text-green-400" />
                Vegetarian
              </span>
            )}
          </div>
        </div>
      </div>

      <div className="relative mb-8">
        <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
          <Search className="h-5 w-5 text-gray-400" />
        </div>
        <Input
          type="text"
          placeholder="Search menu items..."
          className="pl-10 pr-4 py-6 text-base border-gray-300 focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
        />
      </div>

      <div className="relative flex flex-col lg:flex-row gap-8">
        <div className="flex-1 space-y-8">
          <h2 className="text-2xl sm:text-3xl font-bold text-gray-800 flex items-center">
            <Utensils className="w-6 h-6 mr-2 text-amber-500" />
            Menu
          </h2>

          {searchQuery && (
            <div className="mb-6">
              <h3 className="text-lg font-semibold text-gray-800 mb-4">
                Search Results for "{searchQuery}"
              </h3>
              {filteredItems.length > 0 ? (
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                  {filteredItems.map((item) => (
                    <div
                      key={item.itemId}
                      className="flex flex-col p-4 bg-white rounded-lg border border-gray-200 hover:border-amber-300 transition-colors shadow-sm hover:shadow-md"
                    >
                      <div className="flex-1">
                        <div className="flex justify-between items-start">
                          <h4 className="text-md font-medium text-gray-800">{item.itemName}</h4>
                          <span className="text-sm font-medium text-gray-800">₹{item.basePrice}</span>
                        </div>
                        <p className="text-sm text-gray-600 line-clamp-2 mt-1">{item.description}</p>
                        {item.vegetarian && (
                          <span className="inline-flex items-center mt-2 text-green-600 text-xs">
                            <Leaf className="w-3 h-3 mr-1" /> Vegetarian
                          </span>
                        )}
                      </div>
                      <div className="flex items-center gap-2 mt-4">
                        <div className="flex items-center border border-gray-300 rounded-lg overflow-hidden">
                          <button
                            className="p-2 text-gray-600 hover:bg-gray-100 disabled:opacity-50"
                            onClick={() => handleQuantityChange(item.itemId, String((quantities[item.itemId] || 0) - 1))}
                            disabled={(quantities[item.itemId] || 0) <= 0}
                          >
                            <Minus className="w-4 h-4" />
                          </button>
                          <input
                            type="number"
                            value={quantities[item.itemId] || 0}
                            onChange={(e) => handleQuantityChange(item.itemId, e.target.value)}
                            className="w-12 text-center border-x border-gray-300 focus:outline-none text-sm"
                            min="0"
                          />
                          <button
                            className="p-2 text-gray-600 hover:bg-gray-100"
                            onClick={() => handleQuantityChange(item.itemId, String((quantities[item.itemId] || 0) + 1))}
                          >
                            <Plus className="w-4 h-4" />
                          </button>
                        </div>
                        <Button
                          onClick={() => addItemToCart(item.itemId, quantities[item.itemId] || 1)}
                          className="flex-1 bg-blue-600 hover:bg-blue-700 text-white text-sm py-2"
                          disabled={isAddingItem === item.itemId || !item.available || (quantities[item.itemId] || 0) <= 0}
                        >
                          {isAddingItem === item.itemId ? (
                            <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                          ) : (
                            <span className="flex items-center justify-center">
                              <Plus className="w-4 h-4 mr-1" /> Add
                            </span>
                          )}
                        </Button>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="text-center py-8 bg-gray-50 rounded-lg">
                  <p className="text-gray-600">No items found matching your search.</p>
                </div>
              )}
            </div>
          )}

          {!searchQuery && sortedCategories.length > 0 ? (
            sortedCategories.map((category) => {
              const categoryItems = filteredItems.filter((item) => item.categoryId === category.categoryId);
              if (categoryItems.length === 0) return null;

              return (
                <div key={category.categoryId} className="space-y-4">
                  <h3 className="text-xl font-semibold text-gray-800 border-b pb-2">{category.categoryName}</h3>
                  <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                    {categoryItems.map((item) => (
                      <div
                        key={item.itemId}
                        className="flex flex-col p-4 bg-white rounded-lg border border-gray-200 hover:border-amber-300 transition-colors shadow-sm hover:shadow-md"
                      >
                        <div className="flex-1">
                          <div className="flex justify-between items-start">
                            <h4 className="text-md font-medium text-gray-800">{item.itemName}</h4>
                            <span className="text-sm font-medium text-gray-800">₹{item.basePrice}</span>
                          </div>
                          <p className="text-sm text-gray-600 line-clamp-2 mt-1">{item.description}</p>
                          {item.vegetarian && (
                            <span className="inline-flex items-center mt-2 text-green-600 text-xs">
                              <Leaf className="w-3 h-3 mr-1" /> Vegetarian
                            </span>
                          )}
                        </div>
                        <div className="flex items-center gap-2 mt-4">
                          <div className="flex items-center border border-gray-300 rounded-lg overflow-hidden">
                            <button
                              className="p-2 text-gray-600 hover:bg-gray-100 disabled:opacity-50"
                              onClick={() => handleQuantityChange(item.itemId, String((quantities[item.itemId] || 0) - 1))}
                              disabled={(quantities[item.itemId] || 0) <= 0}
                            >
                              <Minus className="w-4 h-4" />
                            </button>
                            <input
                              type="number"
                              value={quantities[item.itemId] || 0}
                              onChange={(e) => handleQuantityChange(item.itemId, e.target.value)}
                              className="w-12 text-center border-x border-gray-300 focus:outline-none text-sm"
                              min="0"
                            />
                            <button
                              className="p-2 text-gray-600 hover:bg-gray-100"
                              onClick={() => handleQuantityChange(item.itemId, String((quantities[item.itemId] || 0) + 1))}
                            >
                              <Plus className="w-4 h-4" />
                            </button>
                          </div>
                          <Button
                            onClick={() => addItemToCart(item.itemId, quantities[item.itemId] || 1)}
                            className="flex-1 bg-blue-600 hover:bg-blue-700 text-white text-sm py-2"
                            disabled={isAddingItem === item.itemId || !item.available || (quantities[item.itemId] || 0) <= 0}
                          >
                            {isAddingItem === item.itemId ? (
                              <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                            ) : (
                              <span className="flex items-center justify-center">
                                <Plus className="w-4 h-4 mr-1" /> Add
                              </span>
                            )}
                          </Button>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              );
            })
          ) : (
            !searchQuery && (
              <div className="flex flex-col items-center justify-center p-8 bg-white rounded-xl shadow-md border border-dashed border-gray-300">
                <h3 className="text-lg font-medium text-gray-700">No Categories Found</h3>
                <p className="text-gray-600 mt-1">No categories available for this restaurant.</p>
              </div>
            )
          )}
        </div>
      </div>

      {cartSummary?.items.length ? (
        <>
          <div className="fixed bottom-4 right-4 lg:hidden z-50">
            <Button
              className="bg-blue-600 hover:bg-blue-700 h-14 w-14 rounded-full shadow-lg relative transition-transform hover:scale-105"
              onClick={() => setIsCartExpanded(true)}
            >
              <ShoppingCart className="w-6 h-6 text-white" />
              <span className="absolute -top-1 -right-1 bg-red-500 text-white text-xs rounded-full w-5 h-5 flex items-center justify-center">
                {cartSummary.items.reduce((sum, item) => sum + item.quantity, 0)}
              </span>
            </Button>
          </div>

          <div className="hidden lg:block mt-8">
            <div className="bg-white rounded-xl shadow-lg border border-gray-200 p-6 sticky top-8">
              <h3 className="text-lg font-semibold text-gray-800 mb-4">Your Order</h3>
              <div className="space-y-3 mb-4 max-h-96 overflow-y-auto">
                {cartSummary.items.map((item) => (
                  <div key={item.itemId} className="flex justify-between items-center p-3 bg-gray-50 rounded-lg">
                    <div className="flex-1">
                      <p className="text-sm font-medium text-gray-800">{item.itemName}</p>
                      <p className="text-xs text-gray-600">₹{item.unitPrice} × {cartQuantities[item.itemId] || item.quantity}</p>
                    </div>
                    <div className="flex items-center gap-2">
                      <div className="flex items-center border border-gray-300 rounded-lg">
                        <button
                          className="p-2 text-gray-600 hover:bg-gray-100 disabled:opacity-50"
                          onClick={() => handleCartQuantityChange(item.itemId, -1)}
                          disabled={isAddingItem === item.itemId || (cartQuantities[item.itemId] || item.quantity) <= 1}
                        >
                          <Minus className="w-4 h-4" />
                        </button>
                        <span className="w-12 text-center text-sm">{cartQuantities[item.itemId] || item.quantity}</span>
                        <button
                          className="p-2 text-gray-600 hover:bg-gray-100 disabled:opacity-50"
                          onClick={() => handleCartQuantityChange(item.itemId, 1)}
                          disabled={isAddingItem === item.itemId}
                        >
                          <Plus className="w-4 h-4" />
                        </button>
                      </div>
                      <Button
                        onClick={() => updateCartItemQuantity(item.itemId, cartQuantities[item.itemId] || item.quantity)}
                        className="bg-blue-600 hover:bg-blue-700 text-white text-sm py-2 px-3"
                        disabled={isAddingItem === item.itemId || (cartQuantities[item.itemId] === item.quantity)}
                      >
                        {isAddingItem === item.itemId ? (
                          <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                        ) : (
                          "Update"
                        )}
                      </Button>
                      <p className="text-sm font-medium text-gray-800 min-w-[60px] text-right">
                        ₹{(item.unitPrice * (cartQuantities[item.itemId] || item.quantity)).toFixed(2)}
                      </p>
                      <Button
                        variant="ghost"
                        size="sm"
                        className="text-red-600 hover:bg-red-50 p-2"
                        onClick={() => removeItemFromCart(item.itemId)}
                        disabled={isAddingItem === item.itemId}
                      >
                        <Trash2 className="w-4 h-4" />
                      </Button>
                    </div>
                  </div>
                ))}
              </div>
              <div className="border-t border-gray-200 pt-4 space-y-2">
                <div className="flex justify-between text-sm text-gray-700">
                  <span>Subtotal</span>
                  <span>₹{cartSummary.subtotal.toFixed(2)}</span>
                </div>
                <div className="flex justify-between text-sm text-gray-700">
                  <span>Tax</span>
                  <span>₹{cartSummary.taxAmount.toFixed(2)}</span>
                </div>
                <div className="flex justify-between text-sm text-gray-700">
                  <span>Delivery</span>
                  <span>₹{cartSummary.deliveryCharges.toFixed(2)}</span>
                </div>
                <div className="flex justify-between text-base font-bold text-gray-800 pt-2">
                  <span>Total</span>
                  <span>₹{cartSummary.finalAmount.toFixed(2)}</span>
                </div>
              </div>
              <div className="flex gap-3 mt-6">
                <Button
                  variant="outline"
                  className="flex-1 border-gray-300 text-gray-700 hover:bg-gray-50 hover:text-gray-900"
                  onClick={() => setIsClearCartOpen(true)}
                >
                  Clear
                </Button>
                <Button
                  className="flex-1 bg-green-600 hover:bg-green-700 text-white"
                  onClick={handleCheckout}
                >
                  Checkout
                </Button>
              </div>
            </div>
          </div>

          {isCartExpanded && (
            <div className="fixed inset-0 z-50 lg:hidden">
              <div
                className="absolute inset-0 bg-black bg-opacity-50 transition-opacity duration-300"
                onClick={() => setIsCartExpanded(false)}
              ></div>
              <div
                ref={cartRef}
                className="absolute bottom-0 w-full bg-white rounded-t-3xl shadow-2xl p-6 max-h-[70vh] overflow-y-auto transform transition-transform duration-300 ease-in-out"
              >
                <div className="flex justify-center mb-4">
                  <div className="w-12 h-1.5 bg-gray-300 rounded-full" />
                </div>
                <div className="flex justify-between items-center mb-4">
                  <h3 className="text-xl font-bold text-gray-800">Your Order</h3>
                  <button
                    onClick={() => setIsCartExpanded(false)}
                    className="text-gray-500 hover:text-gray-700"
                  >
                    <svg
                      xmlns="http://www.w3.org/2000/svg"
                      className="h-6 w-6"
                      fill="none"
                      viewBox="0 0 24 24"
                      stroke="currentColor"
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={2}
                        d="M6 18L18 6M6 6l12 12"
                      />
                    </svg>
                  </button>
                </div>
                <div className="space-y-3 mb-4">
                  {cartSummary.items.map((item) => (
                    <div key={item.itemId} className="flex justify-between items-center p-3 bg-gray-50 rounded-lg">
                      <div className="flex-1">
                        <p className="text-sm font-medium text-gray-800">{item.itemName}</p>
                        <p className="text-xs text-gray-600">₹{item.unitPrice} × {cartQuantities[item.itemId] || item.quantity}</p>
                      </div>
                      <div className="flex items-center gap-2">
                        <div className="flex items-center border border-gray-300 rounded-lg">
                          <button
                            className="p-2 text-gray-600 hover:bg-gray-100 disabled:opacity-50"
                            onClick={() => handleCartQuantityChange(item.itemId, -1)}
                            disabled={isAddingItem === item.itemId || (cartQuantities[item.itemId] || item.quantity) <= 1}
                          >
                            <Minus className="w-4 h-4" />
                          </button>
                          <span className="w-12 text-center text-sm">{cartQuantities[item.itemId] || item.quantity}</span>
                          <button
                            className="p-2 text-gray-600 hover:bg-gray-100 disabled:opacity-50"
                            onClick={() => handleCartQuantityChange(item.itemId, 1)}
                            disabled={isAddingItem === item.itemId}
                          >
                            <Plus className="w-4 h-4" />
                          </button>
                        </div>
                        <Button
                          onClick={() => updateCartItemQuantity(item.itemId, cartQuantities[item.itemId] || item.quantity)}
                          className="bg-blue-600 hover:bg-blue-700 text-white text-sm py-2 px-3"
                          disabled={isAddingItem === item.itemId || (cartQuantities[item.itemId] === item.quantity)}
                        >
                          {isAddingItem === item.itemId ? (
                            <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                          ) : (
                            "Update"
                          )}
                        </Button>
                        <p className="text-sm font-medium text-gray-800 min-w-[60px] text-right">
                          ₹{(item.unitPrice * (cartQuantities[item.itemId] || item.quantity)).toFixed(2)}
                        </p>
                        <Button
                          variant="ghost"
                          size="sm"
                          className="text-red-600 hover:bg-red-50 p-2"
                          onClick={() => removeItemFromCart(item.itemId)}
                          disabled={isAddingItem === item.itemId}
                        >
                          <Trash2 className="w-4 h-4" />
                        </Button>
                      </div>
                    </div>
                  ))}
                </div>
                <div className="border-t border-gray-200 pt-4 space-y-2">
                  <div className="flex justify-between text-sm text-gray-700">
                    <span>Subtotal</span>
                    <span>₹{cartSummary.subtotal.toFixed(2)}</span>
                  </div>
                  <div className="flex justify-between text-sm text-gray-700">
                    <span>Tax</span>
                    <span>₹{cartSummary.taxAmount.toFixed(2)}</span>
                  </div>
                  <div className="flex justify-between text-sm text-gray-700">
                    <span>Delivery</span>
                    <span>₹{cartSummary.deliveryCharges.toFixed(2)}</span>
                  </div>
                  <div className="flex justify-between text-base font-bold text-gray-800 pt-2">
                    <span>Total</span>
                    <span>₹{cartSummary.finalAmount.toFixed(2)}</span>
                  </div>
                </div>
                <div className="flex gap-3 mt-6">
                  <Button
                    variant="outline"
                    className="flex-1 border-gray-300 text-gray-700 hover:bg-gray-50 hover:text-gray-900"
                    onClick={() => setIsClearCartOpen(true)}
                  >
                    Clear
                  </Button>
                  <Button
                    className="flex-1 bg-green-600 hover:bg-green-700 text-white"
                    onClick={handleCheckout}
                  >
                    Checkout
                  </Button>
                </div>
              </div>
            </div>
          )}
        </>
      ) : null}

      <Dialog open={isClearCartOpen} onOpenChange={setIsClearCartOpen}>
        <DialogContent className="sm:max-w-[425px]">
          <DialogHeader>
            <DialogTitle className="text-lg font-semibold">Clear Cart</DialogTitle>
          </DialogHeader>
          <p className="text-gray-600">Are you sure you want to clear all items from your cart?</p>
          <DialogFooter>
            <Button
              variant="outline"
              className="border-gray-300 text-gray-700 hover:bg-gray-50 hover:text-gray-900"
              onClick={() => setIsClearCartOpen(false)}
            >
              Cancel
            </Button>
            <Button
              onClick={clearCart}
              className="bg-red-600 hover:bg-red-700 text-white"
            >
              Clear Cart
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default UserOrder;