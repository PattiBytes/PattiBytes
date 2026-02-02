/* eslint-disable react-hooks/static-components */
/* eslint-disable react-hooks/set-state-in-effect */
 
 
/* eslint-disable @typescript-eslint/no-explicit-any */
'use client';

import Link from 'next/link';
import Image from 'next/image';
import { usePathname, useRouter } from 'next/navigation';
import { useEffect, useMemo, useState } from 'react';
import { LogOut, Menu, X, ChevronRight } from 'lucide-react';
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
  }, [pathname]); // usePathname is correct in App Router. [web:79]

  useEffect(() => {
    const handleScroll = () => setIsScrolled(window.scrollY > 8);
    window.addEventListener('scroll', handleScroll);
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  useEffect(() => {
    setSidebarOpen(false);
  }, [pathname]);

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

  // If you want to ALWAYS show app logo (not user avatar), set this to true.
  const FORCE_APP_LOGO_AS_AVATAR = true;

  const userAvatarUrl = (user as any)?.avatar_url || (user as any)?.logo_url || '';
  const showAppLogo = FORCE_APP_LOGO_AS_AVATAR || !userAvatarUrl;

  const AppLogo = ({ size }: { size: number }) => (
    <div
      className="relative rounded-full overflow-hidden ring-2 ring-gray-200 bg-white"
      style={{ width: size, height: size }}
    >
      <Image
        src="/icon-192.png"
        alt="PattiBytes"
        fill
        sizes={`${size}px`}
        className="object-cover"
        priority
      />
    </div>
  );

  const NavLinks = ({ onNavigate }: { onNavigate?: () => void }) => (
    <nav className="space-y-1.5">
      {NAV.map((n) => {
        const isActive = activeHref(n.href);
        return (
          <Link
            key={n.href}
            href={n.href}
            onClick={onNavigate}
            className={cx(
              'flex items-center justify-between gap-2 px-3 py-2 rounded-xl transition-all duration-200',
              isActive
                ? 'bg-gradient-to-r from-orange-500 to-pink-500 text-white shadow'
                : 'text-gray-700 hover:bg-orange-50 hover:text-primary'
            )}
          >
            <span className="text-sm font-semibold truncate">{n.label}</span>
            {isActive && <ChevronRight size={14} />}
          </Link>
        );
      })}

      <div className="pt-3 mt-3 border-t border-gray-200">
        <button
          type="button"
          onClick={handleLogout}
          className="w-full flex items-center gap-2 px-3 py-2 text-red-600 hover:bg-red-50 rounded-xl transition font-semibold"
        >
          <LogOut size={18} />
          <span className="text-sm">Logout</span>
        </button>
      </div>
    </nav>
  );

  if (!user) return <>{children}</>;

  return (
    <div
      className="min-h-screen bg-gradient-to-br from-orange-50 via-white to-pink-50"
      style={{ paddingBottom: `calc(${MOBILE_BOTTOM_NAV_PX}px + env(safe-area-inset-bottom))` }}
    >
      {/* Smaller topbar with circular logo */}
      <header
        className={cx(
          'sticky top-0 z-40 bg-white/85 backdrop-blur border-b border-gray-200/70',
          isScrolled ? 'shadow' : 'shadow-sm'
        )}
      >
        <div className="max-w-7xl mx-auto px-2.5 sm:px-6 lg:px-8">
          <div className="h-14 flex items-center justify-between gap-2">
            <div className="flex items-center gap-2">
              <button
                onClick={() => setSidebarOpen(true)}
                className="lg:hidden w-9 h-9 inline-flex items-center justify-center rounded-xl border border-gray-200 bg-white hover:bg-gray-50"
                aria-label="Open menu"
              >
                <Menu className="w-5 h-5 text-gray-900" />
              </button>

              <Link href="/customer/dashboard" className="flex items-center gap-2">
                <AppLogo size={28} />
                <span className="font-extrabold text-sm sm:text-base text-gray-900">
                  <span className="bg-gradient-to-r from-orange-500 to-pink-500 bg-clip-text text-transparent">
                    {title}
                  </span>
                </span>
              </Link>
            </div>

            <div className="flex items-center gap-2">
              <NotificationBell />

              <Link href={profileHref} className="hidden sm:inline-flex items-center gap-2" title="Profile">
                {showAppLogo ? (
                  <AppLogo size={32} />
                ) : (
                  <div className="relative w-8 h-8 rounded-full overflow-hidden ring-2 ring-gray-200 bg-white">
                    <Image src={userAvatarUrl} alt="Profile" fill sizes="32px" className="object-cover" />
                  </div>
                )}
              </Link>
            </div>
          </div>
        </div>
      </header>

      <div className="flex max-w-7xl mx-auto">
        {/* Desktop Sidebar */}
        <aside className="hidden lg:block sticky top-14 h-[calc(100vh-3.5rem)] w-72 bg-white shadow-xl rounded-r-2xl overflow-y-auto">
          <div className="p-4 space-y-4">
            {/* Profile card using circular logo */}
            <Link
              href={profileHref}
              className="flex items-center gap-3 p-3 rounded-2xl border border-gray-100 bg-gray-50 hover:bg-white transition"
            >
              {showAppLogo ? (
                <AppLogo size={44} />
              ) : (
                <div className="relative w-11 h-11 rounded-full overflow-hidden ring-2 ring-gray-200 bg-white">
                  <Image src={userAvatarUrl} alt="Profile" fill sizes="44px" className="object-cover" />
                </div>
              )}

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

        {/* Mobile Drawer (smaller) */}
        {sidebarOpen && (
          <div className="lg:hidden fixed inset-0 z-50">
            <div className="absolute inset-0 bg-black/45" onClick={() => setSidebarOpen(false)} />

            <div className="absolute left-0 top-0 h-full bg-white shadow-2xl w-[72vw] max-w-[260px]">
              <div className="p-3">
                <div className="flex items-center justify-between mb-3">
                  <div className="flex items-center gap-2 min-w-0">
                    <AppLogo size={26} />
                    <p className="text-sm font-extrabold text-gray-900 truncate">{title}</p>
                  </div>

                  <button
                    type="button"
                    className="w-9 h-9 inline-flex items-center justify-center rounded-xl border border-gray-200 bg-white hover:bg-gray-50"
                    onClick={() => setSidebarOpen(false)}
                    aria-label="Close menu"
                  >
                    <X className="w-5 h-5 text-gray-900" />
                  </button>
                </div>

                {/* compact profile card */}
                <Link
                  href={profileHref}
                  onClick={() => setSidebarOpen(false)}
                  className="flex items-center gap-2.5 p-2.5 rounded-2xl border border-gray-100 bg-gray-50"
                >
                  {showAppLogo ? (
                    <AppLogo size={40} />
                  ) : (
                    <div className="relative w-10 h-10 rounded-full overflow-hidden ring-2 ring-gray-200 bg-white">
                      <Image src={userAvatarUrl} alt="Profile" fill sizes="40px" className="object-cover" />
                    </div>
                  )}

                  <div className="min-w-0">
                    <p className="text-sm font-bold text-gray-900 truncate">{displayName}</p>
                    <p className="text-[11px] text-gray-600 capitalize truncate">{roleLabel || 'user'}</p>
                  </div>
                </Link>

                <div className="mt-3">
                  <NavLinks onNavigate={() => setSidebarOpen(false)} />
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Main */}
        <main className="flex-1 min-h-[calc(100vh-3.5rem)] px-2.5 sm:px-3.5 md:px-5 lg:px-6 py-4">
          {children}
        </main>
      </div>

      <BottomNav role={(user as any).role} />
    </div>
  );
}
