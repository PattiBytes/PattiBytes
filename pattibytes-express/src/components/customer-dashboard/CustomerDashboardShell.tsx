'use client';

import type { ReactNode } from 'react';
import DashboardLayout from '@/components/layouts/DashboardLayout';

export default function CustomerDashboardShell({ children }: { children: ReactNode }) {
  return (
    <DashboardLayout>
      <div className="min-h-screen bg-gradient-to-br from-orange-50 via-white to-pink-50">
        <div className="max-w-7xl mx-auto px-2 sm:px-3 md:px-4 lg:px-6 py-3 sm:py-4 md:py-5">
          {children}
        </div>
      </div>
    </DashboardLayout>
  );
}
