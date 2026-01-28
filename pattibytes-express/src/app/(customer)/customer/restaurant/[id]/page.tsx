/* eslint-disable @typescript-eslint/no-explicit-any */
'use client';

import { useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { restaurantService } from '@/services/restaurants';
import { Star, Clock, MapPin, ArrowLeft, ShoppingCart } from 'lucide-react';
import Image from 'next/image';
import { MenuItem } from '@/types';
import { toast } from 'react-toastify';

interface CartItem extends MenuItem {
  quantity: number;
}

export default function RestaurantDetailPage() {
  const params = useParams();
  const router = useRouter();
   
  const [restaurant, setRestaurant] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [cart, setCart] = useState<CartItem[]>([]);
  const [selectedCategory, setSelectedCategory] = useState<string>('all');

  useEffect(() => {
    const loadRestaurant = async () => {
      try {
        const data = await restaurantService.getRestaurantById(params.id as string);
        setRestaurant(data);
      // eslint-disable-next-line @typescript-eslint/no-unused-vars
      } catch (error) {
        toast.error('Failed to load restaurant');
        router.push('/customer/dashboard');
      } finally {
        setLoading(false);
      }
    };

    loadRestaurant();
  }, [params.id, router]);

  const addToCart = (item: MenuItem) => {
    setCart((prevCart) => {
      const existing = prevCart.find((i) => i.id === item.id);
      if (existing) {
        return prevCart.map((i) =>
          i.id === item.id ? { ...i, quantity: i.quantity + 1 } : i
        );
      }
      return [...prevCart, { ...item, quantity: 1 }];
    });
    toast.success('Added to cart!');
  };

  const removeFromCart = (itemId: string) => {
    setCart((prevCart) => {
      const existing = prevCart.find((i) => i.id === itemId);
      if (existing && existing.quantity > 1) {
        return prevCart.map((i) =>
          i.id === itemId ? { ...i, quantity: i.quantity - 1 } : i
        );
      }
      return prevCart.filter((i) => i.id !== itemId);
    });
  };

  const cartTotal = cart.reduce((sum, item) => sum + item.price * item.quantity, 0);
  const cartCount = cart.reduce((sum, item) => sum + item.quantity, 0);

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary"></div>
      </div>
    );
  }

  if (!restaurant) {
    return <div>Restaurant not found</div>;
  }

   
   
  const allItems = restaurant.menu_categories?.flatMap((c: any) => 
     
    c.menu_items?.map((item: any) => ({ ...item, category_name: c.name })) || []
  ) || [];

  const filteredItems = selectedCategory === 'all' 
    ? allItems 
     
    : allItems.filter((item: any) => item.category_id === selectedCategory);

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <header className="bg-white shadow-sm sticky top-0 z-40">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
          <div className="flex items-center justify-between">
            <button
              onClick={() => router.back()}
              className="flex items-center gap-2 text-gray-700 hover:text-primary"
            >
              <ArrowLeft size={20} />
              <span className="font-medium">Back</span>
            </button>

            {cartCount > 0 && (
              <button
                onClick={() => router.push(`/customer/cart?restaurant=${params.id}`)}
                className="relative bg-primary text-white px-6 py-2 rounded-lg hover:bg-orange-600 flex items-center gap-2"
              >
                <ShoppingCart size={20} />
                <span className="font-medium">
                  {cartCount} items • ₹{cartTotal.toFixed(0)}
                </span>
              </button>
            )}
          </div>
        </div>
      </header>

      {/* Restaurant Info */}
      <div className="bg-white border-b">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          <div className="flex gap-6">
            {restaurant.logo_url && (
              <div className="w-24 h-24 rounded-xl overflow-hidden flex-shrink-0">
                <Image
                  src={restaurant.logo_url}
                  alt={restaurant.business_name}
                  width={96}
                  height={96}
                  className="object-cover"
                />
              </div>
            )}
            
            <div className="flex-1">
              <h1 className="text-3xl font-bold text-gray-900">
                {restaurant.business_name}
              </h1>
              <p className="text-gray-600 mt-1">
                {restaurant.cuisine_types?.join(', ') || 'Multi-cuisine'}
              </p>

              <div className="flex items-center gap-6 mt-4">
                <div className="flex items-center gap-1">
                  <Star className="fill-yellow-400 text-yellow-400" size={18} />
                  <span className="font-semibold">{restaurant.average_rating.toFixed(1)}</span>
                  <span className="text-gray-600">({restaurant.total_reviews} reviews)</span>
                </div>

                <div className="flex items-center gap-1 text-gray-600">
                  <Clock size={18} />
                  <span>{restaurant.estimated_prep_time} min</span>
                </div>

                <div className="flex items-center gap-1 text-gray-600">
                  <MapPin size={18} />
                  <span>{restaurant.delivery_radius_km}km radius</span>
                </div>
              </div>

              {restaurant.description && (
                <p className="text-gray-700 mt-4">{restaurant.description}</p>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Menu */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Category Filter */}
        <div className="flex gap-2 mb-8 overflow-x-auto pb-2">
          <button
            onClick={() => setSelectedCategory('all')}
            className={`px-4 py-2 rounded-lg font-medium whitespace-nowrap ${
              selectedCategory === 'all'
                ? 'bg-primary text-white'
                : 'bg-white text-gray-700 hover:bg-gray-100'
            }`}
          >
            All Items
          </button>
          {restaurant.menu_categories?.map((category: any) => (
            <button
              key={category.id}
              onClick={() => setSelectedCategory(category.id)}
              className={`px-4 py-2 rounded-lg font-medium whitespace-nowrap ${
                selectedCategory === category.id
                  ? 'bg-primary text-white'
                  : 'bg-white text-gray-700 hover:bg-gray-100'
              }`}
            >
              {category.name}
            </button>
          ))}
        </div>

        {/* Menu Items */}
        <div className="grid gap-4">
          {filteredItems.map((item: any) => {
            const cartItem = cart.find((i) => i.id === item.id);
            const quantity = cartItem?.quantity || 0;

            return (
              <div
                key={item.id}
                className="bg-white rounded-lg shadow p-4 flex gap-4"
              >
                {item.image_url && (
                  <div className="w-24 h-24 rounded-lg overflow-hidden flex-shrink-0">
                    <Image
                      src={item.image_url}
                      alt={item.name}
                      width={96}
                      height={96}
                      className="object-cover"
                    />
                  </div>
                )}

                <div className="flex-1">
                  <div className="flex items-start justify-between">
                    <div>
                      <h3 className="font-bold text-gray-900">{item.name}</h3>
                      <p className="text-sm text-gray-600 mt-1">
                        {item.description}
                      </p>
                      <p className="text-lg font-bold text-primary mt-2">
                        ₹{item.price}
                      </p>
                    </div>

                    {quantity > 0 ? (
                      <div className="flex items-center gap-3 bg-primary rounded-lg px-3 py-2">
                        <button
                          onClick={() => removeFromCart(item.id)}
                          className="text-white font-bold text-xl"
                        >
                          −
                        </button>
                        <span className="text-white font-bold w-6 text-center">
                          {quantity}
                        </span>
                        <button
                          onClick={() => addToCart(item)}
                          className="text-white font-bold text-xl"
                        >
                          +
                        </button>
                      </div>
                    ) : (
                      <button
                        onClick={() => addToCart(item)}
                        className="bg-primary text-white px-6 py-2 rounded-lg hover:bg-orange-600 font-medium"
                      >
                        Add
                      </button>
                    )}
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Floating Cart Button (Mobile) */}
      {cartCount > 0 && (
        <div className="fixed bottom-6 left-1/2 transform -translate-x-1/2 lg:hidden z-50">
          <button
            onClick={() => router.push(`/customer/cart?restaurant=${params.id}`)}
            className="bg-primary text-white px-8 py-4 rounded-full shadow-2xl flex items-center gap-3"
          >
            <ShoppingCart size={24} />
            <span className="font-bold text-lg">
              {cartCount} items • ₹{cartTotal.toFixed(0)}
            </span>
          </button>
        </div>
      )}
    </div>
  );
}
