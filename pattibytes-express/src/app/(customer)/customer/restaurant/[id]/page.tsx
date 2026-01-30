'use client';

import { useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/lib/supabase';
import { restaurantService, type Restaurant, type MenuItem, type MenuByCategory } from '@/services/restaurants';
import { locationService } from '@/services/location';
import DashboardLayout from '@/components/layouts/DashboardLayout';
import {
  ArrowLeft,
  Star,
  Clock,
  MapPin,
  ShoppingCart,
  Plus,
  Minus,
  Tag,
  Percent,
  Heart,
  Phone,
  Mail,
  Store,
  Leaf,
  X,
  Sparkles,
} from 'lucide-react';
import { toast } from 'react-toastify';
import Image from 'next/image';

interface CartItem {
  id: string;
  name: string;
  price: number;
  quantity: number;
  image_url?: string;
  is_veg: boolean;
  discount_percentage?: number;
}

interface PromoCode {
  id: string;
  code: string;
  discount_type: 'percentage' | 'fixed';
  discount_value: number;
  min_order_value?: number;
  max_discount?: number;
  description?: string;
}

export default function RestaurantDetailPage() {
  const params = useParams();
  const router = useRouter();
  const { user } = useAuth();
  const [restaurant, setRestaurant] = useState<Restaurant | null>(null);
  const [menuByCategory, setMenuByCategory] = useState<MenuByCategory>({});
  const [cart, setCart] = useState<CartItem[]>([]);
  const [promoCode, setPromoCode] = useState('');
  const [appliedPromo, setAppliedPromo] = useState<PromoCode | null>(null);
  const [activePromos, setActivePromos] = useState<PromoCode[]>([]);
  const [loading, setLoading] = useState(true);
  const [userLocation, setUserLocation] = useState<{ lat: number; lon: number } | null>(null);
  const [distance, setDistance] = useState<number | null>(null);

  useEffect(() => {
    if (params.id) {
      loadRestaurantData();
      getUserLocation();
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [params.id]);

  const getUserLocation = async () => {
    try {
      // Try to get from saved addresses first
      if (user) {
        const defaultAddress = await locationService.getDefaultAddress(user.id);
        if (defaultAddress) {
          setUserLocation({ lat: defaultAddress.latitude, lon: defaultAddress.longitude });
          return;
        }
      }

      // Fall back to current location
      const coords = await locationService.getCurrentLocation();
      setUserLocation(coords);
    } catch (error) {
      console.error('Failed to get location:', error);
      // Default to Ludhiana
      setUserLocation({ lat: 30.901, lon: 75.8573 });
    }
  };

  const loadRestaurantData = async () => {
    try {
      const [restaurantData, menuData, promos] = await Promise.all([
        restaurantService.getRestaurantById(params.id as string),
        restaurantService.getMenuItemsByCategory(params.id as string),
        restaurantService.getActivePromoCodes(params.id as string),
      ]);

      if (!restaurantData) {
        toast.error('Restaurant not found');
        router.push('/customer/dashboard');
        return;
      }

      setRestaurant(restaurantData);
      setMenuByCategory(menuData);
      setActivePromos(promos as PromoCode[]);
    } catch (error) {
      console.error('Failed to load restaurant:', error);
      toast.error('Failed to load restaurant details');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (restaurant && userLocation) {
      const dist = locationService.calculateDistance(
        userLocation.lat,
        userLocation.lon,
        restaurant.latitude,
        restaurant.longitude
      );
      setDistance(dist);
    }
  }, [restaurant, userLocation]);

  const addToCart = (item: MenuItem) => {
    const existing = cart.find((c) => c.id === item.id);

    if (existing) {
      setCart(
        cart.map((c) => (c.id === item.id ? { ...c, quantity: c.quantity + 1 } : c))
      );
    } else {
      setCart([
        ...cart,
        {
          id: item.id,
          name: item.name,
          price: item.discount_percentage
            ? item.price * (1 - item.discount_percentage / 100)
            : item.price,
          quantity: 1,
          image_url: item.image_url,
          is_veg: item.is_veg,
          discount_percentage: item.discount_percentage,
        },
      ]);
    }

    toast.success(`${item.name} added to cart!`);
  };

  const removeFromCart = (itemId: string) => {
    const existing = cart.find((c) => c.id === itemId);

    if (existing && existing.quantity > 1) {
      setCart(
        cart.map((c) => (c.id === itemId ? { ...c, quantity: c.quantity - 1 } : c))
      );
    } else {
      setCart(cart.filter((c) => c.id !== itemId));
      toast.info('Item removed from cart');
    }
  };

  const clearCart = () => {
    setCart([]);
    setAppliedPromo(null);
    toast.info('Cart cleared');
  };

  const applyPromoCode = async () => {
    if (!promoCode.trim()) {
      toast.error('Please enter a promo code');
      return;
    }

    try {
      const { data, error } = await supabase
        .from('promo_codes')
        .select('*')
        .eq('code', promoCode.toUpperCase())
        .eq('merchant_id', params.id)
        .eq('is_active', true)
        .gte('valid_until', new Date().toISOString())
        .single();

      if (error || !data) {
        toast.error('Invalid or expired promo code');
        return;
      }

      const subtotal = calculateSubtotal();

      if (data.min_order_value && subtotal < data.min_order_value) {
        toast.error(`Minimum order value of ₹${data.min_order_value} required`);
        return;
      }

      setAppliedPromo(data as PromoCode);
      toast.success(`🎉 Promo code applied! You save ₹${calculateDiscount(data as PromoCode)}`);
      setPromoCode('');
    } catch (error) {
      console.error('Promo error:', error);
      toast.error('Failed to apply promo code');
    }
  };

  const removePromo = () => {
    setAppliedPromo(null);
    toast.info('Promo code removed');
  };

  const calculateSubtotal = () => {
    return cart.reduce((sum, item) => sum + item.price * item.quantity, 0);
  };

  const calculateDiscount = (promo: PromoCode) => {
    if (!promo) return 0;

    const subtotal = calculateSubtotal();

    if (promo.discount_type === 'percentage') {
      const discount = (subtotal * promo.discount_value) / 100;
      return Math.min(discount, promo.max_discount || Infinity);
    } else {
      return Math.min(promo.discount_value, subtotal);
    }
  };

  const calculateDeliveryFee = () => {
    if (!distance) return 30;
    return locationService.calculateDeliveryCharge(distance);
  };

  const calculateGST = () => {
    const subtotal = calculateSubtotal();
    const discount = appliedPromo ? calculateDiscount(appliedPromo) : 0;
    return (subtotal - discount) * 0.05; // 5% GST
  };

  const calculateTotal = () => {
    const subtotal = calculateSubtotal();
    const discount = appliedPromo ? calculateDiscount(appliedPromo) : 0;
    const deliveryFee = calculateDeliveryFee();
    const gst = calculateGST();

    return subtotal - discount + deliveryFee + gst;
  };

  const handleCheckout = () => {
    if (cart.length === 0) {
      toast.error('Your cart is empty');
      return;
    }

    if (!user) {
      toast.error('Please login to continue');
      router.push('/auth/login');
      return;
    }

    if (restaurant && restaurant.min_order_amount > 0) {
      const subtotal = calculateSubtotal();
      if (subtotal < restaurant.min_order_amount) {
        toast.error(`Minimum order amount is ₹${restaurant.min_order_amount}`);
        return;
      }
    }

    // Store cart and navigate to checkout
    localStorage.setItem(
      'checkout_cart',
      JSON.stringify({
        items: cart,
        restaurant_id: params.id,
        restaurant_name: restaurant?.business_name,
        promo: appliedPromo,
        subtotal: calculateSubtotal(),
        discount: appliedPromo ? calculateDiscount(appliedPromo) : 0,
        delivery_fee: calculateDeliveryFee(),
        gst: calculateGST(),
        total: calculateTotal(),
      })
    );

    router.push('/customer/checkout');
  };

  if (loading) {
    return (
      <DashboardLayout>
        <div className="max-w-7xl mx-auto px-4 py-8">
          <div className="space-y-4">
            <div className="bg-gray-200 h-12 w-32 rounded animate-pulse" />
            <div className="bg-gray-200 h-64 rounded-2xl animate-pulse" />
            <div className="grid lg:grid-cols-3 gap-6">
              <div className="lg:col-span-2 space-y-4">
                {[...Array(3)].map((_, i) => (
                  <div key={i} className="bg-gray-200 h-48 rounded-xl animate-pulse" />
                ))}
              </div>
              <div className="bg-gray-200 h-96 rounded-xl animate-pulse" />
            </div>
          </div>
        </div>
      </DashboardLayout>
    );
  }

  if (!restaurant) {
    return (
      <DashboardLayout>
        <div className="max-w-7xl mx-auto px-4 py-16 text-center">
          <Store size={64} className="mx-auto text-gray-400 mb-4" />
          <h2 className="text-2xl font-bold text-gray-900 mb-2">Restaurant not found</h2>
          <p className="text-gray-600 mb-6">The restaurant you&apos;re looking for doesn&apos;t exist.</p>
          <button
            onClick={() => router.push('/customer/dashboard')}
            className="bg-primary text-white px-6 py-3 rounded-lg hover:bg-orange-600 font-semibold"
          >
            Back to Dashboard
          </button>
        </div>
      </DashboardLayout>
    );
  }

  const totalItems = cart.reduce((sum, item) => sum + item.quantity, 0);

  return (
    <DashboardLayout>
      <div className="min-h-screen bg-gradient-to-br from-orange-50 via-white to-pink-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4 md:py-8">
          {/* Header */}
          <button
            onClick={() => router.back()}
            className="flex items-center gap-2 text-gray-600 hover:text-gray-900 mb-4 md:mb-6 group"
          >
            <ArrowLeft size={20} className="group-hover:-translate-x-1 transition-transform" />
            <span className="font-medium">Back to Restaurants</span>
          </button>

          {/* Restaurant Info Card */}
          <div className="bg-white rounded-2xl shadow-xl overflow-hidden mb-6 md:mb-8">
            {restaurant.banner_url ? (
              <div className="relative h-48 md:h-64 lg:h-80">
                <Image src={restaurant.banner_url} alt={restaurant.business_name} fill className="object-cover" />
                <div className="absolute inset-0 bg-gradient-to-t from-black/60 to-transparent" />
                <button className="absolute top-4 right-4 w-12 h-12 bg-white/90 hover:bg-white rounded-full flex items-center justify-center shadow-lg transition-all">
                  <Heart className="w-6 h-6 text-red-500" />
                </button>
              </div>
            ) : (
              <div className="h-48 md:h-64 bg-gradient-to-br from-orange-400 to-pink-500 flex items-center justify-center relative">
                <Store className="text-white w-20 h-20" />
                <button className="absolute top-4 right-4 w-12 h-12 bg-white/90 hover:bg-white rounded-full flex items-center justify-center shadow-lg transition-all">
                  <Heart className="w-6 h-6 text-red-500" />
                </button>
              </div>
            )}

            <div className="p-4 md:p-6 lg:p-8">
              <div className="flex flex-col md:flex-row md:items-start md:justify-between mb-4 md:mb-6">
                <div className="flex-1 mb-4 md:mb-0">
                  <h1 className="text-2xl md:text-3xl lg:text-4xl font-bold text-gray-900 mb-2">
                    {restaurant.business_name}
                  </h1>
                  {restaurant.description && (
                    <p className="text-gray-600 mb-3 md:mb-4 text-sm md:text-base">{restaurant.description}</p>
                  )}

                  {restaurant.cuisine_types && restaurant.cuisine_types.length > 0 && (
                    <div className="flex flex-wrap gap-2 mb-4">
                      {restaurant.cuisine_types.map((cuisine: string, index: number) => (
                        <span
                          key={index}
                          className="px-3 py-1 bg-gradient-to-r from-orange-100 to-pink-100 text-orange-800 rounded-full text-xs md:text-sm font-semibold"
                        >
                          {cuisine}
                        </span>
                      ))}
                    </div>
                  )}

                  <div className="flex flex-wrap items-center gap-4 md:gap-6 text-sm md:text-base">
                    <div className="flex items-center gap-1.5 text-yellow-600">
                      <Star size={18} fill="currentColor" />
                      <span className="font-bold">4.5</span>
                      <span className="text-gray-600">(200+ ratings)</span>
                    </div>
                    <div className="flex items-center gap-1.5 text-gray-600">
                      <Clock size={18} />
                      <span>{restaurant.estimated_prep_time} min</span>
                    </div>
                    {distance !== null && (
                      <div className="flex items-center gap-1.5 text-gray-600">
                        <MapPin size={18} />
                        <span>{distance.toFixed(1)} km away</span>
                      </div>
                    )}
                  </div>
                </div>

                <div className="flex md:flex-col gap-2">
                  {restaurant.phone && (
                    <a
                      href={`tel:${restaurant.phone}`}
                      className="flex items-center gap-2 px-4 py-2 bg-green-50 text-green-700 rounded-lg hover:bg-green-100 transition-all font-medium text-sm"
                    >
                      <Phone size={18} />
                      <span className="hidden md:inline">Call</span>
                    </a>
                  )}
                  {restaurant.email && (
                    <a
                      href={`mailto:${restaurant.email}`}
                      className="flex items-center gap-2 px-4 py-2 bg-blue-50 text-blue-700 rounded-lg hover:bg-blue-100 transition-all font-medium text-sm"
                    >
                      <Mail size={18} />
                      <span className="hidden md:inline">Email</span>
                    </a>
                  )}
                </div>
              </div>

              {/* Active Promo Codes */}
              {activePromos.length > 0 && (
                <div className="bg-gradient-to-r from-green-50 to-emerald-50 border-2 border-green-200 rounded-xl p-4 md:p-6">
                  <div className="flex items-center gap-2 mb-3">
                    <Sparkles className="text-green-600" size={20} />
                    <h3 className="font-bold text-green-900 text-base md:text-lg">Active Offers</h3>
                  </div>
                  <div className="grid sm:grid-cols-2 gap-3">
                    {activePromos.map((promo) => (
                      <div
                        key={promo.id}
                        className="bg-white rounded-lg p-3 border border-green-200 hover:border-green-400 transition-all cursor-pointer"
                        onClick={() => {
                          setPromoCode(promo.code);
                          applyPromoCode();
                        }}
                      >
                        <div className="flex items-start gap-2">
                          <Tag size={16} className="text-green-600 flex-shrink-0 mt-0.5" />
                          <div className="flex-1 min-w-0">
                            <p className="font-bold text-green-900 text-sm mb-1">{promo.code}</p>
                            <p className="text-xs text-green-700 line-clamp-2">
                              {promo.description ||
                                `${promo.discount_type === 'percentage' ? `${promo.discount_value}% OFF` : `₹${promo.discount_value} OFF`}${promo.min_order_value ? ` on orders above ₹${promo.min_order_value}` : ''}`}
                            </p>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {restaurant.min_order_amount > 0 && (
                <div className="mt-4 bg-orange-50 border border-orange-200 rounded-lg p-3">
                  <p className="text-sm text-orange-800">
                    ℹ️ Minimum order amount: <span className="font-bold">₹{restaurant.min_order_amount}</span>
                  </p>
                </div>
              )}
            </div>
          </div>

          {/* Menu and Cart */}
          <div className="grid lg:grid-cols-3 gap-6 md:gap-8">
            {/* Menu Items */}
            <div className="lg:col-span-2">
              <div className="flex items-center justify-between mb-4 md:mb-6">
                <h2 className="text-xl md:text-2xl font-bold text-gray-900">Our Menu</h2>
                <div className="text-sm text-gray-600">
                  {Object.keys(menuByCategory).length} categories
                </div>
              </div>

              {Object.keys(menuByCategory).length > 0 ? (
                <div className="space-y-6 md:space-y-8">
                  {Object.entries(menuByCategory).map(([category, items]) => (
                    <div key={category} className="bg-white rounded-xl shadow-lg p-4 md:p-6">
                      <h3 className="text-lg md:text-xl font-bold text-gray-900 mb-4 pb-3 border-b-2 border-primary flex items-center gap-2">
                        <span>{category}</span>
                        <span className="text-sm text-gray-500 font-normal">({items.length})</span>
                      </h3>
                      <div className="grid sm:grid-cols-2 gap-4">
                        {items.map((item) => {
                          const cartItem = cart.find((c) => c.id === item.id);
                          const finalPrice = item.discount_percentage
                            ? item.price * (1 - item.discount_percentage / 100)
                            : item.price;

                          return (
                            <div
                              key={item.id}
                              className="bg-gray-50 rounded-xl p-3 md:p-4 hover:shadow-md transition-all border-2 border-transparent hover:border-primary"
                            >
                              <div className="flex gap-3 md:gap-4">
                                {item.image_url ? (
                                  <div className="relative w-20 h-20 md:w-24 md:h-24 flex-shrink-0 rounded-lg overflow-hidden">
                                    <Image src={item.image_url} alt={item.name} fill className="object-cover" />
                                    {item.discount_percentage && (
                                      <div className="absolute top-1 left-1 bg-green-500 text-white text-[10px] px-1.5 py-0.5 rounded-md font-bold">
                                        {item.discount_percentage}% OFF
                                      </div>
                                    )}
                                  </div>
                                ) : (
                                  <div className="w-20 h-20 md:w-24 md:h-24 bg-gradient-to-br from-orange-200 to-pink-200 rounded-lg flex items-center justify-center flex-shrink-0">
                                    <ShoppingCart className="text-orange-600" size={24} />
                                  </div>
                                )}

                                <div className="flex-1 min-w-0 flex flex-col">
                                  <div className="flex items-start gap-2 mb-1">
                                    <h4 className="font-bold text-gray-900 text-sm md:text-base line-clamp-1 flex-1">
                                      {item.name}
                                    </h4>
                                    {item.is_veg ? (
                                      <div className="w-4 h-4 border-2 border-green-600 flex items-center justify-center flex-shrink-0">
                                        <div className="w-2 h-2 rounded-full bg-green-600" />
                                      </div>
                                    ) : (
                                      <div className="w-4 h-4 border-2 border-red-600 flex items-center justify-center flex-shrink-0">
                                        <div className="w-2 h-2 rounded-full bg-red-600" />
                                      </div>
                                    )}
                                  </div>

                                  {item.description && (
                                    <p className="text-xs text-gray-600 mb-2 line-clamp-2">{item.description}</p>
                                  )}

                                  <div className="mt-auto">
                                    <div className="flex items-center justify-between mb-2">
                                      <div>
                                        {item.discount_percentage ? (
                                          <div className="flex items-center gap-2">
                                            <p className="text-base md:text-lg font-bold text-primary">
                                              ₹{finalPrice.toFixed(0)}
                                            </p>
                                            <p className="text-xs text-gray-500 line-through">₹{item.price}</p>
                                          </div>
                                        ) : (
                                          <p className="text-base md:text-lg font-bold text-primary">₹{item.price}</p>
                                        )}
                                      </div>
                                    </div>

                                    {cartItem ? (
                                      <div className="flex items-center justify-between bg-primary text-white rounded-lg overflow-hidden">
                                        <button
                                          onClick={() => removeFromCart(item.id)}
                                          className="px-3 py-2 hover:bg-orange-600 transition-colors"
                                        >
                                          <Minus size={14} />
                                        </button>
                                        <span className="font-bold text-sm">{cartItem.quantity}</span>
                                        <button
                                          onClick={() => addToCart(item)}
                                          className="px-3 py-2 hover:bg-orange-600 transition-colors"
                                        >
                                          <Plus size={14} />
                                        </button>
                                      </div>
                                    ) : (
                                      <button
                                        onClick={() => addToCart(item)}
                                        disabled={!item.is_available}
                                        className="w-full bg-primary text-white px-3 py-2 rounded-lg hover:bg-orange-600 font-semibold flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed transition-all text-sm"
                                      >
                                        <Plus size={14} />
                                        Add
                                      </button>
                                    )}
                                  </div>
                                </div>
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="text-center py-16 bg-white rounded-xl shadow-lg">
                  <ShoppingCart size={64} className="mx-auto text-gray-400 mb-4" />
                  <h3 className="text-xl font-bold text-gray-900 mb-2">No menu items available</h3>
                  <p className="text-gray-600">Check back later for updates</p>
                </div>
              )}
            </div>

            {/* Cart Sidebar - Sticky on desktop */}
            <div className="lg:col-span-1">
              <div className="bg-white rounded-xl shadow-2xl overflow-hidden sticky top-4">
                {/* Cart Header */}
                <div className="bg-gradient-to-r from-orange-500 to-pink-500 p-4 md:p-6">
                  <div className="flex items-center justify-between text-white">
                    <div className="flex items-center gap-3">
                      <div className="w-12 h-12 bg-white/20 rounded-full flex items-center justify-center">
                        <ShoppingCart size={24} />
                      </div>
                      <div>
                        <h3 className="text-lg md:text-xl font-bold">Your Cart</h3>
                        <p className="text-xs text-white/90">{totalItems} items</p>
                      </div>
                    </div>
                    {cart.length > 0 && (
                      <button
                        onClick={clearCart}
                        className="text-white/90 hover:text-white p-2 hover:bg-white/10 rounded-lg transition-all"
                        title="Clear cart"
                      >
                        <X size={20} />
                      </button>
                    )}
                  </div>
                </div>

                <div className="p-4 md:p-6">
                  {cart.length > 0 ? (
                    <>
                      {/* Cart Items */}
                      <div className="space-y-3 mb-6 max-h-64 overflow-y-auto">
                        {cart.map((item) => (
                          <div key={item.id} className="flex items-center gap-3 pb-3 border-b last:border-b-0">
                            {item.image_url ? (
                              <div className="relative w-14 h-14 flex-shrink-0 rounded-lg overflow-hidden">
                                <Image src={item.image_url} alt={item.name} fill className="object-cover" />
                              </div>
                            ) : (
                              <div className="w-14 h-14 bg-gradient-to-br from-orange-100 to-pink-100 rounded-lg flex items-center justify-center flex-shrink-0">
                                {item.is_veg ? (
                                  <Leaf className="text-green-600" size={20} />
                                ) : (
                                  <ShoppingCart className="text-orange-600" size={20} />
                                )}
                              </div>
                            )}
                            <div className="flex-1 min-w-0">
                              <p className="font-semibold text-gray-900 truncate text-sm">{item.name}</p>
                              <p className="text-xs text-gray-600">
                                ₹{item.price} × {item.quantity}
                              </p>
                              {item.discount_percentage && (
                                <span className="text-[10px] bg-green-100 text-green-700 px-1.5 py-0.5 rounded-full font-semibold">
                                  {item.discount_percentage}% OFF
                                </span>
                              )}
                            </div>
                            <div className="text-right">
                              <p className="font-bold text-primary text-sm">₹{(item.price * item.quantity).toFixed(0)}</p>
                              <div className="flex gap-1 mt-1">
                                <button
                                  onClick={() => removeFromCart(item.id)}
                                  className="w-6 h-6 bg-gray-100 hover:bg-gray-200 rounded flex items-center justify-center text-gray-600"
                                >
                                  <Minus size={12} />
                                </button>
                                <button
                                  // eslint-disable-next-line @typescript-eslint/no-explicit-any
                                  onClick={() => addToCart(item as any)}
                                  className="w-6 h-6 bg-primary hover:bg-orange-600 rounded flex items-center justify-center text-white"
                                >
                                  <Plus size={12} />
                                </button>
                              </div>
                            </div>
                          </div>
                        ))}
                      </div>

                      {/* Promo Code Section */}
                      <div className="mb-6 p-4 bg-gradient-to-r from-purple-50 to-pink-50 rounded-xl">
                        <label className="block text-sm font-semibold text-gray-800 mb-2 flex items-center gap-2">
                          <Tag size={16} className="text-purple-600" />
                          Have a promo code?
                        </label>
                        {appliedPromo ? (
                          <div className="bg-white border-2 border-green-500 rounded-lg p-3">
                            <div className="flex items-center justify-between mb-2">
                              <div className="flex items-center gap-2">
                                <div className="w-8 h-8 bg-green-500 rounded-full flex items-center justify-center">
                                  <Percent size={14} className="text-white" />
                                </div>
                                <div>
                                  <p className="font-bold text-green-900 text-sm">{appliedPromo.code}</p>
                                  <p className="text-xs text-green-700">Applied successfully!</p>
                                </div>
                              </div>
                              <button
                                onClick={removePromo}
                                className="text-red-500 hover:text-red-700 p-1"
                                title="Remove promo"
                              >
                                <X size={16} />
                              </button>
                            </div>
                            <p className="text-xs text-green-800 bg-green-50 px-2 py-1 rounded">
                              You&apos;re saving ₹{calculateDiscount(appliedPromo).toFixed(0)}! 🎉
                            </p>
                          </div>
                        ) : (
                          <div className="flex gap-2">
                            <input
                              type="text"
                              value={promoCode}
                              onChange={(e) => setPromoCode(e.target.value.toUpperCase())}
                              onKeyPress={(e) => e.key === 'Enter' && applyPromoCode()}
                              placeholder="Enter code"
                              className="flex-1 px-3 py-2 border-2 border-gray-200 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-purple-500 text-sm uppercase"
                            />
                            <button
                              onClick={applyPromoCode}
                              className="bg-gradient-to-r from-purple-600 to-pink-600 text-white px-4 py-2 rounded-lg hover:from-purple-700 hover:to-pink-700 font-semibold text-sm shadow-lg"
                            >
                              Apply
                            </button>
                          </div>
                        )}
                      </div>

                      {/* Bill Summary */}
                      <div className="space-y-2.5 mb-6 pb-6 border-b-2 border-dashed">
                        <div className="flex justify-between text-sm">
                          <span className="text-gray-600">Item Total</span>
                          <span className="font-semibold text-gray-900">₹{calculateSubtotal().toFixed(0)}</span>
                        </div>
                        {appliedPromo && (
                          <div className="flex justify-between text-sm bg-green-50 -mx-2 px-2 py-1 rounded">
                            <span className="text-green-700 font-medium flex items-center gap-1">
                              <Sparkles size={14} />
                              Discount ({appliedPromo.code})
                            </span>
                            <span className="font-bold text-green-700">
                              -₹{calculateDiscount(appliedPromo).toFixed(0)}
                            </span>
                          </div>
                        )}
                        <div className="flex justify-between text-sm">
                          <span className="text-gray-600">Delivery Fee</span>
                          <span className="font-semibold text-gray-900">₹{calculateDeliveryFee()}</span>
                        </div>
                        <div className="flex justify-between text-sm">
                          <span className="text-gray-600">GST (5%)</span>
                          <span className="font-semibold text-gray-900">₹{calculateGST().toFixed(0)}</span>
                        </div>
                      </div>

                      {/* Total */}
                      <div className="flex justify-between items-center mb-6 p-4 bg-gradient-to-r from-orange-50 to-pink-50 rounded-xl">
                        <span className="text-lg font-bold text-gray-900">Grand Total</span>
                        <span className="text-2xl md:text-3xl font-bold text-primary">
                          ₹{calculateTotal().toFixed(0)}
                        </span>
                      </div>

                      {/* Checkout Button */}
                      <button
                        onClick={handleCheckout}
                        className="w-full bg-gradient-to-r from-orange-500 to-pink-500 text-white py-4 rounded-xl hover:from-orange-600 hover:to-pink-600 font-bold text-lg shadow-xl hover:shadow-2xl transform active:scale-95 transition-all flex items-center justify-center gap-2"
                      >
                        <ShoppingCart size={20} />
                        Proceed to Checkout
                      </button>

                      {restaurant.min_order_amount > 0 && calculateSubtotal() < restaurant.min_order_amount && (
                        <p className="text-xs text-center text-red-600 mt-3">
                          Add ₹{(restaurant.min_order_amount - calculateSubtotal()).toFixed(0)} more to place order
                        </p>
                      )}
                    </>
                  ) : (
                    <div className="text-center py-12">
                      <div className="w-20 h-20 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-4">
                        <ShoppingCart size={40} className="text-gray-400" />
                      </div>
                      <h4 className="font-bold text-gray-900 mb-2">Your cart is empty</h4>
                      <p className="text-sm text-gray-600">Add items from the menu to get started</p>
                    </div>
                  )}
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </DashboardLayout>
  );
}
