/**
 * Standardized Error Handler
 * Provides consistent error formatting and handling utilities
 */

import { logger } from './logger';

export interface AppError {
  message: string;
  code?: string;
  statusCode?: number;
  details?: unknown;
  stack?: string;
}

export class StandardError extends Error {
  code?: string;
  statusCode: number;
  details?: unknown;

  constructor(message: string, statusCode: number = 500, code?: string, details?: unknown) {
    super(message);
    this.name = 'StandardError';
    this.statusCode = statusCode;
    this.code = code;
    this.details = details;
    Error.captureStackTrace(this, this.constructor);
  }
}

/**
 * Format an error into a standardized AppError object
 */
export function formatError(error: unknown): AppError {
  if (error instanceof StandardError) {
    return {
      message: error.message,
      code: error.code,
      statusCode: error.statusCode,
      details: error.details,
      stack: error.stack,
    };
  }

  if (error instanceof Error) {
    return {
      message: error.message,
      statusCode: 500,
      stack: error.stack,
    };
  }

  return {
    message: String(error),
    statusCode: 500,
  };
}

/**
 * Handle and log an error
 */
export function handleError(error: unknown, context?: string): AppError {
  const formattedError = formatError(error);
  
  logger.error(
    context ? `Error in ${context}` : 'Error occurred',
    error,
    { context, formattedError }
  );

  return formattedError;
}

/**
 * Create a user-friendly error message
 */
export function getUserFriendlyMessage(error: AppError): string {
  // Map known error codes to user-friendly messages
  const errorMessages: Record<string, string> = {
    'UNAUTHORIZED': 'You are not authorized to perform this action.',
    'FORBIDDEN': 'Access denied.',
    'NOT_FOUND': 'The requested resource was not found.',
    'VALIDATION_ERROR': 'Please check your input and try again.',
    'DATABASE_ERROR': 'A database error occurred. Please try again later.',
    'NETWORK_ERROR': 'Network error. Please check your connection.',
  };

  if (error.code && errorMessages[error.code]) {
    return errorMessages[error.code];
  }

  // Return the error message if it's user-friendly, otherwise return a generic message
  if (error.message && !error.message.includes('Error:') && !error.message.includes('at ')) {
    return error.message;
  }

  return 'An unexpected error occurred. Please try again.';
}

/**
 * Check if error is a known error type
 */
export function isKnownError(error: unknown): boolean {
  return (
    error instanceof StandardError ||
    error instanceof Error
  );
}

/**
 * Create a StandardError from various error types
 */
export function createError(
  message: string,
  statusCode: number = 500,
  code?: string,
  details?: unknown
): StandardError {
  return new StandardError(message, statusCode, code, details);
}

