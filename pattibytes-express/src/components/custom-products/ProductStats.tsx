import { Package, CheckCircle, XCircle, Tag } from 'lucide-react';
import type { CustomProduct } from './types';

interface Props { products: CustomProduct[] }

export function ProductStats({ products }: Props) {
  const active   = products.filter(p => p.isactive).length;
  const inactive = products.length - active;
  const cats     = new Set(products.map(p => p.category)).size;

  const stats = [
    { icon: Package,     label: 'Total',      value: products.length, color: 'text-blue-600',   bg: 'bg-blue-50'   },
    { icon: CheckCircle, label: 'Active',     value: active,          color: 'text-green-600',  bg: 'bg-green-50'  },
    { icon: XCircle,     label: 'Inactive',   value: inactive,        color: 'text-gray-500',   bg: 'bg-gray-50'   },
    { icon: Tag,         label: 'Categories', value: cats,            color: 'text-purple-600', bg: 'bg-purple-50' },
  ];

  return (
    <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-6">
      {stats.map(({ icon: Icon, label, value, color, bg }) => (
        <div key={label} className={`${bg} rounded-xl p-4 flex items-center gap-3`}>
          <Icon className={`w-8 h-8 ${color}`} />
          <div>
            <p className="text-2xl font-black text-gray-900">{value}</p>
            <p className="text-xs font-semibold text-gray-500">{label}</p>
          </div>
        </div>
      ))}
    </div>
  );
}
