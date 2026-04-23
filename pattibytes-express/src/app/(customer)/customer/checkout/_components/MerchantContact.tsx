'use client';

import { Phone, MessageCircle } from 'lucide-react';
import { toast } from 'react-toastify';

interface Props {
  phone?:        string | null;
  businessName?: string | null;
}

export function MerchantContact({ phone, businessName }: Props) {
  if (!phone) return null;

  const clean = phone.replace(/\D/g, '');
  const whatsapp = () => {
    if (!clean) return toast.error('Phone number not available');
    window.open(
      `https://wa.me/${clean}?text=${encodeURIComponent(`Hi, I placed an order from ${businessName || ''}`)}`,
      '_blank', 'noopener,noreferrer'
    );
  };

  return (
    <div className="bg-white rounded-xl shadow-md p-6">
      <h2 className="text-xl font-bold mb-3 flex items-center gap-2">
        <Phone className="text-primary" size={22} />
        Restaurant contact
      </h2>
      <div className="flex gap-3 flex-wrap">
        <a
          href={`tel:${phone}`}
          className="px-4 py-2 rounded-lg bg-gray-100 hover:bg-gray-200
                     font-semibold text-sm inline-flex items-center gap-2"
        >
          <Phone className="w-4 h-4" /> Call
        </a>
        <button
          type="button"
          onClick={whatsapp}
          className="px-4 py-2 rounded-lg bg-green-100 hover:bg-green-200 text-green-800
                     font-semibold text-sm inline-flex items-center gap-2"
        >
          <MessageCircle className="w-4 h-4" /> WhatsApp
        </button>
      </div>
    </div>
  );
}

