'use client';

import { useState, useEffect } from 'react';
import { useOrganization } from '@/lib/hooks/useAuth';
import { usePanelContext } from '@/lib/contexts/PanelContext';
import GmailLayout from '@/components/layout/GmailLayout';
import { Trash2, Loader2 } from 'lucide-react';

export default function TrashPage() {
  const { organization } = useOrganization();
  const { setActiveNav } = usePanelContext();
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    setActiveNav('trash');
  }, [setActiveNav]);

  useEffect(() => {
    // Simulate loading
    const timer = setTimeout(() => setLoading(false), 500);
    return () => clearTimeout(timer);
  }, []);

  return (
    <GmailLayout>
      <div className="h-full flex flex-col bg-[#f8f9fa]">
        {/* Header */}
        <div className="bg-white border-b border-gray-200 px-6 py-4">
          <h1 className="text-xl font-semibold text-gray-900">Trash</h1>
          <p className="text-sm text-gray-500 mt-1">
            Items in trash will be permanently deleted after 30 days
          </p>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-6">
          {loading ? (
            <div className="flex items-center justify-center h-64">
              <Loader2 className="h-8 w-8 animate-spin text-blue-600" />
            </div>
          ) : (
            <div className="flex flex-col items-center justify-center h-64 text-center">
              <div className="w-16 h-16 bg-gray-100 rounded-full flex items-center justify-center mb-4">
                <Trash2 size={32} className="text-gray-400" />
              </div>
              <h3 className="text-lg font-medium text-gray-900 mb-2">Trash is empty</h3>
              <p className="text-gray-500 max-w-md">
                Items you delete will appear here. You can restore them or permanently delete them.
              </p>
            </div>
          )}
        </div>
      </div>
    </GmailLayout>
  );
}
