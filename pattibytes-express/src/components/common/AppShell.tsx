/* eslint-disable react-hooks/static-components */
/* eslint-disable react-hooks/set-state-in-effect */
 
 
/* eslint-disable @typescript-eslint/no-explicit-any */
'use client';

import Link from 'next/link';
import Image from 'next/image';
import { usePathname, useRouter } from 'next/navigation';
import { useEffect, useMemo, useState } from 'react';
import { LogOut, Menu, X, ChevronRight, User as UserIcon } from 'lucide-react';
import { toast } from 'react-toastify';

import { useAuth } from '@/contexts/AuthContext';
import NotificationBell from '@/components/common/NotificationBell';
import BottomNav from '@/components/navigation/BottomNav';

type NavItem = { href: string; label: string };

const NAV: NavItem[] = [
  { href: '/merchant/dashboard', label: 'Dashboard' },
  { href: '/merchant/orders', label: 'Orders' },
  { href: '/merchant/menu', label: 'Menu' },
  { href: '/merchant/analytics', label: 'Analytics' },
  { href: '/customer/dashboard', label: 'Browse Food' },
  { href: '/merchant/profile', label: 'Profile' },
];

const MOBILE_BOTTOM_NAV_PX = 72;

function cx(...s: Array<string | false | null | undefined>) {
  return s.filter(Boolean).join(' ');
}

