/* eslint-disable react-hooks/exhaustive-deps */
/* eslint-disable @typescript-eslint/no-unused-vars */
/* eslint-disable @typescript-eslint/no-explicit-any */
'use client';

import { useAuth } from '@/contexts/AuthContext';
import { useRouter, usePathname } from 'next/navigation';
import Link from 'next/link';
import Image from 'next/image';
import {
  Home,
  ShoppingBag,
  User,
  LogOut,
  Settings,
  Store,
  Truck,
  Users,
  Tag,
  BarChart3,
  Bell,
  Search,
  Receipt,
  Wallet,
  Crown,
  ChevronRight,
} from 'lucide-react';
import { useMemo, useState, useEffect } from 'react';
import NotificationBell from '@/components/common/NotificationBell';
import BottomNav from '@/components/navigation/BottomNav';
import { supabase } from '@/lib/supabase';

interface DashboardLayoutProps {
  children: React.ReactNode;
}

interface NavItem {
  name: string;
  href: string;
  icon: any;
  badge?: number;
}

type AppSettingsRow = {
  id: string;
  app_name?: string | null;
  support_email?: string | null;
  support_phone?: string | null;
  business_address?: string | null;
  facebook_url?: string | null;
  instagram_url?: string | null;
  twitter_url?: string | null;
  youtube_url?: string | null;
  website_url?: string | null;
  delivery_fee?: number | null;
  min_order_amount?: number | null;
  tax_percentage?: number | null;
  created_at?: string | null;
  updated_at?: string | null;
};

