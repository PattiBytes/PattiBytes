'use client';

import { X } from 'lucide-react';
import AddressAutocomplete, { type AddressPick } from '@/components/AddressAutocomplete';
import type { SavedAddress } from '@/services/location';

export default function LocationModal({
  open,
  title,
  savedAddresses,
  showSearch,
  onClose,
  onToggleSearch,
  onPickAddressSearch,
  onPickSaved,
}: {
  open: boolean;
  title: string;
  savedAddresses: SavedAddress[];
  showSearch: boolean;
  onClose: () => void;
  onToggleSearch: () => void;
  onPickAddressSearch: (pick: AddressPick) => void;
  onPickSaved: (addr: SavedAddress) => void;
}) {
  if (!open) return null;

  return (
    <>
      <div className="fixed inset-0 bg-black/50 z-50" onClick={onClose} />
      <div className="fixed left-0 right-0 bottom-0 sm:top-1/2 sm:left-1/2 sm:-translate-x-1/2 sm:-translate-y-1/2 sm:bottom-auto w-full sm:w-[560px] bg-white rounded-t-2xl sm:rounded-2xl shadow-2xl z-50 max-h-[90vh] overflow-hidden">
        <div className="p-4 border-b flex items-center justify-between sticky top-0 bg-white z-10">
          <h2 className="text-lg font-bold text-gray-900">{title}</h2>
          <button type="button" className="p-2 rounded-lg hover:bg-gray-100" onClick={onClose} aria-label="Close">
            <X className="w-5 h-5 text-gray-600" />
          </button>
        </div>

        <div className="p-4 overflow-y-auto">
          <button
            type="button"
            onClick={onToggleSearch}
            className="w-full bg-primary text-white px-4 py-3 rounded-xl font-semibold hover:bg-orange-600"
          >
            {showSearch ? 'Hide search' : 'Search new address'}
          </button>

          {showSearch && (
            <div className="mt-4">
              <AddressAutocomplete onSelect={onPickAddressSearch} />
            </div>
          )}

          <div className="mt-5 border-t pt-4">
            <h3 className="font-bold text-gray-900 mb-3">Saved addresses</h3>

            {savedAddresses.length === 0 ? (
              <p className="text-sm text-gray-600">No saved addresses yet.</p>
            ) : (
              <div className="space-y-2">
                {savedAddresses.map((a) => (
                  <button
                    key={a.id}
                    type="button"
                    onClick={() => onPickSaved(a)}
                    className="w-full text-left p-4 rounded-xl border border-gray-200 hover:border-gray-300 hover:bg-gray-50"
                  >
                    <p className="font-bold text-gray-900">
                      {a.label} {a.isdefault ? <span className="text-xs text-primary">(Default)</span> : null}
                    </p>
                    <p className="text-sm text-gray-600 mt-1 line-clamp-2">{a.address}</p>
                  </button>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>
    </>
  );
}
