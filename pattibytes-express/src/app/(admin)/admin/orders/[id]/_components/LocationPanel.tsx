'use client';
import { MapPin, Navigation } from 'lucide-react';
import { normalizeLocation, fmtTime, type OrderNormalized } from './types';

function openMaps(lat?: number, lng?: number) {
  if (!lat || !lng) return;
  window.open(`https://www.google.com/maps?q=${lat},${lng}`, '_blank');
}

interface Props { order: OrderNormalized; }

export function LocationPanel({ order }: Props) {
  const customerLoc = normalizeLocation(order.customerLocation);
  const driverLoc   = normalizeLocation(order.driverLocation);

  return (
    <div className="bg-white rounded-2xl shadow-sm border p-4 sm:p-6">
      <h3 className="font-bold text-gray-900 mb-4 flex items-center gap-2">
        <MapPin className="w-5 h-5 text-primary" /> Live Locations
      </h3>

      <div className="grid sm:grid-cols-2 gap-3">
        {/* Customer */}
        <div className="border rounded-xl p-3">
          <p className="text-xs font-bold text-gray-500 mb-2">📱 Customer Location</p>
          {customerLoc ? (
            <>
              <p className="font-mono text-xs text-gray-700">
                {customerLoc.lat?.toFixed(6)}, {customerLoc.lng?.toFixed(6)}
              </p>
              {customerLoc.accuracy && (
                <p className="text-xs text-gray-400 mt-0.5">
                  Accuracy: ±{customerLoc.accuracy.toFixed(0)}m
                </p>
              )}
              <p className="text-xs text-gray-400 mt-0.5">
                Updated: {fmtTime(customerLoc.updated_at ?? customerLoc.updatedAt)}
              </p>
              <button type="button" onClick={() => openMaps(customerLoc.lat, customerLoc.lng)}
                className="mt-2 inline-flex items-center gap-1 text-xs font-semibold text-primary hover:underline">
                <Navigation className="w-3.5 h-3.5" /> Open in Maps
              </button>
            </>
          ) : (
            <p className="text-xs text-gray-400">Not available</p>
          )}
        </div>

        {/* Driver */}
        <div className="border rounded-xl p-3">
          <p className="text-xs font-bold text-gray-500 mb-2">🚴 Driver Location</p>
          {driverLoc ? (
            <>
              <p className="font-mono text-xs text-gray-700">
                {driverLoc.lat?.toFixed(6)}, {driverLoc.lng?.toFixed(6)}
              </p>
              {driverLoc.accuracy && (
                <p className="text-xs text-gray-400 mt-0.5">
                  Accuracy: ±{driverLoc.accuracy.toFixed(0)}m
                </p>
              )}
              <p className="text-xs text-gray-400 mt-0.5">
                Updated: {fmtTime(driverLoc.updated_at ?? driverLoc.updatedAt)}
              </p>
              <button type="button" onClick={() => openMaps(driverLoc.lat, driverLoc.lng)}
                className="mt-2 inline-flex items-center gap-1 text-xs font-semibold text-primary hover:underline">
                <Navigation className="w-3.5 h-3.5" /> Open in Maps
              </button>
            </>
          ) : (
            <p className="text-xs text-gray-400">Not available</p>
          )}
        </div>
      </div>

      {/* Delivery pin */}
      {order.deliveryLatitude && order.deliveryLongitude && (
        <div className="mt-3 pt-3 border-t">
          <p className="text-xs font-bold text-gray-500 mb-1">📌 Delivery Pin</p>
          <button type="button"
            onClick={() => openMaps(order.deliveryLatitude!, order.deliveryLongitude!)}
            className="inline-flex items-center gap-1 text-sm font-semibold text-primary hover:underline">
            <Navigation className="w-4 h-4" />
            {order.deliveryLatitude.toFixed(6)}, {order.deliveryLongitude.toFixed(6)}
          </button>
        </div>
      )}
    </div>
  );
}
