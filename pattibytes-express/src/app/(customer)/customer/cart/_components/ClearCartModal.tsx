'use client';

import { Trash2 } from 'lucide-react';

interface Props {
  onConfirm: () => void;
  onCancel:  () => void;
}

export function ClearCartModal({ onConfirm, onCancel }: Props) {
  return (
    <>
      <div className="fixed inset-0 bg-black/50 z-50" onClick={onCancel} />
      <div className="fixed top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2
                      w-full max-w-md bg-white rounded-2xl shadow-2xl z-50 p-6 mx-4">
        <div className="text-center mb-6">
          <div className="w-16 h-16 bg-red-100 rounded-full flex items-center
                          justify-center mx-auto mb-4">
            <Trash2 className="w-8 h-8 text-red-600" />
          </div>
          <h2 className="text-xl font-bold text-gray-900 mb-2">Clear Cart?</h2>
          <p className="text-gray-600">
            Are you sure you want to remove all items from your cart?
          </p>
        </div>
        <div className="flex gap-3">
          <button
            onClick={onCancel}
            className="flex-1 px-6 py-3 border-2 border-gray-300 rounded-xl
                       hover:bg-gray-50 font-semibold transition-colors"
          >
            Cancel
          </button>
          <button
            onClick={onConfirm}
            className="flex-1 px-6 py-3 bg-red-600 text-white rounded-xl
                       hover:bg-red-700 font-semibold transition-colors"
          >
            Clear Cart
          </button>
        </div>
      </div>
    </>
  );
}
