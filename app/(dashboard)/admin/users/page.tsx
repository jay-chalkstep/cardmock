'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';

/**
 * User Management Page
 * 
 * This page redirects to Settings > Organization tab
 * User management has been moved to the Settings modal
 */
export default function UserManagementPage() {
  const router = useRouter();

  useEffect(() => {
    // Note: We can't directly open the Settings modal from here
    // Instead, we'll show a message and let users know to use Settings
    // For now, we'll just redirect to a page that shows the message
    // In the future, we could add a query param to Settings to open a specific tab
  }, [router]);

  return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center">
      <div className="text-center max-w-md mx-auto p-8">
        <h1 className="text-2xl font-bold text-gray-900 mb-4">
          User Management Moved
        </h1>
        <p className="text-gray-600 mb-6">
          User and organization management has been moved to Settings. 
          Click the gear icon in the header to access Settings.
        </p>
        <button
          onClick={() => router.push('/projects')}
          className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
        >
          Go to Projects
        </button>
      </div>
    </div>
  );
}
