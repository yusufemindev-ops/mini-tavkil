import { Navigate, Outlet } from 'react-router';
import { usePermissions } from '@/features/auth/use-permissions';

// Route-level RBAC guard (runs inside ProtectedRoute, so auth is already verified).
// Blocks a role that lacks `permission` from reaching the page by URL — not just
// from seeing it in the sidebar. super_admin's '*' passes everything.
export function RequirePermission({ permission }: { permission: string }) {
  const { can } = usePermissions();
  if (!can(permission)) {
    return <Navigate to="/dashboard" replace />;
  }
  return <Outlet />;
}
