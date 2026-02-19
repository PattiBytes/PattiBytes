'use client';

// eslint-disable-next-line @typescript-eslint/no-unused-vars
import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Sparkles, ChefHat, MessageCircle, ArrowRight, Flame, Gift } from 'lucide-react';

interface CustomOrderSectionProps {
  onOpenCustomOrder: () => void;
}

export default function CustomOrderSection({ onOpenCustomOrder }: CustomOrderSectionProps) {
  const router = useRouter();

  const categories = [
    {
      id: 'birthday',
      icon: Gift,
      title: 'Birthday Specials',
      description: 'Custom cakes & party orders',
      color: 'from-pink-500 to-purple-600',
      bgColor: 'from-pink-50 to-purple-50',
    },
    {
      id: 'bulk',
      icon: ChefHat,
      title: 'Bulk Orders',
      description: 'Events & corporate catering',
      color: 'from-orange-500 to-red-600',
      bgColor: 'from-orange-50 to-red-50',
    },
    {
      id: 'custom',
      icon: Sparkles,
      title: 'Custom Menu',
      description: 'Tell us what you want',
      color: 'from-blue-500 to-cyan-600',
      bgColor: 'from-blue-50 to-cyan-50',
    },
  ];

  return (
    <div className="bg-white rounded-3xl shadow-xl border-2 border-gray-200 p-4 sm:p-6 animate-in fade-in duration-500">
      {/* Header */}
      <div className="flex items-center justify-between gap-2 mb-4">
        <div className="min-w-0">
          <h2 className="text-lg sm:text-xl font-black text-gray-900 flex items-center gap-2">
            <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-yellow-400 to-orange-500 flex items-center justify-center shadow-lg">
              <Flame className="w-5 h-5 text-white" />
            </div>
            Special Orders
          </h2>
          <p className="text-xs text-gray-700 font-semibold mt-1">Custom orders for any occasion</p>
        </div>
      </div>

      {/* Categories Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 mb-4">
        {categories.map((cat) => {
          const Icon = cat.icon;
          return (
            <button
              key={cat.id}
              onClick={() => router.push(`/customer/custom-order?category=${cat.id}`)}
              className={`group relative overflow-hidden rounded-2xl border-2 border-gray-200 hover:border-primary transition-all hover:shadow-lg hover:scale-105 bg-gradient-to-br ${cat.bgColor} p-4 text-left`}
            >
              <div className={`w-12 h-12 rounded-xl bg-gradient-to-br ${cat.color} flex items-center justify-center shadow-md mb-3 group-hover:scale-110 transition-transform`}>
                <Icon className="w-6 h-6 text-white" />
              </div>
              <h3 className="font-bold text-gray-900 text-sm mb-1">{cat.title}</h3>
              <p className="text-xs text-gray-600">{cat.description}</p>
            </button>
          );
        })}
      </div>

      {/* Main CTA */}
      <button
        onClick={onOpenCustomOrder}
        className="w-full bg-gradient-to-r from-primary to-pink-600 text-white py-4 rounded-2xl font-black text-base hover:shadow-2xl transition-all hover:scale-105 flex items-center justify-center gap-2 animate-pulse-slow"
      >
        <MessageCircle className="w-5 h-5" />
        Place Custom Order
        <ArrowRight className="w-5 h-5" />
      </button>

      <p className="text-xs text-gray-500 text-center mt-3">
        💡 Min order value may apply for custom orders
      </p>
    </div>
  );
}
