/**
 * API-Specific Error Handling
 * Handles errors specific to API routes
 */

import { NextResponse } from 'next/server';
import { PostgrestError } from '@supabase/supabase-js';
import { formatError, createError, StandardError } from '@/lib/utils/error-handler';
import { logger } from '@/lib/utils/logger';
import { errorResponse } from './response';

/**
 * Check if error is a Supabase PostgrestError
 */
export function isPostgrestError(error: unknown): error is PostgrestError {
  return (
    typeof error === 'object' &&
    error !== null &&
    'code' in error &&
    'message' in error &&
    'details' in error
  );
}

/**
 * Format Supabase error into user-friendly message
 */
export function formatSupabaseError(error: PostgrestError): string {
  // Map common Supabase error codes to user-friendly messages
  const errorMessages: Record<string, string> = {
    'PGRST116': 'Resource not found',
    '23505': 'A record with this information already exists',
    '23503': 'Cannot delete: this record is referenced by other records',
    '42501': 'Insufficient privileges',
    '42P01': 'Database table does not exist',
  };

  if (error.code && errorMessages[error.code]) {
    return errorMessages[error.code];
  }

  // Return the error message if available
  return error.message || 'Database error occurred';
}

/**
 * Handle Supabase errors
 */
export function handleSupabaseError(error: unknown): NextResponse {
  if (isPostgrestError(error)) {
    logger.error('Supabase error', error, {
      code: error.code,
      details: error.details,
      hint: error.hint,
    });

    // Map error codes to HTTP status codes
    const statusMap: Record<string, number> = {
      'PGRST116': 404, // Not found
      '23505': 409, // Conflict
      '23503': 409, // Foreign key violation
      '42501': 403, // Insufficient privileges
      '42P01': 500, // Table does not exist
    };

    const status = statusMap[error.code || ''] || 500;
    const message = formatSupabaseError(error);

    return errorResponse(createError(message, status, error.code), message, status);
  }

  // Handle other errors
  return errorResponse(error);
}

/**
 * Handle validation errors
 */
export function handleValidationError(
  field: string,
  message: string
): NextResponse {
  return errorResponse(
    createError(`Validation error: ${field} - ${message}`, 400, 'VALIDATION_ERROR'),
    `Validation error: ${field} - ${message}`,
    400
  );
}

/**
 * Handle missing required fields
 */
export function handleMissingFields(fields: string[]): NextResponse {
  return errorResponse(
    createError(
      `Missing required fields: ${fields.join(', ')}`,
      400,
      'VALIDATION_ERROR'
    ),
    `Missing required fields: ${fields.join(', ')}`,
    400
  );
}

/**
 * Check if required fields are present in request body
 */
export function validateRequiredFields(
  body: Record<string, unknown>,
  requiredFields: string[]
): { valid: boolean; missing: string[] } {
  const missing = requiredFields.filter(field => {
    const value = body[field];
    return value === undefined || value === null || value === '';
  });

  return {
    valid: missing.length === 0,
    missing,
  };
}

/**
 * Handle missing required fields - returns NextResponse if invalid
 */
export function checkRequiredFields(
  body: Record<string, unknown>,
  requiredFields: string[]
): NextResponse | null {
  const validation = validateRequiredFields(body, requiredFields);
  if (!validation.valid) {
    return handleMissingFields(validation.missing);
  }
  return null;
}

