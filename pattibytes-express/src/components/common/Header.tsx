'use client';

import { useAuth } from '@/contexts/AuthContext';
import Link from 'next/link';
import Image from 'next/image';
import { Menu, X, User, ShoppingBag } from 'lucide-react';
import { useState } from 'react';
import { useRouter, usePathname } from 'next/navigation';

export default function Header() {
  const { user, logout } = useAuth();
  const router = useRouter();
  const pathname = usePathname();
  const [menuOpen, setMenuOpen] = useState(false);

  const handleLogout = async () => {
    await logout();
    router.push('/');
  };

  // Don't show header on auth pages or dashboard pages
  if (pathname.startsWith('/auth') || 
      pathname.startsWith('/customer') || 
      pathname.startsWith('/merchant') || 
      pathname.startsWith('/driver') || 
      pathname.startsWith('/admin')) {
    return null;
  }

  return (
    <header className="bg-white shadow-sm sticky top-0 z-50">
      <nav className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex justify-between items-center h-16">
          {/* Logo */}
          <Link href="/" className="flex items-center gap-3 hover-scale">
            <div className="relative w-10 h-10">
              <Image
                src="/icon-192.png"
                alt="PattiBytes Express"
                fill
                 sizes="40px"
                className="object-contain"
                priority
              />
            </div>
            <div className="hidden sm:block">
              <div className="font-bold text-xl text-gray-900">PattiBytes Express</div>
              <div className="text-xs text-primary font-semibold">ਪੱਟੀ ਦੀ ਲੋੜ, ਹਾਢੇ ਕੋਲ ਤੋੜ</div>
            </div>
          </Link>

          {/* Desktop Menu */}
          <div className="hidden md:flex items-center gap-6">
            {user ? (
              <>
                <Link
                  href={`/${user.role}/dashboard`}
                  className="text-gray-700 hover:text-primary font-medium transition-colors"
                >
                  Dashboard
                </Link>
                <Link
                  href={`/${user.role}/orders`}
                  className="text-gray-700 hover:text-primary font-medium transition-colors flex items-center gap-2"
                >
                  <ShoppingBag size={20} />
                  Orders
                </Link>
                <Link
                  href={`/${user.role}/profile`}
                  className="text-gray-700 hover:text-primary font-medium transition-colors flex items-center gap-2"
                >
                  <User size={20} />
                  Profile
                </Link>
                <button
                  onClick={handleLogout}
                  className="bg-red-600 text-white px-6 py-2 rounded-lg hover:bg-red-700 font-medium transition-colors"
                >
                  Logout
                </button>
              </>
            ) : (
              <>
                <Link
                  href="/auth/login"
                  className="text-gray-700 hover:text-primary font-medium transition-colors"
                >
                  Sign In
                </Link>
                <Link
                  href="/auth/signup"
                  className="bg-primary text-white px-6 py-2 rounded-lg hover:bg-orange-600 font-medium transition-colors"
                >
                  Sign Up
                </Link>
              </>
            )}
          </div>

          {/* Mobile Menu Button */}
<button
  onClick={() => setMenuOpen(!menuOpen)}
  className="md:hidden p-2 rounded-lg hover:bg-gray-100 text-gray-900" // Added text-gray-900
>
  {menuOpen ? (
    <X size={24} className="text-gray-900" />
  ) : (
    <Menu size={24} className="text-gray-900" />
  )}
</button>

        </div>

        {/* Mobile Menu */}
        {menuOpen && (
          <div className="md:hidden py-4 border-t border-gray-200">
            <div className="flex flex-col gap-4">
              {user ? (
                <>
                  <Link
                    href={`/${user.role}/dashboard`}
                    className="text-gray-700 hover:text-primary font-medium transition-colors px-4 py-2"
                    onClick={() => setMenuOpen(false)}
                  >
                    Dashboard
                  </Link>
                  <Link
                    href={`/${user.role}/orders`}
                    className="text-gray-700 hover:text-primary font-medium transition-colors px-4 py-2 flex items-center gap-2"
                    onClick={() => setMenuOpen(false)}
                  >
                    <ShoppingBag size={20} />
                    Orders
                  </Link>
                  <Link
                    href={`/${user.role}/profile`}
                    className="text-gray-700 hover:text-primary font-medium transition-colors px-4 py-2 flex items-center gap-2"
                    onClick={() => setMenuOpen(false)}
                  >
                    <User size={20} />
                    Profile
                  </Link>
                  <button
                    onClick={() => {
                      handleLogout();
                      setMenuOpen(false);
                    }}
                    className="bg-red-600 text-white px-6 py-2 rounded-lg hover:bg-red-700 font-medium transition-colors mx-4"
                  >
                    Logout
                  </button>
                </>
              ) : (
                <>
                  <Link
                    href="/auth/login"
                    className="text-gray-700 hover:text-primary font-medium transition-colors px-4 py-2"
                    onClick={() => setMenuOpen(false)}
                  >
                    Sign In
                  </Link>
                  <Link
                    href="/auth/signup"
                    className="bg-primary text-white px-6 py-2 rounded-lg hover:bg-orange-600 font-medium transition-colors mx-4 text-center"
                    onClick={() => setMenuOpen(false)}
                  >
                    Sign Up
                  </Link>
                </>
              )}
            </div>
          </div>
        )}
      </nav>
    </header>
  );
}
