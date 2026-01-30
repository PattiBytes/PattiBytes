'use client';

import { useAuth } from '@/contexts/AuthContext';
import Link from 'next/link';
import Image from 'next/image';
import { Menu, X, User, ShoppingBag, LayoutDashboard, Package, MapPin, Users, Shield } from 'lucide-react';
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
      pathname.startsWith('/admin') ||
      pathname.startsWith('/superadmin')) {
    return null;
  }

  // Get role-specific links
  const getRoleLinks = () => {
    if (!user) return [];

    const baseLinks = [
      {
        href: `/${user.role}/dashboard`,
        label: 'Dashboard',
        icon: <LayoutDashboard size={20} />,
      },
      {
        href: `/${user.role}/orders`,
        label: 'Orders',
        icon: <ShoppingBag size={20} />,
      },
    ];

    // Role-specific links
    if (user.role === 'merchant') {
      baseLinks.push({
        href: '/merchant/menu',
        label: 'Menu',
        icon: <Package size={20} />,
      });
    }

    if (user.role === 'driver') {
      baseLinks.push({
        href: '/driver/deliveries',
        label: 'Deliveries',
        icon: <MapPin size={20} />,
      });
    }

    if (user.role === 'admin') {
      baseLinks.push({
        href: '/admin/merchants',
        label: 'Merchants',
        icon: <Users size={20} />,
      });
    }

    if (user.role === 'superadmin') {
      baseLinks.push(
        {
          href: '/superadmin/users',
          label: 'Users',
          icon: <Users size={20} />,
        },
        {
          href: '/superadmin/merchants',
          label: 'Merchants',
          icon: <Package size={20} />,
        }
      );
    }

    baseLinks.push({
      href: `/${user.role}/profile`,
      label: 'Profile',
      icon: <User size={20} />,
    });

    return baseLinks;
  };

  const roleLinks = getRoleLinks();

  // Get profile image
  const getProfileImage = () => {
    if (user?.avatar_url) return user.avatar_url;
    if (user?.logo_url) return user.logo_url;
    return null;
  };

  const profileImage = getProfileImage();

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
                {roleLinks.map((link) => (
                  <Link
                    key={link.href}
                    href={link.href}
                    className="text-gray-700 hover:text-primary font-medium transition-colors flex items-center gap-2"
                  >
                    {link.icon}
                    {link.label}
                  </Link>
                ))}
                
                {/* Profile Image/Logo */}
                {profileImage && (
                  <div className="relative w-10 h-10 rounded-full overflow-hidden border-2 border-primary">
                    <Image
                      src={profileImage}
                      alt={user.full_name || 'Profile'}
                      fill
                      sizes="40px"
                      className="object-cover"
                    />
                  </div>
                )}
                
                {/* Role Badge */}
                {(user.role === 'superadmin' || user.role === 'admin') && (
                  <div className="flex items-center gap-1 bg-purple-100 text-purple-800 px-3 py-1 rounded-full text-xs font-semibold">
                    <Shield size={14} />
                    {user.role === 'superadmin' ? 'SuperAdmin' : 'Admin'}
                  </div>
                )}
                
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
            className="md:hidden p-2 rounded-lg hover:bg-gray-100 text-gray-900"
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
                  {/* Profile Image in Mobile */}
                  {profileImage && (
                    <div className="flex items-center gap-3 px-4 py-2">
                      <div className="relative w-12 h-12 rounded-full overflow-hidden border-2 border-primary">
                        <Image
                          src={profileImage}
                          alt={user.full_name || 'Profile'}
                          fill
                          sizes="48px"
                          className="object-cover"
                        />
                      </div>
                      <div>
                        <p className="font-semibold text-gray-900">{user.full_name}</p>
                        <p className="text-sm text-gray-600 capitalize">{user.role}</p>
                      </div>
                    </div>
                  )}
                  
                  {roleLinks.map((link) => (
                    <Link
                      key={link.href}
                      href={link.href}
                      className="text-gray-700 hover:text-primary font-medium transition-colors px-4 py-2 flex items-center gap-2"
                      onClick={() => setMenuOpen(false)}
                    >
                      {link.icon}
                      {link.label}
                    </Link>
                  ))}
                  
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
