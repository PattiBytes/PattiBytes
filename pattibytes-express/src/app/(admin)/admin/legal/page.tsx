// src/app/(admin)/admin/legal/page.tsx
import { LegalPagesList } from './_components/LegalPagesList';

export const dynamic  = 'force-dynamic';
export const revalidate = 0;

export default function AdminLegalPage() {
  // LegalPagesList is a client component that:
  //  - wraps itself in DashboardLayout
  //  - self-fetches via Server Actions
  return <LegalPagesList />;
}
