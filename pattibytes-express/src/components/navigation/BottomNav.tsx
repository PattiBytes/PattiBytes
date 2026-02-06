'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { Home, ShoppingBag, User, Store, Truck, Wallet, Bell, BarChart3, Tag } from 'lucide-react';

interface NavItem {
  name: string;
  href: string;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  icon: any;
}

interface BottomNavProps {
  role: string;
}

const BAR_H = 64; // visible bar height (without safe-area)

export default function BottomNav({ role }: BottomNavProps) {
  const pathname = usePathname();

  const getNavItems = (): NavItem[] => {
    if (role === 'customer') {
      return [
        { name: 'Home', href: '/customer/dashboard', icon: Home },
       
        { name: 'Cart', href: '/customer/cart', icon: ShoppingBag },
        { name: 'Orders', href: '/customer/orders', icon: Store },
        { name: 'Profile', href: '/customer/profile', icon: User },
      ];
    }

    if (role === 'merchant') {
      return [
        { name: 'Home', href: '/merchant/dashboard', icon: Home },
        { name: 'Orders', href: '/merchant/orders', icon: ShoppingBag },
        { name: 'Menu', href: '/merchant/menu', icon: Store },
        { name: 'Offers', href: '/merchant/promo-codes', icon: Tag },
        { name: 'Profile', href: '/merchant/profile', icon: User },
      ];
    }

    if (role === 'driver') {
      return [
        { name: 'Home', href: '/driver/dashboard', icon: Home },
        { name: 'Orders', href: '/driver/orders', icon: Truck },
        { name: 'Earnings', href: '/driver/earnings', icon: Wallet },
        { name: 'Profile', href: '/driver/profile', icon: User },
      ];
    }

    if (role === 'admin' || role === 'superadmin') {
      return [
        { name: 'Home', href: '/admin/dashboard', icon: Home },
        { name: 'Orders', href: '/admin/orders', icon: ShoppingBag },
        { name: 'Requests', href: '/admin/access-requests', icon: Bell },
         { name: 'Analytics', href: '/admin/analytics', icon: BarChart3 },
       { name: 'Offers', href: '/admin/promo-codes', icon: Tag },
        { name: 'Settings', href: '/admin/settings', icon: User },
        
      ];
    }

    return [];
  };

  const navItems = getNavItems();

  // Important: render a spacer so page content never sits behind the fixed bar.
  return (
    <>
      <nav
        className="lg:hidden fixed bottom-0 left-0 right-0 bg-white/95 backdrop-blur border-t border-gray-200 z-40"
        style={{ paddingBottom: 'env(safe-area-inset-bottom)' }}
      >
        <div className="max-w-screen-xl mx-auto px-2">
          <div className="flex items-center justify-around" style={{ height: BAR_H }}>
            {navItems.map((item) => {
              const isActive = pathname === item.href || pathname.startsWith(item.href + '/');
              const Icon = item.icon;

              return (
                <Link
                  key={item.href}
                  href={item.href}
                  aria-current={isActive ? 'page' : undefined}
                  className={[
                    'flex flex-col items-center justify-center flex-1 h-full px-1 transition',
                    'active:scale-[0.98]',
                    isActive ? 'text-primary' : 'text-gray-600 hover:text-primary',
                  ].join(' ')}
                >
                  <Icon size={22} className="mb-0.5 flex-shrink-0" />
                  <span className="text-[10px] font-semibold truncate max-w-full">{item.name}</span>
                </Link>
              );
            })}
          </div>
        </div>
      </nav>

      {/* Spacer: prevents bottom nav from covering buttons/links */}
      <div
        className="lg:hidden"
        style={{ height: `calc(${BAR_H}px + env(safe-area-inset-bottom))` }}
      />
    </>
  );
}
