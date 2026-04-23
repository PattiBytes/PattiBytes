'use client';
import Image from 'next/image';
import {
  Mail, Phone, MapPin, Upload, Trash2,
  Image as ImageIcon, AlertTriangle, CheckCircle2,
  Loader2, MapPinned, Navigation2
} from 'lucide-react';
import type { Settings } from './types';
import { uploadToStorage } from './utils';
import { useState } from 'react';
import { toast } from 'react-toastify';
import { HubLocationPicker } from './HubLocationPicker';

interface Props { settings: Settings; onChange: (s: Settings) => void; }

export function GeneralSection({ settings, onChange }: Props) {
  const [uploadingLogo, setUploadingLogo] = useState(false);

  const handleLogoUpload = async (file?: File | null) => {
    if (!file) return;
    if (!file.type.startsWith('image/')) { toast.error('Choose an image file'); return; }
    if (file.size > 2 * 1024 * 1024) { toast.error('File must be < 2MB'); return; }
    setUploadingLogo(true);
    try {
      const url = await uploadToStorage(file);
      onChange({ ...settings, app_logo_url: url });
      toast.success('Logo uploaded!');
    } catch (e: unknown) {
      toast.error((e as Error)?.message ?? 'Upload failed');
    } finally {
      setUploadingLogo(false);
    }
  };

  return (
    <div className="space-y-8">

      {/* ── App Name ── */}
      <div>
        <label className="block text-sm font-bold text-gray-700 mb-2">App Name</label>
        <input
          type="text"
          value={settings.app_name}
          onChange={e => onChange({ ...settings, app_name: e.target.value })}
          className="w-full px-4 py-3 border-2 border-gray-200 rounded-xl focus:ring-2 focus:ring-primary focus:border-primary transition-all text-base font-semibold"
          placeholder="PattiBytes Express"
        />
      </div>

      {/* ── App Logo ── */}
      <div className="border-t pt-6">
        <label className="block text-sm font-bold text-gray-700 mb-4 flex items-center gap-2">
          <ImageIcon size={16} className="text-primary" /> App Logo
        </label>

        {settings.app_logo_url && (
          <div className="mb-4 flex items-center gap-4 p-4 bg-gray-50 rounded-2xl border-2 border-gray-100 hover:border-primary/30 transition-all">
            <div
              className="relative w-20 h-20 rounded-2xl overflow-hidden ring-4 ring-primary/20 shadow-xl bg-white flex-shrink-0"
              style={{ transform: 'perspective(500px) rotateY(-5deg) rotateX(3deg)', boxShadow: '6px 10px 24px rgba(0,0,0,0.15)' }}
            >
              <Image src={settings.app_logo_url} alt="App Logo" fill className="object-cover p-1"
                onError={() => onChange({ ...settings, app_logo_url: '' })} />
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-bold text-gray-900">Current Logo</p>
              <p className="text-xs text-gray-400 truncate mt-0.5">{settings.app_logo_url}</p>
            </div>
            <button onClick={() => onChange({ ...settings, app_logo_url: '' })}
              className="px-3 py-2 bg-red-600 text-white rounded-xl hover:bg-red-700 transition text-sm flex items-center gap-1.5 shadow font-semibold hover:scale-105">
              <Trash2 size={13} /> Remove
            </button>
          </div>
        )}

        <label
          className={`flex items-center justify-center gap-2 px-6 py-3 rounded-xl font-bold cursor-pointer transition-all shadow-md text-white w-full sm:w-auto
            ${uploadingLogo ? 'bg-gray-400 cursor-not-allowed' : 'bg-gradient-to-r from-orange-500 to-pink-500 hover:from-orange-600 hover:to-pink-600 hover:scale-105 hover:shadow-lg'}`}
        >
          <input type="file" accept="image/*" className="hidden" disabled={uploadingLogo}
            onChange={e => handleLogoUpload(e.target.files?.[0])} />
          {uploadingLogo
            ? <><Loader2 size={18} className="animate-spin" /> Uploading…</>
            : <><Upload size={18} /> {settings.app_logo_url ? 'Change Logo' : 'Upload Logo'}</>}
        </label>

        <div className="mt-3 bg-blue-50 border border-blue-200 rounded-xl p-3 flex items-start gap-2">
          <AlertTriangle size={14} className="text-blue-600 shrink-0 mt-0.5" />
          <p className="text-xs text-blue-800"><strong>PNG, 512×512+, &lt; 2MB</strong> — transparent background recommended</p>
        </div>

        {settings.app_logo_url && (
          <div className="mt-2 bg-green-50 border border-green-200 rounded-xl p-3 flex items-center gap-2 text-xs text-green-800">
            <CheckCircle2 size={14} className="text-green-600 shrink-0" />
            Logo ready — click <strong className="text-primary mx-1">Save</strong> to apply.
          </div>
        )}
      </div>

      {/* ── Contact info ── */}
      <div className="border-t pt-6 grid sm:grid-cols-2 gap-4">
        <div>
          <label className="block text-sm font-bold text-gray-700 mb-2 flex items-center gap-2">
            <Mail size={14} className="text-primary" /> Support Email
          </label>
          <input type="email" value={settings.support_email}
            onChange={e => onChange({ ...settings, support_email: e.target.value })}
            className="w-full px-4 py-3 border-2 border-gray-200 rounded-xl focus:ring-2 focus:ring-primary transition-all"
            placeholder="support@pattibytes.com" />
        </div>
        <div>
          <label className="block text-sm font-bold text-gray-700 mb-2 flex items-center gap-2">
            <Phone size={14} className="text-primary" /> Support Phone
          </label>
          <input type="tel" value={settings.support_phone}
            onChange={e => onChange({ ...settings, support_phone: e.target.value })}
            className="w-full px-4 py-3 border-2 border-gray-200 rounded-xl focus:ring-2 focus:ring-primary transition-all"
            placeholder="+91 98765 43210" />
        </div>
        <div className="sm:col-span-2">
          <label className="block text-sm font-bold text-gray-700 mb-2 flex items-center gap-2">
            <MapPin size={14} className="text-primary" /> Business Address
          </label>
          <textarea value={settings.business_address}
            onChange={e => onChange({ ...settings, business_address: e.target.value })}
            rows={2} className="w-full px-4 py-3 border-2 border-gray-200 rounded-xl focus:ring-2 focus:ring-primary transition-all resize-none"
            placeholder="Patti, Punjab, India" />
        </div>
        <div>
          <label className="block text-sm font-bold text-gray-700 mb-2 flex items-center gap-2">
            <Navigation2 size={14} className="text-primary" /> Customer Search Radius (km)
          </label>
          <input type="number" min={1} max={100} value={settings.customer_search_radius_km ?? 25}
            onChange={e => onChange({ ...settings, customer_search_radius_km: Math.max(1, Number(e.target.value)) })}
            className="w-full px-4 py-3 border-2 border-gray-200 rounded-xl focus:ring-2 focus:ring-primary transition-all" />
          <p className="text-xs text-gray-400 mt-1">Max radius customers can search for merchants</p>
        </div>
      </div>

      {/* ── Hub Location ── */}
      <div className="border-t pt-6">
        <div className="flex items-center gap-3 mb-4">
          <div className="p-2.5 rounded-xl bg-gradient-to-br from-blue-100 to-indigo-100 border border-blue-200 shadow-sm">
            <MapPinned size={20} className="text-blue-600" />
          </div>
          <div>
            <h3 className="font-extrabold text-gray-900 text-base">Hub / Dispatch Location</h3>
            <p className="text-xs text-gray-500 mt-0.5">Used as the origin point for delivery distance calculations</p>
          </div>
        </div>

        <div className="bg-gradient-to-br from-blue-50 to-indigo-50 rounded-2xl p-4 border-2 border-blue-200">
          <HubLocationPicker
            lat={settings.hub_latitude}
            lng={settings.hub_longitude}
            address={settings.business_address}
            onChange={(la, lo, addr) =>
              onChange({ ...settings, hub_latitude: la, hub_longitude: lo, business_address: addr })
            }
          />
        </div>
      </div>

    </div>
  );
}
