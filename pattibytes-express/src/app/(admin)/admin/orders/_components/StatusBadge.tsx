'use client';

import React from 'react';
import { Clock, ChefHat, Package, Truck, CheckCircle, XCircle, FileText, Loader2 } from 'lucide-react';

const STATUS_MAP: Record<string, { color: string; Icon: React.ElementType }> = {
  pending:    { color: 'bg-yellow-100 text-yellow-800',  Icon: Clock       },
  confirmed:  { color: 'bg-blue-100 text-blue-800',     Icon: ChefHat     },
  preparing:  { color: 'bg-purple-100 text-purple-800', Icon: ChefHat     },
  ready:      { color: 'bg-orange-100 text-orange-800', Icon: Package     },
  assigned:   { color: 'bg-indigo-100 text-indigo-800', Icon: Truck       },
  picked_up:  { color: 'bg-indigo-100 text-indigo-800', Icon: Truck       },
  delivered:  { color: 'bg-green-100 text-green-800',   Icon: CheckCircle },
  cancelled:  { color: 'bg-red-100 text-red-800',       Icon: XCircle     },
  quoted:     { color: 'bg-teal-100 text-teal-800',     Icon: FileText    },
  processing: { color: 'bg-blue-100 text-blue-800',     Icon: Loader2     },
};

export function StatusBadge({ status }: { status: string }) {
  const cfg = STATUS_MAP[status] ?? STATUS_MAP['pending'];
  const { Icon } = cfg;
  return (
    <span className={`inline-flex items-center gap-1 px-2 py-1 rounded-full text-xs font-semibold ${cfg.color}`}>
      <Icon size={12} />
      {status.replace('_', ' ')}
    </span>
  );
}
