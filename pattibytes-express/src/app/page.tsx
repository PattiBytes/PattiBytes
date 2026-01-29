/* eslint-disable @typescript-eslint/no-explicit-any */
'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/contexts/AuthContext';
import Link from 'next/link';
import Image from 'next/image';
import { 
  ShoppingBag, 
  Truck, 
  Store, 
  ChevronRight,
  Download,
  Smartphone,
  Monitor,
  Apple
} from 'lucide-react';

export default function HomePage() {
  const { user, loading } = useAuth();
  const router = useRouter();
  const [isStandalone, setIsStandalone] = useState(false);
  const [installPrompt, setInstallPrompt] = useState<any>(null);
  const [showInstallInstructions, setShowInstallInstructions] = useState(false);
  const [platform, setPlatform] = useState<'ios' | 'android' | 'desktop'>('desktop');

  useEffect(() => {
    const standalone = window.matchMedia('(display-mode: standalone)').matches || 
                      (window.navigator as any).standalone === true;
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setIsStandalone(standalone);

    const userAgent = window.navigator.userAgent.toLowerCase();
    if (/iphone|ipad|ipod/.test(userAgent)) {
      setPlatform('ios');
    } else if (/android/.test(userAgent)) {
      setPlatform('android');
    } else {
      setPlatform('desktop');
    }

    if (standalone && user && !loading) {
      router.push(`/${user.role}/dashboard`);
      return;
    }

    const handleBeforeInstallPrompt = (e: Event) => {
      e.preventDefault();
      setInstallPrompt(e);
    };

    window.addEventListener('beforeinstallprompt', handleBeforeInstallPrompt);

    return () => {
      window.removeEventListener('beforeinstallprompt', handleBeforeInstallPrompt);
    };
  }, [user, loading, router, isStandalone]);

  const handleInstallClick = async () => {
    if (installPrompt) {
      installPrompt.prompt();
      const { outcome } = await installPrompt.userResult;
      if (outcome === 'accepted') {
        setInstallPrompt(null);
      }
    } else {
      setShowInstallInstructions(true);
    }
  };

  const handleContinueToApp = () => {
    if (user) {
      router.push(`/${user.role}/dashboard`);
    } else {
      router.push('/auth/login');
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-orange-50 via-white to-pink-50">
        <div className="text-center">
          <div className="animate-spin rounded-full h-16 w-16 border-t-4 border-primary mx-auto mb-4"></div>
          <p className="text-gray-600">Loading...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-orange-50 via-white to-pink-50">
      <section className="relative overflow-hidden">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-20">
          <div className="text-center">
            <div className="relative w-32 h-32 mx-auto mb-8 animate-scaleIn">
              <Image
                src="/icon-192.png"
                alt="PattiBytes Express"
                fill
                sizes="128px"
                className="object-contain"
                priority
              />
            </div>

            <h1 className="text-5xl md:text-6xl font-bold text-gray-900 mb-4 animate-fadeIn">
              PattiBytes Express
            </h1>
            
            <p className="text-2xl md:text-3xl text-primary font-bold mb-2 animate-fadeIn">
              ਪੱਟੀ ਦੀ ਲੋੜ, ਹਾਢੇ ਕੋਲ ਤੋੜ
            </p>

            <p className="text-xl text-gray-600 mb-12 max-w-2xl mx-auto animate-fadeIn">
              Order food from your favorite local restaurants in Ludhiana. Fast delivery, fresh food!
            </p>

            <div className="flex flex-col sm:flex-row gap-4 justify-center items-center mb-12">
              {!isStandalone && (
                <button
                  onClick={handleInstallClick}
                  className="group bg-gradient-to-r from-orange-500 to-pink-500 text-white px-8 py-4 rounded-xl font-bold text-lg hover:shadow-2xl transition-all hover-scale flex items-center gap-3"
                >
                  <Download size={24} />
                  Install App
                  <ChevronRight className="group-hover:translate-x-1 transition-transform" />
                </button>
              )}

              {user ? (
                <button
                  onClick={handleContinueToApp}
                  className="bg-white text-primary border-2 border-primary px-8 py-4 rounded-xl font-bold text-lg hover:bg-primary hover:text-white transition-all hover-scale flex items-center gap-3"
                >
                  Continue to App
                  <ChevronRight />
                </button>
              ) : (
                <>
                  <Link
                    href="/auth/login"
                    className="bg-white text-primary border-2 border-primary px-8 py-4 rounded-xl font-bold text-lg hover:bg-primary hover:text-white transition-all hover-scale inline-flex items-center gap-3"
                  >
                    Sign In
                    <ChevronRight />
                  </Link>

                  <Link
                    href="/auth/signup"
                    className="bg-gray-900 text-white px-8 py-4 rounded-xl font-bold text-lg hover:bg-gray-800 transition-all hover-scale inline-flex items-center gap-3"
                  >
                    Sign Up
                    <ChevronRight />
                  </Link>
                </>
              )}
            </div>

            <div className="grid md:grid-cols-3 gap-8 mt-20">
              <div className="bg-white rounded-2xl p-8 shadow-lg hover-lift">
                <div className="w-16 h-16 bg-gradient-to-br from-orange-500 to-pink-500 rounded-xl flex items-center justify-center mx-auto mb-4">
                  <ShoppingBag className="text-white" size={32} />
                </div>
                <h3 className="text-xl font-bold text-gray-900 mb-2">Order Food</h3>
                <p className="text-gray-600">
                  Browse menus from local restaurants and order your favorite dishes
                </p>
              </div>

              <div className="bg-white rounded-2xl p-8 shadow-lg hover-lift">
                <div className="w-16 h-16 bg-gradient-to-br from-blue-500 to-purple-500 rounded-xl flex items-center justify-center mx-auto mb-4">
                  <Truck className="text-white" size={32} />
                </div>
                <h3 className="text-xl font-bold text-gray-900 mb-2">Fast Delivery</h3>
                <p className="text-gray-600">
                  Get your food delivered quickly by our reliable delivery partners
                </p>
              </div>

              <div className="bg-white rounded-2xl p-8 shadow-lg hover-lift">
                <div className="w-16 h-16 bg-gradient-to-br from-green-500 to-teal-500 rounded-xl flex items-center justify-center mx-auto mb-4">
                  <Store className="text-white" size={32} />
                </div>
                <h3 className="text-xl font-bold text-gray-900 mb-2">Local Restaurants</h3>
                <p className="text-gray-600">
                  Support local businesses and enjoy authentic Punjabi cuisine
                </p>
              </div>
            </div>
          </div>
        </div>
      </section>

      {showInstallInstructions && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl max-w-md w-full p-8 animate-scaleIn">
            <div className="text-center mb-6">
              {platform === 'ios' && <Apple size={48} className="mx-auto text-gray-700 mb-4" />}
              {platform === 'android' && <Smartphone size={48} className="mx-auto text-green-600 mb-4" />}
              {platform === 'desktop' && <Monitor size={48} className="mx-auto text-blue-600 mb-4" />}
              
              <h3 className="text-2xl font-bold text-gray-900 mb-2">
                Install PattiBytes Express
              </h3>
            </div>

            <div className="text-left space-y-4 text-gray-700">
              {platform === 'ios' && (
                <>
                  <p className="font-semibold">On iPhone/iPad:</p>
                  <ol className="list-decimal list-inside space-y-2">
                    <li>Tap the Share button in Safari</li>
                    <li>Scroll down and tap &quot;Add to Home Screen&quot;</li>
                    <li>Tap &quot;Add&quot; in the top right</li>
                    <li>Launch the app from your home screen</li>
                  </ol>
                </>
              )}

              {platform === 'android' && (
                <>
                  <p className="font-semibold">On Android:</p>
                  <ol className="list-decimal list-inside space-y-2">
                    <li>Tap the menu button (⋮)</li>
                    <li>Select &quot;Add to Home screen&quot; or &quot;Install app&quot;</li>
                    <li>Tap &quot;Install&quot; or &quot;Add&quot;</li>
                    <li>Launch the app from your home screen</li>
                  </ol>
                </>
              )}

              {platform === 'desktop' && (
                <>
                  <p className="font-semibold">On Desktop (Chrome/Edge):</p>
                  <ol className="list-decimal list-inside space-y-2">
                    <li>Look for the install icon in the address bar</li>
                    <li>Click &quot;Install&quot;</li>
                    <li>Or go to menu ⋮ → &quot;Install PattiBytes Express&quot;</li>
                    <li>Launch from your desktop or taskbar</li>
                  </ol>
                </>
              )}
            </div>

            <button
              onClick={() => setShowInstallInstructions(false)}
              className="w-full mt-6 bg-primary text-white px-6 py-3 rounded-lg font-semibold hover:bg-orange-600 transition-colors"
            >
              Got it!
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
