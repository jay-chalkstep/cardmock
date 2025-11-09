/**
 * Common Database Query Patterns
 * Reusable query patterns for Supabase operations
 */

import { SupabaseClient } from '@supabase/supabase-js';
import { handleDatabaseError } from './errors';
import { logger } from '@/lib/utils/logger';

/**
 * Generic query result type
 */
export interface QueryResult<T> {
  data: T | null;
  error: Error | null;
}

/**
 * Execute a query with error handling
 */
export async function executeQuery<T>(
  queryFn: () => Promise<{ data: T | null; error: any } | { data: T[] | null; error: any }>,
  context?: string
): Promise<QueryResult<T>> {
  try {
    const result = await queryFn();
    
    if (result.error) {
      const error = handleDatabaseError(result.error, context);
      logger.error('Query execution failed', error, { context });
      return {
        data: null,
        error,
      };
    }

    // Handle both single and array results
    const data = Array.isArray(result.data) ? (result.data as any) : (result.data as T | null);

    return {
      data: data as T | null,
      error: null,
    };
  } catch (error) {
    const dbError = handleDatabaseError(error, context);
    logger.error('Query execution error', error, { context });
    return {
      data: null,
      error: dbError,
    };
  }
}

/**
 * Get a single record by ID
 */
export async function getById<T>(
  client: SupabaseClient,
  table: string,
  id: string,
  select?: string
): Promise<QueryResult<T>> {
  return executeQuery<T>(
    async () => {
      const result = await client.from(table).select(select || '*').eq('id', id).single();
      return { data: result.data as T | null, error: result.error };
    },
    `getById(${table}, ${id})`
  );
}

/**
 * Get records by organization ID
 */
export async function getByOrg<T>(
  client: SupabaseClient,
  table: string,
  orgId: string,
  select?: string
): Promise<QueryResult<T[]>> {
  return executeQuery<T[]>(
    async () => {
      const result = await client.from(table).select(select || '*').eq('organization_id', orgId);
      return { data: result.data as T[] | null, error: result.error };
    },
    `getByOrg(${table}, ${orgId})`
  );
}

/**
 * Get records by user ID
 */
export async function getByUser<T>(
  client: SupabaseClient,
  table: string,
  userId: string,
  select?: string
): Promise<QueryResult<T[]>> {
  return executeQuery<T[]>(
    async () => {
      const result = await client.from(table).select(select || '*').eq('created_by', userId);
      return { data: result.data as T[] | null, error: result.error };
    },
    `getByUser(${table}, ${userId})`
  );
}

/**
 * Create a new record
 */
export async function createRecord<T>(
  client: SupabaseClient,
  table: string,
  data: Partial<T>
): Promise<QueryResult<T>> {
  return executeQuery<T>(
    async () => {
      const result = await client.from(table).insert(data).select().single();
      return { data: result.data as T | null, error: result.error };
    },
    `createRecord(${table})`
  );
}

/**
 * Update a record by ID
 */
export async function updateRecord<T>(
  client: SupabaseClient,
  table: string,
  id: string,
  data: Partial<T>
): Promise<QueryResult<T>> {
  return executeQuery<T>(
    async () => {
      const result = await client.from(table).update(data).eq('id', id).select().single();
      return { data: result.data as T | null, error: result.error };
    },
    `updateRecord(${table}, ${id})`
  );
}

/**
 * Delete a record by ID
 */
export async function deleteRecord(
  client: SupabaseClient,
  table: string,
  id: string
): Promise<QueryResult<void>> {
  return executeQuery<void>(
    async () => {
      const result = await client.from(table).delete().eq('id', id);
      return { data: null, error: result.error };
    },
    `deleteRecord(${table}, ${id})`
  );
}

/**
 * Check if a record exists
 */
export async function recordExists(
  client: SupabaseClient,
  table: string,
  id: string
): Promise<boolean> {
  const result = await getById(client, table, id, 'id');
  return result.data !== null && result.error === null;
}

