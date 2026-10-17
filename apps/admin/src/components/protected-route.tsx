import { Navigate, Outlet } from 'react-router';
import { useSession } from '@/features/auth/use-session';

export function ProtectedRoute() {
  const { data, isLoading, isError } = useSession();

  if (isLoading) {
    return (
      <div className="text-muted-foreground flex min-h-screen items-center justify-center">
        Loading…
      </div>
    );
  }

  if (isError || !data) {
    return <Navigate to="/login" replace />;
  }

  return <Outlet />;
}
