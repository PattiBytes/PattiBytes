'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/hooks/useAuth';
import { useNotifications } from '@/hooks/useNotifications';
import { Bell, ShoppingCart, Menu, X, User, LogOut, Home } from 'lucide-react';
import Link from 'next/link';

export default function Header() {
  const router = useRouter();
  const { user, logout } = useAuth();
  const { unreadCount } = useNotifications();
  const [cartCount, setCartCount] = useState(0);
  const [showProfileMenu, setShowProfileMenu] = useState(false);
  const [showMobileMenu, setShowMobileMenu] = useState(false);

  useEffect(() => {
    // Load cart count from localStorage
    const cart = JSON.parse(localStorage.getItem('cart') || '[]');
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setCartCount(cart.length);
  }, []);

  const handleLogout = async () => {
    await logout();
    router.push('/login');
  };

  const getDashboardLink = () => {
    if (!user) return '/';
    switch (user.role) {
      case 'customer':
        return '/customer/dashboard';
      case 'merchant':
        return '/merchant/dashboard';
      case 'driver':
        return '/driver/dashboard';
      case 'admin':
      case 'superadmin':
        return '/admin/dashboard';
      default:
        return '/';
    }
  };

  return (
    <header className="bg-white shadow-md sticky top-0 z-50">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-16">
          {/* Logo & Branding */}
          <div className="flex items-center gap-3">
            <Link href="/" className="flex items-center gap-3 hover:opacity-80 transition-opacity">
              {/* Logo */}
              <div className="w-10 h-10 rounded-full bg-gradient-to-br from-orange-500 to-pink-500 flex items-center justify-center text-white font-bold text-xl shadow-lg">
                PB
              </div>
              {/* Title & Tagline */}
              <div className="hidden sm:block">
                <h1 className="text-xl font-bold bg-gradient-to-r from-orange-500 to-pink-500 bg-clip-text text-transparent">
                  PattiBytes Express
                </h1>
                <p className="text-xs text-gray-600">Delicious food, delivered fast</p>
              </div>
            </Link>
          </div>

          {/* Desktop Navigation */}
          <nav className="hidden md:flex items-center gap-6">
            {user && (
              <>
                <Link
                  href={getDashboardLink()}
                  className="flex items-center gap-2 text-gray-700 hover:text-primary transition-colors"
                >
                  <Home size={20} />
                  <span className="font-medium">Dashboard</span>
                </Link>

                {user.role === 'customer' && (
                  <>
                    <Link
                      href="/customer/restaurants"
                      className="text-gray-700 hover:text-primary transition-colors font-medium"
                    >
                      Restaurants
                    </Link>
                    <Link
                      href="/customer/orders"
                      className="text-gray-700 hover:text-primary transition-colors font-medium"
                    >
                      My Orders
                    </Link>
                  </>
                )}

                {user.role === 'merchant' && (
                  <>
                    <Link
                      href="/merchant/orders"
                      className="text-gray-700 hover:text-primary transition-colors font-medium"
                    >
                      Orders
                    </Link>
                    <Link
                      href="/merchant/menu"
                      className="text-gray-700 hover:text-primary transition-colors font-medium"
                    >
                      Menu
                    </Link>
                  </>
                )}

                {user.role === 'driver' && (
                  <Link
                    href="/driver/orders"
                    className="text-gray-700 hover:text-primary transition-colors font-medium"
                  >
                    Deliveries
                  </Link>
                )}

                {(user.role === 'admin' || user.role === 'superadmin') && (
                  <>
                    <Link
                      href="/admin/orders"
                      className="text-gray-700 hover:text-primary transition-colors font-medium"
                    >
                      Orders
                    </Link>
                    <Link
                      href="/admin/merchants"
                      className="text-gray-700 hover:text-primary transition-colors font-medium"
                    >
                      Merchants
                    </Link>
                    <Link
                      href="/admin/users"
                      className="text-gray-700 hover:text-primary transition-colors font-medium"
                    >
                      Users
                    </Link>
                  </>
                )}
              </>
            )}
          </nav>

          {/* Right Side Icons */}
          <div className="flex items-center gap-4">
            {user && (
              <>
                {/* Cart (Customer only) */}
                {user.role === 'customer' && (
                  <button
                    onClick={() => router.push('/customer/cart')}
                    className="relative p-2 text-gray-700 hover:text-primary transition-colors"
                  >
                    <ShoppingCart size={24} />
                    {cartCount > 0 && (
                      <span className="absolute -top-1 -right-1 bg-primary text-white text-xs font-bold rounded-full w-5 h-5 flex items-center justify-center">
                        {cartCount}
                      </span>
                    )}
                  </button>
                )}

                {/* Notifications */}
                <button
                  onClick={() => router.push(`/${user.role}/notifications`)}
                  className="relative p-2 text-gray-700 hover:text-primary transition-colors"
                >
                  <Bell size={24} />
                  {unreadCount > 0 && (
                    <span className="absolute -top-1 -right-1 bg-red-500 text-white text-xs font-bold rounded-full w-5 h-5 flex items-center justify-center">
                      {unreadCount}
                    </span>
                  )}
                </button>

                {/* Profile Menu */}
                <div className="relative">
                  <button
                    onClick={() => setShowProfileMenu(!showProfileMenu)}
                    className="flex items-center gap-2 p-2 rounded-lg hover:bg-gray-100 transition-colors"
                  >
                    <div className="w-8 h-8 rounded-full bg-gradient-to-br from-orange-400 to-pink-500 flex items-center justify-center text-white font-bold">
                      {user.full_name?.charAt(0).toUpperCase() || 'U'}
                    </div>
                    <span className="hidden md:block font-medium text-gray-700">
                      {user.full_name?.split(' ')[0] || 'User'}
                    </span>
                  </button>

                  {showProfileMenu && (
                    <>
                      <div
                        className="fixed inset-0 z-10"
                        onClick={() => setShowProfileMenu(false)}
                      />
                      <div className="absolute right-0 mt-2 w-48 bg-white rounded-lg shadow-lg py-2 z-20">
                        <Link
                          href={`/${user.role}/profile`}
                          className="flex items-center gap-2 px-4 py-2 text-gray-700 hover:bg-gray-100 transition-colors"
                        >
                          <User size={18} />
                          Profile
                        </Link>
                        <button
                          onClick={handleLogout}
                          className="flex items-center gap-2 px-4 py-2 text-red-600 hover:bg-red-50 transition-colors w-full text-left"
                        >
                          <LogOut size={18} />
                          Logout
                        </button>
                      </div>
                    </>
                  )}
                </div>
              </>
            )}

            {!user && (
              <div className="flex items-center gap-3">
                <Link
                  href="/login"
                  className="text-gray-700 hover:text-primary transition-colors font-medium"
                >
                  Login
                </Link>
                <Link
                  href="/signup"
                  className="bg-primary text-white px-4 py-2 rounded-lg hover:bg-orange-600 transition-colors font-medium"
                >
                  Sign Up
                </Link>
              </div>
            )}

            {/* Mobile Menu Toggle */}
            <button
              onClick={() => setShowMobileMenu(!showMobileMenu)}
              className="md:hidden p-2 text-gray-700 hover:text-primary transition-colors"
            >
              {showMobileMenu ? <X size={24} /> : <Menu size={24} />}
            </button>
          </div>
        </div>
      </div>

      {/* Mobile Menu */}
      {showMobileMenu && user && (
        <div className="md:hidden border-t border-gray-200 bg-white">
          <nav className="px-4 py-4 space-y-3">
            <Link
              href={getDashboardLink()}
              className="flex items-center gap-2 text-gray-700 hover:text-primary transition-colors py-2"
            >
              <Home size={20} />
              Dashboard
            </Link>

            {user.role === 'customer' && (
              <>
                <Link
                  href="/customer/restaurants"
                  className="block text-gray-700 hover:text-primary transition-colors py-2"
                >
                  Restaurants
                </Link>
                <Link
                  href="/customer/orders"
                  className="block text-gray-700 hover:text-primary transition-colors py-2"
                >
                  My Orders
                </Link>
              </>
            )}

            {user.role === 'merchant' && (
              <>
                <Link
                  href="/merchant/orders"
                  className="block text-gray-700 hover:text-primary transition-colors py-2"
                >
                  Orders
                </Link>
                <Link
                  href="/merchant/menu"
                  className="block text-gray-700 hover:text-primary transition-colors py-2"
                >
                  Menu
                </Link>
              </>
            )}

            {user.role === 'driver' && (
              <Link
                href="/driver/orders"
                className="block text-gray-700 hover:text-primary transition-colors py-2"
              >
                Deliveries
              </Link>
            )}

            {(user.role === 'admin' || user.role === 'superadmin') && (
              <>
                <Link
                  href="/admin/orders"
                  className="block text-gray-700 hover:text-primary transition-colors py-2"
                >
                  Orders
                </Link>
                <Link
                  href="/admin/merchants"
                  className="block text-gray-700 hover:text-primary transition-colors py-2"
                >
                  Merchants
                </Link>
                <Link
                  href="/admin/users"
                  className="block text-gray-700 hover:text-primary transition-colors py-2"
                >
                  Users
                </Link>
              </>
            )}
          </nav>
        </div>
      )}
    </header>
  );
}
