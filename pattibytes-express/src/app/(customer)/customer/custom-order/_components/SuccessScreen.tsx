'use client';

import { useRouter } from 'next/navigation';
import { CheckCircle2, ClipboardList, ShoppingBag, Clock, MessageSquare } from 'lucide-react';

interface Props {
  orderRef: string;
  orderId:  string;
}

export function SuccessScreen({ orderRef, orderId }: Props) {
  const router = useRouter();

  return (
    <div className="min-h-[80vh] flex flex-col items-center justify-center p-6 text-center
                    animate-in fade-in zoom-in duration-500">

      {/* Animated success ring */}
      <div className="relative w-24 h-24 mb-6">
        <div className="absolute inset-0 rounded-full bg-gradient-to-br from-purple-400 to-pink-400
                        opacity-20 animate-ping" />
        <div className="w-full h-full rounded-full bg-gradient-to-br from-purple-500 to-pink-500
                        flex items-center justify-center shadow-2xl">
          <CheckCircle2 className="w-12 h-12 text-white" />
        </div>
      </div>

      <h1 className="text-2xl font-black text-gray-900 mb-2">Order Submitted!</h1>
      <p className="text-gray-500 font-medium mb-1">Your custom order is being reviewed</p>
      <div className="inline-flex items-center gap-2 px-4 py-2 bg-purple-50 border-2 border-purple-200
                      rounded-full text-sm font-black text-purple-700 mb-6">
        <ClipboardList className="w-4 h-4" />
        Ref: {orderRef}
      </div>

      {/* Timeline */}
      <div className="w-full max-w-sm space-y-3 mb-8 text-left">
        {[
          { icon: CheckCircle2, color: 'text-green-500 bg-green-50',  label: 'Order received',         done: true  },
          { icon: Clock,         color: 'text-amber-500 bg-amber-50',  label: 'Team reviewing (≤30m)',  done: false },
          { icon: MessageSquare, color: 'text-blue-500  bg-blue-50',   label: 'Quote sent to you',      done: false },
          { icon: ShoppingBag,   color: 'text-purple-500 bg-purple-50',label: 'Order confirmed',        done: false },
        ].map(({ icon: Icon, color, label, done }) => (
          <div key={label} className="flex items-center gap-3">
            <div className={`w-9 h-9 rounded-full ${color} flex items-center justify-center flex-shrink-0
                            ${done ? '' : 'opacity-50'}`}>
              <Icon className="w-4 h-4" />
            </div>
            <span className={`text-sm font-bold ${done ? 'text-gray-900' : 'text-gray-400'}`}>
              {label}
            </span>
          </div>
        ))}
      </div>

      <div className="flex flex-col gap-3 w-full max-w-sm">
        <button
          onClick={() => router.push(`/customer/orders/${orderId}`)}
          className="w-full bg-gradient-to-r from-purple-500 to-pink-500 text-white
                     py-3.5 rounded-2xl font-black shadow-lg hover:shadow-xl
                     hover:scale-[1.02] transition-all"
        >
          Track Order
        </button>
        <button
          onClick={() => router.push('/customer/dashboard')}
          className="w-full bg-white border-2 border-gray-200 text-gray-700 py-3.5 rounded-2xl
                     font-black hover:bg-gray-50 transition"
        >
          Back to Home
        </button>
      </div>
    </div>
  );
}
