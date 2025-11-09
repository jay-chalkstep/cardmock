/**
 * Unified API Authentication Utilities
 * Standardizes authentication patterns across all API routes
 */

import { auth } from '@clerk/nextjs/server';
import { NextResponse } from 'next/server';
import { createError, formatError } from '@/lib/utils/error-handler';
import { logger } from '@/lib/utils/logger';

export interface AuthContext {
  userId: string;
  orgId: string;
}

/**
 * Get authenticated user context for API routes
 * Throws StandardError if not authenticated
 */
export async function getAuthContext(): Promise<AuthContext> {
  try {
    const { userId, orgId } = await auth();

    if (!userId) {
      throw createError('Unauthorized: No user ID found', 401, 'UNAUTHORIZED');
    }

    if (!orgId) {
      throw createError('Unauthorized: No organization ID found', 401, 'UNAUTHORIZED');
    }

    return { userId, orgId };
  } catch (error) {
    if (error instanceof Error && 'statusCode' in error) {
      throw error;
    }
    throw createError('Authentication failed', 401, 'UNAUTHORIZED', error);
  }
}

/**
 * Get authenticated user context or return null
 * Use when authentication is optional
 */
export async function getAuthContextOptional(): Promise<AuthContext | null> {
  try {
    return await getAuthContext();
  } catch {
    return null;
  }
}

/**
 * Require authentication and return context, or return error response
 * Use in API route handlers
 */
export async function requireAuth(): Promise<AuthContext | NextResponse> {
  try {
    return await getAuthContext();
  } catch (error) {
    const formattedError = formatError(error);
    logger.error('Authentication failed in API route', error);
    return NextResponse.json(
      { error: formattedError.message },
      { status: formattedError.statusCode || 401 }
    );
  }
}

/**
 * Check if user is admin
 */
export async function isAdmin(): Promise<boolean> {
  try {
    const { orgRole } = await auth();
    return orgRole === 'org:admin';
  } catch {
    return false;
  }
}

/**
 * Require admin role or return error response
 */
export async function requireAdmin(): Promise<boolean | NextResponse> {
  try {
    const admin = await isAdmin();
    if (!admin) {
      return NextResponse.json(
        { error: 'Forbidden: Admin access required' },
        { status: 403 }
      );
    }
    return true;
  } catch (error) {
    const formattedError = formatError(error);
    logger.error('Admin check failed', error);
    return NextResponse.json(
      { error: formattedError.message },
      { status: formattedError.statusCode || 403 }
    );
  }
}

