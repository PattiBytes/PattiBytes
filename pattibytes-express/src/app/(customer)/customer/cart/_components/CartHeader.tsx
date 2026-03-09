'use client';

import { ArrowLeft, Trash2 } from 'lucide-react';

interface Props {
  itemCount:     number;
  onBack:        () => void;
  onClearCart:   () => void;
}

export function CartHeader({ itemCount, onBack, onClearCart }: Props) {
  return (
    <div className="flex items-center justify-between mb-6">
      <div className="flex items-center gap-4">
        <button onClick={onBack} className="p-2 hover:bg-gray-100 rounded-lg transition-colors">
          <ArrowLeft className="w-6 h-6" />
        </button>
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Your Cart</h1>
          <p className="text-sm text-gray-600">{itemCount} {itemCount === 1 ? 'item' : 'items'}</p>
        </div>
      </div>
      <button
        onClick={onClearCart}
        className="text-red-600 hover:bg-red-50 px-4 py-2 rounded-lg
                   transition-colors flex items-center gap-2"
      >
        <Trash2 className="w-4 h-4" />
        <span className="hidden sm:inline">Clear Cart</span>
      </button>
    </div>
  );
}
