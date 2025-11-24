/**
 * Rate limiting utilities for integrations
 * Implements per-integration and per-user rate limiting
 */

import { logger } from '@/lib/utils/logger';

// Rate limit configuration per integration (requests per minute)
const RATE_LIMITS: Record<string, { limit: number; windowMs: number }> = {
  gmail: { limit: 20, windowMs: 60 * 1000 }, // 20 requests per minute
  slack: { limit: 50, windowMs: 60 * 1000 }, // 50 requests per minute
  drive: { limit: 100, windowMs: 60 * 1000 }, // 100 requests per minute
  dropbox: { limit: 100, windowMs: 60 * 1000 }, // 100 requests per minute
  default: { limit: 60, windowMs: 60 * 1000 }, // 60 requests per minute default
};

// In-memory rate limit store (in production, use Redis or similar)
interface RateLimitEntry {
  count: number;
  resetAt: number;
}

const rateLimitStore = new Map<string, RateLimitEntry>();

/**
 * Check rate limit for an integration and user
 */
export function checkRateLimit(
  integrationType: string,
  userId: string,
  customLimit?: number,
  customWindowMs?: number
): { allowed: boolean; remaining: number; resetAt: number } {
  const config = RATE_LIMITS[integrationType] || RATE_LIMITS.default;
  const limit = customLimit || config.limit;
  const windowMs = customWindowMs || config.windowMs;
  
  const key = `${integrationType}:${userId}`;
  const now = Date.now();
  
  let entry = rateLimitStore.get(key);
  
  // If no entry or window expired, create new entry
  if (!entry || entry.resetAt < now) {
    entry = {
      count: 0,
      resetAt: now + windowMs,
    };
    rateLimitStore.set(key, entry);
  }
  
  // Check if limit exceeded
  if (entry.count >= limit) {
    logger.warn('Rate limit exceeded', { integrationType, userId, limit, count: entry.count });
    return {
      allowed: false,
      remaining: 0,
      resetAt: entry.resetAt,
    };
  }
  
  // Increment count
  entry.count++;
  rateLimitStore.set(key, entry);
  
  // Clean up old entries periodically (every 5 minutes)
  if (Math.random() < 0.01) { // 1% chance to clean up
    cleanupRateLimitStore();
  }
  
  return {
    allowed: true,
    remaining: limit - entry.count,
    resetAt: entry.resetAt,
  };
}

/**
 * Clean up expired rate limit entries
 */
function cleanupRateLimitStore(): void {
  const now = Date.now();
  for (const [key, entry] of rateLimitStore.entries()) {
    if (entry.resetAt < now) {
      rateLimitStore.delete(key);
    }
  }
}

/**
 * Get rate limit info without incrementing
 */
export function getRateLimitInfo(
  integrationType: string,
  userId: string
): { limit: number; remaining: number; resetAt: number } {
  const config = RATE_LIMITS[integrationType] || RATE_LIMITS.default;
  const key = `${integrationType}:${userId}`;
  const entry = rateLimitStore.get(key);
  
  if (!entry || entry.resetAt < Date.now()) {
    return {
      limit: config.limit,
      remaining: config.limit,
      resetAt: Date.now() + config.windowMs,
    };
  }
  
  return {
    limit: config.limit,
    remaining: Math.max(0, config.limit - entry.count),
    resetAt: entry.resetAt,
  };
}

/**
 * Reset rate limit for a user (for testing or manual override)
 */
export function resetRateLimit(integrationType: string, userId: string): void {
  const key = `${integrationType}:${userId}`;
  rateLimitStore.delete(key);
}