export default function DashboardLayout({ children }: DashboardLayoutProps) {
  const { user, logout } = useAuth();
  const router = useRouter();
  const pathname = usePathname();

  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [isScrolled, setIsScrolled] = useState(false);
  const [approvalsCount, setApprovalsCount] = useState<number>(0);

  // app settings (optional)
  const [appName, setAppName] = useState<string>('PattiBytes');

  const isAdminLike = useMemo(
    () => user?.role === 'admin' || user?.role === 'superadmin',
    [user?.role]
  );

  useEffect(() => {
    const handleScroll = () => setIsScrolled(window.scrollY > 10);
    window.addEventListener('scroll', handleScroll);
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  // Close sidebar on route change
  useEffect(() => {
    setSidebarOpen(false);
  }, [pathname]);

  // Lock body scroll when sidebar is open (mobile)
  useEffect(() => {
    if (!sidebarOpen) return;
    const prev = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => {
      document.body.style.overflow = prev;
    };
  }, [sidebarOpen]);

  // Load app_settings (optional)
  useEffect(() => {
    const loadAppSettings = async () => {
      try {
        const { data, error } = await supabase
          .from('app_settings')
          .select(
            'id,app_name,support_email,support_phone,business_address,facebook_url,instagram_url,twitter_url,youtube_url,website_url,delivery_fee,min_order_amount,tax_percentage,created_at,updated_at'
          )
          .limit(1)
          .single(); // returns one row [web:134]

        if (!error && data) {
          const row = data as AppSettingsRow;
          setAppName(row.app_name || 'PattiBytes');
        }
      } catch {
        // keep fallback
      }
    };

    loadAppSettings();
  }, []);

  // Load approvals badge for admin/superadmin
  useEffect(() => {
    const loadApprovalsCount = async () => {
      if (!user) return;
      if (!(user.role === 'admin' || user.role === 'superadmin')) return;

      const { count, error } = await supabase
        .from('access_requests')
        .select('id', { count: 'exact', head: true })
        .eq('status', 'pending');

      if (!error) setApprovalsCount(count || 0);
    };

    loadApprovalsCount();
  }, [user?.id, user?.role]);

  const handleLogout = async () => {
    await logout();
    router.push('/');
  };

  const getCurrentPanel = () => {
    if (pathname.startsWith('/superadmin')) return 'superadmin';
    if (pathname.startsWith('/admin')) return 'admin';
    if (pathname.startsWith('/merchant')) return 'merchant';
    if (pathname.startsWith('/driver')) return 'driver';
    if (pathname.startsWith('/customer')) return 'customer';
    return 'customer';
  };

  const handlePanelSwitch = (panelUrl: string) => {
    router.push(panelUrl);
  };

  const getHomeHref = () => {
    if (!user) return '/';
    if (user.role === 'superadmin') return '/superadmin/dashboard';
    return `/${user.role}/dashboard`;
  };

  const getProfileHref = () => {
    if (!user) return '/';
    if (user.role === 'superadmin') return '/superadmin/profile';
    return `/${user.role}/profile`;
  };

  const getNavItems = (): NavItem[] => {
    if (!user) return [];

    const customerDashboardItem: NavItem = {
      name: 'Browse Food',
      href: '/customer/dashboard',
      icon: Home,
    };

    if (user.role === 'customer') {
      return [
        { name: 'Home', href: '/customer/dashboard', icon: Home },
        { name: 'Search', href: '/customer/search', icon: Search },
        { name: 'Cart', href: '/customer/cart', icon: ShoppingBag },
        { name: 'Orders', href: '/customer/orders', icon: Receipt },
        { name: 'Notifications', href: '/customer/notifications', icon: Bell },
        { name: 'Profile', href: '/customer/profile', icon: User },
      ];
    }

    if (user.role === 'merchant') {
      return [
        { name: 'Dashboard', href: '/merchant/dashboard', icon: Home },
        { name: 'Orders', href: '/merchant/orders', icon: ShoppingBag },
        { name: 'Menu', href: '/merchant/menu', icon: Store },
        { name: 'Analytics', href: '/merchant/analytics', icon: BarChart3 },
        customerDashboardItem,
        { name: 'Profile', href: '/merchant/profile', icon: User },
      ];
    }

    if (user.role === 'driver') {
      return [
        { name: 'Dashboard', href: '/driver/dashboard', icon: Home },
        { name: 'Deliveries', href: '/driver/orders', icon: Truck },
        { name: 'Earnings', href: '/driver/earnings', icon: Wallet },
        customerDashboardItem,
        { name: 'Profile', href: '/driver/profile', icon: User },
      ];
    }

    if (user.role === 'admin') {
      return [
        { name: 'Dashboard', href: '/admin/dashboard', icon: Home },
        { name: 'Orders', href: '/admin/orders', icon: ShoppingBag },
        { name: 'Users', href: '/admin/users', icon: Users },
        { name: 'Merchants', href: '/admin/merchants', icon: Store },
        { name: 'Drivers', href: '/admin/drivers', icon: Truck },
        { name: 'Approvals', href: '/admin/access-requests', icon: Bell, badge: approvalsCount },
        { name: 'Promo Codes', href: '/admin/promo-codes', icon: Tag },
        { name: 'Analytics', href: '/admin/analytics', icon: BarChart3 },
        { name: 'Settings', href: '/admin/settings', icon: Settings },
        customerDashboardItem,
        
      ];
    }

    if (user.role === 'superadmin') {
      return [
        { name: 'Dashboard', href: '/superadmin/dashboard', icon: Crown },
        { name: 'Users', href: '/superadmin/users', icon: Users },
        { name: 'Profile', href: '/superadmin/profile', icon: User },

        { name: 'Admin Dashboard', href: '/admin/dashboard', icon: Home },
         { name: 'Orders', href: '/admin/orders', icon: ShoppingBag },
        { name: 'Approvals', href: '/admin/access-requests', icon: Bell, badge: approvalsCount },
        { name: 'Merchants', href: '/admin/merchants', icon: Store },
         { name: 'Drivers', href: '/admin/drivers', icon: Truck },
        { name: 'Promo Codes', href: '/admin/promo-codes', icon: Tag },
         { name: 'Analytics', href: '/admin/analytics', icon: BarChart3 },
        { name: 'Admins', href: '/admin/admins', icon: Users },
        { name: 'Settings', href: '/admin/settings', icon: Settings },
         

        customerDashboardItem,
      ];
    }

    return [];
  };

  const navItems = getNavItems();

  if (!user) return <>{children}</>;

  return (
    <div
      className="min-h-screen w-full max-w-full overflow-x-hidden bg-gradient-to-br from-gray-50 to-gray-100"
      style={{
        paddingBottom: `calc(76px + env(safe-area-inset-bottom))`, // prevents being hidden under BottomNav on small devices
      }}
    >
      {/* Top Navigation */}
      <nav
        className={`bg-white sticky top-0 z-40 transition-all duration-300 ${
          isScrolled ? 'shadow-lg' : 'shadow-sm'
        }`}
      >
        <div className="max-w-7xl mx-auto px-3 sm:px-6 lg:px-8 w-full max-w-full">
          <div className="flex justify-between h-16 min-w-0">
            <div className="flex items-center gap-3 min-w-0">
              <button
                onClick={() => setSidebarOpen((v) => !v)}
                className="lg:hidden p-2 rounded-xl text-gray-900 hover:bg-gradient-to-r hover:from-orange-500 hover:to-pink-500 hover:text-white transition-all duration-300 transform hover:scale-105 active:scale-95 shrink-0"
                aria-label="Toggle menu"
              >
                <div className="relative w-6 h-6">
                  <span
                    className={`absolute h-0.5 w-6 bg-current transform transition-all duration-300 ${
                      sidebarOpen ? 'rotate-45 top-3' : 'top-1'
                    }`}
                  />
                  <span
                    className={`absolute h-0.5 w-6 bg-current top-3 transition-all duration-300 ${
                      sidebarOpen ? 'opacity-0' : 'opacity-100'
                    }`}
                  />
                  <span
                    className={`absolute h-0.5 w-6 bg-current transform transition-all duration-300 ${
                      sidebarOpen ? '-rotate-45 top-3' : 'top-5'
                    }`}
                  />
                </div>
              </button>

              <Link href={getHomeHref()} className="flex items-center gap-2 group min-w-0">
                <div className="relative w-10 h-10 transform transition-transform group-hover:scale-110 shrink-0">
                  <Image
                    src="/icon-192.png"
                    alt="PattiBytes"
                    fill
                    sizes="40px"
                    className="object-contain"
                    priority
                  />
                </div>
                <span className="text-xl font-bold bg-gradient-to-r from-orange-500 to-pink-500 bg-clip-text text-transparent hidden sm:block truncate">
                  {appName || 'PattiBytes'}
                </span>
              </Link>

              {/* Panel Switcher (superadmin only) */}
              {user.role === 'superadmin' && (
                <div className="hidden md:flex items-center gap-2 ml-4 min-w-0">
                  <div className="p-1.5 bg-gradient-to-r from-yellow-400 to-yellow-500 rounded-lg shadow-md shrink-0">
                    <Crown className="text-white" size={16} />
                  </div>
                  <select
                    onChange={(e) => handlePanelSwitch(e.target.value)}
                    value={
                      getCurrentPanel() === 'superadmin'
                        ? '/superadmin/dashboard'
                        : `/${getCurrentPanel()}/dashboard`
                    }
                    className="px-4 py-2 border-2 border-yellow-300 bg-gradient-to-r from-yellow-50 to-yellow-100 text-gray-900 rounded-xl text-sm font-semibold focus:outline-none focus:ring-2 focus:ring-yellow-500 focus:border-transparent cursor-pointer hover:shadow-md transition-all max-w-full"
                  >
                    <option value="/admin/dashboard">👑 Admin Panel</option>
                    <option value="/merchant/dashboard">🏪 Merchant Panel</option>
                    <option value="/driver/dashboard">🚗 Driver Panel</option>
                    <option value="/customer/dashboard">🍔 Customer Panel</option>
                    <option value="/superadmin/dashboard">🛡️ Superadmin Panel</option>
                  </select>
                </div>
              )}
            </div>

            <div className="flex items-center gap-2 sm:gap-3 shrink-0">
              <NotificationBell />

              <Link
                href={getProfileHref()}
                className="flex items-center gap-3 hover:bg-gray-50 rounded-xl p-2 transition-all duration-300 group min-w-0"
              >
                <div className="hidden sm:block text-right min-w-0">
                  <p className="text-sm font-semibold text-gray-900 group-hover:text-primary transition-colors truncate">
                    {user.full_name || 'User'}
                  </p>
                  <p className="text-xs text-gray-600 capitalize flex items-center justify-end gap-1 min-w-0">
                    {user.role === 'superadmin' && <Crown size={12} className="text-yellow-500 shrink-0" />}
                    <span className="truncate">{user.role}</span>
                  </p>
                </div>

                {user.avatar_url || user.logo_url ? (
                  <div className="relative w-10 h-10 ring-2 ring-gray-200 group-hover:ring-primary rounded-full transition-all overflow-hidden shrink-0">
                    <Image
                      src={user.avatar_url || user.logo_url || ''}
                      alt="Profile"
                      fill
                      sizes="40px"
                      className="rounded-full object-cover"
                    />
                    {user.role === 'superadmin' && (
                      <div className="absolute -top-1 -right-1 w-5 h-5 bg-gradient-to-r from-yellow-400 to-yellow-500 rounded-full flex items-center justify-center shadow-md">
                        <Crown size={12} className="text-white" />
                      </div>
                    )}
                  </div>
                ) : (
                  <div className="w-10 h-10 bg-gradient-to-r from-orange-500 to-pink-500 rounded-full flex items-center justify-center relative shadow-md group-hover:shadow-lg transition-all shrink-0">
                    <span className="text-white font-semibold">{user.full_name?.charAt(0) || 'U'}</span>
                    {user.role === 'superadmin' && (
                      <div className="absolute -top-1 -right-1 w-5 h-5 bg-gradient-to-r from-yellow-400 to-yellow-500 rounded-full flex items-center justify-center shadow-md">
                        <Crown size={12} className="text-white" />
                      </div>
                    )}
                  </div>
                )}
              </Link>
            </div>
          </div>
        </div>
      </nav>

      <div className="flex max-w-7xl mx-auto w-full max-w-full overflow-x-hidden">
        {/* Desktop Sidebar */}
        <aside className="hidden lg:block sticky top-16 h-[calc(100vh-4rem)] w-64 shrink-0 bg-white shadow-xl rounded-r-2xl overflow-y-auto overflow-x-hidden">
          <nav className="p-4 space-y-2">
            {user.role === 'superadmin' && (
              <div className="mb-4 p-4 bg-gradient-to-r from-yellow-400 via-yellow-500 to-yellow-600 rounded-xl text-white shadow-lg">
                <div className="flex items-center gap-2 mb-1">
                  <Crown size={20} className="animate-pulse" />
                  <span className="font-bold">Super Admin</span>
                </div>
                <p className="text-xs opacity-90">Full system access</p>
              </div>
            )}

            {navItems.map((item) => {
              const isActive = pathname === item.href || pathname.startsWith(item.href + '/');
              const Icon = item.icon;

              return (
                <Link
                  key={item.href}
                  href={item.href}
                  className={`flex items-center justify-between gap-3 px-4 py-3 rounded-xl transition-all duration-300 group min-w-0 ${
                    isActive
                      ? 'bg-gradient-to-r from-orange-500 to-pink-500 text-white shadow-lg'
                      : 'text-gray-700 hover:bg-gradient-to-r hover:from-orange-50 hover:to-pink-50 hover:text-primary'
                  }`}
                >
                  <div className="flex items-center gap-3 min-w-0">
                    <Icon size={20} className={isActive ? 'animate-pulse shrink-0' : 'shrink-0'} />
                    <span className="font-medium truncate">{item.name}</span>
                  </div>

                  {!!item.badge && item.badge > 0 && (
                    <span
                      className={`px-2 py-0.5 text-xs font-bold rounded-full shrink-0 ${
                        isActive ? 'bg-white text-primary' : 'bg-red-500 text-white'
                      }`}
                    >
                      {item.badge}
                    </span>
                  )}

                  {isActive && <ChevronRight size={16} className="shrink-0" />}
                </Link>
              );
            })}

            <div className="pt-4 mt-4 border-t border-gray-200">
              <button
                onClick={handleLogout}
                className="w-full flex items-center gap-3 px-4 py-3 text-red-600 hover:bg-red-50 rounded-xl transition-all duration-300 font-medium group"
              >
                <LogOut size={20} className="group-hover:translate-x-1 transition-transform shrink-0" />
                <span className="truncate">Logout</span>
              </button>
            </div>
          </nav>
        </aside>

        {/* Mobile Sidebar */}
        <aside
          className={`lg:hidden fixed top-16 left-0 z-30 h-[calc(100vh-4rem)] w-[78vw] max-w-[320px] bg-white shadow-2xl transform transition-transform duration-300 ease-out overflow-y-auto overflow-x-hidden ${
            sidebarOpen ? 'translate-x-0' : '-translate-x-full'
          }`}
        >
          <nav className="p-4 space-y-2 w-full max-w-full">
            {user.role === 'superadmin' && (
              <div className="mb-4 p-4 bg-gradient-to-r from-yellow-400 via-yellow-500 to-yellow-600 rounded-xl text-white shadow-lg">
                <div className="flex items-center gap-2 mb-1">
                  <Crown size={20} className="animate-pulse shrink-0" />
                  <span className="font-bold truncate">Super Admin</span>
                </div>
                <p className="text-xs opacity-90 truncate">Full system access</p>

                <select
                  onChange={(e) => {
                    handlePanelSwitch(e.target.value);
                    setSidebarOpen(false);
                  }}
                  value={
                    getCurrentPanel() === 'superadmin'
                      ? '/superadmin/dashboard'
                      : `/${getCurrentPanel()}/dashboard`
                  }
                  className="mt-3 w-full max-w-full px-3 py-2 bg-white text-gray-900 rounded-lg text-sm font-semibold focus:outline-none"
                >
                  <option value="/admin/dashboard">👑 Admin Panel</option>
                  <option value="/merchant/dashboard">🏪 Merchant Panel</option>
                  <option value="/driver/dashboard">🚗 Driver Panel</option>
                  <option value="/customer/dashboard">🍔 Customer Panel</option>
                  <option value="/superadmin/dashboard">🛡️ Superadmin Panel</option>
                </select>
              </div>
            )}

            {navItems.map((item) => {
              const isActive = pathname === item.href || pathname.startsWith(item.href + '/');
              const Icon = item.icon;

              return (
                <Link
                  key={item.href}
                  href={item.href}
                  onClick={() => setSidebarOpen(false)}
                  className={`flex items-center justify-between gap-3 px-4 py-3 rounded-xl transition-all duration-300 min-w-0 ${
                    isActive
                      ? 'bg-gradient-to-r from-orange-500 to-pink-500 text-white shadow-lg'
                      : 'text-gray-700 hover:bg-gradient-to-r hover:from-orange-50 hover:to-pink-50 hover:text-primary'
                  }`}
                >
                  <div className="flex items-center gap-3 min-w-0">
                    <Icon size={20} className="shrink-0" />
                    <span className="font-medium truncate">{item.name}</span>
                  </div>

                  {!!item.badge && item.badge > 0 && (
                    <span
                      className={`px-2 py-0.5 text-xs font-bold rounded-full shrink-0 ${
                        isActive ? 'bg-white text-primary' : 'bg-red-500 text-white'
                      }`}
                    >
                      {item.badge}
                    </span>
                  )}
                </Link>
              );
            })}

            <div className="pt-4 mt-4 border-t border-gray-200">
              <button
                onClick={handleLogout}
                className="w-full flex items-center gap-3 px-4 py-3 text-red-600 hover:bg-red-50 rounded-xl transition-all duration-300 font-medium"
              >
                <LogOut size={20} className="shrink-0" />
                <span className="truncate">Logout</span>
              </button>
            </div>
          </nav>
        </aside>

        {/* Main: min-w-0 prevents children from forcing overflow in flex row */}
        <main className="flex-1 min-w-0 w-full max-w-full overflow-x-hidden">
          {children}
        </main>
      </div>

      <BottomNav role={user.role} />

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
