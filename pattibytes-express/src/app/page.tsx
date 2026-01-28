'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { ArrowRight, MapPin, Clock, ShieldCheck, Bike, Store, Users, Home, Search, User, Menu, X } from 'lucide-react';
import { useAuth } from '@/hooks/useAuth';

export default function HomePage() {
  const router = useRouter();
  const { isAuthenticated, loading, userRole, user } = useAuth();
  const [showPanel, setShowPanel] = useState(false);
  const [showMobileMenu, setShowMobileMenu] = useState(false);

  useEffect(() => {
    // Show panel redirect option for authenticated users
    if (!loading && isAuthenticated && userRole) {
      // eslint-disable-next-line react-hooks/set-state-in-effect
      setShowPanel(true);
    }
  }, [isAuthenticated, loading, userRole]);

  const handleGoToPanel = () => {
    if (userRole === 'customer') {
      router.push('/customer/dashboard');
    } else if (userRole === 'merchant') {
      router.push('/merchant/dashboard');
    } else if (userRole === 'driver') {
      router.push('/driver/dashboard');
    } else if (userRole === 'admin' || userRole === 'superadmin') {
      router.push('/admin/dashboard');
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary"></div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-orange-50 via-white to-orange-50">
      {/* Header */}
      <header className="bg-white shadow-sm sticky top-0 z-50">
        <nav className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <div className="w-10 h-10 bg-primary rounded-full flex items-center justify-center">
                <span className="text-white font-bold text-xl">P</span>
              </div>
              <h1 className="text-2xl font-bold text-primary">Pattibytes Express</h1>
            </div>

            {/* Desktop Menu */}
            <div className="hidden md:flex items-center gap-6">
              <Link href="#features" className="text-gray-700 hover:text-primary font-medium">
                Features
              </Link>
              <Link href="#about" className="text-gray-700 hover:text-primary font-medium">
                About
              </Link>
              {isAuthenticated ? (
                <button
                  onClick={handleGoToPanel}
                  className="bg-primary text-white px-6 py-2 rounded-lg hover:bg-orange-600 font-medium flex items-center gap-2"
                >
                  Go to Dashboard
                  <ArrowRight size={16} />
                </button>
              ) : (
                <>
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
                </>
              )}
            </div>

            {/* Mobile Menu Button */}
            <button
              onClick={() => setShowMobileMenu(!showMobileMenu)}
              className="md:hidden text-gray-700"
            >
              {showMobileMenu ? <X size={24} /> : <Menu size={24} />}
            </button>
          </div>

          {/* Mobile Menu */}
          {showMobileMenu && (
            <div className="md:hidden mt-4 pb-4 space-y-3">
              <Link href="#features" className="block text-gray-700 hover:text-primary font-medium">
                Features
              </Link>
              <Link href="#about" className="block text-gray-700 hover:text-primary font-medium">
                About
              </Link>
              {isAuthenticated ? (
                <button
                  onClick={handleGoToPanel}
                  className="w-full bg-primary text-white px-6 py-2 rounded-lg hover:bg-orange-600 font-medium"
                >
                  Go to Dashboard
                </button>
              ) : (
                <>
                  <Link
                    href="/auth/login"
                    className="block text-center border-2 border-primary text-primary px-6 py-2 rounded-lg hover:bg-orange-50 font-medium"
                  >
                    Login
                  </Link>
                  <Link
                    href="/auth/signup"
                    className="block text-center bg-primary text-white px-6 py-2 rounded-lg hover:bg-orange-600 font-medium"
                  >
                    Sign Up
                  </Link>
                </>
              )}
            </div>
          )}
        </nav>
      </header>

      {/* Panel Redirect Notification */}
      {showPanel && (
        <div className="bg-gradient-to-r from-blue-500 to-blue-600 text-white">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-3">
            <div className="flex items-center justify-between">
              <p className="font-medium">
                Welcome back, {user?.full_name}! Ready to continue?
              </p>
              <div className="flex items-center gap-3">
                <button
                  onClick={handleGoToPanel}
                  className="bg-white text-blue-600 px-4 py-2 rounded-lg hover:bg-blue-50 font-medium text-sm"
                >
                  Go to Dashboard
                </button>
                <button
                  onClick={() => setShowPanel(false)}
                  className="text-white hover:text-blue-100"
                >
                  <X size={20} />
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Hero Section */}
      <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-20">
        <div className="grid lg:grid-cols-2 gap-12 items-center">
          <div>
            <h1 className="text-5xl font-bold text-gray-900 leading-tight">
              Food Delivery from
              <span className="text-primary"> Local Restaurants</span>
            </h1>
            <p className="text-xl text-gray-600 mt-6">
              Order delicious food from your favorite restaurants, cafes, dhabas and more in Ludhiana. 
              Fast delivery, great prices, amazing taste!
            </p>
            
            <div className="flex flex-col sm:flex-row gap-4 mt-8">
              {isAuthenticated ? (
                <button
                  onClick={handleGoToPanel}
                  className="bg-primary text-white px-8 py-4 rounded-lg hover:bg-orange-600 font-semibold text-lg flex items-center justify-center gap-2 shadow-lg"
                >
                  Go to Dashboard
                  <ArrowRight size={20} />
                </button>
              ) : (
                <>
                  <Link
                    href="/auth/signup?role=customer"
                    className="bg-primary text-white px-8 py-4 rounded-lg hover:bg-orange-600 font-semibold text-lg flex items-center justify-center gap-2 shadow-lg"
                  >
                    Order Now
                    <ArrowRight size={20} />
                  </Link>
                  <Link
                    href="/auth/signup?role=merchant"
                    className="bg-white text-primary border-2 border-primary px-8 py-4 rounded-lg hover:bg-orange-50 font-semibold text-lg flex items-center justify-center gap-2"
                  >
                    Join as Restaurant
                  </Link>
                </>
              )}
            </div>

            {/* Stats */}
            <div className="grid grid-cols-3 gap-6 mt-12">
              <div>
                <p className="text-3xl font-bold text-primary">50+</p>
                <p className="text-gray-600 mt-1">Restaurants</p>
              </div>
              <div>
                <p className="text-3xl font-bold text-primary">1000+</p>
                <p className="text-gray-600 mt-1">Happy Customers</p>
              </div>
              <div>
                <p className="text-3xl font-bold text-primary">30min</p>
                <p className="text-gray-600 mt-1">Avg Delivery</p>
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
                    <p className="text-sm text-gray-600">We deliver anywhere in city</p>
                  </div>
                </div>

                <div className="flex items-center gap-4">
                  <div className="w-16 h-16 bg-orange-100 rounded-xl flex items-center justify-center">
                    <Bike className="text-primary" size={32} />
                  </div>
                  <div>
                    <p className="font-bold text-gray-900">Fast Delivery</p>
                    <p className="text-sm text-gray-600">Get food in 30 minutes</p>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Features Section */}
      <section id="features" className="bg-white py-20">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-16">
            <h2 className="text-4xl font-bold text-gray-900">Why Choose Us?</h2>
            <p className="text-xl text-gray-600 mt-4">
              We make food delivery simple, fast, and reliable
            </p>
          </div>

          <div className="grid md:grid-cols-3 gap-8">
            <div className="bg-orange-50 rounded-2xl p-8 text-center">
              <div className="w-16 h-16 bg-primary rounded-full flex items-center justify-center mx-auto mb-4">
                <Clock className="text-white" size={32} />
              </div>
              <h3 className="text-xl font-bold text-gray-900 mb-3">Fast Delivery</h3>
              <p className="text-gray-600">
                Get your food delivered in 30 minutes or less. We value your time!
              </p>
            </div>

            <div className="bg-orange-50 rounded-2xl p-8 text-center">
              <div className="w-16 h-16 bg-primary rounded-full flex items-center justify-center mx-auto mb-4">
                <ShieldCheck className="text-white" size={32} />
              </div>
              <h3 className="text-xl font-bold text-gray-900 mb-3">100% Safe</h3>
              <p className="text-gray-600">
                Contactless delivery, hygiene standards, and verified restaurants.
              </p>
            </div>

            <div className="bg-orange-50 rounded-2xl p-8 text-center">
              <div className="w-16 h-16 bg-primary rounded-full flex items-center justify-center mx-auto mb-4">
                <Users className="text-white" size={32} />
              </div>
              <h3 className="text-xl font-bold text-gray-900 mb-3">Best Support</h3>
              <p className="text-gray-600">
                24/7 customer support to help you with any issues or queries.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* Join Section */}
      <section id="about" className="py-20">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="bg-gradient-to-r from-primary to-orange-600 rounded-3xl p-12 text-center text-white">
            <h2 className="text-4xl font-bold mb-4">Join Pattibytes Express Today</h2>
            <p className="text-xl mb-8 text-orange-100">
              Whether you&apos;re hungry or want to grow your business, we&apos;ve got you covered!
            </p>
            
            {!isAuthenticated && (
              <div className="flex flex-col sm:flex-row gap-4 justify-center">
                <Link
                  href="/auth/signup?role=customer"
                  className="bg-white text-primary px-8 py-4 rounded-lg hover:bg-orange-50 font-semibold text-lg"
                >
                  Order Food Now
                </Link>
                <Link
                  href="/auth/signup?role=merchant"
                  className="bg-transparent border-2 border-white text-white px-8 py-4 rounded-lg hover:bg-white hover:text-primary font-semibold text-lg"
                >
                  Register Restaurant
                </Link>
                <Link
                  href="/auth/signup?role=driver"
                  className="bg-transparent border-2 border-white text-white px-8 py-4 rounded-lg hover:bg-white hover:text-primary font-semibold text-lg"
                >
                  Become a Driver
                </Link>
              </div>
            )}
          </div>
        </div>
      </section>

      {/* Footer */}
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
                <li><Link href="#about" className="hover:text-white">About Us</Link></li>
                <li><Link href="#features" className="hover:text-white">Features</Link></li>
                <li><a href="mailto:contact@pattibytes.com" className="hover:text-white">Contact</a></li>
              </ul>
            </div>
            
            <div>
              <h4 className="font-semibold mb-4">For Partners</h4>
              <ul className="space-y-2 text-gray-400">
                <li><Link href="/auth/signup?role=merchant" className="hover:text-white">Partner with us</Link></li>
                <li><Link href="/auth/signup?role=driver" className="hover:text-white">Ride with us</Link></li>
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

      {/* Bottom Navigation - Mobile Only */}
      {isAuthenticated && (
        <nav className="md:hidden fixed bottom-0 left-0 right-0 bg-white border-t border-gray-200 z-50">
          <div className="grid grid-cols-4 gap-1">
            <button
              onClick={handleGoToPanel}
              className="flex flex-col items-center justify-center py-3 text-primary"
            >
              <Home size={24} />
              <span className="text-xs mt-1">Home</span>
            </button>
            
            <button
              onClick={() => router.push('/customer/dashboard')}
              className="flex flex-col items-center justify-center py-3 text-gray-600"
            >
              <Search size={24} />
              <span className="text-xs mt-1">Search</span>
            </button>
            
            <button
              onClick={() => router.push('/customer/orders')}
              className="flex flex-col items-center justify-center py-3 text-gray-600"
            >
              <Store size={24} />
              <span className="text-xs mt-1">Orders</span>
            </button>
            
            <button
              onClick={() => router.push('/customer/profile')}
              className="flex flex-col items-center justify-center py-3 text-gray-600"
            >
              <User size={24} />
              <span className="text-xs mt-1">Profile</span>
            </button>
          </div>
        </nav>
      )}
    </div>
  );
}
