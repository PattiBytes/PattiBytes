'use client';

import { useEffect, useState } from 'react';
import { QRCodeSVG } from 'qrcode.react';
import { Download, Share2, Smartphone, CheckCircle } from 'lucide-react';
import Link from 'next/link';
import Image from 'next/image';
import { isAppInstalled, getDeviceType } from '@/lib/pwa';

export default function QRCodePage() {
  const [appUrl, setAppUrl] = useState('');
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const [deferredPrompt, setDeferredPrompt] = useState<any>(null);
  const [deviceType, setDeviceType] = useState<'ios' | 'android' | 'desktop'>('desktop');
  const [canShare, setCanShare] = useState(false);
  const [mounted, setMounted] = useState(false);
  const [installed, setInstalled] = useState(false);

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setMounted(true);
    
    const url = window.location.origin;
    setAppUrl(url);
    setCanShare(typeof navigator !== 'undefined' && !!navigator.share);
    setDeviceType(getDeviceType());
    setInstalled(isAppInstalled());

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const handleBeforeInstallPrompt = (e: any) => {
      e.preventDefault();
      setDeferredPrompt(e);
    };

    const handleAppInstalled = () => {
      setInstalled(true);
      setDeferredPrompt(null);
    };

    window.addEventListener('beforeinstallprompt', handleBeforeInstallPrompt);
    window.addEventListener('appinstalled', handleAppInstalled);

    return () => {
      window.removeEventListener('beforeinstallprompt', handleBeforeInstallPrompt);
      window.removeEventListener('appinstalled', handleAppInstalled);
    };
  }, []);

  const handleInstallPWA = async () => {
    if (!deferredPrompt) return;

    deferredPrompt.prompt();
    const { outcome } = await deferredPrompt.userChoice;

    if (outcome === 'accepted') {
      console.log('PWA installed');
      setInstalled(true);
    }
    setDeferredPrompt(null);
  };

  const downloadQR = () => {
    const svg = document.querySelector('#qr-code svg');
    if (svg) {
      const svgData = new XMLSerializer().serializeToString(svg);
      const canvas = document.createElement('canvas');
      const ctx = canvas.getContext('2d');
      const img = new window.Image(); // Fix: Use window.Image instead of Image
      
      canvas.width = 512;
      canvas.height = 512;
      
      img.onload = () => {
        ctx?.drawImage(img, 0, 0);
        const url = canvas.toDataURL('image/png');
        const link = document.createElement('a');
        link.download = 'pattibytes-qr.png';
        link.href = url;
        link.click();
      };
      
      img.src = 'data:image/svg+xml;base64,' + btoa(svgData);
    }
  };

  const shareQR = async () => {
    if (canShare) {
      try {
        await navigator.share({
          title: 'PattiBytes Express',
          text: 'ਪੱਟੀ ਦੀ ਲੋੜ, ਹਾਢੇ ਕੋਲ ਤੋੜ - Scan to order delicious food!',
          url: appUrl,
        });
      } catch (error) {
        console.error('Share failed:', error);
      }
    }
  };

  if (!mounted) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-orange-500 via-pink-500 to-purple-500 flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-white"></div>
      </div>
    );
  }

  // If app is already installed, show success message
  if (installed) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-orange-500 via-pink-500 to-purple-500 flex items-center justify-center p-4">
        <div className="bg-white rounded-2xl shadow-2xl max-w-md w-full p-8 text-center">
          <div className="w-20 h-20 mx-auto mb-4 bg-green-100 rounded-full flex items-center justify-center">
            <CheckCircle className="text-green-600" size={40} />
          </div>
          <h1 className="text-3xl font-bold text-gray-900 mb-2">App Installed!</h1>
          <p className="text-gray-600 mb-6">PattiBytes Express has been added to your home screen</p>
          
          <div className="relative w-32 h-32 mx-auto mb-6">
            <Image
              src="/icon-192.png"
              alt="PattiBytes Logo"
              fill
              className="object-contain"
              priority
            />
          </div>

          <Link
            href="/"
            className="block w-full bg-primary text-white px-6 py-4 rounded-lg hover:bg-orange-600 font-semibold text-lg"
          >
            Open App →
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-orange-500 via-pink-500 to-purple-500 flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl shadow-2xl max-w-md w-full p-8">
        {/* Header with Logo */}
        <div className="text-center mb-8">
          <div className="relative w-20 h-20 mx-auto mb-4">
            <Image
              src="/icon-192.png"
              alt="PattiBytes Logo"
              fill
              className="object-contain"
              priority
            />
          </div>
          <h1 className="text-3xl font-bold text-gray-900 mb-2">PattiBytes Express</h1>
          <p className="text-gray-600 text-sm">ਪੱਟੀ ਦੀ ਲੋੜ, ਹਾਢੇ ਕੋਲ ਤੋੜ</p>
          <p className="text-gray-500 text-xs mt-1">Scan to order delicious food!</p>
        </div>

        {/* QR Code */}
        <div className="bg-gradient-to-br from-orange-100 to-pink-100 rounded-xl p-8 mb-6 flex justify-center" id="qr-code">
          {appUrl && (
            <QRCodeSVG
              value={appUrl}
              size={256}
              level="H"
              includeMargin
              imageSettings={{
                src: '/icon-192.png',
                x: undefined,
                y: undefined,
                height: 50,
                width: 50,
                excavate: true,
              }}
              className="rounded-lg shadow-lg bg-white p-4"
            />
          )}
        </div>

        {/* Install Instructions */}
        <div className="mb-6 space-y-3">
          {deviceType === 'ios' && (
            <div className="bg-blue-50 border-2 border-blue-200 rounded-lg p-4">
              <div className="flex items-start gap-3">
                <Smartphone className="text-blue-600 flex-shrink-0 mt-1" size={20} />
                <div>
                  <h3 className="font-bold text-blue-900 mb-2">📱 iOS - Install App</h3>
                  <ol className="text-sm text-blue-800 space-y-1 list-decimal list-inside">
                    <li>Open this page in <strong>Safari</strong></li>
                    <li>Tap the <strong>Share</strong> button <span className="inline-block">⎋</span></li>
                    <li>Scroll and tap <strong>&quot;Add to Home Screen&quot;</strong></li>
                    <li>Tap <strong>&quot;Add&quot;</strong> to install</li>
                  </ol>
                </div>
              </div>
            </div>
          )}

          {deviceType === 'android' && deferredPrompt && (
            <div className="bg-green-50 border-2 border-green-200 rounded-lg p-4">
              <div className="flex items-start gap-3">
                <Smartphone className="text-green-600 flex-shrink-0 mt-1" size={20} />
                <div className="flex-1">
                  <h3 className="font-bold text-green-900 mb-3">🤖 Android - Install Now</h3>
                  <button
                    onClick={handleInstallPWA}
                    className="bg-green-600 text-white px-6 py-3 rounded-lg hover:bg-green-700 font-semibold w-full shadow-lg animate-pulse"
                  >
                    ⬇️ Install App to Home Screen
                  </button>
                </div>
              </div>
            </div>
          )}

          {deviceType === 'android' && !deferredPrompt && (
            <div className="bg-green-50 border-2 border-green-200 rounded-lg p-4">
              <div className="flex items-start gap-3">
                <Smartphone className="text-green-600 flex-shrink-0 mt-1" size={20} />
                <div>
                  <h3 className="font-bold text-green-900 mb-2">🤖 Android - Manual Install</h3>
                  <ol className="text-sm text-green-800 space-y-1 list-decimal list-inside">
                    <li>Open Chrome browser menu (⋮)</li>
                    <li>Tap <strong>&quot;Add to Home screen&quot;</strong></li>
                    <li>Tap <strong>&quot;Add&quot;</strong> to install</li>
                  </ol>
                </div>
              </div>
            </div>
          )}

          {deviceType === 'desktop' && (
            <div className="bg-purple-50 border-2 border-purple-200 rounded-lg p-4">
              <div className="flex items-start gap-3">
                <Smartphone className="text-purple-600 flex-shrink-0 mt-1" size={20} />
                <div>
                  <h3 className="font-bold text-purple-900 mb-2">💻 Desktop - How to Use</h3>
                  <p className="text-sm text-purple-800 mb-2">
                    Scan this QR code with your <strong>mobile device</strong> to install the app on your phone.
                  </p>
                  <p className="text-xs text-purple-700">
                    Works on both Android and iOS devices!
                  </p>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Why Install Section */}
        <div className="bg-gradient-to-r from-orange-50 to-pink-50 rounded-lg p-4 mb-6">
          <h3 className="font-bold text-gray-900 mb-2 text-center">✨ Why Install?</h3>
          <ul className="text-sm text-gray-700 space-y-1">
            <li>⚡ Faster loading times</li>
            <li>🔔 Get instant order updates</li>
            <li>📱 Works offline</li>
            <li>🎯 Quick access from home screen</li>
          </ul>
        </div>

        {/* Actions */}
        <div className="flex gap-3 mb-4">
          <button
            onClick={downloadQR}
            className="flex-1 bg-gray-100 text-gray-700 px-4 py-3 rounded-lg hover:bg-gray-200 font-medium flex items-center justify-center gap-2 transition-all"
          >
            <Download size={18} />
            Save QR
          </button>
          {canShare && (
            <button
              onClick={shareQR}
              className="flex-1 bg-primary text-white px-4 py-3 rounded-lg hover:bg-orange-600 font-medium flex items-center justify-center gap-2 transition-all"
            >
              <Share2 size={18} />
              Share
            </button>
          )}
        </div>

        {/* Footer */}
        <div className="text-center">
          <Link
            href="/"
            className="text-primary hover:text-orange-600 font-semibold text-sm inline-block transition-all hover:scale-105"
          >
            Skip & Open Web App →
          </Link>
        </div>
      </div>
    </div>
  );
}
