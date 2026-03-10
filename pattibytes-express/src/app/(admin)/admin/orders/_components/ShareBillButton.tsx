'use client';
import { useState } from 'react';
// eslint-disable-next-line @typescript-eslint/no-unused-vars
import { Check, Share2, Copy } from 'lucide-react';
import { toast } from 'react-toastify';
import { shareOrderBill } from '../_utils/shareBill';
import type { Order } from '../_types';

interface Props {
  order   : Order;
  variant ?: 'icon' | 'full';   // icon = just icon button, full = with label
  size    ?: 'sm' | 'xs';
}

export function ShareBillButton({ order, variant = 'full', size = 'xs' }: Props) {
  const [state, setState] = useState<'idle' | 'done'>('idle');

  const handle = async () => {
    const result = await shareOrderBill(order);
    if (result === 'shared') {
      toast.success('Order details shared!');
    } else if (result === 'copied') {
      toast.success('Bill copied to clipboard!');
      setState('done');
      setTimeout(() => setState('idle'), 2000);
    } else {
      toast.error('Could not share — try copying manually');
    }
  };

  const sizeClass = size === 'xs' ? 'px-2 py-1 text-xs' : 'px-3 py-1.5 text-sm';
  const Icon      = state === 'done' ? Check : (variant === 'icon' ? Share2 : Share2);

  return (
    <button
      type="button"
      onClick={handle}
      title="Share / Copy bill"
      className={`inline-flex items-center gap-1 ${sizeClass} rounded font-semibold border transition-all
        ${state === 'done'
          ? 'border-green-300 text-green-700 bg-green-50'
          : 'border-teal-200 text-teal-700 hover:bg-teal-600 hover:text-white'
        }`}
    >
      <Icon size={size === 'xs' ? 11 : 13} />
      {variant === 'full' && (state === 'done' ? 'Copied!' : 'Share')}
    </button>
  );
}
