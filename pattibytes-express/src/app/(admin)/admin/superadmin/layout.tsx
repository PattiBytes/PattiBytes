import RoleGate from '@/components/RoleGate';

export default function SuperAdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return <RoleGate allowedRoles={['superadmin']}>{children}</RoleGate>;
}
