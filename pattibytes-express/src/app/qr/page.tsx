'use client';

import { useEffect, useState } from 'react';
import { QRCodeSVG } from 'qrcode.react';
import { Download, Share2, Smartphone } from 'lucide-react';
import Link from 'next/link';

export default function QRCodePage() {
  const [appUrl, setAppUrl] = useState('');
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const [deferredPrompt, setDeferredPrompt] = useState<any>(null);
  const [deviceType, setDeviceType] = useState<'ios' | 'android' | 'desktop'>('desktop');
  const [canShare, setCanShare] = useState(false);
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setMounted(true);
    
    // Get current URL or use production URL
    const url = window.location.origin;
    setAppUrl(url);

    // Check if sharing is available
    setCanShare(typeof navigator !== 'undefined' && !!navigator.share);

    // Detect device
    const userAgent = navigator.userAgent.toLowerCase();
    if (/iphone|ipad|ipod/.test(userAgent)) {
      setDeviceType('ios');
    } else if (/android/.test(userAgent)) {
      setDeviceType('android');
    }

    // Listen for PWA install prompt
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const handleBeforeInstallPrompt = (e: any) => {
      e.preventDefault();
      setDeferredPrompt(e);
    };

    window.addEventListener('beforeinstallprompt', handleBeforeInstallPrompt);

    return () => {
      window.removeEventListener('beforeinstallprompt', handleBeforeInstallPrompt);
    };
  }, []);

  const handleInstallPWA = async () => {
    if (!deferredPrompt) return;

    deferredPrompt.prompt();
    const { outcome } = await deferredPrompt.userChoice;

    if (outcome === 'accepted') {
      console.log('PWA installed');
    }
    setDeferredPrompt(null);
  };

  const downloadQR = () => {
    const svg = document.querySelector('#qr-code svg');
    if (svg) {
      const svgData = new XMLSerializer().serializeToString(svg);
      const canvas = document.createElement('canvas');
      const ctx = canvas.getContext('2d');
      const img = new Image();
      
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
          text: 'Scan to order delicious food!',
          url: appUrl,
        });
      } catch (error) {
        console.error('Share failed:', error);
      }
    }
  };

  // Don't render share button until mounted
  if (!mounted) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-orange-500 via-pink-500 to-purple-500 flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-white"></div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-orange-500 via-pink-500 to-purple-500 flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl shadow-2xl max-w-md w-full p-8">
        {/* Header */}
        <div className="text-center mb-8">
          <div className="w-16 h-16 mx-auto mb-4 rounded-full bg-gradient-to-br from-orange-500 to-pink-500 flex items-center justify-center shadow-lg">
            <span className="text-white font-bold text-2xl">PB</span>
          </div>
          <h1 className="text-3xl font-bold text-gray-900 mb-2">PattiBytes Express</h1>
          <p className="text-gray-600">Scan to order delicious food!</p>
        </div>

        {/* QR Code */}
        <div className="bg-gradient-to-br from-orange-100 to-pink-100 rounded-xl p-8 mb-6 flex justify-center" id="qr-code">
          {appUrl && (
            <QRCodeSVG
              value={appUrl}
              size={256}
              level="H"
              includeMargin
              className="rounded-lg shadow-lg bg-white p-4"
            />
          )}
        </div>

        {/* Instructions */}
        <div className="mb-6 space-y-3">
          {deviceType === 'ios' && (
            <div className="bg-blue-50 border-2 border-blue-200 rounded-lg p-4">
              <div className="flex items-start gap-3">
                <Smartphone className="text-blue-600 flex-shrink-0 mt-1" size={20} />
                <div>
                  <h3 className="font-bold text-blue-900 mb-1">iOS Instructions</h3>
                  <ol className="text-sm text-blue-800 space-y-1 list-decimal list-inside">
                    <li>Open this page in Safari</li>
                    <li>Tap the Share button</li>
                    <li>Scroll and tap &quot;Add to Home Screen&quot;</li>
                    <li>Tap &quot;Add&quot; to install</li>
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
                  <h3 className="font-bold text-green-900 mb-2">Android - Install App</h3>
                  <button
                    onClick={handleInstallPWA}
                    className="bg-green-600 text-white px-4 py-2 rounded-lg hover:bg-green-700 font-medium w-full"
                  >
                    Install App
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
                  <h3 className="font-bold text-green-900 mb-1">Android Instructions</h3>
                  <ol className="text-sm text-green-800 space-y-1 list-decimal list-inside">
                    <li>Open Chrome browser menu</li>
                    <li>Tap &quot;Add to Home screen&quot;</li>
                    <li>Tap &quot;Add&quot; to install</li>
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
                  <h3 className="font-bold text-purple-900 mb-1">How to Use</h3>
                  <p className="text-sm text-purple-800">
                    Scan this QR code with your mobile device to access the app and add it to your home screen for quick access.
                  </p>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Actions */}
        <div className="flex gap-3">
          <button
            onClick={downloadQR}
            className="flex-1 bg-gray-100 text-gray-700 px-4 py-3 rounded-lg hover:bg-gray-200 font-medium flex items-center justify-center gap-2"
          >
            <Download size={18} />
            Download
          </button>
          {canShare && (
            <button
              onClick={shareQR}
              className="flex-1 bg-primary text-white px-4 py-3 rounded-lg hover:bg-orange-600 font-medium flex items-center justify-center gap-2"
            >
              <Share2 size={18} />
              Share
            </button>
          )}
        </div>

        {/* Footer */}
        <div className="text-center mt-6">
          <Link
            href="/"
            className="text-primary hover:text-orange-600 font-medium text-sm"
          >
            Open App →
          </Link>
        </div>
      </div>
    </div>
  );
}
