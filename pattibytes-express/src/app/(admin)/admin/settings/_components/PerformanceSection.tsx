'use client';
import { Eye } from 'lucide-react';
import { Toggle } from './Toggle';
import type { Settings } from './types';

interface Props { settings: Settings; onChange: (s: Settings) => void; }

export function PerformanceSection({ settings, onChange }: Props) {
  return (
    <div className="space-y-4">
      <div className="bg-gradient-to-br from-indigo-50 to-white rounded-xl p-5 border flex items-start gap-4">
        <div className="p-3 rounded-xl bg-indigo-100">
          <Eye size={20} className="text-indigo-600" />
        </div>
        <div className="flex-1">
          <div className="flex items-center justify-between">
            <div>
              <p className="font-bold text-gray-900">Show Menu Item Images</p>
              <p className="text-xs text-gray-500 mt-1">When disabled, images won&apos;t render in the customer app — saves bandwidth. Images are still stored.</p>
            </div>
            <Toggle checked={settings.show_menu_images ?? true} onChange={v => onChange({ ...settings, show_menu_images: v })} />
          </div>
        </div>
      </div>
    </div>
  );
}
