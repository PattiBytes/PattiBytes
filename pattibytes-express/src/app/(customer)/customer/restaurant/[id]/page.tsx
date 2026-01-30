/* eslint-disable @typescript-eslint/no-unused-vars */
/* eslint-disable @typescript-eslint/no-explicit-any */
'use client';

import { useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { useAuth } from '@/hooks/useAuth';
import { useLocation } from '@/hooks/useLocation';
import { restaurantService } from '@/services/restaurants';
import { locationService } from '@/services/location';
import DashboardLayout from '@/components/layouts/DashboardLayout';
import { ArrowLeft, MapPin, Clock, Star, ShoppingCart, Plus, Minus, Search } from 'lucide-react';
import { toast } from 'react-toastify';
import Image from 'next/image';

interface CartItem {
  id: string;
  name: string;
  price: number;
  quantity: number;
  image_url?: string;
}

export default function RestaurantDetailPage() {
  const params = useParams();
  const router = useRouter();
  const { user } = useAuth();
  const { location } = useLocation();
  const [restaurant, setRestaurant] = useState<any>(null);
  const [menuItems, setMenuItems] = useState<any>({});
  const [loading, setLoading] = useState(true);
  const [cart, setCart] = useState<CartItem[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<string>('All');

  useEffect(() => {
    if (params.id) {
      loadRestaurant();
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [params.id]);

  const loadRestaurant = async () => {
    try {
      const data = await restaurantService.getRestaurantById(params.id as string);
      setRestaurant(data);

      const items = await restaurantService.getMenuItemsByCategory(params.id as string);
      setMenuItems(items);
    } catch (error) {
      console.error('Failed to load restaurant:', error);
      toast.error('Failed to load restaurant');
    } finally {
      setLoading(false);
    }
  };

  const getDistance = () => {
    if (!location || !restaurant) return 0;
    return locationService.calculateDistance(
      location.lat,
      location.lon,
      restaurant.latitude,
      restaurant.longitude
    );
  };

  const getDeliveryCharge = () => {
    return locationService.calculateDeliveryCharge(getDistance());
  };

  const addToCart = (item: any) => {
    const existing = cart.find((i) => i.id === item.id);
    if (existing) {
      setCart(cart.map((i) => 
        i.id === item.id ? { ...i, quantity: i.quantity + 1 } : i
      ));
    } else {
      setCart([...cart, {
        id: item.id,
        name: item.name,
        price: item.price,
        quantity: 1,
        image_url: item.image_url,
      }]);
    }
    toast.success('Added to cart');
  };

  const removeFromCart = (itemId: string) => {
    const existing = cart.find((i) => i.id === itemId);
    if (existing && existing.quantity > 1) {
      setCart(cart.map((i) => 
        i.id === itemId ? { ...i, quantity: i.quantity - 1 } : i
      ));
    } else {
      setCart(cart.filter((i) => i.id !== itemId));
    }
  };

  const getCartQuantity = (itemId: string) => {
    const item = cart.find((i) => i.id === itemId);
    return item ? item.quantity : 0;
  };

  const getCartTotal = () => {
    return cart.reduce((total, item) => total + (item.price * item.quantity), 0);
  };

  const getTotalWithDelivery = () => {
    return getCartTotal() + getDeliveryCharge();
  };

  const handleCheckout = () => {
    if (cart.length === 0) {
      toast.error('Your cart is empty');
      return;
    }
    
    // Store cart in sessionStorage
    sessionStorage.setItem('cart', JSON.stringify({
      items: cart,
      restaurant_id: restaurant.id,
      restaurant_name: restaurant.business_name,
      delivery_charge: getDeliveryCharge(),
    }));

    router.push('/customer/checkout');
  };

  const categories = ['All', ...Object.keys(menuItems)];

  const filteredItems = () => {
    let items: any[] = [];
    
    if (selectedCategory === 'All') {
      items = Object.values(menuItems).flat() as any[];
    } else {
      items = menuItems[selectedCategory] || [];
    }

    if (searchQuery) {
      items = items.filter((item: any) =>
        item.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        item.description?.toLowerCase().includes(searchQuery.toLowerCase())
      );
    }

    return items;
  };

  if (loading) {
    return (
      <DashboardLayout>
        <div className="max-w-7xl mx-auto px-4 py-8">
          <div className="bg-gray-200 h-96 rounded-lg animate-pulse" />
        </div>
      </DashboardLayout>
    );
  }

  if (!restaurant) {
    return (
      <DashboardLayout>
        <div className="max-w-7xl mx-auto px-4 py-8 text-center">
          <p className="text-gray-600">Restaurant not found</p>
        </div>
      </DashboardLayout>
    );
  }

  return (
    <DashboardLayout>
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Header */}
        <div className="flex items-center gap-4 mb-6">
          <button
            onClick={() => router.back()}
            className="p-2 hover:bg-gray-100 rounded-lg"
          >
            <ArrowLeft size={24} />
          </button>
          <h1 className="text-3xl font-bold text-gray-900">{restaurant.business_name}</h1>
        </div>

        {/* Restaurant Banner */}
        <div className="bg-white rounded-lg shadow-lg overflow-hidden mb-6">
          {restaurant.banner_url ? (
            <div className="relative h-64">
              <Image
                src={restaurant.banner_url}
                alt={restaurant.business_name}
                fill
                className="object-cover"
              />
            </div>
          ) : (
            <div className="h-64 bg-gradient-to-br from-orange-400 to-pink-500" />
          )}

          <div className="p-6">
            <div className="flex items-start justify-between mb-4">
              <div className="flex-1">
                <p className="text-gray-700 mb-3">{restaurant.description}</p>
                
                <div className="flex flex-wrap gap-2 mb-3">
                  {restaurant.cuisine_types?.map((cuisine: string, index: number) => (
                    <span
                      key={index}
                      className="px-3 py-1 bg-orange-100 text-orange-800 text-sm rounded-full"
                    >
                      {cuisine}
                    </span>
                  ))}
                </div>

                <div className="flex items-center gap-6 text-sm text-gray-600">
                  <div className="flex items-center gap-2">
                    <MapPin size={16} />
                    <span>{getDistance().toFixed(1)} km away</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <Clock size={16} />
                    <span>30-40 min</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <Star size={16} className="text-yellow-600" fill="currentColor" />
                    <span>4.5</span>
                  </div>
                </div>
              </div>

              <div className="text-right">
                <p className="text-sm text-gray-600 mb-1">Delivery Fee</p>
                <p className="text-2xl font-bold text-primary">
                  ₹{getDeliveryCharge()}
                </p>
              </div>
            </div>
          </div>
        </div>

        <div className="grid lg:grid-cols-3 gap-6">
          {/* Menu Section */}
          <div className="lg:col-span-2">
            {/* Search & Categories */}
            <div className="bg-white rounded-lg shadow p-4 mb-6">
              <div className="relative mb-4">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={20} />
                <input
                  type="text"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder="Search menu items..."
                  className="w-full pl-10 pr-4 py-3 border rounded-lg focus:ring-2 focus:ring-primary"
                />
              </div>

              <div className="flex gap-2 overflow-x-auto pb-2">
                {categories.map((category) => (
                  <button
                    key={category}
                    onClick={() => setSelectedCategory(category)}
                    className={`px-4 py-2 rounded-lg whitespace-nowrap font-medium ${
                      selectedCategory === category
                        ? 'bg-primary text-white'
                        : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                    }`}
                  >
                    {category}
                  </button>
                ))}
              </div>
            </div>

            {/* Menu Items */}
            <div className="space-y-4">
              {filteredItems().map((item: any) => (
                <div
                  key={item.id}
                  className="bg-white rounded-lg shadow p-4 flex gap-4"
                >
                  {item.image_url && (
                    <div className="relative w-24 h-24 flex-shrink-0">
                      <Image
                        src={item.image_url}
                        alt={item.name}
                        fill
                        className="object-cover rounded-lg"
                      />
                    </div>
                  )}

                  <div className="flex-1">
                    <h3 className="font-bold text-lg text-gray-900 mb-1">{item.name}</h3>
                    <p className="text-sm text-gray-600 mb-2">{item.description}</p>
                    <p className="text-xl font-bold text-primary">₹{item.price}</p>
                  </div>

                  <div className="flex flex-col items-end justify-between">
                    {item.is_available ? (
                      getCartQuantity(item.id) > 0 ? (
                        <div className="flex items-center gap-3 bg-primary rounded-lg">
                          <button
                            onClick={() => removeFromCart(item.id)}
                            className="text-white px-3 py-2 hover:bg-orange-600 rounded-l-lg"
                          >
                            <Minus size={18} />
                          </button>
                          <span className="text-white font-bold">
                            {getCartQuantity(item.id)}
                          </span>
                          <button
                            onClick={() => addToCart(item)}
                            className="text-white px-3 py-2 hover:bg-orange-600 rounded-r-lg"
                          >
                            <Plus size={18} />
                          </button>
                        </div>
                      ) : (
                        <button
                          onClick={() => addToCart(item)}
                          className="bg-primary text-white px-6 py-2 rounded-lg hover:bg-orange-600 font-medium flex items-center gap-2"
                        >
                          <Plus size={18} />
                          Add
                        </button>
                      )
                    ) : (
                      <span className="text-red-600 font-medium">Not Available</span>
                    )}
                  </div>
                </div>
              ))}
            </div>

            {filteredItems().length === 0 && (
              <div className="text-center py-12 bg-white rounded-lg">
                <p className="text-gray-600">No menu items found</p>
              </div>
            )}
          </div>

          {/* Cart Sidebar */}
          <div className="lg:col-span-1">
            <div className="bg-white rounded-lg shadow p-6 sticky top-4">
              <h3 className="text-xl font-bold text-gray-900 mb-4 flex items-center gap-2">
                <ShoppingCart size={24} />
                Your Cart
              </h3>

              {cart.length > 0 ? (
                <>
                  <div className="space-y-3 mb-4 max-h-96 overflow-y-auto">
                    {cart.map((item) => (
                      <div key={item.id} className="flex items-center justify-between py-2 border-b">
                        <div className="flex-1">
                          <p className="font-semibold text-gray-900">{item.name}</p>
                          <p className="text-sm text-gray-600">₹{item.price} × {item.quantity}</p>
                        </div>
                        <div className="flex items-center gap-2">
                          <button
                            onClick={() => removeFromCart(item.id)}
                            className="text-gray-600 hover:text-primary p-1"
                          >
                            <Minus size={16} />
                          </button>
                          <span className="font-bold">{item.quantity}</span>
                          <button
                            onClick={() => addToCart(item)}
                            className="text-gray-600 hover:text-primary p-1"
                          >
                            <Plus size={16} />
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>

                  <div className="space-y-2 mb-4 pt-4 border-t">
                    <div className="flex justify-between text-gray-700">
                      <span>Subtotal</span>
                      <span>₹{getCartTotal()}</span>
                    </div>
                    <div className="flex justify-between text-gray-700">
                      <span>Delivery Fee</span>
                      <span>₹{getDeliveryCharge()}</span>
                    </div>
                    <div className="flex justify-between text-xl font-bold text-gray-900 pt-2 border-t">
                      <span>Total</span>
                      <span>₹{getTotalWithDelivery()}</span>
                    </div>
                  </div>

                  <button
                    onClick={handleCheckout}
                    className="w-full bg-primary text-white px-6 py-4 rounded-lg hover:bg-orange-600 font-bold text-lg"
                  >
                    Proceed to Checkout
                  </button>
                </>
              ) : (
                <div className="text-center py-8">
                  <ShoppingCart size={48} className="mx-auto text-gray-400 mb-3" />
                  <p className="text-gray-600">Your cart is empty</p>
                  <p className="text-sm text-gray-500 mt-1">Add items to get started</p>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </DashboardLayout>
  );
}
