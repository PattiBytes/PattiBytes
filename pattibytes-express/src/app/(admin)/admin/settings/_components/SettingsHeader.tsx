'use client';
import { Settings2, LogOut, Save, Loader2 } from 'lucide-react';

interface Props {
  saving: boolean;
  onSave: () => void;
  onLogout: () => void;
  lastSaved?: string;
}

export function SettingsHeader({ saving, onSave, onLogout, lastSaved }: Props) {
  return (
    <div className="relative overflow-hidden rounded-2xl bg-gradient-to-br from-orange-500 via-orange-600 to-pink-600 p-6 text-white shadow-2xl mb-6">
      {/* Animated bg blobs */}
      <div className="absolute -top-6 -right-6 w-40 h-40 rounded-full bg-white/10 animate-pulse" />
      <div className="absolute -bottom-10 -left-10 w-56 h-56 rounded-full bg-white/5 animate-pulse [animation-delay:1s]" />
      <div className="absolute top-1/2 right-1/4 w-20 h-20 rounded-full bg-white/10 animate-bounce [animation-delay:0.5s]" />

      <div className="relative z-10 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="flex items-center gap-4">
          {/* 3D icon */}
          <div
            className="w-16 h-16 rounded-2xl bg-white/20 backdrop-blur-sm flex items-center justify-center shadow-xl border border-white/30"
            style={{ transform: 'perspective(400px) rotateX(8deg) rotateY(-5deg)', boxShadow: '4px 8px 24px rgba(0,0,0,0.2)' }}
          >
            <Settings2 size={32} className="animate-[spin_20s_linear_infinite]" />
          </div>
          <div>
            <h1 className="text-2xl sm:text-3xl font-extrabold tracking-tight">App Settings</h1>
            <p className="text-orange-100 text-sm mt-0.5">
              {lastSaved ? `Last saved: ${lastSaved}` : 'Configure PattiBytes Express'}
            </p>
          </div>
        </div>

        <div className="flex items-center gap-3">
          <button
            onClick={onLogout}
            className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-white/20 hover:bg-white/30 backdrop-blur-sm border border-white/30 font-semibold text-sm transition-all duration-200 hover:scale-105"
          >
            <LogOut size={16} />
            <span className="hidden sm:inline">Logout</span>
          </button>
          <button
            onClick={onSave}
            disabled={saving}
            className="flex items-center gap-2 px-6 py-2.5 rounded-xl bg-white text-orange-600 font-bold text-sm shadow-lg hover:shadow-xl hover:scale-105 transition-all duration-200 disabled:opacity-60 disabled:scale-100"
          >
            {saving ? <Loader2 size={18} className="animate-spin" /> : <Save size={18} />}
            {saving ? 'Saving…' : 'Save Settings'}
          </button>
        </div>
      </div>
    </div>
  );
}