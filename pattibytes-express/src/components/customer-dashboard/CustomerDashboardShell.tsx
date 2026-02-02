'use client';

import type { ReactNode } from 'react';
import DashboardLayout from '@/components/layouts/DashboardLayout';

export default function CustomerDashboardShell({ children }: { children: ReactNode }) {
  return (
    <DashboardLayout>
      <div className="min-h-screen bg-gradient-to-br from-orange-50 via-white to-pink-50">
        <div className="max-w-7xl mx-auto px-3 sm:px-4 md:px-6 lg:px-8 py-3 sm:py-4 md:py-6">
          {children}
        </div>
      </div>
    </DashboardLayout>
  );
}
