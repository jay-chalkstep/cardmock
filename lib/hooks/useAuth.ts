/**
 * Auth Hooks - Re-exports Clerk hooks with backward compatibility
 */

// Re-export Clerk hooks directly
export { useUser, useOrganization, useAuth } from '@clerk/nextjs';

// Re-export admin status hook
export { useAdminStatus, useIsAdmin } from './useAdminStatus';
