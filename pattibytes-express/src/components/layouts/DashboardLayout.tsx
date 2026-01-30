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
  ChevronRight
} from 'lucide-react';
import { useState, useEffect } from 'react';
import NotificationBell from '@/components/common/NotificationBell';
import BottomNav from '@/components/navigation/BottomNav';

interface DashboardLayoutProps {
  children: React.ReactNode;
}

interface NavItem {
  name: string;
  href: string;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  icon: any;
  badge?: number;
}

export default function DashboardLayout({ children }: DashboardLayoutProps) {
  const { user, logout } = useAuth();
  const router = useRouter();
  const pathname = usePathname();
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [isScrolled, setIsScrolled] = useState(false);

  useEffect(() => {
    const handleScroll = () => {
      setIsScrolled(window.scrollY > 10);
    };
    window.addEventListener('scroll', handleScroll);
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  // Close sidebar on route change
  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setSidebarOpen(false);
  }, [pathname]);

  const handleLogout = async () => {
    await logout();
    router.push('/');
  };

  const handlePanelSwitch = (panelUrl: string) => {
    router.push(panelUrl);
  };

  const getNavItems = (): NavItem[] => {
    if (!user) return [];

    const customerDashboardItem = {
      name: 'Browse Food',
      href: '/customer/dashboard',
      icon: Home
    };

    if (user.role === 'customer') {
      return [
        { name: 'Home', href: '/customer/dashboard', icon: Home },
        { name: 'Search', href: '/customer/search', icon: Search },
        { name: 'Cart', href: '/customer/cart', icon: ShoppingBag, badge: 3 },
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

    if (user.role === 'admin' || user.role === 'superadmin') {
      const adminItems: NavItem[] = [
        { name: 'Dashboard', href: '/admin/dashboard', icon: Home },
        { name: 'Orders', href: '/admin/orders', icon: ShoppingBag },
        { name: 'Users', href: '/admin/users', icon: Users },
        { name: 'Merchants', href: '/admin/merchants', icon: Store },
        { name: 'Drivers', href: '/admin/drivers', icon: Truck },
        { name: 'Approvals', href: '/admin/access-requests', icon: Bell, badge: 0 },
        { name: 'Promo Codes', href: '/admin/promo-codes', icon: Tag },
        customerDashboardItem,
        { name: 'Settings', href: '/admin/settings', icon: Settings },
      ];

      if (user.role === 'superadmin') {
        adminItems.push(
          { name: 'Admins', href: '/admin/admins', icon: Users },
          { name: 'Super Admin', href: '/admin/superadmin', icon: Crown }
        );
      }

      return adminItems;
    }

    return [];
  };

  const navItems = getNavItems();

  if (!user) {
    return <>{children}</>;
  }

  const getCurrentPanel = () => {
    if (pathname.startsWith('/admin')) return 'admin';
    if (pathname.startsWith('/merchant')) return 'merchant';
    if (pathname.startsWith('/driver')) return 'driver';
    if (pathname.startsWith('/customer')) return 'customer';
    return 'admin';
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 to-gray-100 pb-16 md:pb-0">
      {/* Top Navigation */}
      <nav className={`bg-white sticky top-0 z-40 transition-all duration-300 ${
        isScrolled ? 'shadow-lg' : 'shadow-sm'
      }`}>
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between h-16">
            <div className="flex items-center gap-3">
              {/* Hamburger Menu - Only visible on mobile/tablet */}
              <button
                onClick={() => setSidebarOpen(!sidebarOpen)}
                className="lg:hidden p-2 rounded-xl text-gray-900 hover:bg-gradient-to-r hover:from-orange-500 hover:to-pink-500 hover:text-white transition-all duration-300 transform hover:scale-105 active:scale-95"
                aria-label="Toggle menu"
              >
                <div className="relative w-6 h-6">
                  <span className={`absolute h-0.5 w-6 bg-current transform transition-all duration-300 ${
                    sidebarOpen ? 'rotate-45 top-3' : 'top-1'
                  }`} />
                  <span className={`absolute h-0.5 w-6 bg-current top-3 transition-all duration-300 ${
                    sidebarOpen ? 'opacity-0' : 'opacity-100'
                  }`} />
                  <span className={`absolute h-0.5 w-6 bg-current transform transition-all duration-300 ${
                    sidebarOpen ? '-rotate-45 top-3' : 'top-5'
                  }`} />
                </div>
              </button>
              
              <Link 
                href={user.role === 'superadmin' ? '/admin/superadmin' : `/${user.role}/dashboard`} 
                className="flex items-center gap-2 group"
              >
                <div className="relative w-10 h-10 transform transition-transform group-hover:scale-110">
                  <Image
                    src="/icon-192.png"
                    alt="PattiBytes"
                    fill
                    sizes="40px"
                    className="object-contain"
                    priority
                  />
                </div>
                <span className="text-xl font-bold bg-gradient-to-r from-orange-500 to-pink-500 bg-clip-text text-transparent hidden sm:block">
                  PattiBytes
                </span>
              </Link>

              {/* Superadmin Panel Switcher */}
              {user.role === 'superadmin' && (
                <div className="hidden md:flex items-center gap-2 ml-4">
                  <div className="p-1.5 bg-gradient-to-r from-yellow-400 to-yellow-500 rounded-lg shadow-md">
                    <Crown className="text-white" size={16} />
                  </div>
                  <select
                    onChange={(e) => handlePanelSwitch(e.target.value)}
                    value={`/${getCurrentPanel()}/dashboard`}
                    className="px-4 py-2 border-2 border-yellow-300 bg-gradient-to-r from-yellow-50 to-yellow-100 text-gray-900 rounded-xl text-sm font-semibold focus:outline-none focus:ring-2 focus:ring-yellow-500 focus:border-transparent cursor-pointer hover:shadow-md transition-all"
                  >
                    <option value="/admin/dashboard">👑 Admin Panel</option>
                    <option value="/merchant/dashboard">🏪 Merchant Panel</option>
                    <option value="/driver/dashboard">🚗 Driver Panel</option>
                    <option value="/customer/dashboard">🍔 Customer Panel</option>
                  </select>
                </div>
              )}
            </div>

            <div className="flex items-center gap-3">
              <NotificationBell />
              
              <Link 
                href={`/${user.role}/profile`} 
                className="flex items-center gap-3 hover:bg-gray-50 rounded-xl p-2 transition-all duration-300 group"
              >
                <div className="hidden sm:block text-right">
                  <p className="text-sm font-semibold text-gray-900 group-hover:text-primary transition-colors">
                    {user.full_name || 'User'}
                  </p>
                  <p className="text-xs text-gray-600 capitalize flex items-center justify-end gap-1">
                    {user.role === 'superadmin' && <Crown size={12} className="text-yellow-500" />}
                    {user.role}
                  </p>
                </div>
                
                {user.avatar_url || user.logo_url ? (
                  <div className="relative w-10 h-10 ring-2 ring-gray-200 group-hover:ring-primary rounded-full transition-all">
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
                  <div className="w-10 h-10 bg-gradient-to-r from-orange-500 to-pink-500 rounded-full flex items-center justify-center relative shadow-md group-hover:shadow-lg transition-all">
                    <span className="text-white font-semibold">
                      {user.full_name?.charAt(0) || 'U'}
                    </span>
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

      <div className="flex max-w-7xl mx-auto">
        {/* Desktop Sidebar - Hidden on mobile */}
        <aside className="hidden lg:block sticky top-16 h-[calc(100vh-4rem)] w-64 bg-white shadow-xl rounded-r-2xl overflow-y-auto">
          <nav className="p-4 space-y-2">
            {user.role === 'superadmin' && (
              <div className="mb-4 p-4 bg-gradient-to-r from-yellow-400 via-yellow-500 to-yellow-600 rounded-xl text-white shadow-lg transform hover:scale-105 transition-all">
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
                  className={`flex items-center justify-between gap-3 px-4 py-3 rounded-xl transition-all duration-300 group ${
                    isActive
                      ? 'bg-gradient-to-r from-orange-500 to-pink-500 text-white shadow-lg transform scale-105'
                      : 'text-gray-700 hover:bg-gradient-to-r hover:from-orange-50 hover:to-pink-50 hover:text-primary'
                  }`}
                >
                  <div className="flex items-center gap-3">
                    <Icon size={20} className={isActive ? 'animate-pulse' : 'group-hover:scale-110 transition-transform'} />
                    <span className="font-medium">{item.name}</span>
                  </div>
                  {item.badge && (
                    <span className={`px-2 py-0.5 text-xs font-bold rounded-full ${
                      isActive ? 'bg-white text-primary' : 'bg-red-500 text-white'
                    }`}>
                      {item.badge}
                    </span>
                  )}
                  {isActive && <ChevronRight size={16} />}
                </Link>
              );
            })}

            <div className="pt-4 mt-4 border-t border-gray-200">
              <button
                onClick={handleLogout}
                className="w-full flex items-center gap-3 px-4 py-3 text-red-600 hover:bg-red-50 rounded-xl transition-all duration-300 font-medium group"
              >
                <LogOut size={20} className="group-hover:translate-x-1 transition-transform" />
                <span>Logout</span>
              </button>
            </div>
          </nav>
        </aside>

        {/* Mobile Sidebar - Slide-in from left */}
        <aside
          className={`lg:hidden fixed top-16 left-0 z-30 h-[calc(100vh-4rem)] w-72 bg-white shadow-2xl transform transition-transform duration-300 ease-out overflow-y-auto ${
            sidebarOpen ? 'translate-x-0' : '-translate-x-full'
          }`}
        >
          <nav className="p-4 space-y-2">
            {user.role === 'superadmin' && (
              <div className="mb-4 p-4 bg-gradient-to-r from-yellow-400 via-yellow-500 to-yellow-600 rounded-xl text-white shadow-lg">
                <div className="flex items-center gap-2 mb-1">
                  <Crown size={20} className="animate-pulse" />
                  <span className="font-bold">Super Admin</span>
                </div>
                <p className="text-xs opacity-90">Full system access</p>
                
                {/* Mobile Panel Switcher */}
                <select
                  onChange={(e) => {
                    handlePanelSwitch(e.target.value);
                    setSidebarOpen(false);
                  }}
                  value={`/${getCurrentPanel()}/dashboard`}
                  className="mt-3 w-full px-3 py-2 bg-white text-gray-900 rounded-lg text-sm font-semibold focus:outline-none"
                >
                  <option value="/admin/dashboard">👑 Admin Panel</option>
                  <option value="/merchant/dashboard">🏪 Merchant Panel</option>
                  <option value="/driver/dashboard">🚗 Driver Panel</option>
                  <option value="/customer/dashboard">🍔 Customer Panel</option>
                </select>
              </div>
            )}

            {navItems.map((item, index) => {
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
                  style={{
                    animationDelay: `${index * 50}ms`,
                    animation: sidebarOpen ? 'slideIn 0.3s ease-out forwards' : 'none'
                  }}
                >
                  <div className="flex items-center gap-3">
                    <Icon size={20} />
                    <span className="font-medium">{item.name}</span>
                  </div>
                  {item.badge && (
                    <span className={`px-2 py-0.5 text-xs font-bold rounded-full ${
                      isActive ? 'bg-white text-primary' : 'bg-red-500 text-white'
                    }`}>
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
                <LogOut size={20} />
                <span>Logout</span>
              </button>
            </div>
          </nav>
        </aside>

        {/* Main Content */}
        <main className="flex-1 min-h-[calc(100vh-4rem)] lg:ml-0">
          {children}
        </main>
      </div>

      {/* Mobile Bottom Navigation */}
      <BottomNav role={user.role} />

      {/* Mobile Overlay with blur */}
      {sidebarOpen && (
        <div
          className="lg:hidden fixed inset-0 bg-black/50 backdrop-blur-sm z-20 transition-opacity duration-300"
          onClick={() => setSidebarOpen(false)}
        />
      )}

      <style jsx>{`
        @keyframes slideIn {
          from {
            opacity: 0;
            transform: translateX(-20px);
          }
          to {
            opacity: 1;
            transform: translateX(0);
          }
        }
      `}</style>
    </div>
  );
}
