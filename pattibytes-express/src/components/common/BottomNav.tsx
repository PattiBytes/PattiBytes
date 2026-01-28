'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { Home, Search, ShoppingBag, User, Store, Truck, Package, BarChart } from 'lucide-react';
import { useAuth } from '@/hooks/useAuth';

export default function BottomNav() {
  const pathname = usePathname();
  const { user } = useAuth();

  // Different nav items based on user role
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const navItems: Record<string, Array<{ href: string; icon: any; label: string }>> = {
    customer: [
      { href: '/customer/dashboard', icon: Home, label: 'Home' },
      { href: '/customer/search', icon: Search, label: 'Search' },
      { href: '/customer/orders', icon: ShoppingBag, label: 'Orders' },
      { href: '/customer/profile', icon: User, label: 'Profile' },
    ],
    merchant: [
      { href: '/merchant/dashboard', icon: Home, label: 'Home' },
      { href: '/merchant/menu', icon: Store, label: 'Menu' },
      { href: '/merchant/orders', icon: Package, label: 'Orders' },
      { href: '/merchant/profile', icon: User, label: 'Profile' },
    ],
    driver: [
      { href: '/driver/dashboard', icon: Home, label: 'Home' },
      { href: '/driver/deliveries', icon: Truck, label: 'Deliveries' },
      { href: '/driver/earnings', icon: BarChart, label: 'Earnings' },
      { href: '/driver/profile', icon: User, label: 'Profile' },
    ],
    admin: [
      { href: '/admin/dashboard', icon: Home, label: 'Home' },
      { href: '/admin/merchants', icon: Store, label: 'Merchants' },
      { href: '/admin/orders', icon: Package, label: 'Orders' },
      { href: '/admin/profile', icon: User, label: 'Profile' },
    ],
  };

  const items = navItems[user?.role || 'customer'] || navItems.customer;

  return (
    <nav className="md:hidden fixed bottom-0 left-0 right-0 bg-white border-t border-gray-200 z-50 safe-area-bottom">
      <div className="grid grid-cols-4 gap-1">
        {items.map((item) => {
          const isActive = pathname === item.href;
          const Icon = item.icon;

          return (
            <Link
              key={item.href}
              href={item.href}
              className={`flex flex-col items-center justify-center py-3 transition-colors ${
                isActive
                  ? 'text-primary bg-orange-50'
                  : 'text-gray-600 hover:text-primary'
              }`}
            >
              <Icon size={24} />
              <span className="text-xs mt-1 font-medium">{item.label}</span>
            </Link>
          );
        })}
      </div>
    </nav>
  );
}
