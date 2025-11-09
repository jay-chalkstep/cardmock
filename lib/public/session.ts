/**
 * Session management for public reviewers
 * Manages session state for anonymous reviewers
 */

import crypto from 'crypto';
import { cookies } from 'next/headers';
import { supabaseServer } from '@/lib/supabase-server';
import { logger } from '@/lib/utils/logger';

const SESSION_COOKIE_NAME = 'aiproval_public_session';
const SESSION_DURATION_DAYS = 30;

export interface PublicReviewerSession {
  id: string;
  email?: string;
  name?: string;
  company?: string;
  verifiedAt?: string;
  ipAddress?: string;
  userAgent?: string;
  sessionToken: string;
  createdAt: string;
}

/**
 * Create a new public reviewer session
 */
export async function createPublicSession(
  reviewerData: {
    email?: string;
    name?: string;
    company?: string;
    ipAddress?: string;
    userAgent?: string;
  }
): Promise<{ sessionToken: string; reviewerId: string }> {
  try {
    const sessionToken = crypto.randomUUID();
    
    // Store in database
    const { data: reviewer, error } = await supabaseServer
      .from('public_reviewers')
      .insert({
        email: reviewerData.email,
        name: reviewerData.name,
        company: reviewerData.company,
        ip_address: reviewerData.ipAddress,
        user_agent: reviewerData.userAgent,
        session_token: sessionToken,
      })
      .select()
      .single();
    
    if (error || !reviewer) {
      logger.error('Failed to create public session', error);
      throw new Error('Failed to create session');
    }
    
    // Set cookie
    const cookieStore = await cookies();
    cookieStore.set(SESSION_COOKIE_NAME, sessionToken, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      maxAge: SESSION_DURATION_DAYS * 24 * 60 * 60,
      path: '/',
    });
    
    return {
      sessionToken,
      reviewerId: reviewer.id,
    };
  } catch (error) {
    logger.error('Failed to create public session', error);
    throw error;
  }
}

/**
 * Get public session from cookie
 */
export async function getPublicSession(): Promise<PublicReviewerSession | null> {
  try {
    const cookieStore = await cookies();
    const sessionToken = cookieStore.get(SESSION_COOKIE_NAME)?.value;
    
    if (!sessionToken) {
      return null;
    }
    
    // Get from database
    const { data: reviewer, error } = await supabaseServer
      .from('public_reviewers')
      .select('*')
      .eq('session_token', sessionToken)
      .single();
    
    if (error || !reviewer) {
      return null;
    }
    
    return {
      id: reviewer.id,
      email: reviewer.email || undefined,
      name: reviewer.name || undefined,
      company: reviewer.company || undefined,
      verifiedAt: reviewer.verified_at || undefined,
      ipAddress: reviewer.ip_address || undefined,
      userAgent: reviewer.user_agent || undefined,
      sessionToken: reviewer.session_token,
      createdAt: reviewer.created_at,
    };
  } catch (error) {
    logger.error('Failed to get public session', error);
    return null;
  }
}

/**
 * Update public session data
 */
export async function updatePublicSession(
  sessionToken: string,
  data: {
    email?: string;
    name?: string;
    company?: string;
    verifiedAt?: string;
  }
): Promise<boolean> {
  try {
    const updateData: Record<string, unknown> = {};
    
    if (data.email !== undefined) updateData.email = data.email;
    if (data.name !== undefined) updateData.name = data.name;
    if (data.company !== undefined) updateData.company = data.company;
    if (data.verifiedAt !== undefined) updateData.verified_at = data.verifiedAt;
    
    const { error } = await supabaseServer
      .from('public_reviewers')
      .update(updateData)
      .eq('session_token', sessionToken);
    
    if (error) {
      logger.error('Failed to update public session', error);
      return false;
    }
    
    return true;
  } catch (error) {
    logger.error('Failed to update public session', error);
    return false;
  }
}

/**
 * Clear public session
 */
export async function clearPublicSession(): Promise<void> {
  try {
    const cookieStore = await cookies();
    cookieStore.delete(SESSION_COOKIE_NAME);
  } catch (error) {
    logger.error('Failed to clear public session', error);
  }
}

/**
 * Get or create public session (idempotent)
 */
export async function getOrCreatePublicSession(
  reviewerData: {
    email?: string;
    name?: string;
    company?: string;
    ipAddress?: string;
    userAgent?: string;
  }
): Promise<{ sessionToken: string; reviewerId: string; isNew: boolean }> {
  const existing = await getPublicSession();
  
  if (existing) {
    // Update if new data provided
    if (reviewerData.email || reviewerData.name || reviewerData.company) {
      await updatePublicSession(existing.sessionToken, {
        email: reviewerData.email || existing.email,
        name: reviewerData.name || existing.name,
        company: reviewerData.company || existing.company,
      });
    }
    
    return {
      sessionToken: existing.sessionToken,
      reviewerId: existing.id,
      isNew: false,
    };
  }
  
  // Create new session
  const { sessionToken, reviewerId } = await createPublicSession(reviewerData);
  return {
    sessionToken,
    reviewerId,
    isNew: true,
  };
}

