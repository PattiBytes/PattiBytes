/* eslint-disable @typescript-eslint/no-explicit-any */
'use client';

import {
  MapPin, Plus, Check, Trash2, Info,
  Phone, Navigation, Home, Briefcase, MapPinned,
} from 'lucide-react';
import type { SavedAddress } from '@/services/location';

function isValidPhone(v: string) { return String(v || '').replace(/\D/g, '').length === 10; }

export function formatFullAddress(a: SavedAddress) {
  const lines: string[] = [];
  if (a.address) lines.push(a.address);
  const extra: string[] = [];
  if ((a as any).apartment_floor) extra.push(`Flat/Floor: ${(a as any).apartment_floor}`);
  if ((a as any).apartmentfloor)  extra.push(`Flat/Floor: ${(a as any).apartmentfloor}`);
  if ((a as any).landmark)        extra.push(`Landmark: ${(a as any).landmark}`);
  if (extra.length) lines.push(extra.join(' • '));
  const city = [a.city, a.state, (a as any).postalcode || (a as any).postal_code].filter(Boolean).join(', ');
  if (city) lines.push(city);
  return lines.join('\n');
}

function AddressIcon({ label }: { label: string }) {
  switch (String(label || '').toLowerCase()) {
    case 'home': return <Home className="w-5 h-5" />;
    case 'work': return <Briefcase className="w-5 h-5" />;
    default:     return <MapPinned className="w-5 h-5" />;
  }
}

interface Props {
  addresses:       SavedAddress[];
  selectedId:      string | null;
  onSelect:        (a: SavedAddress) => void;
  onDelete:        (id: string) => void;
  onAddNew:        () => void;
}

export function DeliveryAddressSection({
  addresses, selectedId, onSelect, onDelete, onAddNew,
}: Props) {
  return (
    <div className="bg-white rounded-xl shadow-md p-6">
      <div className="flex items-center justify-between mb-4">
        <h2 className="text-xl font-bold flex items-center gap-2">
          <MapPin className="text-primary" size={24} />
          Delivery Address
        </h2>
        <button
          onClick={onAddNew}
          className="text-primary hover:bg-orange-50 px-3 py-1.5 rounded-lg
                     flex items-center gap-1 transition-colors font-semibold"
        >
          <Plus size={16} /> Add New
        </button>
      </div>

      {addresses.length ? (
        <div className="space-y-3">
          {addresses.map((addr: any) => {
            const phoneOk    = isValidPhone(addr.recipient_phone || addr.recipientphone || '');
            const landmarkOk = String(addr.landmark || '').trim().length >= 2;
            const isSelected = selectedId === addr.id;

            return (
              <div
                key={addr.id}
                onClick={() => onSelect(addr)}
                className={`relative p-4 rounded-lg border-2 cursor-pointer transition-all
                  ${isSelected ? 'border-primary bg-orange-50' : 'border-gray-200 hover:border-gray-300'}`}
              >
                <div className="flex items-start gap-3">
                  <div className="text-primary mt-1">
                    <AddressIcon label={addr.label} />
                  </div>

                  <div className="flex-1">
                    <div className="flex items-center gap-2 mb-1 flex-wrap">
                      <p className="font-bold text-gray-900">{addr.label}</p>
                      {(addr.is_default || addr.isdefault) && (
                        <span className="text-xs bg-primary text-white px-2 py-0.5 rounded-full">
                          Default
                        </span>
                      )}
                      {(!phoneOk || !landmarkOk) && (
                        <span className="text-xs bg-red-100 text-red-700 px-2 py-0.5 rounded-full">
                          Missing required details
                        </span>
                      )}
                    </div>

                    <p className="text-sm text-gray-700 whitespace-pre-line">
                      {formatFullAddress(addr)}
                    </p>

                    <div className="mt-2 flex items-center gap-3 text-xs text-gray-600 flex-wrap">
                      {addr.recipient_name && (
                        <span className="inline-flex items-center gap-1">
                          <Info className="w-3 h-3" />{addr.recipient_name}
                        </span>
                      )}
                      {(addr.recipient_phone || addr.recipientphone) && (
                        <span className="inline-flex items-center gap-1">
                          <Phone className="w-3 h-3" />
                          {addr.recipient_phone || addr.recipientphone}
                        </span>
                      )}
                      {(addr.delivery_instructions || addr.deliveryinstructions) && (
                        <span className="inline-flex items-center gap-1">
                          <Navigation className="w-3 h-3" />
                          {addr.delivery_instructions || addr.deliveryinstructions}
                        </span>
                      )}
                    </div>

                    <div className="mt-3 flex items-center gap-2">
                      <button
                        type="button"
                        onClick={e => {
                          e.stopPropagation();
                          window.open(
                            `https://www.google.com/maps?q=${addr.latitude},${addr.longitude}`,
                            '_blank', 'noopener,noreferrer'
                          );
                        }}
                        className="text-xs font-semibold text-primary hover:underline"
                      >
                        Open in Maps
                      </button>
                      {!addr.is_default && !addr.isdefault && (
                        <button
                          type="button"
                          onClick={e => { e.stopPropagation(); onDelete(addr.id); }}
                          className="ml-auto p-1.5 hover:bg-red-50 text-red-600 rounded transition-colors"
                        >
                          <Trash2 size={16} />
                        </button>
                      )}
                    </div>
                  </div>

                  {isSelected && <Check className="text-primary flex-shrink-0" size={20} />}
                </div>
              </div>
            );
          })}
        </div>
      ) : (
        <div className="text-center py-12 bg-gray-50 rounded-lg">
          <MapPin size={48} className="mx-auto text-gray-400 mb-3" />
          <p className="text-gray-600 mb-4">No saved addresses</p>
          <button
            onClick={onAddNew}
            className="bg-primary text-white px-6 py-2 rounded-lg
                       hover:bg-orange-600 font-semibold"
          >
            Add Your First Address
          </button>
        </div>
      )}
    </div>
  );
}

