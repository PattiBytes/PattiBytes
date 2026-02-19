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
  Menu,
  X,
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
  const [appName, setAppName] = useState<string>('PattiBytes');
  const [appLogo, setAppLogo] = useState<string>('/icon-192.png');

  const isAdminLike = useMemo(
    () => user?.role === 'admin' || user?.role === 'superadmin',
    [user?.role]
  );

  useEffect(() => {
    const handleScroll = () => setIsScrolled(window.scrollY > 10);
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

  useEffect(() => {
    const loadAppSettings = async () => {
      try {
        const { data, error } = await supabase
          .from('app_settings')
          .select(
            'id,app_name,support_email,support_phone,business_address,facebook_url,instagram_url,twitter_url,youtube_url,website_url,delivery_fee,min_order_amount,tax_percentage,created_at,updated_at'
          )
          .limit(1)
          .single();

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

  useEffect(() => {
  const loadAppSettings = async () => {
    try {
      const { data, error } = await supabase
        .from('app_settings')
        .select('app_name, app_logo_url')
        .limit(1)
        .single();

      if (!error && data) {
        if (data.app_name) setAppName(data.app_name || 'PattiBytes');
        if (data.app_logo_url) setAppLogo(data.app_logo_url);
      }
    } catch {
      // keep fallback
    }
  };

  loadAppSettings();
}, []);

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
        { name: 'Offers', href: '/merchant/promo-codes', icon: Tag },
        { name: 'Analytics', href: '/merchant/analytics', icon: BarChart3 },
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
         { name: 'custom-products', href: '/admin/custom-products', icon: Tag },
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
           { name: 'custom-products', href: '/admin/custom-products', icon: Tag },
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
      className="min-h-screen w-full bg-gradient-to-br from-gray-50 via-white to-gray-100"
      style={{
        paddingBottom: `calc(76px + env(safe-area-inset-bottom))`,
      }}
    >
      {/* Top Navigation - Fully Responsive */}
      <nav
        className={`bg-white/95 backdrop-blur-md sticky top-0 z-40 transition-all duration-300 border-b ${
          isScrolled ? 'shadow-lg border-gray-200' : 'shadow-sm border-transparent'
        }`}
      >
        <div className="max-w-7xl mx-auto px-3 sm:px-4 lg:px-6">
          <div className="flex justify-between items-center h-14 sm:h-16">
            {/* Left Section */}
            <div className="flex items-center gap-2 sm:gap-3 min-w-0 flex-1">
              {/* Mobile Menu Button */}
              <button
                onClick={() => setSidebarOpen((v) => !v)}
                className="lg:hidden p-2 rounded-xl text-gray-700 hover:bg-gradient-to-r hover:from-orange-500 hover:to-pink-500 hover:text-white transition-all duration-300 transform hover:scale-105 active:scale-95 shrink-0"
                aria-label="Toggle menu"
              >
                {sidebarOpen ? <X size={20} /> : <Menu size={20} />}
              </button>

              {/* Logo - Circular with Ring */}
              <Link href={getHomeHref()} className="flex items-center gap-2 sm:gap-3 group min-w-0">
                <div className="relative w-9 h-9 sm:w-11 sm:h-11 shrink-0">
                  <div className="absolute inset-0 rounded-full bg-gradient-to-r from-orange-500 to-pink-500 blur-md opacity-0 group-hover:opacity-75 transition-opacity duration-300" />
                  <div className="relative w-full h-full rounded-full ring-2 ring-orange-200 group-hover:ring-orange-400 transition-all duration-300 overflow-hidden bg-white shadow-md">
                   <Image
  src={appLogo}
  alt="Logo"
  fill
  sizes="44px"
  className="object-cover p-1 transform group-hover:scale-110 transition-transform duration-300"
  priority
  onError={() => setAppLogo('/icon-192.png')}
/>
                  </div>
                </div>
                <span className="text-lg sm:text-xl font-bold bg-gradient-to-r from-orange-500 to-pink-500 bg-clip-text text-transparent hidden sm:block truncate">
                  {appName}
                </span>
              </Link>

              {/* Superadmin Panel Switcher - Desktop */}
              {user.role === 'superadmin' && (
                <div className="hidden md:flex items-center gap-2 ml-2 lg:ml-4">
                  <div className="p-1.5 bg-gradient-to-r from-yellow-400 to-yellow-500 rounded-lg shadow-md shrink-0 animate-pulse">
                    <Crown className="text-white" size={14} />
                  </div>
                  <select
                    onChange={(e) => handlePanelSwitch(e.target.value)}
                    value={
                      getCurrentPanel() === 'superadmin'
                        ? '/superadmin/dashboard'
                        : `/${getCurrentPanel()}/dashboard`
                    }
                    className="px-3 py-1.5 border-2 border-yellow-300 bg-gradient-to-r from-yellow-50 to-yellow-100 text-gray-900 rounded-lg text-xs lg:text-sm font-semibold focus:outline-none focus:ring-2 focus:ring-yellow-500 cursor-pointer hover:shadow-md transition-all"
                  >
                    <option value="/admin/dashboard">👑 Admin</option>
                    <option value="/merchant/dashboard">🏪 Merchant</option>
                    <option value="/driver/dashboard">🚗 Driver</option>
                    <option value="/customer/dashboard">🍔 Customer</option>
                    <option value="/superadmin/dashboard">🛡️ Superadmin</option>
                  </select>
                </div>
              )}
            </div>

            {/* Right Section */}
            <div className="flex items-center gap-1.5 sm:gap-3 shrink-0">
              <NotificationBell />

              {/* Profile Button */}
              <Link
                href={getProfileHref()}
                className="flex items-center gap-2 sm:gap-3 hover:bg-gray-50 rounded-xl p-1.5 sm:p-2 transition-all duration-300 group"
              >
                <div className="hidden sm:block text-right min-w-0">
                  <p className="text-sm font-semibold text-gray-900 group-hover:text-primary transition-colors truncate max-w-[120px]">
                    {user.full_name || 'User'}
                  </p>
                  <p className="text-xs text-gray-600 capitalize flex items-center justify-end gap-1">
                    {user.role === 'superadmin' && <Crown size={10} className="text-yellow-500 shrink-0" />}
                    <span className="truncate">{user.role}</span>
                  </p>
                </div>

                {/* Avatar - Circular */}
                {user.avatar_url || user.logo_url ? (
                  <div className="relative w-8 h-8 sm:w-10 sm:h-10 shrink-0">
                    <div className="absolute inset-0 rounded-full bg-gradient-to-r from-orange-500 to-pink-500 blur-sm opacity-0 group-hover:opacity-75 transition-opacity duration-300" />
                    <div className="relative w-full h-full rounded-full ring-2 ring-gray-200 group-hover:ring-primary transition-all overflow-hidden shadow-md">
                      <Image
                        src={user.avatar_url || user.logo_url || ''}
                        alt="Profile"
                        fill
                        sizes="40px"
                        className="object-cover"
                      />
                      {user.role === 'superadmin' && (
                        <div className="absolute -top-0.5 -right-0.5 w-4 h-4 sm:w-5 sm:h-5 bg-gradient-to-r from-yellow-400 to-yellow-500 rounded-full flex items-center justify-center shadow-md">
                          <Crown size={10} className="text-white" />
                        </div>
                      )}
                    </div>
                  </div>
                ) : (
                  <div className="relative w-8 h-8 sm:w-10 sm:h-10 shrink-0">
                    <div className="absolute inset-0 rounded-full bg-gradient-to-r from-orange-500 to-pink-500 blur-sm opacity-50 group-hover:opacity-100 transition-opacity duration-300" />
                    <div className="relative w-full h-full bg-gradient-to-r from-orange-500 to-pink-500 rounded-full flex items-center justify-center shadow-md group-hover:shadow-lg transition-all">
                      <span className="text-white font-bold text-xs sm:text-sm">
                        {user.full_name?.charAt(0) || 'U'}
                      </span>
                      {user.role === 'superadmin' && (
                        <div className="absolute -top-0.5 -right-0.5 w-4 h-4 sm:w-5 sm:h-5 bg-gradient-to-r from-yellow-400 to-yellow-500 rounded-full flex items-center justify-center shadow-md animate-pulse">
                          <Crown size={10} className="text-white" />
                        </div>
                      )}
                    </div>
                  </div>
                )}
              </Link>
            </div>
          </div>
        </div>
      </nav>

      <div className="flex max-w-7xl mx-auto w-full">
        {/* Desktop Sidebar */}
        <aside className="hidden lg:block sticky top-14 sm:top-16 h-[calc(100vh-3.5rem)] sm:h-[calc(100vh-4rem)] w-64 xl:w-72 shrink-0 bg-white/95 backdrop-blur-md shadow-xl rounded-r-2xl overflow-y-auto">
          <nav className="p-3 lg:p-4 space-y-1.5">
            {/* Superadmin Badge */}
            {user.role === 'superadmin' && (
              <div className="mb-4 p-4 bg-gradient-to-r from-yellow-400 via-yellow-500 to-yellow-600 rounded-xl text-white shadow-lg animate-gradient">
                <div className="flex items-center gap-2 mb-1">
                  <Crown size={20} className="animate-pulse" />
                  <span className="font-bold">Super Admin</span>
                </div>
                <p className="text-xs opacity-90">Full system access</p>
              </div>
            )}

            {/* Navigation Items */}
            {navItems.map((item) => {
              const isActive = pathname === item.href || pathname.startsWith(item.href + '/');
              const Icon = item.icon;

              return (
                <Link
                  key={item.href}
                  href={item.href}
                  className={`flex items-center justify-between gap-3 px-3 lg:px-4 py-2.5 lg:py-3 rounded-xl transition-all duration-300 group ${
                    isActive
                      ? 'bg-gradient-to-r from-orange-500 to-pink-500 text-white shadow-lg scale-105'
                      : 'text-gray-700 hover:bg-gradient-to-r hover:from-orange-50 hover:to-pink-50 hover:text-primary hover:scale-102'
                  }`}
                >
                  <div className="flex items-center gap-3 min-w-0">
                    <Icon size={20} className={`shrink-0 ${isActive ? 'animate-pulse' : ''}`} />
                    <span className="font-medium truncate text-sm lg:text-base">{item.name}</span>
                  </div>

                  <div className="flex items-center gap-2 shrink-0">
                    {!!item.badge && item.badge > 0 && (
                      <span
                        className={`px-2 py-0.5 text-xs font-bold rounded-full animate-pulse ${
                          isActive ? 'bg-white text-primary' : 'bg-red-500 text-white'
                        }`}
                      >
                        {item.badge}
                      </span>
                    )}
                    {isActive && <ChevronRight size={16} className="animate-pulse" />}
                  </div>
                </Link>
              );
            })}

            {/* Logout Button */}
            <div className="pt-3 lg:pt-4 mt-3 lg:mt-4 border-t border-gray-200">
              <button
                onClick={handleLogout}
                className="w-full flex items-center gap-3 px-3 lg:px-4 py-2.5 lg:py-3 text-red-600 hover:bg-red-50 rounded-xl transition-all duration-300 font-medium group"
              >
                <LogOut size={20} className="group-hover:translate-x-1 transition-transform shrink-0" />
                <span className="truncate text-sm lg:text-base">Logout</span>
              </button>
            </div>
          </nav>
        </aside>

        {/* Mobile Sidebar */}
        <aside
          className={`lg:hidden fixed top-14 sm:top-16 left-0 z-30 h-[calc(100vh-3.5rem)] sm:h-[calc(100vh-4rem)] w-[280px] sm:w-[320px] bg-white/98 backdrop-blur-md shadow-2xl transform transition-transform duration-300 ease-out overflow-y-auto ${
            sidebarOpen ? 'translate-x-0' : '-translate-x-full'
          }`}
        >
          <nav className="p-4 space-y-1.5">
            {/* Superadmin Badge + Panel Switcher */}
            {user.role === 'superadmin' && (
              <div className="mb-4 p-4 bg-gradient-to-r from-yellow-400 via-yellow-500 to-yellow-600 rounded-xl text-white shadow-lg">
                <div className="flex items-center gap-2 mb-2">
                  <Crown size={20} className="animate-pulse shrink-0" />
                  <span className="font-bold truncate">Super Admin</span>
                </div>
                <p className="text-xs opacity-90 mb-3">Full system access</p>

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
                  className="w-full px-3 py-2 bg-white text-gray-900 rounded-lg text-sm font-semibold focus:outline-none"
                >
                  <option value="/admin/dashboard">👑 Admin Panel</option>
                  <option value="/merchant/dashboard">🏪 Merchant Panel</option>
                  <option value="/driver/dashboard">🚗 Driver Panel</option>
                  <option value="/customer/dashboard">🍔 Customer Panel</option>
                  <option value="/superadmin/dashboard">🛡️ Superadmin Panel</option>
                </select>
              </div>
            )}

            {/* Navigation Items */}
            {navItems.map((item) => {
              const isActive = pathname === item.href || pathname.startsWith(item.href + '/');
              const Icon = item.icon;

              return (
                <Link
                  key={item.href}
                  href={item.href}
                  onClick={() => setSidebarOpen(false)}
                  className={`flex items-center justify-between gap-3 px-4 py-3 rounded-xl transition-all duration-300 ${
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

            {/* Logout Button */}
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

        {/* Main Content */}
        <main className="flex-1 min-w-0 w-full p-3 sm:p-4 lg:p-6">
          <div className="max-w-full">{children}</div>
        </main>
      </div>

      {/* Bottom Navigation */}
      <BottomNav role={user.role} />

      {/* Mobile Overlay */}
      {sidebarOpen && (
        <div
          className="lg:hidden fixed inset-0 bg-black/50 backdrop-blur-sm z-20 top-14 sm:top-16"
          onClick={() => setSidebarOpen(false)}
        />
      )}
    </div>
  );
}
