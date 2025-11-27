/**
 * useAdminStatus Hook
 *
 * Provides consistent admin status checking across all components.
 * Handles loading states and organization membership properly.
 */

'use client';

import { useOrganization } from '@clerk/nextjs';

export interface AdminStatus {
  /** Whether the user is an admin in the current organization */
  isAdmin: boolean;
  /** Whether the membership data has fully loaded */
  isLoaded: boolean;
  /** The current organization (if any) */
  organization: ReturnType<typeof useOrganization>['organization'];
  /** The user's membership in the organization */
  membership: ReturnType<typeof useOrganization>['membership'];
  /** The user's role string (e.g., 'org:admin', 'org:member') */
  role: string | null;
}

/**
 * Hook to check if current user has admin privileges
 *
 * Usage:
 * ```tsx
 * const { isAdmin, isLoaded } = useAdminStatus();
 *
 * if (!isLoaded) return <Loading />;
 * if (!isAdmin) return <AccessDenied />;
 * ```
 */
export function useAdminStatus(): AdminStatus {
  const { organization, membership, isLoaded } = useOrganization();

  // Get the role from membership
  const role = membership?.role ?? null;

  // Check if user is admin
  // Clerk uses 'org:admin' for admin role
  const isAdmin = isLoaded && role === 'org:admin';

  return {
    isAdmin,
    isLoaded,
    organization,
    membership,
    role,
  };
}

/**
 * Simple boolean check for admin status (for conditional rendering)
 * Note: Returns false while loading - use useAdminStatus for loading state
 */
export function useIsAdmin(): boolean {
  const { isAdmin } = useAdminStatus();
  return isAdmin;
}
