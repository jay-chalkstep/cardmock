/**
 * Unified API Authentication Utilities
 * Standardizes authentication patterns across all API routes
 */

import { auth } from '@clerk/nextjs/server';
import { NextResponse } from 'next/server';
import { createError, formatError } from '@/lib/utils/error-handler';
import { logger } from '@/lib/utils/logger';
import { supabaseServer } from '@/lib/supabase-server';
import { Client } from '@/lib/supabase';

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
 * Requires both userId and orgId - use for most routes
 */
export async function getAuthContext(): Promise<AuthContext> {
  try {
    const { userId, orgId } = await auth();

    if (!userId) {
      throw createError('Unauthorized', 401, 'UNAUTHORIZED');
    }

    if (!orgId) {
      throw createError('Organization required', 401, 'UNAUTHORIZED');
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
 * Get authenticated user context without requiring organization
 * Use for routes that work without org context (e.g., notifications)
 */
export async function getUserAuthContext(): Promise<UserAuthContext> {
  try {
    const { userId, orgId } = await auth();

    if (!userId) {
      throw createError('Unauthorized', 401, 'UNAUTHORIZED');
    }

    return { userId, orgId: orgId || null };
  } catch (error) {
    if (error instanceof Error && 'statusCode' in error) {
      throw error;
    }
    throw createError('Authentication failed', 401, 'UNAUTHORIZED', error);
  }
}

// Alias for backwards compatibility
export const getOrgAuthContext = getAuthContext;

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
 * Use in API route handlers - requires org context
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

// Alias for backwards compatibility
export const requireOrgAuth = requireAuth;

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

/**
 * Check if user has Client role
 * Note: This assumes a "Client" role exists in Clerk organization settings
 */
export async function isClient(): Promise<boolean> {
  try {
    const { orgRole } = await auth();
    return orgRole === 'org:client';
  } catch {
    return false;
  }
}

/**
 * Require Client role or return error response
 */
export async function requireClient(): Promise<boolean | NextResponse> {
  try {
    const client = await isClient();
    if (!client) {
      return NextResponse.json(
        { error: 'Forbidden: Client access required' },
        { status: 403 }
      );
    }
    return true;
  } catch (error) {
    const formattedError = formatError(error);
    logger.error('Client check failed', error);
    return NextResponse.json(
      { error: formattedError.message },
      { status: formattedError.statusCode || 403 }
    );
  }
}

/**
 * Check if user is internal (not a client)
 * Internal users are admins or members (not clients)
 */
export async function isInternalUser(): Promise<boolean> {
  try {
    const { orgRole } = await auth();
    return orgRole === 'org:admin' || orgRole === 'org:member';
  } catch {
    return false;
  }
}

/**
 * Require internal user (admin or member) or return error response
 */
export async function requireInternalUser(): Promise<boolean | NextResponse> {
  try {
    const internal = await isInternalUser();
    if (!internal) {
      return NextResponse.json(
        { error: 'Forbidden: Internal user access required' },
        { status: 403 }
      );
    }
    return true;
  } catch (error) {
    const formattedError = formatError(error);
    logger.error('Internal user check failed', error);
    return NextResponse.json(
      { error: formattedError.message },
      { status: formattedError.statusCode || 403 }
    );
  }
}

/**
 * Get the client ID assigned to the current user
 * Returns null if no client is assigned
 */
export async function getUserAssignedClientId(userId?: string, orgId?: string): Promise<string | null> {
  try {
    const client = await getUserAssignedClient(userId, orgId);
    return client?.id || null;
  } catch (error) {
    logger.error('Failed to get user assigned client ID', error);
    return null;
  }
}

/**
 * Get the full client object assigned to the current user
 * Returns null if no client is assigned or if user is not in an org
 */
export async function getUserAssignedClient(userId?: string, orgId?: string): Promise<Client | null> {
  try {
    let finalUserId = userId;
    let finalOrgId = orgId;

    if (!finalUserId || !finalOrgId) {
      const authContext = await getOrgAuthContext();
      finalUserId = finalUserId || authContext.userId;
      finalOrgId = finalOrgId || authContext.orgId;
    }

    const { data: assignment } = await supabaseServer
      .from('client_users')
      .select('*, client:clients(*)')
      .eq('user_id', finalUserId)
      .eq('organization_id', finalOrgId)
      .single();

    if (!assignment || !assignment.client) {
      return null;
    }

    return Array.isArray(assignment.client) ? assignment.client[0] : assignment.client;
  } catch (error) {
    logger.error('Failed to get user assigned client', error);
    return null;
  }
}

/**
 * Get the client hierarchy for the current user
 * Returns the user's assigned client and all its child clients
 */
export async function getUserClientHierarchy(): Promise<Client[]> {
  try {
    const assignedClient = await getUserAssignedClient();
    if (!assignedClient) {
      return [];
    }

    // Get all child clients recursively using the database function
    const { data: children } = await supabaseServer
      .rpc('get_child_clients', { parent_id: assignedClient.id });

    return [assignedClient, ...(children || [])];
  } catch (error) {
    logger.error('Failed to get user client hierarchy', error);
    return [];
  }
}


/**
 * Get the client with hierarchy for a user (parent + children)
 * Returns the user's assigned client with parent and child clients populated
 */
export async function getUserClientWithHierarchy(userId?: string, orgId?: string): Promise<Client | null> {
  try {
    const client = await getUserAssignedClient(userId, orgId);
    if (!client) {
      return null;
    }

    // Get parent client if exists
    if (client.parent_client_id) {
      const { data: parentClient } = await supabaseServer
        .from('clients')
        .select('*')
        .eq('id', client.parent_client_id)
        .single();

      if (parentClient) {
        client.parent_client = parentClient as Client;
      }
    }

    // Get child clients
    const { data: childClients } = await supabaseServer
      .from('clients')
      .select('*')
      .eq('parent_client_id', client.id)
      .eq('organization_id', client.organization_id);

    if (childClients && childClients.length > 0) {
      client.child_clients = childClients as Client[];
    }

    return client;
  } catch (error) {
    logger.error('Error getting user client hierarchy', error);
    return null;
  }
}


