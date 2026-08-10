import { useSession } from './use-session';

// Permission check for the current admin. super_admin carries the '*' wildcard
// (granted everything); everyone else must hold the exact `domain:action` code.
export function usePermissions() {
  const { data } = useSession();
  const permissions = data?.permissions ?? [];

  const can = (code: string): boolean => permissions.includes('*') || permissions.includes(code);

  return { permissions, can };
}
