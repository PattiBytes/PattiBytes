'use client';

import { useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/hooks/useAuth';
import { useNotifications } from '@/hooks/useNotifications';
import { cartService } from '@/services/cart';
import { Bell, ShoppingCart, ChevronDown, LogOut, User, Store, Truck, Shield, Menu, X } from 'lucide-react';

export default function Header() {
  const router = useRouter();
  const { user, logout } = useAuth();
  const { unreadCount } = useNotifications(user?.id);
  const [cartCount, setCartCount] = useState(0);
  const [showProfileMenu, setShowProfileMenu] = useState(false);
  const [showMobileMenu, setShowMobileMenu] = useState(false);

  // Update cart count
  useState(() => {
    if (typeof window !== 'undefined') {
      const count = cartService.getCount();
      setCartCount(count);
    }
  });

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const panelLinks: Record<string, { icon: any; label: string; href: string }> = {
    customer: { icon: User, label: 'Customer', href: '/customer/dashboard' },
    merchant: { icon: Store, label: 'Merchant', href: '/merchant/dashboard' },
    driver: { icon: Truck, label: 'Driver', href: '/driver/dashboard' },
    admin: { icon: Shield, label: 'Admin', href: '/admin/dashboard' },
    superadmin: { icon: Shield, label: 'Super Admin', href: '/admin/superadmin' },
  };

  const currentPanel = panelLinks[user?.role || 'customer'];

  const handleLogout = async () => {
    await logout();
    router.push('/');
  };

  return (
    <header className="bg-white shadow-sm sticky top-0 z-50">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-16">
          {/* Logo & App Name */}
          <Link href="/" className="flex items-center gap-2">
            <div className="w-10 h-10 bg-primary rounded-full flex items-center justify-center">
              <span className="text-white font-bold text-xl">P</span>
            </div>
            <span className="text-xl font-bold text-primary hidden sm:block">
              Pattibytes Express
            </span>
          </Link>

          {/* Desktop Navigation */}
          <div className="hidden md:flex items-center gap-4">
            {/* Cart (Customer only) */}
            {user?.role === 'customer' && (
              <Link
                href="/customer/cart"
                className="relative p-2 text-gray-700 hover:text-primary"
              >
                <ShoppingCart size={24} />
                {cartCount > 0 && (
                  <span className="absolute -top-1 -right-1 bg-red-500 text-white text-xs rounded-full w-5 h-5 flex items-center justify-center">
                    {cartCount}
                  </span>
                )}
              </Link>
            )}

            {/* Notifications */}
            <Link
              href={`/${user?.role}/notifications`}
              className="relative p-2 text-gray-700 hover:text-primary"
            >
              <Bell size={24} />
              {unreadCount > 0 && (
                <span className="absolute -top-1 -right-1 bg-red-500 text-white text-xs rounded-full w-5 h-5 flex items-center justify-center">
                  {unreadCount}
                </span>
              )}
            </Link>

            {/* Profile Menu */}
            <div className="relative">
              <button
                onClick={() => setShowProfileMenu(!showProfileMenu)}
                className="flex items-center gap-2 p-2 rounded-lg hover:bg-gray-100"
              >
                <div className="w-8 h-8 rounded-full bg-primary flex items-center justify-center text-white font-semibold">
                  {user?.full_name?.charAt(0).toUpperCase() || 'U'}
                </div>
                <span className="font-medium text-gray-900 hidden lg:block">
                  {user?.full_name}
                </span>
                <ChevronDown size={16} className="text-gray-600" />
              </button>

              {/* Dropdown */}
              {showProfileMenu && (
                <>
                  <div
                    className="fixed inset-0 z-10"
                    onClick={() => setShowProfileMenu(false)}
                  />
                  <div className="absolute right-0 mt-2 w-64 bg-white rounded-lg shadow-lg border border-gray-200 py-2 z-20">
                    <div className="px-4 py-3 border-b border-gray-200">
                      <p className="font-semibold text-gray-900">{user?.full_name}</p>
                      <p className="text-sm text-gray-600">{user?.email}</p>
                    </div>

                    {/* Current Panel */}
                    <div className="px-4 py-3 bg-orange-50 border-b border-gray-200">
                      <div className="flex items-center gap-2 text-primary">
                        {currentPanel && <currentPanel.icon size={18} />}
                        <span className="font-medium capitalize">
                          {currentPanel?.label} Panel
                        </span>
                      </div>
                    </div>

                    {/* Panel Switching */}
                    <div className="py-2">
                      <p className="px-4 py-2 text-xs font-semibold text-gray-500 uppercase">
                        Switch Panel
                      </p>
                      {Object.entries(panelLinks).map(([role, panel]) => {
                        if (role === user?.role) return null;
                        return (
                          <button
                            key={role}
                            onClick={() => {
                              router.push(panel.href);
                              setShowProfileMenu(false);
                            }}
                            className="w-full px-4 py-2 text-left hover:bg-gray-100 flex items-center gap-2 text-gray-700"
                          >
                            <panel.icon size={18} />
                            <span>{panel.label}</span>
                          </button>
                        );
                      })}
                    </div>

                    <div className="border-t border-gray-200 py-2">
                      <Link
                        href={`/${user?.role}/profile`}
                        className="block px-4 py-2 text-gray-700 hover:bg-gray-100"
                        onClick={() => setShowProfileMenu(false)}
                      >
                        Profile Settings
                      </Link>
                      <button
                        onClick={handleLogout}
                        className="w-full px-4 py-2 text-left text-red-600 hover:bg-red-50 flex items-center gap-2"
                      >
                        <LogOut size={18} />
                        <span>Logout</span>
                      </button>
                    </div>
                  </div>
                </>
              )}
            </div>
          </div>

          {/* Mobile Menu Button */}
          <button
            onClick={() => setShowMobileMenu(!showMobileMenu)}
            className="md:hidden p-2 text-gray-700"
          >
            {showMobileMenu ? <X size={24} /> : <Menu size={24} />}
          </button>
        </div>

        {/* Mobile Menu */}
        {showMobileMenu && (
          <div className="md:hidden py-4 border-t border-gray-200">
            <div className="space-y-1">
              <Link
                href={`/${user?.role}/profile`}
                className="block px-4 py-3 text-gray-700 hover:bg-gray-100 rounded-lg"
                onClick={() => setShowMobileMenu(false)}
              >
                Profile Settings
              </Link>
              <button
                onClick={handleLogout}
                className="w-full text-left px-4 py-3 text-red-600 hover:bg-red-50 rounded-lg"
              >
                Logout
              </button>
            </div>
          </div>
        )}
      </div>
    </header>
  );
}
