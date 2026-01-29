'use client';

import { useState } from 'react';
import Link from 'next/link';
import { useAuth } from '@/hooks/useAuth';
import { useRouter, usePathname } from 'next/navigation';
import { Menu, X, ShoppingCart, User, LogOut, Bell, Settings } from 'lucide-react';
import RoleSwitcher from './RoleSwitcher';

export default function Header() {
  const { user, logout } = useAuth();
  const router = useRouter();
  const pathname = usePathname();
  const [showMobileMenu, setShowMobileMenu] = useState(false);
  const [cartCount] = useState(0);

  const handleLogout = async () => {
    await logout();
    router.push('/');
  };

  const isActive = (path: string) => pathname === path;

  return (
    <header className="bg-white shadow-md sticky top-0 z-40">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-16">
          {/* Logo */}
          <Link href="/" className="flex items-center gap-3">
            <div className="w-10 h-10 bg-gradient-to-br from-orange-500 to-pink-500 rounded-full flex items-center justify-center shadow-lg">
              <span className="text-white text-xl font-bold">PB</span>
            </div>
            <div className="hidden sm:block">
              <h1 className="text-xl font-bold bg-gradient-to-r from-orange-500 to-pink-500 bg-clip-text text-transparent">
                PattiBytes Express
              </h1>
              <p className="text-xs text-gray-600 font-semibold -mt-1">
                ਪੱਟੀ ਦੀ ਲੋੜ, ਹਾਢੇ ਕੋਲ ਤੋੜ
              </p>
            </div>
          </Link>

          {/* Desktop Navigation */}
          {user && (
            <nav className="hidden md:flex items-center gap-6">
              {user.role === 'customer' && (
                <>
                  <Link
                    href="/customer/dashboard"
                    className={`font-medium transition-colors ${
                      isActive('/customer/dashboard')
                        ? 'text-primary'
                        : 'text-gray-700 hover:text-primary'
                    }`}
                  >
                    Home
                  </Link>
                  <Link
                    href="/customer/restaurants"
                    className={`font-medium transition-colors ${
                      isActive('/customer/restaurants')
                        ? 'text-primary'
                        : 'text-gray-700 hover:text-primary'
                    }`}
                  >
                    Restaurants
                  </Link>
                  <Link
                    href="/customer/orders"
                    className={`font-medium transition-colors ${
                      isActive('/customer/orders')
                        ? 'text-primary'
                        : 'text-gray-700 hover:text-primary'
                    }`}
                  >
                    Orders
                  </Link>
                </>
              )}

              {user.role === 'merchant' && (
                <>
                  <Link
                    href="/merchant/dashboard"
                    className={`font-medium transition-colors ${
                      isActive('/merchant/dashboard')
                        ? 'text-primary'
                        : 'text-gray-700 hover:text-primary'
                    }`}
                  >
                    Dashboard
                  </Link>
                  <Link
                    href="/merchant/menu"
                    className={`font-medium transition-colors ${
                      isActive('/merchant/menu')
                        ? 'text-primary'
                        : 'text-gray-700 hover:text-primary'
                    }`}
                  >
                    Menu
                  </Link>
                  <Link
                    href="/merchant/orders"
                    className={`font-medium transition-colors ${
                      isActive('/merchant/orders')
                        ? 'text-primary'
                        : 'text-gray-700 hover:text-primary'
                    }`}
                  >
                    Orders
                  </Link>
                </>
              )}

              {user.role === 'driver' && (
                <>
                  <Link
                    href="/driver/dashboard"
                    className={`font-medium transition-colors ${
                      isActive('/driver/dashboard')
                        ? 'text-primary'
                        : 'text-gray-700 hover:text-primary'
                    }`}
                  >
                    Dashboard
                  </Link>
                  <Link
                    href="/driver/orders"
                    className={`font-medium transition-colors ${
                      isActive('/driver/orders')
                        ? 'text-primary'
                        : 'text-gray-700 hover:text-primary'
                    }`}
                  >
                    Deliveries
                  </Link>
                </>
              )}

              {(user.role === 'admin' || user.role === 'superadmin') && (
                <>
                  <Link
                    href="/admin/dashboard"
                    className={`font-medium transition-colors ${
                      isActive('/admin/dashboard')
                        ? 'text-primary'
                        : 'text-gray-700 hover:text-primary'
                    }`}
                  >
                    Dashboard
                  </Link>
                  <Link
                    href="/admin/merchants"
                    className={`font-medium transition-colors ${
                      isActive('/admin/merchants')
                        ? 'text-primary'
                        : 'text-gray-700 hover:text-primary'
                    }`}
                  >
                    Restaurants
                  </Link>
                  <Link
                    href="/admin/orders"
                    className={`font-medium transition-colors ${
                      isActive('/admin/orders')
                        ? 'text-primary'
                        : 'text-gray-700 hover:text-primary'
                    }`}
                  >
                    Orders
                  </Link>
                </>
              )}
            </nav>
          )}

          {/* Right Side Actions */}
          <div className="flex items-center gap-3">
            {user ? (
              <>
                {/* Role Switcher (Admin/Superadmin only) */}
                <RoleSwitcher />

                {/* Cart (Customer only) */}
                {user.role === 'customer' && (
                  <Link
                    href="/customer/cart"
                    className="relative p-2 hover:bg-gray-100 rounded-full transition-colors"
                  >
                    <ShoppingCart size={20} className="text-gray-700" />
                    {cartCount > 0 && (
                      <span className="absolute -top-1 -right-1 bg-red-500 text-white text-xs w-5 h-5 flex items-center justify-center rounded-full font-bold">
                        {cartCount}
                      </span>
                    )}
                  </Link>
                )}

                {/* Notifications */}
                <button className="relative p-2 hover:bg-gray-100 rounded-full transition-colors">
                  <Bell size={20} className="text-gray-700" />
                  <span className="absolute top-1 right-1 w-2 h-2 bg-red-500 rounded-full"></span>
                </button>

                {/* Profile Menu */}
                <div className="relative group">
                  <button className="flex items-center gap-2 p-2 hover:bg-gray-100 rounded-lg transition-colors">
                    <div className="w-8 h-8 bg-gradient-to-br from-orange-400 to-pink-500 rounded-full flex items-center justify-center">
                      <User size={18} className="text-white" />
                    </div>
                    <span className="hidden lg:inline font-medium text-gray-700">
                      {user.full_name?.split(' ')[0] || 'User'}
                    </span>
                  </button>

                  {/* Dropdown */}
                  <div className="absolute right-0 mt-2 w-48 bg-white rounded-lg shadow-xl py-2 opacity-0 invisible group-hover:opacity-100 group-hover:visible transition-all">
                    <Link
                      href={`/${user.role}/profile`}
                      className="flex items-center gap-2 px-4 py-2 hover:bg-gray-50 text-gray-700"
                    >
                      <User size={16} />
                      Profile
                    </Link>
                    <Link
                      href={`/${user.role}/profile`}
                      className="flex items-center gap-2 px-4 py-2 hover:bg-gray-50 text-gray-700"
                    >
                      <Settings size={16} />
                      Settings
                    </Link>
                    <button
                      onClick={handleLogout}
                      className="w-full flex items-center gap-2 px-4 py-2 hover:bg-gray-50 text-red-600"
                    >
                      <LogOut size={16} />
                      Logout
                    </button>
                  </div>
                </div>

                {/* Mobile Menu Button */}
                <button
                  onClick={() => setShowMobileMenu(!showMobileMenu)}
                  className="md:hidden p-2 hover:bg-gray-100 rounded-lg"
                >
                  {showMobileMenu ? <X size={24} /> : <Menu size={24} />}
                </button>
              </>
            ) : (
              <div className="flex items-center gap-3">
                <Link
                  href="/auth/login"
                  className="px-4 py-2 text-gray-700 font-medium hover:text-primary transition-colors"
                >
                  Login
                </Link>
                <Link
                  href="/auth/signup"
                  className="px-4 py-2 bg-primary text-white rounded-lg hover:bg-orange-600 font-medium transition-colors"
                >
                  Sign Up
                </Link>
              </div>
            )}
          </div>
        </div>

        {/* Mobile Menu */}
        {showMobileMenu && user && (
          <div className="md:hidden py-4 border-t border-gray-200">
            <nav className="flex flex-col gap-2">
              {user.role === 'customer' && (
                <>
                  <Link
                    href="/customer/dashboard"
                    className="px-4 py-2 hover:bg-gray-50 rounded-lg text-gray-700 font-medium"
                    onClick={() => setShowMobileMenu(false)}
                  >
                    Home
                  </Link>
                  <Link
                    href="/customer/restaurants"
                    className="px-4 py-2 hover:bg-gray-50 rounded-lg text-gray-700 font-medium"
                    onClick={() => setShowMobileMenu(false)}
                  >
                    Restaurants
                  </Link>
                  <Link
                    href="/customer/orders"
                    className="px-4 py-2 hover:bg-gray-50 rounded-lg text-gray-700 font-medium"
                    onClick={() => setShowMobileMenu(false)}
                  >
                    Orders
                  </Link>
                </>
              )}
            </nav>
          </div>
        )}
      </div>
    </header>
  );
}
