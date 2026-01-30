/* eslint-disable @typescript-eslint/no-unused-vars */
/* eslint-disable @typescript-eslint/no-explicit-any */
'use client';

import { useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { useAuth } from '@/hooks/useAuth';
import { supabase } from '@/lib/supabase';
import { restaurantService } from '@/services/restaurants';
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
  Percent
} from 'lucide-react';
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
  const [restaurant, setRestaurant] = useState<any>(null);
  const [menuByCategory, setMenuByCategory] = useState<any>({});
  const [cart, setCart] = useState<CartItem[]>([]);
  const [promoCode, setPromoCode] = useState('');
  const [appliedPromo, setAppliedPromo] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [showCart, setShowCart] = useState(false);

  useEffect(() => {
    if (params.id) {
      loadRestaurantData();
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [params.id]);

  const loadRestaurantData = async () => {
    try {
      const [restaurantData, menuData] = await Promise.all([
        restaurantService.getRestaurantById(params.id as string),
        restaurantService.getMenuItemsByCategory(params.id as string),
      ]);

      setRestaurant(restaurantData);
      setMenuByCategory(menuData);
    } catch (error) {
      console.error('Failed to load restaurant:', error);
      toast.error('Failed to load restaurant details');
    } finally {
      setLoading(false);
    }
  };

  const addToCart = (item: any) => {
    const existing = cart.find((c) => c.id === item.id);
    
    if (existing) {
      setCart(cart.map((c) => 
        c.id === item.id ? { ...c, quantity: c.quantity + 1 } : c
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
    
    toast.success(`${item.name} added to cart!`);
  };

  const removeFromCart = (itemId: string) => {
    const existing = cart.find((c) => c.id === itemId);
    
    if (existing && existing.quantity > 1) {
      setCart(cart.map((c) => 
        c.id === itemId ? { ...c, quantity: c.quantity - 1 } : c
      ));
    } else {
      setCart(cart.filter((c) => c.id !== itemId));
    }
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
        .single();

      if (error || !data) {
        toast.error('Invalid or expired promo code');
        return;
      }

      // Check if minimum order value is met
      if (data.min_order_value && calculateSubtotal() < data.min_order_value) {
        toast.error(`Minimum order value of ₹${data.min_order_value} required`);
        return;
      }

      setAppliedPromo(data);
      toast.success(`Promo code applied! You save ₹${calculateDiscount(data)}`);
    } catch (error) {
      toast.error('Failed to apply promo code');
    }
  };

  const calculateSubtotal = () => {
    return cart.reduce((sum, item) => sum + (item.price * item.quantity), 0);
  };

  const calculateDiscount = (promo: any) => {
    if (!promo) return 0;
    
    const subtotal = calculateSubtotal();
    
    if (promo.discount_type === 'percentage') {
      const discount = (subtotal * promo.discount_value) / 100;
      return Math.min(discount, promo.max_discount || Infinity);
    } else {
      return promo.discount_value;
    }
  };

  const calculateTotal = () => {
    const subtotal = calculateSubtotal();
    const discount = appliedPromo ? calculateDiscount(appliedPromo) : 0;
    const deliveryFee = 30;
    const gst = (subtotal - discount) * 0.05; // 5% GST
    
    return subtotal - discount + deliveryFee + gst;
  };

  const handleCheckout = () => {
    if (cart.length === 0) {
      toast.error('Your cart is empty');
      return;
    }

    // Store cart and navigate to checkout
    localStorage.setItem('checkout_cart', JSON.stringify({
      items: cart,
      restaurant_id: params.id,
      restaurant_name: restaurant.business_name,
      promo: appliedPromo,
      subtotal: calculateSubtotal(),
      discount: appliedPromo ? calculateDiscount(appliedPromo) : 0,
      total: calculateTotal(),
    }));

    router.push('/customer/checkout');
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
        <button
          onClick={() => router.back()}
          className="flex items-center gap-2 text-gray-600 hover:text-gray-900 mb-6"
        >
          <ArrowLeft size={20} />
          <span>Back to Restaurants</span>
        </button>

        {/* Restaurant Info */}
        <div className="bg-white rounded-lg shadow-lg overflow-hidden mb-8">
          {restaurant.banner_url && (
            <div className="relative h-64">
              <Image
                src={restaurant.banner_url}
                alt={restaurant.business_name}
                fill
                className="object-cover"
              />
            </div>
          )}

          <div className="p-6">
            <div className="flex items-start justify-between mb-4">
              <div className="flex-1">
                <h1 className="text-3xl font-bold text-gray-900 mb-2">
                  {restaurant.business_name}
                </h1>
                <p className="text-gray-600 mb-3">{restaurant.description}</p>
                
                <div className="flex flex-wrap gap-2 mb-4">
                  {restaurant.cuisine_types?.map((cuisine: string, index: number) => (
                    <span
                      key={index}
                      className="px-3 py-1 bg-orange-100 text-orange-800 rounded-full text-sm font-medium"
                    >
                      {cuisine}
                    </span>
                  ))}
                </div>

                <div className="flex items-center gap-6 text-sm">
                  <div className="flex items-center gap-1 text-yellow-600">
                    <Star size={18} fill="currentColor" />
                    <span className="font-bold">4.5</span>
                    <span className="text-gray-600">(200+ ratings)</span>
                  </div>
                  <div className="flex items-center gap-1 text-gray-600">
                    <Clock size={18} />
                    <span>30-40 min</span>
                  </div>
                  <div className="flex items-center gap-1 text-gray-600">
                    <MapPin size={18} />
                    <span>2.5 km away</span>
                  </div>
                </div>
              </div>
            </div>

            {/* Active Offers */}
            {restaurant.active_offers && restaurant.active_offers.length > 0 && (
              <div className="bg-green-50 border-2 border-green-200 rounded-lg p-4">
                <div className="flex items-center gap-2 mb-2">
                  <Percent className="text-green-600" size={20} />
                  <h3 className="font-bold text-green-900">Active Offers</h3>
                </div>
                <div className="space-y-2">
                  {restaurant.active_offers.map((offer: any, index: number) => (
                    <div key={index} className="flex items-center gap-2">
                      <Tag size={14} className="text-green-600" />
                      <span className="text-sm text-green-800">{offer.description}</span>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Menu */}
        <div className="grid lg:grid-cols-3 gap-8">
          <div className="lg:col-span-2">
            <h2 className="text-2xl font-bold text-gray-900 mb-6">Menu</h2>
            
            {Object.keys(menuByCategory).length > 0 ? (
              <div className="space-y-8">
                {Object.entries(menuByCategory).map(([category, items]: [string, any]) => (
                  <div key={category}>
                    <h3 className="text-xl font-bold text-gray-900 mb-4 pb-2 border-b-2 border-primary">
                      {category}
                    </h3>
                    <div className="grid md:grid-cols-2 gap-4">
                      {items.map((item: any) => (
                        <div
                          key={item.id}
                          className="bg-white rounded-lg shadow hover:shadow-lg transition-shadow p-4 flex gap-4"
                        >
                          {item.image_url && (
                            <div className="relative w-24 h-24 flex-shrink-0 rounded-lg overflow-hidden">
                              <Image
                                src={item.image_url}
                                alt={item.name}
                                fill
                                className="object-cover"
                              />
                            </div>
                          )}
                          
                          <div className="flex-1">
                            <h4 className="font-bold text-gray-900 mb-1">{item.name}</h4>
                            <p className="text-sm text-gray-600 mb-2 line-clamp-2">
                              {item.description}
                            </p>
                            <div className="flex items-center justify-between">
                              <p className="text-xl font-bold text-primary">₹{item.price}</p>
                              
                              {cart.find((c) => c.id === item.id) ? (
                                <div className="flex items-center gap-2 bg-primary text-white rounded-lg">
                                  <button
                                    onClick={() => removeFromCart(item.id)}
                                    className="px-3 py-1 hover:bg-orange-600"
                                  >
                                    <Minus size={16} />
                                  </button>
                                  <span className="font-bold">
                                    {cart.find((c) => c.id === item.id)?.quantity}
                                  </span>
                                  <button
                                    onClick={() => addToCart(item)}
                                    className="px-3 py-1 hover:bg-orange-600"
                                  >
                                    <Plus size={16} />
                                  </button>
                                </div>
                              ) : (
                                <button
                                  onClick={() => addToCart(item)}
                                  disabled={!item.is_available}
                                  className="bg-primary text-white px-4 py-2 rounded-lg hover:bg-orange-600 font-medium flex items-center gap-2 disabled:opacity-50"
                                >
                                  <Plus size={16} />
                                  Add
                                </button>
                              )}
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="text-center py-12 bg-white rounded-lg">
                <p className="text-gray-600">No menu items available</p>
              </div>
            )}
          </div>

          {/* Cart Sidebar */}
          <div className="lg:col-span-1">
            <div className="bg-white rounded-lg shadow-lg p-6 sticky top-8">
              <div className="flex items-center gap-2 mb-6">
                <ShoppingCart className="text-primary" size={24} />
                <h3 className="text-xl font-bold text-gray-900">Your Cart</h3>
                <span className="ml-auto bg-primary text-white px-2 py-1 rounded-full text-sm">
                  {cart.reduce((sum, item) => sum + item.quantity, 0)}
                </span>
              </div>

              {cart.length > 0 ? (
                <>
                  <div className="space-y-3 mb-6 max-h-64 overflow-y-auto">
                    {cart.map((item) => (
                      <div key={item.id} className="flex items-center gap-3 pb-3 border-b">
                        {item.image_url && (
                          <div className="relative w-12 h-12 flex-shrink-0 rounded overflow-hidden">
                            <Image
                              src={item.image_url}
                              alt={item.name}
                              fill
                              className="object-cover"
                            />
                          </div>
                        )}
                        <div className="flex-1 min-w-0">
                          <p className="font-semibold text-gray-900 truncate">{item.name}</p>
                          <p className="text-sm text-gray-600">₹{item.price} × {item.quantity}</p>
                        </div>
                        <p className="font-bold text-primary">₹{item.price * item.quantity}</p>
                      </div>
                    ))}
                  </div>

                  {/* Promo Code */}
                  <div className="mb-6">
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Have a promo code?
                    </label>
                    <div className="flex gap-2">
                      <input
                        type="text"
                        value={promoCode}
                        onChange={(e) => setPromoCode(e.target.value.toUpperCase())}
                        placeholder="Enter code"
                        className="flex-1 px-3 py-2 border rounded-lg focus:ring-2 focus:ring-primary"
                      />
                      <button
                        onClick={applyPromoCode}
                        className="bg-green-600 text-white px-4 py-2 rounded-lg hover:bg-green-700 font-medium"
                      >
                        Apply
                      </button>
                    </div>
                    {appliedPromo && (
                      <p className="text-sm text-green-600 mt-2">
                        ✓ {appliedPromo.code} applied - Save ₹{calculateDiscount(appliedPromo)}
                      </p>
                    )}
                  </div>

                  {/* Bill Summary */}
                  <div className="space-y-2 mb-6 pb-6 border-b">
                    <div className="flex justify-between text-sm">
                      <span className="text-gray-600">Subtotal</span>
                      <span className="font-semibold">₹{calculateSubtotal()}</span>
                    </div>
                    {appliedPromo && (
                      <div className="flex justify-between text-sm text-green-600">
                        <span>Discount</span>
                        <span className="font-semibold">-₹{calculateDiscount(appliedPromo)}</span>
                      </div>
                    )}
                    <div className="flex justify-between text-sm">
                      <span className="text-gray-600">Delivery Fee</span>
                      <span className="font-semibold">₹30</span>
                    </div>
                    <div className="flex justify-between text-sm">
                      <span className="text-gray-600">GST (5%)</span>
                      <span className="font-semibold">
                        ₹{((calculateSubtotal() - (appliedPromo ? calculateDiscount(appliedPromo) : 0)) * 0.05).toFixed(2)}
                      </span>
                    </div>
                  </div>

                  <div className="flex justify-between mb-6">
                    <span className="text-lg font-bold text-gray-900">Total</span>
                    <span className="text-2xl font-bold text-primary">₹{calculateTotal().toFixed(2)}</span>
                  </div>

                  <button
                    onClick={handleCheckout}
                    className="w-full bg-primary text-white py-4 rounded-lg hover:bg-orange-600 font-bold text-lg shadow-lg"
                  >
                    Proceed to Checkout
                  </button>
                </>
              ) : (
                <div className="text-center py-8">
                  <ShoppingCart size={48} className="mx-auto text-gray-400 mb-3" />
                  <p className="text-gray-600">Your cart is empty</p>
                  <p className="text-sm text-gray-500 mt-1">Add items from the menu</p>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </DashboardLayout>
  );
}
