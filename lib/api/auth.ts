/**
 * Mock Authentication Utilities
 * Provides hardcoded auth context for development without Clerk
 */

import { NextResponse } from 'next/server';

// Hardcoded dev user - no auth required
const MOCK_USER = {
  userId: 'dev-user-001',
  orgId: 'dev-org-001',
};

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
 * Returns mock user - no actual auth
 */
export async function getAuthContext(): Promise<AuthContext> {
  return MOCK_USER;
}

/**
 * Get authenticated user context without requiring organization
 */
export async function getUserAuthContext(): Promise<UserAuthContext> {
  return { userId: MOCK_USER.userId, orgId: MOCK_USER.orgId };
}

// Alias for backwards compatibility
export const getOrgAuthContext = getAuthContext;

/**
 * Get authenticated user context or return null
 */
export async function getAuthContextOptional(): Promise<AuthContext | null> {
  return MOCK_USER;
}

/**
 * Require authentication and return context, or return error response
 */
export async function requireAuth(): Promise<AuthContext | NextResponse> {
  return MOCK_USER;
}

// Alias for backwards compatibility
export const requireOrgAuth = requireAuth;

/**
 * Check if user is admin - always true in dev mode
 */
export async function isAdmin(): Promise<boolean> {
  return true;
}

/**
 * Require admin role or return error response
 */
export async function requireAdmin(): Promise<boolean | NextResponse> {
  return true;
}


/**
 * Check if user is internal (not a client)
 */
export async function isInternalUser(): Promise<boolean> {
  return true;
}

/**
 * Require internal user or return error response
 */
export async function requireInternalUser(): Promise<boolean | NextResponse> {
  return true;
}


// Mock organization members for development
export const MOCK_ORG_MEMBERS = [
  {
    id: 'dev-user-001',
    name: 'Dev User',
    email: 'dev@example.com',
    avatar: null,
    role: 'org:admin',
  },
  {
    id: 'dev-reviewer-001',
    name: 'Jane Reviewer',
    email: 'reviewer@example.com',
    avatar: null,
    role: 'org:member',
  },
  {
    id: 'dev-client-001',
    name: 'Client User',
    email: 'client@example.com',
    avatar: null,
    role: 'org:client',
  },
];

/**
 * Get mock user info by ID
 */
export function getMockUserInfo(userId: string) {
  const member = MOCK_ORG_MEMBERS.find(m => m.id === userId);
  return member || {
    id: userId,
    name: 'Unknown User',
    email: 'unknown@example.com',
    avatar: null,
    role: 'org:member',
  };
}

/**
 * Get all mock organization members
 */
export function getMockOrgMembers(excludeUserId?: string) {
  if (excludeUserId) {
    return MOCK_ORG_MEMBERS.filter(m => m.id !== excludeUserId);
  }
  return MOCK_ORG_MEMBERS;
}
