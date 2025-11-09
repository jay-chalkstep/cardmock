/**
 * JWT token generation and validation for public share links
 * Creates secure, time-limited tokens for public asset sharing
 */

import jwt from 'jsonwebtoken';
import { logger } from '@/lib/utils/logger';

const JWT_SECRET = process.env.JWT_SECRET || 'change-this-secret-in-production';
const DEFAULT_EXPIRATION_DAYS = 7;

export interface ShareTokenPayload {
  assetId: string;
  organizationId: string;
  permissions: 'view' | 'comment' | 'approve';
  linkId: string;
  iat?: number;
  exp?: number;
}

/**
 * Generate a share token for a public link
 */
export function generateShareToken(
  assetId: string,
  organizationId: string,
  permissions: 'view' | 'comment' | 'approve',
  linkId: string,
  expiresInDays: number = DEFAULT_EXPIRATION_DAYS
): string {
  try {
    const payload: ShareTokenPayload = {
      assetId,
      organizationId,
      permissions,
      linkId,
    };
    
    const token = jwt.sign(payload, JWT_SECRET, {
      expiresIn: `${expiresInDays}d`,
      issuer: 'aiproval',
      audience: 'public-share',
    });
    
    return token;
  } catch (error) {
    logger.error('Failed to generate share token', error);
    throw new Error('Failed to generate share token');
  }
}

/**
 * Verify and decode a share token
 */
export function verifyShareToken(token: string): ShareTokenPayload | null {
  try {
    const decoded = jwt.verify(token, JWT_SECRET, {
      issuer: 'aiproval',
      audience: 'public-share',
    }) as ShareTokenPayload;
    
    return decoded;
  } catch (error) {
    if (error instanceof jwt.TokenExpiredError) {
      logger.debug('Share token expired', { token: token.substring(0, 20) });
      return null;
    }
    if (error instanceof jwt.JsonWebTokenError) {
      logger.debug('Invalid share token', { error: error.message });
      return null;
    }
    logger.error('Token verification error', error);
    return null;
  }
}

/**
 * Decode token without verification (for debugging)
 */
export function decodeShareToken(token: string): ShareTokenPayload | null {
  try {
    const decoded = jwt.decode(token) as ShareTokenPayload | null;
    return decoded;
  } catch (error) {
    logger.error('Token decode error', error);
    return null;
  }
}

/**
 * Check if token is expired
 */
export function isTokenExpired(token: string): boolean {
  try {
    const decoded = jwt.decode(token) as ShareTokenPayload | null;
    if (!decoded || !decoded.exp) {
      return true;
    }
    
    const now = Math.floor(Date.now() / 1000);
    return decoded.exp < now;
  } catch {
    return true;
  }
}

