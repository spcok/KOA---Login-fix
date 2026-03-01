
import { useMemo } from 'react';
import { useAuthStore } from '@/src/store/authStore';
import { UserPermissions, UserRole } from '@/types';

/**
 * Hook to securely access user permissions and role from the auth store.
 * This reads from the state which is kept in sync with JWT claims via Realtime.
 */
export function usePermissions() {
  const { profile, user } = useAuthStore();

  const permissions = useMemo(() => {
    if (!profile) return {} as UserPermissions;
    return profile.permissions || {} as UserPermissions;
  }, [profile]);

  const role = useMemo(() => {
    return profile?.role as UserRole || 'Volunteer';
  }, [profile]);

  const isAdmin = role === 'Admin';
  const isStaff = role === 'Staff' || isAdmin;
  const isVet = role === 'Veterinarian' || isAdmin;

  /**
   * Check if the user has a specific permission.
   */
  const hasPermission = (permission: keyof UserPermissions): boolean => {
    if (isAdmin) return true;
    return !!permissions[permission];
  };

  /**
   * Check if the user can perform an action based on their role.
   */
  const can = (action: 'manage_users' | 'manage_animals' | 'view_reports' | 'manage_settings'): boolean => {
    switch (action) {
      case 'manage_users':
        return isAdmin;
      case 'manage_animals':
        return isStaff || isVet;
      case 'view_reports':
        return isStaff || isVet;
      case 'manage_settings':
        return isAdmin;
      default:
        return false;
    }
  };

  return {
    permissions,
    role,
    isAdmin,
    isStaff,
    isVet,
    hasPermission,
    can,
    isAuthenticated: !!user && !!profile,
    userId: user?.id
  };
}
