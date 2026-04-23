'use client';

import { MapPin, Phone, CreditCard, Banknote } from 'lucide-react';

interface Props {
  address:       string;
  phone:         string;
  paymentMethod: 'cod' | 'online';
  onAddressChange: (v: string) => void;
  onPhoneChange:   (v: string) => void;
  onPaymentChange: (v: 'cod' | 'online') => void;
}

export function DeliverySection({
  address, phone, paymentMethod,
  onAddressChange, onPhoneChange, onPaymentChange,
}: Props) {
  return (
    <div className="space-y-4">

      {/* Delivery address */}
      <div>
        <label className="text-sm font-black text-gray-900 flex items-center gap-1.5 mb-2">
          <MapPin className="w-4 h-4 text-primary" />
          Delivery address <span className="text-red-500">*</span>
        </label>
        <textarea
          value={address}
          onChange={e => onAddressChange(e.target.value)}
          placeholder="Full address with landmark, city, PIN…"
          rows={3}
          className="w-full px-4 py-3 bg-white border-2 border-gray-200 rounded-2xl text-sm font-medium
                     text-gray-900 placeholder-gray-400 focus:ring-2 focus:ring-primary
                     focus:border-primary outline-none transition resize-none"
        />
      </div>

      {/* Phone */}
      <div>
        <label className="text-sm font-black text-gray-900 flex items-center gap-1.5 mb-2">
          <Phone className="w-4 h-4 text-primary" />
          Contact number <span className="text-red-500">*</span>
        </label>
        <input
          type="tel"
          value={phone}
          onChange={e => onPhoneChange(e.target.value.replace(/\D/g, '').slice(0, 10))}
          placeholder="10-digit mobile number"
          maxLength={10}
          className="w-full px-4 py-3 bg-white border-2 border-gray-200 rounded-2xl text-sm font-medium
                     text-gray-900 placeholder-gray-400 focus:ring-2 focus:ring-primary
                     focus:border-primary outline-none transition"
        />
      </div>

      {/* Payment method */}
      <div>
        <label className="text-sm font-black text-gray-900 flex items-center gap-1.5 mb-2">
          <CreditCard className="w-4 h-4 text-primary" />
          Payment method
        </label>
        <div className="grid grid-cols-2 gap-3">
          {([
            { id: 'cod',    label: 'Cash on Delivery', sub: 'Pay when delivered', Icon: Banknote    },
            { id: 'online', label: 'Online / UPI',      sub: 'Pay after quote',   Icon: CreditCard  },
          ] as const).map(({ id, label, sub, Icon }) => (
            <button
              key={id}
              type="button"
              onClick={() => onPaymentChange(id)}
              className={`flex flex-col items-start gap-1.5 p-3.5 rounded-2xl border-2 text-left
                          transition hover:scale-[1.02]
                          ${paymentMethod === id
                            ? 'border-primary bg-orange-50 shadow-md'
                            : 'border-gray-200 bg-white hover:border-gray-300'}`}
            >
              <Icon className={`w-5 h-5 ${paymentMethod === id ? 'text-primary' : 'text-gray-500'}`} />
              <span className={`text-sm font-black ${paymentMethod === id ? 'text-primary' : 'text-gray-800'}`}>
                {label}
              </span>
              <span className="text-[11px] text-gray-500 font-medium">{sub}</span>
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}

