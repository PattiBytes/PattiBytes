/* eslint-disable @typescript-eslint/no-explicit-any */
'use client';
import { User, Phone, Mail, MapPin, Navigation } from 'lucide-react';
// eslint-disable-next-line @typescript-eslint/no-unused-vars
import { toINR, cx, trustMeta, type OrderNormalized, type ProfileMini } from './types';

interface Props {
  order: OrderNormalized;
  customer: ProfileMini | null;
}

export function CustomerPanel({ order, customer }: Props) {
  const ts    = Number(customer?.trust_score ?? customer?.trustscore ?? 5);
  const as_   = String(customer?.account_status ?? customer?.accountstatus ?? 'active');
  const badge = trustMeta(ts, as_);
  const TrustIcon = badge.icon;

  const isWalkIn = !order.customerId;
  const name = isWalkIn
    ? (order.recipientName ?? order.customerNotes?.replace('Walk-in:', '').trim() ?? 'Walk-in Customer')
    : (order.recipientName ?? customer?.full_name ?? customer?.fullname ?? 'Customer');

  const phone = order.customerPhone ?? customer?.phone;

  return (
    <div className="bg-white rounded-2xl shadow-sm border p-4 sm:p-6 space-y-4">
      <h3 className="font-bold text-gray-900 flex items-center gap-2">
        <User className="w-5 h-5 text-primary" /> Customer
      </h3>

      {/* Name + trust badge */}
      <div className="flex items-start gap-3">
        {/* Avatar */}
        <div className="w-10 h-10 rounded-full bg-gray-100 flex items-center justify-center shrink-0 overflow-hidden">
          {(customer as any)?.avatar_url ?? (customer as any)?.avatarurl ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={(customer as any).avatar_url ?? (customer as any).avatarurl} alt={name} className="w-full h-full object-cover" />
          ) : (
            <User className="w-5 h-5 text-gray-400" />
          )}
        </div>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 flex-wrap">
            <p className="font-bold text-gray-900">{name}</p>
            {isWalkIn ? (
              <span className="text-[10px] font-bold bg-amber-100 text-amber-700 border border-amber-200 px-2 py-0.5 rounded-full">
                Walk-in
              </span>
            ) : (
              <span className={cx('inline-flex items-center gap-1 text-[10px] font-bold px-2 py-0.5 rounded-full border', badge.color)}>
                <TrustIcon className="w-3 h-3" /> {badge.text}
              </span>
            )}
          </div>
          {!isWalkIn && (
            <p className="text-xs text-gray-400 mt-0.5 font-mono">{order.customerId.slice(0, 16)}…</p>
          )}
        </div>
      </div>

      {/* Contact */}
      {phone && (
        <a href={`tel:${phone}`}
          className="flex items-center gap-2 text-sm text-primary hover:underline">
          <Phone className="w-4 h-4 text-gray-400" /> {phone}
        </a>
      )}
      {customer?.email && (
        <a href={`mailto:${customer.email}`}
          className="flex items-center gap-2 text-sm text-gray-600 hover:text-primary hover:underline">
          <Mail className="w-4 h-4 text-gray-400" /> {customer.email}
        </a>
      )}
      {!isWalkIn && (
        <p className="text-xs text-gray-400">
          Trust score: <strong className="text-gray-700">{ts.toFixed(1)} / 5</strong>
        </p>
      )}

      {/* Delivery address */}
      <div className="pt-4 border-t space-y-1.5">
        <p className="text-xs font-bold text-gray-500 flex items-center gap-1">
          <MapPin className="w-3.5 h-3.5" /> Delivery Address
        </p>
        {order.deliveryAddressLabel && (
          <span className="text-xs bg-gray-100 text-gray-600 px-2 py-0.5 rounded-full font-semibold">
            {order.deliveryAddressLabel}
          </span>
        )}
        <p className="text-sm text-gray-800 whitespace-pre-line leading-relaxed">
          {order.deliveryAddress ?? 'N/A'}
        </p>
        {order.recipientName && order.recipientName !== name && (
          <p className="text-xs text-gray-500">
            Recipient: <strong>{order.recipientName}</strong>
          </p>
        )}
        {order.deliveryDistanceKm != null && (
          <p className="text-xs text-gray-400">
            📍 {Number(order.deliveryDistanceKm).toFixed(2)} km from merchant
          </p>
        )}
        {order.deliveryLatitude && order.deliveryLongitude && (
          <a
            href={`https://www.google.com/maps?q=${order.deliveryLatitude},${order.deliveryLongitude}`}
            target="_blank" rel="noopener noreferrer"
            className="inline-flex items-center gap-1 text-xs text-primary hover:underline"
          >
            <Navigation className="w-3.5 h-3.5" /> Open in Maps
          </a>
        )}
      </div>
    </div>
  );
}
