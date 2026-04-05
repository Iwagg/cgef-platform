import type { UserRole } from '../lib/types';
import { useAuthStore } from '../stores/auth';
import { hasRole } from '../lib/rbac';

interface RBACGuardProps {
  requiredRole: UserRole;
  children: React.ReactNode;
  fallback?: React.ReactNode;
}

export function RBACGuard({ requiredRole, children, fallback = null }: RBACGuardProps) {
  const { profile } = useAuthStore();
  if (!hasRole(profile?.role, requiredRole)) {
    return <>{fallback}</>;
  }
  return <>{children}</>;
}
