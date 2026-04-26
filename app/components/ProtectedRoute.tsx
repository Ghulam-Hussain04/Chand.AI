'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useAuthStore } from '@/app/stores/authStore';
import { Role, hasPermission } from '@/app/lib/rbac';
import { toast } from 'sonner';

interface ProtectedRouteProps {
  children: React.ReactNode;
  requiredRole?: Role | Role[];
  requiredPermission?: string;
  fallbackPath?: string;
}

/**
 * Protected Route Component
 * Ensures user is authenticated and has required role/permissions
 */
export function ProtectedRoute({
  children,
  requiredRole,
  requiredPermission,
  fallbackPath = '/auth/login',
}: ProtectedRouteProps) {
  const router = useRouter();
  const { user, token } = useAuthStore();

  useEffect(() => {
    // Check authentication
    if (!token || !user) {
      router.push('/auth/login');
      return;
    }

    // Check role requirement
    if (requiredRole) {
      const roleArray = Array.isArray(requiredRole) ? requiredRole : [requiredRole];
      if (!roleArray.includes(user.role)) {
        toast.error('You do not have permission to access this resource');
        router.push(fallbackPath);
        return;
      }
    }

    // Check permission requirement
    if (requiredPermission) {
      const hasPerms = hasPermission(user.role, requiredPermission as any);
      if (!hasPerms) {
        toast.error('You do not have permission to perform this action');
        router.push(fallbackPath);
        return;
      }
    }
  }, [user, token, requiredRole, requiredPermission, router, fallbackPath]);

  // Show nothing while checking auth
  if (!token || !user) {
    return null;
  }

  // Check role requirement (sync check)
  if (requiredRole) {
    const roleArray = Array.isArray(requiredRole) ? requiredRole : [requiredRole];
    if (!roleArray.includes(user.role)) {
      return null;
    }
  }

  // Check permission requirement (sync check)
  if (requiredPermission) {
    const hasPerms = hasPermission(user.role, requiredPermission as any);
    if (!hasPerms) {
      return null;
    }
  }

  return <>{children}</>;
}

export default ProtectedRoute;
