'use client';
import { Timer, TrendingUp, CheckCircle } from 'lucide-react';

interface Props {
  createdAt: string | null;
  estimatedDeliveryTime: string | null;
  actualDeliveryTime: string | null;
  preparationTime: number | null;
}

export function MetricsBar({ createdAt, estimatedDeliveryTime, actualDeliveryTime, preparationTime }: Props) {
  if (!createdAt) return null;

  const created  = new Date(createdAt).getTime();
  // eslint-disable-next-line react-hooks/purity
  const now      = Date.now();
  const elapsed  = Math.max(0, Math.floor((now - created) / 60000));
  const est      = estimatedDeliveryTime ? new Date(estimatedDeliveryTime).getTime() : null;
  const act      = actualDeliveryTime    ? new Date(actualDeliveryTime).getTime()    : null;
  const estMins  = est ? Math.max(0, Math.floor((est - created) / 60000)) : null;
  const actMins  = act ? Math.max(0, Math.floor((act - created) / 60000)) : null;

  const tiles = [
    { icon: Timer,       label: 'Elapsed',   value: `${elapsed}m`,              color: 'text-blue-600',   bg: 'bg-blue-50'   },
    { icon: TrendingUp,  label: 'Estimated', value: estMins ? `${estMins}m` : 'N/A', color: 'text-orange-600', bg: 'bg-orange-50' },
    { icon: CheckCircle, label: 'Actual',    value: actMins ? `${actMins}m` : 'N/A', color: 'text-green-600',  bg: 'bg-green-50'  },
    { icon: Timer,       label: 'Prep Time', value: preparationTime ? `${preparationTime}m` : 'N/A', color: 'text-purple-600', bg: 'bg-purple-50' },
  ];

  return (
    <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-5">
      {tiles.map(({ icon: Icon, label, value, color, bg }) => (
        <div key={label} className={`${bg} rounded-2xl p-3 text-center border border-white shadow-sm`}>
          <Icon className={`w-5 h-5 mx-auto ${color} mb-1`} />
          <p className="text-xs text-gray-500 font-medium">{label}</p>
          <p className={`text-xl font-black ${color}`}>{value}</p>
        </div>
      ))}
    </div>
  );
}
