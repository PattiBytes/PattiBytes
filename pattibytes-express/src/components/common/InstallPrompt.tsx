/* eslint-disable react-hooks/set-state-in-effect */
/* eslint-disable @typescript-eslint/no-explicit-any */
'use client';

import { useEffect, useState } from 'react';
import { X, Download, Share } from 'lucide-react';

export default function InstallPrompt() {
  const [deferredPrompt, setDeferredPrompt] = useState<any>(null);
  const [showPrompt, setShowPrompt] = useState(false);
  const [deviceType, setDeviceType] = useState<'android' | 'ios' | 'desktop'>('desktop');

  useEffect(() => {
    // Check if already installed
    if (window.matchMedia('(display-mode: standalone)').matches) {
      return;
    }

    // Check if dismissed recently
    const dismissed = localStorage.getItem('installPromptDismissed');
    if (dismissed) {
      const dismissedTime = parseInt(dismissed);
      const daysSinceDismissed = (Date.now() - dismissedTime) / (1000 * 60 * 60 * 24);
      if (daysSinceDismissed < 7) return; // Don't show for 7 days after dismiss
    }

    // Detect device type
    const userAgent = navigator.userAgent.toLowerCase();
    if (/android/.test(userAgent)) {
      setDeviceType('android');
    } else if (/iphone|ipad|ipod/.test(userAgent)) {
      setDeviceType('ios');
    }

    // Listen for install prompt (Android)
    const handleBeforeInstallPrompt = (e: any) => {
      e.preventDefault();
      setDeferredPrompt(e);
      setShowPrompt(true);
    };

    window.addEventListener('beforeinstallprompt', handleBeforeInstallPrompt);

    // Show iOS prompt after 3 seconds
    if (/iphone|ipad|ipod/.test(userAgent)) {
      setTimeout(() => setShowPrompt(true), 3000);
    }

    return () => {
      window.removeEventListener('beforeinstallprompt', handleBeforeInstallPrompt);
    };
  }, []);

  const handleInstallClick = async () => {
    if (!deferredPrompt) return;

    deferredPrompt.prompt();
    const { outcome } = await deferredPrompt.userChoice;

    if (outcome === 'accepted') {
      console.log('PWA installed');
    }
    setDeferredPrompt(null);
    setShowPrompt(false);
  };

  const handleDismiss = () => {
    localStorage.setItem('installPromptDismissed', Date.now().toString());
    setShowPrompt(false);
  };

  if (!showPrompt) return null;

  return (
    <div className="fixed bottom-0 left-0 right-0 z-50 p-4 pb-safe">
      <div className="bg-gradient-to-r from-orange-500 to-pink-500 rounded-2xl shadow-2xl p-4 max-w-md mx-auto">
        <button
          onClick={handleDismiss}
          className="absolute top-2 right-2 text-white hover:bg-white/20 rounded-full p-1"
        >
          <X size={20} />
        </button>

        <div className="flex items-start gap-4">
          <div className="w-16 h-16 bg-white rounded-2xl flex items-center justify-center flex-shrink-0 shadow-lg">
            <span className="text-3xl">🍕</span>
          </div>

          <div className="flex-1 text-white">
            <h3 className="font-bold text-lg mb-1">
              Install PattiBytes Express
            </h3>
            <p className="text-sm opacity-90 mb-3">
              ਪੱਟੀ ਦੀ ਲੋੜ, ਹਾਢੇ ਕੋਲ ਤੋੜ
            </p>

            {deviceType === 'android' && deferredPrompt && (
              <button
                onClick={handleInstallClick}
                className="bg-white text-orange-600 px-6 py-2.5 rounded-lg font-semibold flex items-center gap-2 hover:bg-gray-100 transition-colors w-full justify-center"
              >
                <Download size={18} />
                Install Now
              </button>
            )}

            {deviceType === 'ios' && (
              <div className="bg-white/20 backdrop-blur-sm rounded-lg p-3 text-sm">
                <div className="flex items-center gap-2 mb-2">
                  <Share size={16} />
                  <span className="font-semibold">Install App:</span>
                </div>
                <ol className="space-y-1 text-xs">
                  <li>1. Tap the Share button below</li>
                  <li>2. Scroll and tap &quot;Add to Home Screen&quot;</li>
                  <li>3. Tap &quot;Add&quot; to install</li>
                </ol>
              </div>
            )}

            {deviceType === 'desktop' && (
              <p className="text-sm bg-white/20 backdrop-blur-sm rounded-lg p-3">
                Scan the QR code on mobile to install the app!
              </p>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
