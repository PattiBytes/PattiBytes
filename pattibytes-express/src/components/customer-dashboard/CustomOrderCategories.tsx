'use client';

import { useRouter } from 'next/navigation';
import { Sparkles, Milk, ShoppingCart, Pill } from 'lucide-react';

const CATEGORIES = [
  {
    id: 'custom',
    icon: Sparkles,
    title: 'Custom Order',
    description: 'Special requests',
    color: 'from-purple-500 to-pink-600',
    bgColor: 'bg-purple-50',
  },
  {
    id: 'dairy',
    icon: Milk,
    title: 'Dairy',
    description: 'Fresh dairy products',
    color: 'from-blue-500 to-cyan-600',
    bgColor: 'bg-blue-50',
  },
  {
    id: 'grocery',
    icon: ShoppingCart,
    title: 'Grocery',
    description: 'Daily essentials',
    color: 'from-green-500 to-emerald-600',
    bgColor: 'bg-green-50',
  },
  {
    id: 'medicines',
    icon: Pill,
    title: 'Medicines',
    description: 'Pharmacy items',
    color: 'from-red-500 to-rose-600',
    bgColor: 'bg-red-50',
  },
];

export default function CustomOrderCategories() {
  const router = useRouter();

  return (
    <div className="bg-white rounded-2xl shadow-lg border border-gray-200 p-4 mb-6 animate-in fade-in duration-500">
      <div className="flex items-center gap-2 mb-3">
        <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-orange-500 to-pink-600 flex items-center justify-center shadow-md">
          <Sparkles className="w-4 h-4 text-white" />
        </div>
        <h2 className="text-base font-black text-gray-900">Quick Orders</h2>
      </div>

      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        {CATEGORIES.map((cat) => {
          const Icon = cat.icon;
          return (
            <button
              key={cat.id}
              onClick={() => router.push(`/customer/custom-order?category=${cat.id}`)}
              className={`${cat.bgColor} border border-gray-200 rounded-xl p-3 text-center hover:shadow-lg hover:scale-105 transition-all group`}
            >
              <div
                className={`w-10 h-10 rounded-lg bg-gradient-to-br ${cat.color} flex items-center justify-center shadow-md mx-auto mb-2 group-hover:scale-110 transition-transform`}
              >
                <Icon className="w-5 h-5 text-white" />
              </div>
              <p className="text-xs font-bold text-gray-900 mb-0.5">{cat.title}</p>
              <p className="text-xs text-gray-600">{cat.description}</p>
            </button>
          );
        })}
      </div>

      <p className="text-xs text-gray-500 text-center mt-3">
        💡 Browse products or request custom items
      </p>
    </div>
  );
}
