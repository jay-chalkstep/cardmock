/**
 * Webhook signature verification utilities
 * Verifies webhook signatures from various platforms
 */

import crypto from 'crypto';
import { logger } from '@/lib/utils/logger';

/**
 * Verify Slack webhook signature
 */
export function verifySlackSignature(
  payload: string,
  signature: string,
  timestamp: string
): boolean {
  try {
    const signingSecret = process.env.SLACK_SIGNING_SECRET;
    if (!signingSecret) {
      logger.warn('SLACK_SIGNING_SECRET not configured');
      return false;
    }
    
    // Check timestamp to prevent replay attacks (5 minute window)
    const requestTime = parseInt(timestamp, 10);
    const currentTime = Math.floor(Date.now() / 1000);
    if (Math.abs(currentTime - requestTime) > 300) {
      logger.warn('Slack webhook timestamp too old or too far in future', { timestamp, currentTime });
      return false;
    }
    
    // Create signature base string
    const sigBaseString = `v0:${timestamp}:${payload}`;
    const hmac = crypto.createHmac('sha256', signingSecret);
    hmac.update(sigBaseString);
    const computedSignature = `v0=${hmac.digest('hex')}`;
    
    // Use timing-safe comparison
    return crypto.timingSafeEqual(
      Buffer.from(signature),
      Buffer.from(computedSignature)
    );
  } catch (error) {
    logger.error('Slack signature verification error', error);
    return false;
  }
}

/**
 * Verify Gmail webhook signature (if using push notifications)
 */
export function verifyGmailSignature(
  payload: string,
  signature: string
): boolean {
  try {
    // Gmail push notifications use JWT tokens
    // This is a placeholder - actual implementation depends on Gmail's push notification setup
    const secret = process.env.GMAIL_WEBHOOK_SECRET;
    if (!secret) {
      logger.warn('GMAIL_WEBHOOK_SECRET not configured');
      return false;
    }
    
    // For now, return true if secret matches (simplified)
    // In production, implement proper JWT verification
    return signature === secret;
  } catch (error) {
    logger.error('Gmail signature verification error', error);
    return false;
  }
}

/**
 * Verify Figma webhook signature (if available)
 */
export function verifyFigmaSignature(
  payload: string,
  signature: string
): boolean {
  try {
    const secret = process.env.FIGMA_WEBHOOK_SECRET;
    if (!secret) {
      logger.warn('FIGMA_WEBHOOK_SECRET not configured');
      return false;
    }
    
    // Figma webhooks use HMAC-SHA256
    const hmac = crypto.createHmac('sha256', secret);
    hmac.update(payload);
    const computedSignature = hmac.digest('hex');
    
    return crypto.timingSafeEqual(
      Buffer.from(signature),
      Buffer.from(computedSignature)
    );
  } catch (error) {
    logger.error('Figma signature verification error', error);
    return false;
  }
}

/**
 * Verify generic HMAC signature
 */
export function verifyHMACSignature(
  payload: string,
  signature: string,
  secret: string,
  algorithm: string = 'sha256'
): boolean {
  try {
    const hmac = crypto.createHmac(algorithm, secret);
    hmac.update(payload);
    const computedSignature = hmac.digest('hex');
    
    return crypto.timingSafeEqual(
      Buffer.from(signature),
      Buffer.from(computedSignature)
    );
  } catch (error) {
    logger.error('HMAC signature verification error', error);
    return false;
  }
}

/**
 * Validate webhook timestamp to prevent replay attacks
 */
export function validateWebhookTimestamp(timestamp: string, maxAgeSeconds: number = 300): boolean {
  try {
    const requestTime = parseInt(timestamp, 10);
    const currentTime = Math.floor(Date.now() / 1000);
    const age = Math.abs(currentTime - requestTime);
    
    if (age > maxAgeSeconds) {
      logger.warn('Webhook timestamp validation failed', { timestamp, age, maxAgeSeconds });
      return false;
    }
    
    return true;
  } catch (error) {
    logger.error('Timestamp validation error', error);
    return false;
  }
}

