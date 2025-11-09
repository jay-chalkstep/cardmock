'use client';

import { useState, useEffect } from 'react';
import { Eye, Edit, Trash2, CheckCircle, XCircle, Clock } from 'lucide-react';

interface EmailMockup {
  id: string;
  name: string;
  html_content: string;
  status: 'draft' | 'pending_approval' | 'approved' | 'rejected';
  branding_data?: any;
  created_at: string;
  updated_at: string;
}

interface EmailMockupListProps {
  contractId?: string;
  projectId?: string;
  onEdit?: (mockup: EmailMockup) => void;
  onDelete?: (mockupId: string) => void;
  onView?: (mockup: EmailMockup) => void;
}

export default function EmailMockupList({
  contractId,
  projectId,
  onEdit,
  onDelete,
  onView,
}: EmailMockupListProps) {
  const [mockups, setMockups] = useState<EmailMockup[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchMockups();
  }, [contractId, projectId]);

  const fetchMockups = async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams();
      if (contractId) params.append('contract_id', contractId);
      if (projectId) params.append('project_id', projectId);

      const response = await fetch(`/api/email-mockups?${params.toString()}`);
      if (!response.ok) throw new Error('Failed to fetch email mockups');
      const result = await response.json();
      setMockups(result.data?.mockups || result.mockups || []);
    } catch (error) {
      console.error('Error fetching email mockups:', error);
    } finally {
      setLoading(false);
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'approved':
        return <CheckCircle size={16} className="text-green-600" />;
      case 'rejected':
        return <XCircle size={16} className="text-red-600" />;
      case 'pending_approval':
        return <Clock size={16} className="text-yellow-600" />;
      default:
        return null;
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'approved':
        return 'bg-green-100 text-green-800';
      case 'rejected':
        return 'bg-red-100 text-red-800';
      case 'pending_approval':
        return 'bg-yellow-100 text-yellow-800';
      default:
        return 'bg-gray-100 text-gray-800';
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center p-8">
        <div className="text-gray-500">Loading email mockups...</div>
      </div>
    );
  }

  if (mockups.length === 0) {
    return (
      <div className="flex items-center justify-center p-8">
        <div className="text-center text-gray-500">
          <p>No email mockups found.</p>
          <p className="text-sm mt-2">Create your first email mockup to get started.</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-3">
      {mockups.map((mockup) => (
        <div
          key={mockup.id}
          className="p-4 border border-gray-200 rounded-md hover:bg-gray-50"
        >
          <div className="flex items-start justify-between">
            <div className="flex-1">
              <div className="flex items-center gap-2 mb-2">
                <h4 className="font-medium text-gray-900">{mockup.name}</h4>
                <span className={`px-2 py-1 text-xs rounded-full flex items-center gap-1 ${getStatusColor(mockup.status)}`}>
                  {getStatusIcon(mockup.status)}
                  {mockup.status.replace('_', ' ')}
                </span>
              </div>
              {mockup.branding_data?.brand_name && (
                <p className="text-sm text-gray-600 mb-1">
                  Branding: {mockup.branding_data.brand_name}
                </p>
              )}
              <p className="text-xs text-gray-500">
                Updated: {new Date(mockup.updated_at).toLocaleDateString()}
              </p>
            </div>
            <div className="flex items-center gap-2">
              {onView && (
                <button
                  onClick={() => onView(mockup)}
                  className="p-2 text-gray-600 hover:text-gray-900 hover:bg-gray-100 rounded"
                  title="Preview"
                >
                  <Eye size={18} />
                </button>
              )}
              {onEdit && (
                <button
                  onClick={() => onEdit(mockup)}
                  className="p-2 text-gray-600 hover:text-gray-900 hover:bg-gray-100 rounded"
                  title="Edit"
                >
                  <Edit size={18} />
                </button>
              )}
              {onDelete && (
                <button
                  onClick={() => onDelete(mockup.id)}
                  className="p-2 text-red-600 hover:text-red-900 hover:bg-red-50 rounded"
                  title="Delete"
                >
                  <Trash2 size={18} />
                </button>
              )}
            </div>
          </div>
        </div>
      ))}
    </div>
  );
}

