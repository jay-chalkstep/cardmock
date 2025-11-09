/**
 * Encryption utilities for OAuth credentials
 * Uses AES-256 encryption with a key from environment variables
 */

import crypto from 'crypto';

const ALGORITHM = 'aes-256-gcm';
const IV_LENGTH = 16;
const SALT_LENGTH = 64;
const TAG_LENGTH = 16;
const KEY_LENGTH = 32;
const ITERATIONS = 100000;

/**
 * Get encryption key from environment variable
 * Falls back to a default key in development (NOT for production)
 */
function getEncryptionKey(): Buffer {
  const key = process.env.INTEGRATION_ENCRYPTION_KEY;
  
  if (!key) {
    if (process.env.NODE_ENV === 'production') {
      throw new Error('INTEGRATION_ENCRYPTION_KEY environment variable is required in production');
    }
    // Development fallback - DO NOT USE IN PRODUCTION
    console.warn('WARNING: Using default encryption key in development. Set INTEGRATION_ENCRYPTION_KEY in production!');
    return crypto.scryptSync('default-dev-key-change-in-production', 'salt', KEY_LENGTH);
  }
  
  // If key is provided as hex string, convert it
  if (key.length === 64) {
    return Buffer.from(key, 'hex');
  }
  
  // Otherwise derive key from the string
  return crypto.scryptSync(key, 'integration-salt', KEY_LENGTH);
}

/**
 * Encrypt credentials using AES-256-GCM
 */
export function encryptCredentials(credentials: Record<string, unknown>): string {
  try {
    const key = getEncryptionKey();
    const iv = crypto.randomBytes(IV_LENGTH);
    const cipher = crypto.createCipheriv(ALGORITHM, key, iv);
    
    const plaintext = JSON.stringify(credentials);
    let encrypted = cipher.update(plaintext, 'utf8', 'hex');
    encrypted += cipher.final('hex');
    
    const tag = cipher.getAuthTag();
    
    // Combine IV, tag, and encrypted data
    const result = {
      iv: iv.toString('hex'),
      tag: tag.toString('hex'),
      encrypted,
    };
    
    return JSON.stringify(result);
  } catch (error) {
    throw new Error(`Failed to encrypt credentials: ${error instanceof Error ? error.message : String(error)}`);
  }
}

/**
 * Decrypt credentials using AES-256-GCM
 */
export function decryptCredentials(encryptedData: string): Record<string, unknown> {
  try {
    const key = getEncryptionKey();
    const data = JSON.parse(encryptedData);
    
    const iv = Buffer.from(data.iv, 'hex');
    const tag = Buffer.from(data.tag, 'hex');
    const encrypted = data.encrypted;
    
    const decipher = crypto.createDecipheriv(ALGORITHM, key, iv);
    decipher.setAuthTag(tag);
    
    let decrypted = decipher.update(encrypted, 'hex', 'utf8');
    decrypted += decipher.final('utf8');
    
    return JSON.parse(decrypted);
  } catch (error) {
    throw new Error(`Failed to decrypt credentials: ${error instanceof Error ? error.message : String(error)}`);
  }
}

/**
 * Hash a password using bcrypt (for public share link passwords)
 */
export async function hashPassword(password: string): Promise<string> {
  const bcrypt = await import('bcryptjs');
  return bcrypt.hash(password, 10);
}

/**
 * Verify a password against a hash
 */
export async function verifyPassword(password: string, hash: string): Promise<boolean> {
  const bcrypt = await import('bcryptjs');
  return bcrypt.compare(password, hash);
}

