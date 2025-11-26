/**
 * Authentication Utilities using Clerk
 * Provides auth context for API routes with organization support
 */

import { auth, clerkClient } from '@clerk/nextjs/server';
import { NextResponse } from 'next/server';

export interface AuthContext {
  userId: string;
  orgId: string;
}

export interface UserAuthContext {
  userId: string;
  orgId: string | null;
}

/**
 * Get authenticated user context for API routes
 * Requires both user and organization to be present
 * Returns NextResponse on error (for use in API routes)
 */
export async function getAuthContext(): Promise<AuthContext | NextResponse> {
  const { userId, orgId } = await auth();

  if (!userId) {
    return NextResponse.json(
      { error: 'Unauthorized', message: 'Authentication required' },
      { status: 401 }
    );
  }

  if (!orgId) {
    return NextResponse.json(
      { error: 'No organization', message: 'Please select an organization' },
      { status: 403 }
    );
  }

  return { userId, orgId };
}

/**
 * Get authenticated user context for Server Actions
 * Throws error on auth failure (for use in Server Actions)
 */
export async function getAuthContextOrThrow(): Promise<AuthContext> {
  const { userId, orgId } = await auth();

  if (!userId) {
    throw new Error('Authentication required');
  }

  if (!orgId) {
    throw new Error('Please select an organization');
  }

  return { userId, orgId };
}

/**
 * Get authenticated user context without requiring organization
 */
export async function getUserAuthContext(): Promise<UserAuthContext | NextResponse> {
  const { userId, orgId } = await auth();

  if (!userId) {
    return NextResponse.json(
      { error: 'Unauthorized', message: 'Authentication required' },
      { status: 401 }
    );
  }

  return { userId, orgId: orgId || null };
}

// Alias for backwards compatibility
export const getOrgAuthContext = getAuthContext;

/**
 * Get authenticated user context or return null (for optional auth)
 */
export async function getAuthContextOptional(): Promise<AuthContext | null> {
  const { userId, orgId } = await auth();

  if (!userId || !orgId) {
    return null;
  }

  return { userId, orgId };
}

/**
 * Require authentication and return context, or return error response
 */
export async function requireAuth(): Promise<AuthContext | NextResponse> {
  return getAuthContext();
}

// Alias for backwards compatibility
export const requireOrgAuth = requireAuth;

/**
 * Check if user is admin in the current organization
 */
export async function isAdmin(): Promise<boolean> {
  const { userId, orgId, orgRole } = await auth();

  if (!userId || !orgId) {
    return false;
  }

  return orgRole === 'org:admin';
}

/**
 * Require admin role or return error response
 */
export async function requireAdmin(): Promise<boolean | NextResponse> {
  const isUserAdmin = await isAdmin();

  if (!isUserAdmin) {
    return NextResponse.json(
      { error: 'Forbidden', message: 'Admin access required' },
      { status: 403 }
    );
  }

  return true;
}

/**
 * Check if user is internal (not a client role)
 */
export async function isInternalUser(): Promise<boolean> {
  const { userId, orgId, orgRole } = await auth();

  if (!userId || !orgId) {
    return false;
  }

  // Internal users are admins or members, not clients
  return orgRole === 'org:admin' || orgRole === 'org:member';
}

/**
 * Require internal user or return error response
 */
export async function requireInternalUser(): Promise<boolean | NextResponse> {
  const isInternal = await isInternalUser();

  if (!isInternal) {
    return NextResponse.json(
      { error: 'Forbidden', message: 'Internal user access required' },
      { status: 403 }
    );
  }

  return true;
}

/**
 * Get user info by ID from Clerk
 */
export async function getUserInfo(userId: string) {
  try {
    const client = await clerkClient();
    const user = await client.users.getUser(userId);
    return {
      id: user.id,
      name: `${user.firstName || ''} ${user.lastName || ''}`.trim() || 'Unknown User',
      email: user.emailAddresses[0]?.emailAddress || '',
      avatar: user.imageUrl,
    };
  } catch (error) {
    console.error('Error fetching user info:', error);
    return {
      id: userId,
      name: 'Unknown User',
      email: '',
      avatar: null,
    };
  }
}

/**
 * Get organization members from Clerk
 */
export async function getOrgMembers(orgId: string, excludeUserId?: string) {
  try {
    const client = await clerkClient();
    const memberships = await client.organizations.getOrganizationMembershipList({
      organizationId: orgId,
    });

    const members = memberships.data.map((membership) => ({
      id: membership.publicUserData?.userId || '',
      name: `${membership.publicUserData?.firstName || ''} ${membership.publicUserData?.lastName || ''}`.trim() || 'Unknown',
      email: membership.publicUserData?.identifier || '',
      avatar: membership.publicUserData?.imageUrl || null,
      role: membership.role,
    }));

    if (excludeUserId) {
      return members.filter((m) => m.id !== excludeUserId);
    }

    return members;
  } catch (error) {
    console.error('Error fetching org members:', error);
    return [];
  }
}

// Backwards compatibility aliases
export const getMockUserInfo = getUserInfo;
export const getMockOrgMembers = getOrgMembers;
