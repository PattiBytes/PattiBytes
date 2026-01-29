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
  Menu as MenuIcon, 
  X,
  Settings,
  Store,
  Truck,
  Users,
  Tag,
  BarChart3,
  Bell,
  Search,
  Receipt,
  Wallet
} from 'lucide-react';
import { useState } from 'react';
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
}

export default function DashboardLayout({ children }: DashboardLayoutProps) {
  const { user, logout } = useAuth();
  const router = useRouter();
  const pathname = usePathname();
  const [sidebarOpen, setSidebarOpen] = useState(false);

  const handleLogout = async () => {
    await logout();
    router.push('/');
  };

  const getNavItems = (): NavItem[] => {
    if (!user) return [];

    // Customer Navigation
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

    // Merchant Navigation
    if (user.role === 'merchant') {
      return [
        { name: 'Dashboard', href: '/merchant/dashboard', icon: Home },
        { name: 'Orders', href: '/merchant/orders', icon: ShoppingBag },
        { name: 'Menu', href: '/merchant/menu', icon: Store },
        { name: 'Analytics', href: '/merchant/analytics', icon: BarChart3 },
        { name: 'Profile', href: '/merchant/profile', icon: User },
      ];
    }

    // Driver Navigation
    if (user.role === 'driver') {
      return [
        { name: 'Dashboard', href: '/driver/dashboard', icon: Home },
        { name: 'Deliveries', href: '/driver/orders', icon: Truck },
        { name: 'Earnings', href: '/driver/earnings', icon: Wallet },
        { name: 'Profile', href: '/driver/profile', icon: User },
      ];
    }

    // Admin/Superadmin Navigation
    if (user.role === 'admin' || user.role === 'superadmin') {
      const adminItems: NavItem[] = [
        { name: 'Dashboard', href: '/admin/dashboard', icon: Home },
        { name: 'Orders', href: '/admin/orders', icon: ShoppingBag },
        { name: 'Users', href: '/admin/users', icon: Users },
        { name: 'Merchants', href: '/admin/merchants', icon: Store },
        { name: 'Drivers', href: '/admin/drivers', icon: Truck },
        { name: 'Approvals', href: '/admin/access-requests', icon: Bell },
        { name: 'Promo Codes', href: '/admin/promo-codes', icon: Tag },
        { name: 'Settings', href: '/admin/settings', icon: Settings },
      ];

      // Superadmin only items
      if (user.role === 'superadmin') {
        adminItems.push(
          { name: 'Admins', href: '/admin/admins', icon: Users },
          { name: 'Super Admin', href: '/admin/superadmin', icon: Settings }
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

  return (
    <div className="min-h-screen bg-gray-50 pb-16 md:pb-0">
      {/* Top Navigation */}
      <nav className="bg-white shadow-sm sticky top-0 z-30">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between h-16">
            <div className="flex items-center">
              <button
                onClick={() => setSidebarOpen(!sidebarOpen)}
                className="md:hidden p-2 rounded-md text-gray-600 hover:text-primary mr-2"
              >
                {sidebarOpen ? <X size={24} /> : <MenuIcon size={24} />}
              </button>
              
              <Link href={`/${user.role}/dashboard`} className="flex items-center">
                <div className="relative w-10 h-10">
                  <Image
                    src="/icon-192.png"
                    alt="PattiBytes"
                    fill
                    className="object-contain"
                    priority
                  />
                </div>
                <span className="ml-2 text-xl font-bold text-gray-900 hidden sm:block">
                  PattiBytes
                </span>
              </Link>
            </div>

            <div className="flex items-center gap-4">
              <NotificationBell />
              
              <Link href={`/${user.role}/profile`} className="flex items-center gap-3">
                <div className="hidden sm:block text-right">
                  <p className="text-sm font-semibold text-gray-900">
                    {user.full_name || 'User'}
                  </p>
                  <p className="text-xs text-gray-600 capitalize">{user.role}</p>
                </div>
                
                {user.avatar_url ? (
                  <div className="relative w-10 h-10">
                    <Image
                      src={user.avatar_url}
                      alt="Profile"
                      fill
                      className="rounded-full object-cover"
                    />
                  </div>
                ) : (
                  <div className="w-10 h-10 bg-primary rounded-full flex items-center justify-center">
                    <span className="text-white font-semibold">
                      {user.full_name?.charAt(0) || 'U'}
                    </span>
                  </div>
                )}
              </Link>
            </div>
          </div>
        </div>
      </nav>

      <div className="flex max-w-7xl mx-auto">
        {/* Desktop Sidebar */}
        <aside
          className={`fixed md:sticky top-16 left-0 z-20 h-[calc(100vh-4rem)] w-64 bg-white shadow-lg transform transition-transform duration-300 ease-in-out ${
            sidebarOpen ? 'translate-x-0' : '-translate-x-full'
          } md:translate-x-0 hidden md:block overflow-y-auto`}
        >
          <nav className="p-4 space-y-2">
            {navItems.map((item) => {
              const isActive = pathname === item.href || pathname.startsWith(item.href + '/');
              const Icon = item.icon;
              
              return (
                <Link
                  key={item.href}
                  href={item.href}
                  onClick={() => setSidebarOpen(false)}
                  className={`flex items-center gap-3 px-4 py-3 rounded-lg transition-colors ${
                    isActive
                      ? 'bg-primary text-white'
                      : 'text-gray-700 hover:bg-primary hover:text-white'
                  }`}
                >
                  <Icon size={20} />
                  <span className="font-medium">{item.name}</span>
                </Link>
              );
            })}

            <div className="pt-4 mt-4 border-t border-gray-200">
              <button
                onClick={handleLogout}
                className="w-full flex items-center gap-3 px-4 py-3 text-red-600 hover:bg-red-50 rounded-lg transition-colors"
              >
                <LogOut size={20} />
                <span className="font-medium">Logout</span>
              </button>
            </div>
          </nav>
        </aside>

        {/* Main Content */}
        <main className="flex-1 md:ml-0 min-h-[calc(100vh-4rem)]">
          {children}
        </main>
      </div>

      {/* Mobile Bottom Navigation */}
      <BottomNav role={user.role} />

      {/* Mobile Overlay */}
      {sidebarOpen && (
        <div
          className="fixed inset-0 bg-black bg-opacity-50 z-10 md:hidden"
          onClick={() => setSidebarOpen(false)}
        />
      )}
    </div>
  );
}
