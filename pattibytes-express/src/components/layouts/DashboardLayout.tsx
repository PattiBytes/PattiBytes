'use client';

import { ReactNode } from 'react';
import Header from '@/components/common/Header';
import BottomNav from '@/components/common/BottomNav';
import NotificationsPanel from '../NotificationsPanel';



interface DashboardLayoutProps {
  children: ReactNode;
}

export default function DashboardLayout({ children }: DashboardLayoutProps) {
  return (
    <div className="min-h-screen bg-gray-50">
      <Header />
<NotificationsPanel />
      <main className="pb-20 md:pb-8">{children}</main>
      <BottomNav />
    </div>
  );
}