export default function AppShell({
  title = 'Pattibytes Express',
  children,
}: {
  title?: string;
  children: React.ReactNode;
}) {
  const { user, logout } = useAuth();
  const router = useRouter();
  const pathname = usePathname();

  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [isScrolled, setIsScrolled] = useState(false);

  const activeHref = useMemo(() => {
    const p = pathname || '';
    return (href: string) => p === href || p.startsWith(href + '/');
  }, [pathname]);

  // Scroll shadow
  useEffect(() => {
    const handleScroll = () => setIsScrolled(window.scrollY > 10);
    window.addEventListener('scroll', handleScroll);
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  // Close sidebar on route change
  useEffect(() => {
    setSidebarOpen(false);
  }, [pathname]);

  // Lock body scroll when sidebar open (mobile)
  useEffect(() => {
    if (!sidebarOpen) return;
    const prev = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => {
      document.body.style.overflow = prev;
    };
  }, [sidebarOpen]);

  const handleLogout = async () => {
    try {
      await logout();
      toast.success('Logged out');
      router.push('/login');
    } catch (e: any) {
      toast.error(e?.message || 'Logout failed');
    }
  };

  const profileHref = user?.role ? `/${user.role}/profile` : '/';
  const displayName = (user as any)?.full_name || (user as any)?.fullname || 'User';
  const roleLabel = String((user as any)?.role || '').toLowerCase();

  const avatarUrl = (user as any)?.avatar_url || (user as any)?.logo_url || '';

  const NavLinks = ({ onNavigate }: { onNavigate?: () => void }) => (
    <nav className="space-y-2">
      {NAV.map((n) => {
        const isActive = activeHref(n.href);
        return (
          <Link
            key={n.href}
            href={n.href}
            onClick={onNavigate}
            className={cx(
              'flex items-center justify-between gap-3 px-4 py-3 rounded-xl transition-all duration-300 group',
              isActive
                ? 'bg-gradient-to-r from-orange-500 to-pink-500 text-white shadow-lg'
                : 'text-gray-700 hover:bg-gradient-to-r hover:from-orange-50 hover:to-pink-50 hover:text-primary'
            )}
          >
            <span className="font-semibold truncate">{n.label}</span>
            {isActive && <ChevronRight size={16} />}
          </Link>
        );
      })}

      <div className="pt-4 mt-4 border-t border-gray-200">
        <button
          type="button"
          onClick={handleLogout}
          className="w-full flex items-center gap-3 px-4 py-3 text-red-600 hover:bg-red-50 rounded-xl transition-all duration-300 font-semibold group"
        >
          <LogOut size={20} className="group-hover:translate-x-1 transition-transform" />
          <span>Logout</span>
        </button>
      </div>
    </nav>
  );

  // If no user, render children and no nav (same as your current DashboardLayout behavior)
  if (!user) return <>{children}</>;

  return (
    <div
      className="min-h-screen bg-gradient-to-br from-orange-50 via-white to-pink-50"
      style={{
        paddingBottom: `calc(${MOBILE_BOTTOM_NAV_PX}px + env(safe-area-inset-bottom))`,
      }}
    >
      {/* Top Navigation */}
      <nav
        className={cx(
          'bg-white sticky top-0 z-40 transition-all duration-300 border-b border-gray-200/70',
          isScrolled ? 'shadow-lg' : 'shadow-sm'
        )}
      >
        <div className="max-w-7xl mx-auto px-3 sm:px-6 lg:px-8">
          <div className="flex justify-between h-16">
            <div className="flex items-center gap-3">
              <button
                onClick={() => setSidebarOpen((v) => !v)}
                className="lg:hidden p-2 rounded-xl text-gray-900 hover:bg-gradient-to-r hover:from-orange-500 hover:to-pink-500 hover:text-white transition-all duration-300 transform hover:scale-105 active:scale-95"
                aria-label="Toggle menu"
              >
                {sidebarOpen ? <X className="w-6 h-6" /> : <Menu className="w-6 h-6" />}
              </button>

              <Link href="/customer/dashboard" className="flex items-center gap-2">
                <span className="text-xl font-bold bg-gradient-to-r from-orange-500 to-pink-500 bg-clip-text text-transparent">
                  {title}
                </span>
              </Link>
            </div>

            <div className="flex items-center gap-2 sm:gap-3">
              <NotificationBell />

              <Link
                href={profileHref}
                className="hidden sm:flex items-center gap-2 hover:bg-gray-50 rounded-xl p-2 transition-all duration-300"
                title="Profile"
              >
                <div className="relative w-9 h-9 rounded-full overflow-hidden ring-2 ring-gray-200">
                  {avatarUrl ? (
                    <Image src={avatarUrl} alt="Profile" fill sizes="36px" className="object-cover" />
                  ) : (
                    <div className="w-full h-full bg-gradient-to-r from-orange-500 to-pink-500 flex items-center justify-center">
                      <span className="text-white font-bold">{String(displayName).charAt(0) || 'U'}</span>
                    </div>
                  )}
                </div>
              </Link>

              <button
                type="button"
                onClick={handleLogout}
                className="hidden lg:inline-flex items-center gap-2 px-3 py-2 rounded-xl bg-gray-900 text-white hover:bg-black text-xs font-semibold transition"
                title="Logout"
              >
                <LogOut className="w-4 h-4" />
                Logout
              </button>
            </div>
          </div>
        </div>
      </nav>

      <div className="flex max-w-7xl mx-auto">
        {/* Desktop Sidebar */}
        <aside className="hidden lg:block sticky top-16 h-[calc(100vh-4rem)] w-72 bg-white shadow-xl rounded-r-2xl overflow-y-auto">
          <div className="p-4 space-y-4">
            {/* Profile card (side) */}
            <Link
              href={profileHref}
              className="flex items-center gap-3 p-3 rounded-2xl border border-gray-100 bg-gray-50 hover:bg-white transition"
            >
              <div className="relative w-12 h-12 rounded-full overflow-hidden ring-2 ring-gray-200 bg-white">
                {avatarUrl ? (
                  <Image src={avatarUrl} alt="Profile" fill sizes="48px" className="object-cover" />
                ) : (
                  <div className="w-full h-full bg-gradient-to-r from-orange-500 to-pink-500 flex items-center justify-center">
                    <UserIcon className="text-white" size={20} />
                  </div>
                )}
              </div>
              <div className="min-w-0">
                <p className="text-sm font-bold text-gray-900 truncate">{displayName}</p>
                <p className="text-xs text-gray-600 capitalize truncate">{roleLabel || 'user'}</p>
              </div>
            </Link>

            <div>
              <p className="text-xs font-bold text-gray-500 mb-3">Navigation</p>
              <NavLinks />
            </div>
          </div>
        </aside>

        {/* Mobile Sidebar */}
        <aside
          className={cx(
            'lg:hidden fixed top-16 left-0 z-30 h-[calc(100vh-4rem)] w-[82vw] max-w-[320px] bg-white shadow-2xl transform transition-transform duration-300 ease-out overflow-y-auto',
            sidebarOpen ? 'translate-x-0' : '-translate-x-full'
          )}
        >
          <div className="p-4 space-y-4">
            <Link
              href={profileHref}
              onClick={() => setSidebarOpen(false)}
              className="flex items-center gap-3 p-3 rounded-2xl border border-gray-100 bg-gray-50"
            >
              <div className="relative w-12 h-12 rounded-full overflow-hidden ring-2 ring-gray-200 bg-white">
                {avatarUrl ? (
                  <Image src={avatarUrl} alt="Profile" fill sizes="48px" className="object-cover" />
                ) : (
                  <div className="w-full h-full bg-gradient-to-r from-orange-500 to-pink-500 flex items-center justify-center">
                    <UserIcon className="text-white" size={20} />
                  </div>
                )}
              </div>
              <div className="min-w-0">
                <p className="text-sm font-bold text-gray-900 truncate">{displayName}</p>
                <p className="text-xs text-gray-600 capitalize truncate">{roleLabel || 'user'}</p>
              </div>
            </Link>

            <div>
              <p className="text-xs font-bold text-gray-500 mb-3">Navigation</p>
              <NavLinks onNavigate={() => setSidebarOpen(false)} />
            </div>
          </div>
        </aside>

        {/* Main */}
        <main className="flex-1 min-h-[calc(100vh-4rem)] px-2.5 sm:px-3.5 md:px-5 lg:px-6 py-4">
          {children}
        </main>
      </div>

      {/* Bottom Nav (your existing component) */}
      <BottomNav role={(user as any).role} />

      {/* Mobile overlay */}
      {sidebarOpen && (
        <div
          className="lg:hidden fixed inset-0 bg-black/50 backdrop-blur-sm z-20"
          onClick={() => setSidebarOpen(false)}
        />
      )}
    </div>
  );
}
