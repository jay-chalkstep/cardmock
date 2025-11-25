/**
 * Mock Auth Hooks
 * Replaces Clerk's useUser and useOrganization hooks
 */

// Mock user data
const MOCK_USER = {
  id: 'dev-user-001',
  firstName: 'Dev',
  lastName: 'User',
  fullName: 'Dev User',
  username: 'devuser',
  emailAddresses: [{ emailAddress: 'dev@example.com' }],
  imageUrl: null,
};

// Mock organization data
const MOCK_ORG = {
  id: 'dev-org-001',
  name: 'Dev Organization',
  slug: 'dev-org',
  imageUrl: null,
};

// Mock membership
const MOCK_MEMBERSHIP = {
  role: 'org:admin' as const,
};

/**
 * Mock useUser hook - replaces @clerk/nextjs useUser
 */
export function useUser() {
  return {
    user: MOCK_USER,
    isLoaded: true,
    isSignedIn: true,
  };
}

/**
 * Mock useOrganization hook - replaces @clerk/nextjs useOrganization
 */
export function useOrganization() {
  return {
    organization: MOCK_ORG,
    membership: MOCK_MEMBERSHIP,
    isLoaded: true,
  };
}

/**
 * Mock useAuth hook
 */
export function useAuth() {
  return {
    userId: MOCK_USER.id,
    orgId: MOCK_ORG.id,
    isLoaded: true,
    isSignedIn: true,
  };
}
