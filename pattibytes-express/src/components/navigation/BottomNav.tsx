'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { Home, ShoppingBag, User, Search, Store, Truck, Wallet, Bell } from 'lucide-react';

interface NavItem {
  name: string;
  href: string;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  icon: any;
}

interface BottomNavProps {
  role: string;
}

export default function BottomNav({ role }: BottomNavProps) {
  const pathname = usePathname();

  const getNavItems = (): NavItem[] => {
    if (role === 'customer') {
      return [
        { name: 'Home', href: '/customer/dashboard', icon: Home },
        { name: 'Search', href: '/customer/search', icon: Search },
        { name: 'Cart', href: '/customer/cart', icon: ShoppingBag },
        { name: 'Profile', href: '/customer/profile', icon: User },
      ];
    } else if (role === 'merchant') {
      return [
        { name: 'Home', href: '/merchant/dashboard', icon: Home },
        { name: 'Orders', href: '/merchant/orders', icon: ShoppingBag },
        { name: 'Menu', href: '/merchant/menu', icon: Store },
        { name: 'Profile', href: '/merchant/profile', icon: User },
      ];
    } else if (role === 'driver') {
      return [
        { name: 'Home', href: '/driver/dashboard', icon: Home },
        { name: 'Orders', href: '/driver/orders', icon: Truck },
        { name: 'Earnings', href: '/driver/earnings', icon: Wallet },
        { name: 'Profile', href: '/driver/profile', icon: User },
      ];
    } else if (role === 'admin' || role === 'superadmin') {
      return [
        { name: 'Home', href: '/admin/dashboard', icon: Home },
        { name: 'Orders', href: '/admin/orders', icon: ShoppingBag },
        { name: 'Requests', href: '/admin/access-requests', icon: Bell },
        { name: 'Settings', href: '/admin/settings', icon: User },
      ];
    }

    return [];
  };

  const navItems = getNavItems();

  // Show on mobile and tablet (hide on desktop)
  return (
    <nav className="lg:hidden fixed bottom-0 left-0 right-0 bg-white border-t border-gray-200 z-50 pb-safe">
      <div className="flex justify-around items-center h-16 max-w-screen-xl mx-auto px-2">
        {navItems.map((item) => {
          const isActive = pathname === item.href || pathname.startsWith(item.href + '/');
          const Icon = item.icon;
          
          return (
            <Link
              key={item.href}
              href={item.href}
              className={`flex flex-col items-center justify-center flex-1 h-full transition-colors px-1 ${
                isActive
                  ? 'text-primary'
                  : 'text-gray-600 hover:text-primary'
              }`}
            >
              <Icon size={22} className="mb-0.5 flex-shrink-0" />
              <span className="text-[10px] sm:text-xs font-medium truncate max-w-full">{item.name}</span>
            </Link>
          );
        })}
      </div>
    </nav>
  );
}
