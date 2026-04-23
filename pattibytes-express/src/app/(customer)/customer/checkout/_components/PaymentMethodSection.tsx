'use client';

import { CreditCard, Wallet, Check } from 'lucide-react';
import { toast } from 'react-toastify';

interface Props {
  selected:  'cod' | 'online';
  onChange:  (m: 'cod' | 'online') => void;
}

export function PaymentMethodSection({ selected, onChange }: Props) {
  return (
    <div className="bg-white rounded-xl shadow-md p-6">
      <h2 className="text-xl font-bold mb-4 flex items-center gap-2">
        <CreditCard className="text-primary" size={24} />
        Payment Method
      </h2>

      <div className="space-y-3">
        {/* COD */}
        <button
          type="button"
          onClick={() => onChange('cod')}
          className={`w-full text-left p-4 rounded-lg border-2 transition-all
            ${selected === 'cod'
              ? 'border-primary bg-orange-50'
              : 'border-gray-200 hover:border-gray-300'}`}
        >
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-12 h-12 bg-green-100 rounded-full flex items-center justify-center">
                <Wallet className="text-green-600" size={24} />
              </div>
              <div>
                <p className="font-bold text-gray-900">Cash on Delivery</p>
                <p className="text-sm text-gray-600">Pay when you receive your order</p>
              </div>
            </div>
            {selected === 'cod' && <Check className="text-primary" size={24} />}
          </div>
        </button>

        {/* Online (disabled) */}
        <button
          type="button"
          onClick={() => toast.info('Online payment coming soon!')}
          disabled
          className="w-full text-left p-4 rounded-lg border-2 border-gray-200
                     bg-gray-50 opacity-60 cursor-not-allowed"
        >
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 bg-blue-100 rounded-full flex items-center justify-center">
              <CreditCard className="text-blue-600" size={24} />
            </div>
            <div>
              <p className="font-bold text-gray-900">Online Payment</p>
              <p className="text-sm text-gray-600">UPI, Cards, Wallets (Coming Soon)</p>
            </div>
          </div>
        </button>
      </div>
    </div>
  );
}

