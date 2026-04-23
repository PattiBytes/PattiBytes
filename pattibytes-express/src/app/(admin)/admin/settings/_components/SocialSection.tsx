'use client';
import { Facebook, Instagram, Twitter, Youtube, Globe } from 'lucide-react';
import type { Settings } from './types';
import type { ReactNode } from 'react';

interface FieldProps { icon: ReactNode; label: string; value: string; onChange: (v: string) => void; placeholder: string; }
function Field({ icon, label, value, onChange, placeholder }: FieldProps) {
  return (
    <div>
      <label className="block text-sm font-semibold text-gray-700 mb-2 flex items-center gap-2">{icon} {label}</label>
      <input type="url" value={value} onChange={e => onChange(e.target.value)} placeholder={placeholder}
        className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-primary transition-shadow" />
    </div>
  );
}

interface Props { settings: Settings; onChange: (s: Settings) => void; }

export function SocialSection({ settings, onChange }: Props) {
  return (
    <div className="grid sm:grid-cols-2 gap-4">
      <Field icon={<Facebook size={16} className="text-blue-600" />} label="Facebook URL"
        value={settings.facebook_url} onChange={v => onChange({ ...settings, facebook_url: v })} placeholder="https://facebook.com/yourpage" />
      <Field icon={<Instagram size={16} className="text-pink-600" />} label="Instagram URL"
        value={settings.instagram_url} onChange={v => onChange({ ...settings, instagram_url: v })} placeholder="https://instagram.com/yourprofile" />
      <Field icon={<Twitter size={16} className="text-sky-500" />} label="Twitter / X URL"
        value={settings.twitter_url} onChange={v => onChange({ ...settings, twitter_url: v })} placeholder="https://twitter.com/yourhandle" />
      <Field icon={<Youtube size={16} className="text-red-600" />} label="YouTube URL"
        value={settings.youtube_url} onChange={v => onChange({ ...settings, youtube_url: v })} placeholder="https://youtube.com/yourchannel" />
      <Field icon={<Globe size={16} className="text-green-600" />} label="Website URL"
        value={settings.website_url} onChange={v => onChange({ ...settings, website_url: v })} placeholder="https://yourwebsite.com" />
    </div>
  );
}
