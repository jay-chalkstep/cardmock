/**
 * Standardized API Response Utilities
 * Provides consistent response formatting across all API routes
 */

import { NextResponse } from 'next/server';
import { AppError, formatError } from '@/lib/utils/error-handler';
import { logger } from '@/lib/utils/logger';

/**
 * Success response helper
 */
export function successResponse<T>(data: T, status: number = 200): NextResponse {
  return NextResponse.json(
    { success: true, data },
    { status }
  );
}

/**
 * Error response helper
 */
export function errorResponse(
  error: unknown,
  defaultMessage: string = 'Internal server error',
  defaultStatus: number = 500
): NextResponse {
  const formattedError = formatError(error);
  const status = formattedError.statusCode || defaultStatus;
  const message = formattedError.message || defaultMessage;

  logger.error('API error response', error, { status, message });

  const responseBody: any = {
    success: false,
    error: message,
  };

  if (formattedError.code) {
    responseBody.code = formattedError.code;
  }

  if (formattedError.details && process.env.NODE_ENV === 'development') {
    responseBody.details = formattedError.details;
  }

  return NextResponse.json(responseBody, { status });
}

/**
 * Unauthorized response
 */
export function unauthorizedResponse(message: string = 'Unauthorized'): NextResponse {
  return NextResponse.json(
    { success: false, error: message },
    { status: 401 }
  );
}

/**
 * Forbidden response
 */
export function forbiddenResponse(message: string = 'Forbidden'): NextResponse {
  return NextResponse.json(
    { success: false, error: message },
    { status: 403 }
  );
}

/**
 * Not found response
 */
export function notFoundResponse(message: string = 'Resource not found'): NextResponse {
  return NextResponse.json(
    { success: false, error: message },
    { status: 404 }
  );
}

/**
 * Bad request response
 */
export function badRequestResponse(message: string = 'Bad request'): NextResponse {
  return NextResponse.json(
    { success: false, error: message },
    { status: 400 }
  );
}

/**
 * Validation error response
 */
export function validationErrorResponse(
  errors: Record<string, string[]> | string
): NextResponse {
  return NextResponse.json(
    {
      success: false,
      error: 'Validation failed',
      errors: typeof errors === 'string' ? { message: [errors] } : errors,
    },
    { status: 400 }
  );
}

/**
 * Wrap API route handler with error handling
 */
export function withErrorHandling<T extends (...args: any[]) => Promise<NextResponse>>(
  handler: T
): T {
  return (async (...args: Parameters<T>) => {
    try {
      return await handler(...args);
    } catch (error) {
      return errorResponse(error);
    }
  }) as T;
}

