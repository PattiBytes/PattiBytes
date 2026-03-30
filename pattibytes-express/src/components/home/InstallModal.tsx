'use client';

import { Apple, Smartphone, Monitor, X } from 'lucide-react';
import type { Platform } from '@/types/home';

type Props = {
  platform: Platform;
  appName: string;
  onClose: () => void;
};

const STEPS: Record<Platform, { title: string; steps: string[] }> = {
  ios: {
    title: 'On iPhone/iPad (Safari)',
    steps: [
      'Tap the Share button (box with arrow)',
      'Scroll down and tap "Add to Home Screen"',
      'Tap "Add" in the top right',
      'Open the app from your home screen',
    ],
  },
  android: {
    title: 'On Android (Chrome)',
    steps: [
      'Tap the menu button (⋮) in Chrome',
      'Select "Install app" or "Add to Home screen"',
      'Tap "Install" to confirm',
      'Open the app from your home screen',
    ],
  },
  desktop: {
    title: 'On Desktop (Chrome / Edge)',
    steps: [
      'Look for the install icon (⊕) in the address bar',
      'Click "Install"',
      'Or: Menu (⋮) → "Install Pattibytes Express"',
      'Launch from your desktop or taskbar',
    ],
  },
};

export default function InstallModal({ platform, appName, onClose }: Props) {
  const { title, steps } = STEPS[platform];
  const Icon = platform === 'ios' ? Apple : platform === 'android' ? Smartphone : Monitor;

  return (
    <div
      className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4"
      onClick={(e) => { if (e.target === e.currentTarget) onClose(); }}
    >
      <div className="bg-white rounded-3xl max-w-sm w-full p-7 shadow-2xl relative">
        <button
          onClick={onClose}
          className="absolute top-4 right-4 p-2 rounded-xl bg-gray-100 hover:bg-gray-200 transition"
          aria-label="Close"
        >
          <X className="w-4 h-4 text-gray-600" />
        </button>

        <div className="text-center mb-6">
          <div className="inline-flex items-center justify-center w-16 h-16 rounded-2xl bg-gradient-to-br from-orange-500 to-pink-500 mb-4 shadow-lg">
            <Icon size={32} className="text-white" />
          </div>
          <h3 className="text-xl font-extrabold text-gray-900">Install {appName}</h3>
          <p className="text-sm text-gray-600 mt-1">Add to home screen for the best experience.</p>
        </div>

        <div className="bg-gray-50 rounded-2xl p-4">
          <p className="text-xs font-bold text-gray-500 uppercase tracking-wide mb-3">{title}</p>
          <ol className="space-y-3">
            {steps.map((step, i) => (
              <li key={i} className="flex items-start gap-3">
                <span className="shrink-0 w-6 h-6 rounded-full bg-gradient-to-br from-orange-500 to-pink-500 text-white text-xs font-bold flex items-center justify-center">
                  {i + 1}
                </span>
                <span className="text-sm text-gray-700 leading-relaxed">{step}</span>
              </li>
            ))}
          </ol>
        </div>

        <button
          onClick={onClose}
          className="w-full mt-5 bg-gradient-to-r from-orange-500 to-pink-500 text-white px-6 py-3 rounded-xl font-bold hover:shadow-lg transition"
        >
          Got it!
        </button>
      </div>
    </div>
  );
}