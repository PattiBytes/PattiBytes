'use client';

import AddressAutocomplete from '@/components/AddressAutocomplete';

export type NewAddressForm = {
  label:                  string;
  recipient_name:         string;
  recipient_phone:        string;
  address:                string;
  apartment_floor:        string;
  landmark:               string;
  delivery_instructions:  string;
  latitude:               number;
  longitude:              number;
  is_default:             boolean;
  city:                   string;
  state:                  string;
  postal_code:            string;
};

interface Props {
  form:       NewAddressForm;
  onChange:   (patch: Partial<NewAddressForm>) => void;
  onSave:     () => void;
  onClose:    () => void;
}

export function AddAddressModal({ form, onChange, onSave, onClose }: Props) {
  return (
    <>
      <div className="fixed inset-0 bg-black/50 z-50" onClick={onClose} />
      <div className="fixed top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2
                      w-full max-w-2xl bg-white rounded-2xl shadow-2xl z-50 p-6 mx-4
                      max-h-[90vh] overflow-y-auto">
        <h2 className="text-2xl font-bold mb-6">Add Delivery Address</h2>

        <div className="space-y-4">
          {/* Label */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Address Label
            </label>
            <div className="grid grid-cols-3 gap-2">
              {['Home', 'Work', 'Other'].map(lbl => (
                <button
                  key={lbl} type="button"
                  onClick={() => onChange({ label: lbl })}
                  className={`p-3 rounded-lg border-2 font-medium transition-all
                    ${form.label === lbl
                      ? 'border-primary bg-orange-50 text-primary'
                      : 'border-gray-200 text-gray-700 hover:border-gray-300'}`}
                >
                  {lbl}
                </button>
              ))}
            </div>
          </div>

          {/* Name + Phone */}
          <div className="grid md:grid-cols-2 gap-3">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Recipient name (optional)
              </label>
              <input
                value={form.recipient_name}
                onChange={e => onChange({ recipient_name: e.target.value })}
                placeholder="Name"
                className="w-full border-2 border-gray-200 rounded-lg px-3 py-2 text-sm
                           focus:ring-2 focus:ring-primary focus:border-primary"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Recipient phone <span className="text-red-500">*</span>
              </label>
              <input
                value={form.recipient_phone}
                onChange={e => onChange({ recipient_phone: e.target.value })}
                placeholder="10-digit mobile number"
                inputMode="numeric"
                className="w-full border-2 border-gray-200 rounded-lg px-3 py-2 text-sm
                           focus:ring-2 focus:ring-primary focus:border-primary"
              />
            </div>
          </div>

          {/* Flat + Landmark */}
          <div className="grid md:grid-cols-2 gap-3">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Flat / Floor (optional)
              </label>
              <input
                value={form.apartment_floor}
                onChange={e => onChange({ apartment_floor: e.target.value })}
                placeholder="E.g., 12B 2nd Floor"
                className="w-full border-2 border-gray-200 rounded-lg px-3 py-2 text-sm
                           focus:ring-2 focus:ring-primary focus:border-primary"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Landmark <span className="text-red-500">*</span>
              </label>
              <input
                value={form.landmark}
                onChange={e => onChange({ landmark: e.target.value })}
                placeholder="Near..."
                className="w-full border-2 border-gray-200 rounded-lg px-3 py-2 text-sm
                           focus:ring-2 focus:ring-primary focus:border-primary"
              />
            </div>
          </div>

          {/* Address search */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Search & Select Address <span className="text-red-500">*</span>
            </label>
            <AddressAutocomplete
              // eslint-disable-next-line @typescript-eslint/no-explicit-any
              onSelect={(d: any) =>
                onChange({
                  address:     d.address,
                  latitude:    d.lat,
                  longitude:   d.lon,
                  city:        d.city    || '',
                  state:       d.state   || '',
                  postal_code: d.postalcode || '',
                })
              }
            />
            {form.address && (
              <div className="mt-3 bg-green-50 border-2 border-green-200 rounded-lg p-4">
                <p className="text-sm font-semibold text-green-900 mb-1">Selected Address</p>
                <p className="text-sm text-green-800">{form.address}</p>
              </div>
            )}
          </div>

          {/* Delivery instructions */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Delivery instructions (optional)
            </label>
            <input
              value={form.delivery_instructions}
              onChange={e => onChange({ delivery_instructions: e.target.value })}
              placeholder="Call on arrival, Leave at gate, etc."
              className="w-full border-2 border-gray-200 rounded-lg px-3 py-2 text-sm
                         focus:ring-2 focus:ring-primary focus:border-primary"
            />
          </div>

          {/* Default */}
          <div className="flex items-center gap-2">
            <input
              type="checkbox" id="setDefault"
              checked={form.is_default}
              onChange={e => onChange({ is_default: e.target.checked })}
              className="w-4 h-4 text-primary border-gray-300 rounded"
            />
            <label htmlFor="setDefault" className="text-sm text-gray-700">
              Set as default address
            </label>
          </div>

          {/* Actions */}
          <div className="flex gap-3 pt-4">
            <button
              type="button" onClick={onClose}
              className="flex-1 bg-gray-200 text-gray-700 px-6 py-3 rounded-xl
                         hover:bg-gray-300 font-semibold"
            >
              Cancel
            </button>
            <button
              type="button" onClick={onSave}
              disabled={!form.address}
              className="flex-1 bg-primary text-white px-6 py-3 rounded-xl
                         hover:bg-orange-600 font-semibold
                         disabled:opacity-50 disabled:cursor-not-allowed"
            >
              Save & Select
            </button>
          </div>
        </div>
      </div>
    </>
  );
}

