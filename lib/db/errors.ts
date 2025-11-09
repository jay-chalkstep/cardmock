/**
 * Database Error Handling Utilities
 * Standardized error handling for database operations
 */

import { PostgrestError } from '@supabase/supabase-js';
import { createError, formatError, StandardError } from '@/lib/utils/error-handler';
import { logger } from '@/lib/utils/logger';
import { formatSupabaseError, isPostgrestError } from '@/lib/api/error-handler';

/**
 * Check if error is a Supabase PostgrestError
 */
export function isDatabaseError(error: unknown): error is PostgrestError {
  return isPostgrestError(error);
}

/**
 * Format database error into user-friendly message
 */
export function formatDatabaseError(error: PostgrestError): string {
  return formatSupabaseError(error);
}

/**
 * Handle database errors and convert to StandardError
 */
export function handleDatabaseError(error: unknown, context?: string): StandardError {
  if (isDatabaseError(error)) {
    logger.error(
      context ? `Database error in ${context}` : 'Database error',
      error,
      {
        code: error.code,
        details: error.details,
        hint: error.hint,
      }
    );

    // Map common database error codes to HTTP status codes
    const statusMap: Record<string, number> = {
      'PGRST116': 404, // Not found
      '23505': 409, // Unique constraint violation
      '23503': 409, // Foreign key violation
      '42501': 403, // Insufficient privileges
      '42P01': 500, // Table does not exist
      '42P02': 500, // Undefined table
      '42703': 500, // Undefined column
    };

    const status = statusMap[error.code || ''] || 500;
    const message = formatDatabaseError(error);

    return createError(message, status, error.code, {
      details: error.details,
      hint: error.hint,
    });
  }

  // Handle non-database errors
  const formattedError = formatError(error);
  logger.error(
    context ? `Error in ${context}` : 'Database operation error',
    error
  );

  return createError(
    formattedError.message || 'Database operation failed',
    formattedError.statusCode || 500,
    formattedError.code,
    formattedError.details
  );
}

/**
 * Check if error is a "not found" error
 */
export function isNotFoundError(error: unknown): boolean {
  if (isDatabaseError(error)) {
    return error.code === 'PGRST116';
  }
  return false;
}

/**
 * Check if error is a unique constraint violation
 */
export function isUniqueConstraintError(error: unknown): boolean {
  if (isDatabaseError(error)) {
    return error.code === '23505';
  }
  return false;
}

/**
 * Check if error is a foreign key violation
 */
export function isForeignKeyError(error: unknown): boolean {
  if (isDatabaseError(error)) {
    return error.code === '23503';
  }
  return false;
}

