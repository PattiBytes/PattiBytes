'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { ArrowRight, MapPin, Clock, ShieldCheck, Bike, Store, Users } from 'lucide-react';
import { useAuth } from '@/hooks/useAuth';

export default function HomePage() {
  const router = useRouter();
  const { isAuthenticated, loading, userRole } = useAuth();

  useEffect(() => {
    // Auto-redirect authenticated users to their dashboard
    if (!loading && isAuthenticated && userRole) {
      if (userRole === 'customer') {
        router.push('/customer/dashboard');
      } else if (userRole === 'merchant') {
        router.push('/merchant/dashboard');
      } else if (userRole === 'driver') {
        router.push('/driver/dashboard');
      } else if (userRole === 'admin' || userRole === 'superadmin') {
        router.push('/admin/dashboard');
      }
    }
  }, [isAuthenticated, loading, userRole, router]);

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary"></div>
      </div>
    );
  }

  // Show landing page only for guests
  if (isAuthenticated) {
    return null; // Will redirect via useEffect
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-orange-50 via-white to-orange-50">
      {/* Simple Header for Guests */}
      <header className="bg-white shadow-sm">
        <nav className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <div className="w-10 h-10 bg-primary rounded-full flex items-center justify-center">
                <span className="text-white font-bold text-xl">P</span>
              </div>
              <h1 className="text-2xl font-bold text-primary">Pattibytes Express</h1>
            </div>
            <div className="flex items-center gap-4">
              <Link
                href="/auth/login"
                className="text-gray-700 hover:text-primary font-medium"
              >
                Login
              </Link>
              <Link
                href="/auth/signup"
                className="bg-primary text-white px-6 py-2 rounded-lg hover:bg-orange-600 font-medium"
              >
                Sign Up
              </Link>
            </div>
          </div>
        </nav>
      </header>

      {/* Hero Section */}
      <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-20">
        <div className="grid lg:grid-cols-2 gap-12 items-center">
          <div>
            <h1 className="text-5xl font-bold text-gray-900 leading-tight">
              Food Delivery from
              <span className="text-primary"> Local Favorites</span>
            </h1>
            <p className="text-xl text-gray-600 mt-6">
              Order from restaurants, cafes, dhabas and more in Ludhiana. 
              Fast delivery, great prices, amazing taste!
            </p>
            
            <div className="flex flex-col sm:flex-row gap-4 mt-8">
              <Link
                href="/auth/signup?role=customer"
                className="bg-primary text-white px-8 py-4 rounded-lg hover:bg-orange-600 font-semibold text-lg flex items-center justify-center gap-2 shadow-lg"
              >
                Order Now
                <ArrowRight size={20} />
              </Link>
              <Link
                href="/auth/signup?role=merchant"
                className="bg-white text-primary border-2 border-primary px-8 py-4 rounded-lg hover:bg-orange-50 font-semibold text-lg"
              >
                Join as Partner
              </Link>
            </div>

            {/* Stats */}
            <div className="grid grid-cols-3 gap-6 mt-12">
              <div>
                <p className="text-3xl font-bold text-primary">50+</p>
                <p className="text-gray-600 mt-1">Partners</p>
              </div>
              <div>
                <p className="text-3xl font-bold text-primary">1000+</p>
                <p className="text-gray-600 mt-1">Orders</p>
              </div>
              <div>
                <p className="text-3xl font-bold text-primary">30min</p>
                <p className="text-gray-600 mt-1">Delivery</p>
              </div>
            </div>
          </div>

          <div className="relative">
            <div className="bg-gradient-to-br from-primary to-orange-600 rounded-3xl p-8 shadow-2xl">
              <div className="bg-white rounded-2xl p-6 space-y-4">
                <div className="flex items-center gap-4">
                  <div className="w-16 h-16 bg-orange-100 rounded-xl flex items-center justify-center">
                    <Store className="text-primary" size={32} />
                  </div>
                  <div>
                    <p className="font-bold text-gray-900">Choose Restaurant</p>
                    <p className="text-sm text-gray-600">Browse from 50+ options</p>
                  </div>
                </div>

                <div className="flex items-center gap-4">
                  <div className="w-16 h-16 bg-orange-100 rounded-xl flex items-center justify-center">
                    <MapPin className="text-primary" size={32} />
                  </div>
                  <div>
                    <p className="font-bold text-gray-900">Select Location</p>
                    <p className="text-sm text-gray-600">Delivery anywhere</p>
                  </div>
                </div>

                <div className="flex items-center gap-4">
                  <div className="w-16 h-16 bg-orange-100 rounded-xl flex items-center justify-center">
                    <Bike className="text-primary" size={32} />
                  </div>
                  <div>
                    <p className="font-bold text-gray-900">Fast Delivery</p>
                    <p className="text-sm text-gray-600">30 minutes average</p>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Features */}
      <section className="bg-white py-20">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-16">
            <h2 className="text-4xl font-bold text-gray-900">Why Choose Us?</h2>
            <p className="text-xl text-gray-600 mt-4">
              Simple, fast, and reliable food delivery
            </p>
          </div>

          <div className="grid md:grid-cols-3 gap-8">
            <div className="bg-orange-50 rounded-2xl p-8 text-center">
              <div className="w-16 h-16 bg-primary rounded-full flex items-center justify-center mx-auto mb-4">
                <Clock className="text-white" size={32} />
              </div>
              <h3 className="text-xl font-bold text-gray-900 mb-3">Fast Delivery</h3>
              <p className="text-gray-600">
                30 minutes or less guaranteed
              </p>
            </div>

            <div className="bg-orange-50 rounded-2xl p-8 text-center">
              <div className="w-16 h-16 bg-primary rounded-full flex items-center justify-center mx-auto mb-4">
                <ShieldCheck className="text-white" size={32} />
              </div>
              <h3 className="text-xl font-bold text-gray-900 mb-3">100% Safe</h3>
              <p className="text-gray-600">
                Verified partners and hygiene standards
              </p>
            </div>

            <div className="bg-orange-50 rounded-2xl p-8 text-center">
              <div className="w-16 h-16 bg-primary rounded-full flex items-center justify-center mx-auto mb-4">
                <Users className="text-white" size={32} />
              </div>
              <h3 className="text-xl font-bold text-gray-900 mb-3">24/7 Support</h3>
              <p className="text-gray-600">
                Always here to help you
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* Footer - Only on Root Page */}
      <footer className="bg-gray-900 text-white py-12">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid md:grid-cols-4 gap-8">
            <div>
              <h3 className="text-xl font-bold mb-4">Pattibytes Express</h3>
              <p className="text-gray-400">
                Delivering happiness, one meal at a time.
              </p>
            </div>
            
            <div>
              <h4 className="font-semibold mb-4">Company</h4>
              <ul className="space-y-2 text-gray-400">
                <li><a href="#" className="hover:text-white">About Us</a></li>
                <li><a href="#" className="hover:text-white">Careers</a></li>
                <li><a href="mailto:contact@pattibytes.com" className="hover:text-white">Contact</a></li>
              </ul>
            </div>
            
            <div>
              <h4 className="font-semibold mb-4">For Partners</h4>
              <ul className="space-y-2 text-gray-400">
                <li><Link href="/auth/signup?role=merchant" className="hover:text-white">Partner with us</Link></li>
                <li><Link href="/auth/signup?role=driver" className="hover:text-white">Become a driver</Link></li>
              </ul>
            </div>
            
            <div>
              <h4 className="font-semibold mb-4">Follow Us</h4>
              <div className="space-y-2 text-gray-400">
                <p>
                  <a 
                    href="https://instagram.com/thrillyverse" 
                    target="_blank" 
                    rel="noopener noreferrer"
                    className="hover:text-white"
                  >
                    @thrillyverse
                  </a>
                </p>
                <p>
                  <a 
                    href="https://instagram.com/pattibytes" 
                    target="_blank" 
                    rel="noopener noreferrer"
                    className="hover:text-white"
                  >
                    @pattibytes
                  </a>
                </p>
              </div>
            </div>
          </div>
          
          <div className="border-t border-gray-800 mt-8 pt-8 text-center text-gray-400">
            <p>&copy; 2026 Pattibytes Express. All rights reserved.</p>
          </div>
        </div>
      </footer>
    </div>
  );
}
