/* eslint-disable @typescript-eslint/no-explicit-any */
'use client';

import { useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { restaurantService, type Restaurant, type MenuByCategory } from '@/services/restaurants';
import { useCart } from '@/contexts/CartContext';
import { type CartItem } from '@/services/cart';
import DashboardLayout from '@/components/layouts/DashboardLayout';
import Image from 'next/image';
import {
  ArrowLeft,
  Clock,
  Star,
  MapPin,
  Phone,
  Mail,
  ShoppingCart,
  Plus,
  Minus,
  Search,
  X,
  ChevronDown,
  ChevronUp,
  IndianRupee,
} from 'lucide-react';
import { toast } from 'react-toastify';

export default function RestaurantDetailPage() {
  const params = useParams();
  const router = useRouter();
  const { addToCart, itemCount } = useCart();
  const [restaurant, setRestaurant] = useState<Restaurant | null>(null);
  const [menuByCategory, setMenuByCategory] = useState<MenuByCategory>({});
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [quantities, setQuantities] = useState<{ [key: string]: number }>({});
  const [expandedCategories, setExpandedCategories] = useState<{ [key: string]: boolean }>({});

  const restaurantId = params.id as string;

  useEffect(() => {
    if (restaurantId) {
      loadRestaurantDetails();
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [restaurantId]);

  const loadRestaurantDetails = async () => {
    setLoading(true);
    try {
      const [restaurantData, menu] = await Promise.all([
        restaurantService.getRestaurantById(restaurantId),
        restaurantService.getMenuItemsByCategory(restaurantId),
      ]);

      if (!restaurantData) {
        toast.error('Restaurant not found');
        router.push('/customer/dashboard');
        return;
      }

      setRestaurant(restaurantData);
      setMenuByCategory(menu);

      // Expand first category by default
      const categories = Object.keys(menu);
      if (categories.length > 0) {
        setExpandedCategories({ [categories[0]]: true });
      }
    } catch (error) {
      console.error('Failed to load restaurant details:', error);
      toast.error('Failed to load restaurant details');
    } finally {
      setLoading(false);
    }
  };
const handleAddToCart = (item: any) => {
  const quantity = quantities[item.id] || 1;

  const cartItem: CartItem = {
    id: item.id,
    merchant_id: restaurantId,
    name: item.name,
    price: item.price,
    quantity,
    image_url: item.image_url,
    is_veg: item.is_veg,
    category: item.category,
    discount_percentage: item.discount_percentage,
  };

  const success = addToCart(cartItem, restaurant?.business_name || 'Restaurant');

  if (!success) {
    toast.error(
      'You have items from another restaurant. Please clear your cart first.',
      {
        position: 'top-center',
        autoClose: 3000,
      }
    );
    return;
  }

  toast.success(`${item.name} added to cart!`, {
    position: 'bottom-center',
    autoClose: 2000,
  });

  setQuantities((prev) => ({ ...prev, [item.id]: 1 }));
};


  const updateQuantity = (itemId: string, delta: number) => {
    setQuantities((prev) => {
      const current = prev[itemId] || 1;
      const newValue = Math.max(1, Math.min(10, current + delta));
      return { ...prev, [itemId]: newValue };
    });
  };

  const toggleCategory = (category: string) => {
    setExpandedCategories((prev) => ({
      ...prev,
      [category]: !prev[category],
    }));
  };

  const filteredMenu = Object.entries(menuByCategory).reduce((acc, [category, items]) => {
    if (!searchQuery) {
      acc[category] = items;
      return acc;
    }

    const filtered = items.filter(
      (item) =>
        item.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        item.description?.toLowerCase().includes(searchQuery.toLowerCase())
    );

    if (filtered.length > 0) {
      acc[category] = filtered;
    }

    return acc;
  }, {} as MenuByCategory);

  if (loading) {
    return (
      <DashboardLayout>
        <div className="max-w-7xl mx-auto px-4 py-8">
          <div className="animate-pulse space-y-8">
            <div className="h-64 bg-gray-200 rounded-2xl" />
            <div className="h-32 bg-gray-200 rounded-xl" />
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {[...Array(6)].map((_, i) => (
                <div key={i} className="h-48 bg-gray-200 rounded-xl" />
              ))}
            </div>
          </div>
        </div>
      </DashboardLayout>
    );
  }

  if (!restaurant) {
    return (
      <DashboardLayout>
        <div className="max-w-4xl mx-auto px-4 py-16 text-center">
          <h1 className="text-2xl font-bold text-gray-900 mb-4">Restaurant not found</h1>
          <button
            onClick={() => router.push('/customer/dashboard')}
            className="bg-primary text-white px-6 py-3 rounded-xl hover:bg-orange-600"
          >
            Back to Dashboard
          </button>
        </div>
      </DashboardLayout>
    );
  }

  const finalPrice = (price: number, discount?: number) => {
    if (!discount) return price;
    return price * (1 - discount / 100);
  };

  return (
    <DashboardLayout>
      <div className="min-h-screen bg-gray-50">
        {/* Header Banner */}
        <div className="relative h-64 md:h-80 bg-gradient-to-br from-orange-400 to-pink-500">
          {restaurant.banner_url ? (
            <Image
              src={restaurant.banner_url}
              alt={restaurant.business_name}
              fill
              className="object-cover"
              priority
            />
          ) : null}
          <div className="absolute inset-0 bg-black/40" />

          {/* Back Button */}
          <button
            onClick={() => router.back()}
            className="absolute top-4 left-4 bg-white/90 backdrop-blur-sm p-2 rounded-full hover:bg-white transition-all shadow-lg z-10"
          >
            <ArrowLeft className="w-6 h-6 text-gray-900" />
          </button>

          {/* Cart Button */}
          {itemCount > 0 && (
            <button
              onClick={() => router.push('/customer/cart')}
              className="absolute top-4 right-4 bg-white/90 backdrop-blur-sm p-3 rounded-full hover:bg-white transition-all shadow-lg z-10"
            >
              <ShoppingCart className="w-6 h-6 text-primary" />
              <span className="absolute -top-2 -right-2 bg-red-500 text-white text-xs font-bold w-6 h-6 rounded-full flex items-center justify-center">
                {itemCount}
              </span>
            </button>
          )}

          {/* Restaurant Info Overlay */}
          <div className="absolute bottom-0 left-0 right-0 p-6 bg-gradient-to-t from-black/80 to-transparent">
            <div className="max-w-7xl mx-auto">
              <div className="flex items-start gap-4">
                {restaurant.logo_url && (
                  <div className="w-20 h-20 md:w-24 md:h-24 rounded-xl overflow-hidden border-4 border-white shadow-xl bg-white flex-shrink-0">
                    <Image
                      src={restaurant.logo_url}
                      alt={`${restaurant.business_name} logo`}
                      width={96}
                      height={96}
                      className="object-cover w-full h-full"
                    />
                  </div>
                )}
                <div className="flex-1 min-w-0">
                  <h1 className="text-2xl md:text-4xl font-bold text-white mb-2">
                    {restaurant.business_name}
                  </h1>
                  <div className="flex flex-wrap gap-2 mb-3">
                    {restaurant.cuisine_types?.map((cuisine, index) => (
                      <span
                        key={index}
                        className="px-3 py-1 bg-white/20 backdrop-blur-sm text-white text-xs font-semibold rounded-full"
                      >
                        {cuisine}
                      </span>
                    ))}
                  </div>
                  <div className="flex flex-wrap gap-4 text-white text-sm">
                    <div className="flex items-center gap-1">
                      <Star className="w-4 h-4 fill-yellow-400 text-yellow-400" />
                      <span className="font-bold">{restaurant.average_rating?.toFixed(1) || '4.5'}</span>
                      <span className="text-white/80">({restaurant.total_reviews || 0})</span>
                    </div>
                    <div className="flex items-center gap-1">
                      <Clock className="w-4 h-4" />
                      <span>{restaurant.estimated_prep_time || 30} mins</span>
                    </div>
                    <div className="flex items-center gap-1">
                      <IndianRupee className="w-4 h-4" />
                      <span>Min ₹{restaurant.min_order_amount || 0}</span>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Main Content */}
        <div className="max-w-7xl mx-auto px-4 py-6">
          {/* Restaurant Info Cards */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
            {restaurant.phone && (
              <div className="bg-white rounded-xl shadow-md p-4 flex items-center gap-3">
                <div className="w-12 h-12 bg-blue-100 rounded-full flex items-center justify-center flex-shrink-0">
                  <Phone className="w-6 h-6 text-blue-600" />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-xs text-gray-600">Contact</p>
                  <p className="font-semibold text-gray-900 truncate">{restaurant.phone}</p>
                </div>
              </div>
            )}

            {restaurant.email && (
              <div className="bg-white rounded-xl shadow-md p-4 flex items-center gap-3">
                <div className="w-12 h-12 bg-green-100 rounded-full flex items-center justify-center flex-shrink-0">
                  <Mail className="w-6 h-6 text-green-600" />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-xs text-gray-600">Email</p>
                  <p className="font-semibold text-gray-900 truncate">{restaurant.email}</p>
                </div>
              </div>
            )}

            {restaurant.address && (
              <div className="bg-white rounded-xl shadow-md p-4 flex items-center gap-3">
                <div className="w-12 h-12 bg-orange-100 rounded-full flex items-center justify-center flex-shrink-0">
                  <MapPin className="w-6 h-6 text-primary" />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-xs text-gray-600">Address</p>
                  <p className="font-semibold text-gray-900 line-clamp-2 text-sm">{restaurant.address}</p>
                </div>
              </div>
            )}
          </div>

          {/* Description */}
          {restaurant.description && (
            <div className="bg-white rounded-xl shadow-md p-6 mb-6">
              <h2 className="text-lg font-bold text-gray-900 mb-2">About</h2>
              <p className="text-gray-700 leading-relaxed">{restaurant.description}</p>
            </div>
          )}

          {/* Search Menu */}
          <div className="bg-white rounded-xl shadow-md p-4 mb-6">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 w-5 h-5" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search menu items..."
                className="w-full pl-10 pr-10 py-3 border-2 border-gray-200 rounded-xl focus:ring-2 focus:ring-primary focus:border-primary transition-all"
              />
              {searchQuery && (
                <button
                  onClick={() => setSearchQuery('')}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
                >
                  <X className="w-5 h-5" />
                </button>
              )}
            </div>
          </div>

          {/* Menu Items by Category */}
          <div className="space-y-4">
            {Object.keys(filteredMenu).length === 0 ? (
              <div className="bg-white rounded-xl shadow-md p-16 text-center">
                <p className="text-gray-600 text-lg">No menu items found</p>
              </div>
            ) : (
              Object.entries(filteredMenu).map(([category, items]) => (
                <div key={category} className="bg-white rounded-xl shadow-md overflow-hidden">
                  {/* Category Header */}
                  <button
                    onClick={() => toggleCategory(category)}
                    className="w-full px-6 py-4 flex items-center justify-between hover:bg-gray-50 transition-colors"
                  >
                    <div className="flex items-center gap-3">
                      <h2 className="text-xl font-bold text-gray-900">{category}</h2>
                      <span className="px-3 py-1 bg-primary/10 text-primary text-sm font-semibold rounded-full">
                        {items.length} items
                      </span>
                    </div>
                    {expandedCategories[category] ? (
                      <ChevronUp className="w-6 h-6 text-gray-400" />
                    ) : (
                      <ChevronDown className="w-6 h-6 text-gray-400" />
                    )}
                  </button>

                  {/* Category Items */}
                  {expandedCategories[category] && (
                    <div className="border-t divide-y">
                      {items.map((item) => {
                        const itemQuantity = quantities[item.id] || 1;
                        const discountedPrice = finalPrice(item.price, item.discount_percentage);
                        const hasDiscount = item.discount_percentage && item.discount_percentage > 0;

                        return (
                          <div
                            key={item.id}
                            className="p-4 md:p-6 hover:bg-gray-50 transition-colors"
                          >
                            <div className="flex gap-4">
                              {/* Item Image */}
                              {item.image_url && (
                                <div className="relative w-24 h-24 md:w-32 md:h-32 rounded-xl overflow-hidden flex-shrink-0 bg-gray-100">
                                  <Image
                                    src={item.image_url}
                                    alt={item.name}
                                    fill
                                    sizes="128px"
                                    className="object-cover"
                                  />
                                  {hasDiscount && (
                                    <div className="absolute top-2 left-2 bg-red-500 text-white text-xs font-bold px-2 py-1 rounded-full">
                                      {item.discount_percentage}% OFF
                                    </div>
                                  )}
                                </div>
                              )}

                              {/* Item Details */}
                              <div className="flex-1 min-w-0">
                                <div className="flex items-start justify-between gap-4 mb-2">
                                  <div className="flex-1 min-w-0">
                                    <div className="flex items-center gap-2 mb-1">
                                      {item.is_veg !== undefined && (
                                        <div
                                          className={`w-5 h-5 border-2 ${
                                            item.is_veg
                                              ? 'border-green-600'
                                              : 'border-red-600'
                                          } flex items-center justify-center`}
                                        >
                                          <div
                                            className={`w-2.5 h-2.5 rounded-full ${
                                              item.is_veg ? 'bg-green-600' : 'bg-red-600'
                                            }`}
                                          />
                                        </div>
                                      )}
                                      <h3 className="font-bold text-gray-900 text-lg">
                                        {item.name}
                                      </h3>
                                    </div>

                                    {item.description && (
                                      <p className="text-sm text-gray-600 line-clamp-2 mb-2">
                                        {item.description}
                                      </p>
                                    )}

                                    <div className="flex items-center gap-2">
                                      {hasDiscount && (
                                        <span className="text-sm text-gray-400 line-through">
                                          ₹{item.price}
                                        </span>
                                      )}
                                      <span className="text-lg font-bold text-gray-900">
                                        ₹{discountedPrice.toFixed(2)}
                                      </span>
                                    </div>
                                  </div>
                                </div>

                                {/* Quantity & Add to Cart */}
                                <div className="flex items-center gap-3 mt-4">
                                  <div className="flex items-center gap-2 bg-gray-100 rounded-lg p-1">
                                    <button
                                      onClick={() => updateQuantity(item.id, -1)}
                                      className="w-8 h-8 flex items-center justify-center hover:bg-white rounded transition-colors"
                                      disabled={itemQuantity <= 1}
                                    >
                                      <Minus className="w-4 h-4 text-gray-700" />
                                    </button>
                                    <span className="w-8 text-center font-bold text-gray-900">
                                      {itemQuantity}
                                    </span>
                                    <button
                                      onClick={() => updateQuantity(item.id, 1)}
                                      className="w-8 h-8 flex items-center justify-center hover:bg-white rounded transition-colors"
                                      disabled={itemQuantity >= 10}
                                    >
                                      <Plus className="w-4 h-4 text-gray-700" />
                                    </button>
                                  </div>

                                  <button
                                    onClick={() => handleAddToCart(item)}
                                    className="flex-1 bg-primary text-white px-6 py-2 rounded-lg hover:bg-orange-600 font-semibold flex items-center justify-center gap-2 transition-colors"
                                  >
                                    <ShoppingCart className="w-5 h-5" />
                                    Add to Cart
                                  </button>
                                </div>
                              </div>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  )}
                </div>
              ))
            )}
          </div>
        </div>

        {/* Floating Cart Button (Mobile) */}
        {itemCount > 0 && (
          <div className="fixed bottom-4 left-4 right-4 md:hidden z-50">
            <button
              onClick={() => router.push('/customer/cart')}
              className="w-full bg-primary text-white px-6 py-4 rounded-xl hover:bg-orange-600 font-bold flex items-center justify-between shadow-2xl"
            >
              <div className="flex items-center gap-2">
                <ShoppingCart className="w-6 h-6" />
                <span>{itemCount} {itemCount === 1 ? 'item' : 'items'}</span>
              </div>
              <span>View Cart →</span>
            </button>
          </div>
        )}
      </div>
    </DashboardLayout>
  );
}
