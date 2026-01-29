/* eslint-disable @next/next/no-img-element */
'use client';

import { useEffect } from 'react';
import Link from 'next/link';
import { ArrowRight, Zap, Shield, Clock, Star } from 'lucide-react';
import Header from '@/components/common/Header';

export default function HomePage() {
  useEffect(() => {
    // Register service worker for PWA
    if ('serviceWorker' in navigator) {
      navigator.serviceWorker.register('/sw.js').catch((error) => {
        console.error('Service worker registration failed:', error);
      });
    }
  }, []);

  return (
    <div className="min-h-screen bg-gradient-to-b from-orange-50 to-white">
      <Header />

      {/* Hero Section */}
      <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-16 md:py-24">
        <div className="grid lg:grid-cols-2 gap-12 items-center">
          <div>
            <div className="inline-block bg-orange-100 text-orange-600 px-4 py-2 rounded-full text-sm font-semibold mb-6">
              🎉 Now serving Patti!
            </div>
            
            <h1 className="text-5xl lg:text-6xl font-bold text-gray-900 leading-tight mb-4">
              PattiBytes Express
            </h1>
            
            <p className="text-2xl md:text-3xl mb-2 font-bold text-primary">
              ਪੱਟੀ ਦੀ ਲੋੜ, ਹਾਢੇ ਕੋਲ ਤੋੜ
            </p>
            
            <p className="text-xl text-gray-600 mb-8">
              Your favorite local restaurants, delivered fast to your doorstep
            </p>

            <div className="flex flex-wrap gap-4">
              <Link
                href="/auth/signup"
                className="bg-gradient-to-r from-orange-500 to-pink-500 text-white px-8 py-4 rounded-lg hover:shadow-xl transition-all font-semibold text-lg flex items-center gap-2"
              >
                Order Now
                <ArrowRight size={20} />
              </Link>
              
              <Link
                href="/auth/signup?role=merchant"
                className="bg-white text-gray-900 px-8 py-4 rounded-lg border-2 border-gray-300 hover:border-primary transition-all font-semibold text-lg"
              >
                Partner With Us
              </Link>
            </div>

            {/* Stats */}
            <div className="grid grid-cols-3 gap-6 mt-12">
              <div>
                <div className="text-3xl font-bold text-primary">100+</div>
                <div className="text-sm text-gray-600">Restaurants</div>
              </div>
              <div>
                <div className="text-3xl font-bold text-primary">10k+</div>
                <div className="text-sm text-gray-600">Happy Customers</div>
              </div>
              <div>
                <div className="text-3xl font-bold text-primary">30 min</div>
                <div className="text-sm text-gray-600">Avg Delivery</div>
              </div>
            </div>
          </div>

          <div className="relative">
            <div className="relative z-10">
              <img
                src="https://images.unsplash.com/photo-1504674900247-0877df9cc836?w=600&h=800&fit=crop"
                alt="Delicious Food"
                className="rounded-3xl shadow-2xl"
              />
            </div>
            <div className="absolute -top-4 -right-4 w-72 h-72 bg-gradient-to-br from-orange-400 to-pink-500 rounded-full opacity-20 blur-3xl"></div>
            <div className="absolute -bottom-4 -left-4 w-72 h-72 bg-gradient-to-br from-blue-400 to-purple-500 rounded-full opacity-20 blur-3xl"></div>
          </div>
        </div>
      </section>

      {/* Features */}
      <section className="bg-white py-20">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <h2 className="text-4xl font-bold text-center mb-4">Why Choose Us?</h2>
          <p className="text-center text-gray-600 mb-12">ਸਾਡੇ ਨਾਲ ਆਪਣਾ ਮਨਪਸੰਦ ਖਾਣਾ ਮੰਗਵਾਓ</p>

          <div className="grid md:grid-cols-4 gap-8">
            <div className="text-center">
              <div className="w-16 h-16 bg-gradient-to-br from-orange-400 to-pink-500 rounded-2xl flex items-center justify-center mx-auto mb-4 shadow-lg">
                <Zap className="text-white" size={32} />
              </div>
              <h3 className="font-bold text-xl mb-2">Lightning Fast</h3>
              <p className="text-gray-600">30-minute delivery guarantee</p>
            </div>

            <div className="text-center">
              <div className="w-16 h-16 bg-gradient-to-br from-blue-400 to-purple-500 rounded-2xl flex items-center justify-center mx-auto mb-4 shadow-lg">
                <Shield className="text-white" size={32} />
              </div>
              <h3 className="font-bold text-xl mb-2">Safe & Secure</h3>
              <p className="text-gray-600">Contactless delivery available</p>
            </div>

            <div className="text-center">
              <div className="w-16 h-16 bg-gradient-to-br from-green-400 to-teal-500 rounded-2xl flex items-center justify-center mx-auto mb-4 shadow-lg">
                <Clock className="text-white" size={32} />
              </div>
              <h3 className="font-bold text-xl mb-2">Track Live</h3>
              <p className="text-gray-600">Real-time order tracking</p>
            </div>

            <div className="text-center">
              <div className="w-16 h-16 bg-gradient-to-br from-yellow-400 to-orange-500 rounded-2xl flex items-center justify-center mx-auto mb-4 shadow-lg">
                <Star className="text-white" size={32} />
              </div>
              <h3 className="font-bold text-xl mb-2">Best Quality</h3>
              <p className="text-gray-600">Verified restaurants only</p>
            </div>
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="bg-gradient-to-r from-orange-500 to-pink-500 py-20">
        <div className="max-w-4xl mx-auto px-4 text-center">
          <h2 className="text-4xl font-bold text-white mb-4">
            Ready to Order?
          </h2>
          <p className="text-xl text-white/90 mb-8">
            Join thousands of happy customers in Punjab
          </p>
          <Link
            href="/auth/signup"
            className="inline-block bg-white text-orange-600 px-8 py-4 rounded-lg hover:shadow-xl transition-all font-semibold text-lg"
          >
            Get Started Now
          </Link>
        </div>
      </section>

      {/* Footer */}
      <footer className="bg-gray-900 text-white py-12">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid md:grid-cols-4 gap-8">
            <div>
              <h3 className="font-bold text-xl mb-4">PattiBytes Express</h3>
              <p className="text-gray-400 text-sm">
                ਪੱਟੀ ਦੀ ਲੋੜ, ਹਾਢੇ ਕੋਲ ਤੋੜ
              </p>
            </div>
            <div>
              <h4 className="font-semibold mb-4">Company</h4>
              <ul className="space-y-2 text-sm text-gray-400">
                <li><Link href="/about">About Us</Link></li>
                <li><Link href="/contact">Contact</Link></li>
                <li><Link href="/careers">Careers</Link></li>
              </ul>
            </div>
            <div>
              <h4 className="font-semibold mb-4">Support</h4>
              <ul className="space-y-2 text-sm text-gray-400">
                <li><Link href="/help">Help Center</Link></li>
                <li><Link href="/terms">Terms</Link></li>
                <li><Link href="/privacy">Privacy</Link></li>
              </ul>
            </div>
            <div>
              <h4 className="font-semibold mb-4">Partner</h4>
              <ul className="space-y-2 text-sm text-gray-400">
                <li><Link href="/auth/signup?role=merchant">Become a Partner</Link></li>
                <li><Link href="/auth/signup?role=driver">Deliver With Us</Link></li>
              </ul>
            </div>
          </div>
          <div className="border-t border-gray-800 mt-8 pt-8 text-center text-sm text-gray-400">
            © 2026 PattiBytes Express. All rights reserved.
          </div>
        </div>
      </footer>
    </div>
  );
}
