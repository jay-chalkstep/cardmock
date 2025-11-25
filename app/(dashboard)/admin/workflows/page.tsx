'use client';

import { useState, useEffect } from 'react';
import { useOrganization } from '@/lib/hooks/useAuth';
import { Plus, Search, Workflow as WorkflowIcon, Loader2, Archive, Edit, Trash2, Star, MoreVertical, Briefcase } from 'lucide-react';
import type { Workflow } from '@/lib/supabase';
import Toast from '@/components/Toast';
import GmailLayout from '@/components/layout/GmailLayout';
import WorkflowModal from '@/components/workflows/WorkflowModal';

interface ToastMessage {
  message: string;
  type: 'success' | 'error';
  id: number;
}

const COLOR_HEX_MAP: Record<string, string> = {
  yellow: '#EAB308',
  green: '#10B981',
  blue: '#3B82F6',
  purple: '#A855F7',
  orange: '#F59E0B',
  red: '#EF4444',
  gray: '#6B7280',
};

export default function WorkflowsPage() {
  const { organization } = useOrganization();

  const [workflows, setWorkflows] = useState<Workflow[]>([]);
  const [filteredWorkflows, setFilteredWorkflows] = useState<Workflow[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [showArchived, setShowArchived] = useState(false);

  const [showWorkflowModal, setShowWorkflowModal] = useState(false);
  const [editingWorkflow, setEditingWorkflow] = useState<Workflow | null>(null);
  const [toasts, setToasts] = useState<ToastMessage[]>([]);
  const [openMenuId, setOpenMenuId] = useState<string | null>(null);

  const showToast = (message: string, type: 'success' | 'error') => {
    const id = Date.now();
    setToasts((prev) => [...prev, { message, type, id }]);
  };

  const removeToast = (id: number) => {
    setToasts((prev) => prev.filter((toast) => toast.id !== id));
  };

  useEffect(() => {
    if (organization?.id) {
      fetchWorkflows();
    }
  }, [organization?.id, showArchived]);

  useEffect(() => {
    let filtered = workflows;

    if (searchTerm) {
      filtered = filtered.filter(
        (workflow) =>
          workflow.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
          workflow.description?.toLowerCase().includes(searchTerm.toLowerCase())
      );
    }

    setFilteredWorkflows(filtered);
  }, [searchTerm, workflows]);

  const fetchWorkflows = async () => {
    setLoading(true);
    try {
      const url = `/api/workflows?is_archived=${showArchived}`;
      const response = await fetch(url);
      
      const result = await response.json();

      if (!response.ok || !result.success) {
        const errorMessage = result.error || 'Failed to fetch workflows';
        throw new Error(errorMessage);
      }

      // Extract data from the response structure { success: true, data: { workflows: [...] } }
      const fetchedWorkflows = result.data?.workflows || [];
      setWorkflows(fetchedWorkflows);
    } catch (error) {
      console.error('Error fetching workflows:', error);
      showToast('Failed to load workflows', 'error');
    } finally {
      setLoading(false);
    }
  };

  const handleCreateWorkflow = async (workflowData: any) => {
    try {
      const response = await fetch('/api/workflows', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(workflowData),
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || 'Failed to create workflow');
      }

      await fetchWorkflows();
      showToast('Workflow created successfully', 'success');
    } catch (error) {
      console.error('Error creating workflow:', error);
      throw error;
    }
  };

  const handleUpdateWorkflow = async (workflowData: any) => {
    if (!editingWorkflow) return;

    try {
      const response = await fetch(`/api/workflows/${editingWorkflow.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(workflowData),
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || 'Failed to update workflow');
      }

      await fetchWorkflows();
      setEditingWorkflow(null);
      showToast('Workflow updated successfully', 'success');
    } catch (error) {
      console.error('Error updating workflow:', error);
      throw error;
    }
  };

  const handleArchiveWorkflow = async (workflow: Workflow) => {
    try {
      const response = await fetch(`/api/workflows/${workflow.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ is_archived: !workflow.is_archived }),
      });

      if (!response.ok) throw new Error('Failed to archive workflow');

      await fetchWorkflows();
      showToast(
        `Workflow ${workflow.is_archived ? 'unarchived' : 'archived'} successfully`,
        'success'
      );
    } catch (error) {
      console.error('Error archiving workflow:', error);
      showToast('Failed to archive workflow', 'error');
    }
  };

  const handleDeleteWorkflow = async (workflow: Workflow) => {
    if (!confirm(`Are you sure you want to delete "${workflow.name}"? This action cannot be undone.`)) {
      return;
    }

    try {
      const response = await fetch(`/api/workflows/${workflow.id}`, {
        method: 'DELETE',
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || 'Failed to delete workflow');
      }

      await fetchWorkflows();
      showToast('Workflow deleted successfully', 'success');
    } catch (error) {
      console.error('Error deleting workflow:', error);
      showToast(
        error instanceof Error ? error.message : 'Failed to delete workflow',
        'error'
      );
    }
  };

  return (
    <GmailLayout>
      <div className="min-h-screen bg-gray-50">
        {loading ? (
          <div className="flex items-center justify-center min-h-screen">
            <Loader2 className="h-8 w-8 animate-spin text-purple-600" />
          </div>
        ) : (
          <>
      {/* Header */}
      <div className="bg-white border-b border-gray-200 sticky top-0 z-10">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h1 className="text-3xl font-bold text-gray-900 flex items-center gap-3">
                <WorkflowIcon className="h-8 w-8 text-purple-600" />
                Workflow Templates
              </h1>
              <p className="text-gray-600 mt-1">
                Create and manage multi-stage approval workflows
              </p>
            </div>
            <button
              onClick={() => {
                setEditingWorkflow(null);
                setShowWorkflowModal(true);
              }}
              className="flex items-center gap-2 px-4 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 transition-colors"
            >
              <Plus className="h-5 w-5" />
              New Workflow
            </button>
          </div>

          {/* Search and filters */}
          <div className="flex flex-col sm:flex-row gap-3">
            <div className="flex-1 relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-gray-400" />
              <input
                type="text"
                placeholder="Search workflows..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-500"
              />
            </div>

            <button
              onClick={() => setShowArchived(!showArchived)}
              className={`flex items-center gap-2 px-4 py-2 rounded-lg border transition-colors ${
                showArchived
                  ? 'bg-gray-900 text-white border-gray-900'
                  : 'bg-white text-gray-700 border-gray-300 hover:bg-gray-50'
              }`}
            >
              <Archive className="h-5 w-5" />
              {showArchived ? 'Show Active' : 'Show Archived'}
            </button>
          </div>
        </div>
      </div>

      {/* Workflows grid */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {filteredWorkflows.length === 0 ? (
          <div className="text-center py-16">
            <WorkflowIcon className="h-16 w-16 text-gray-300 mx-auto mb-4" />
            <h3 className="text-lg font-medium text-gray-900 mb-2">
              {searchTerm ? 'No workflows found' : 'No workflows yet'}
            </h3>
            <p className="text-gray-600 mb-6">
              {searchTerm
                ? 'Try adjusting your search'
                : 'Create your first workflow template to get started'}
            </p>
            {!searchTerm && (
              <button
                onClick={() => setShowWorkflowModal(true)}
                className="inline-flex items-center gap-2 px-4 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 transition-colors"
              >
                <Plus className="h-5 w-5" />
                Create Workflow
              </button>
            )}
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {filteredWorkflows.map((workflow) => (
              <div
                key={workflow.id}
                className="bg-white border border-gray-200 rounded-lg p-6 hover:shadow-md transition-shadow relative"
              >
                {/* Default badge */}
                {workflow.is_default && (
                  <div className="absolute top-4 right-4">
                    <Star className="h-5 w-5 text-yellow-500 fill-yellow-500" />
                  </div>
                )}

                <div className="mb-4">
                  <h3 className="text-lg font-semibold text-gray-900 pr-8">
                    {workflow.name}
                  </h3>
                  {workflow.description && (
                    <p className="text-sm text-gray-600 mt-1">{workflow.description}</p>
                  )}
                </div>

                {/* Stage pills */}
                <div className="flex flex-wrap gap-1.5 mb-4">
                  {workflow.stages.map((stage, index) => (
                    <span
                      key={index}
                      className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium border"
                      style={{
                        backgroundColor: COLOR_HEX_MAP[stage.color] + '15',
                        borderColor: COLOR_HEX_MAP[stage.color],
                        color: COLOR_HEX_MAP[stage.color],
                      }}
                    >
                      {stage.order}. {stage.name}
                    </span>
                  ))}
                </div>

                {/* Stats */}
                <div className="flex items-center gap-4 text-sm text-gray-600 mb-4">
                  <span className="flex items-center gap-1">
                    <WorkflowIcon className="h-4 w-4" />
                    {workflow.stage_count || workflow.stages.length} stages
                  </span>
                  <span className="flex items-center gap-1">
                    <Briefcase className="h-4 w-4" />
                    {workflow.project_count || 0} projects
                  </span>
                </div>

                {/* Actions */}
                <div className="flex gap-2">
                  <button
                    onClick={() => {
                      setEditingWorkflow(workflow);
                      setShowWorkflowModal(true);
                    }}
                    className="flex-1 flex items-center justify-center gap-2 px-3 py-2 border border-gray-300 rounded-lg text-sm text-gray-700 hover:bg-gray-50 transition-colors"
                  >
                    <Edit className="h-4 w-4" />
                    Edit
                  </button>
                  <button
                    onClick={() => handleArchiveWorkflow(workflow)}
                    className="flex-1 flex items-center justify-center gap-2 px-3 py-2 border border-gray-300 rounded-lg text-sm text-gray-700 hover:bg-gray-50 transition-colors"
                  >
                    <Archive className="h-4 w-4" />
                    {workflow.is_archived ? 'Unarchive' : 'Archive'}
                  </button>
                  {(workflow.project_count === 0) && (
                    <button
                      onClick={() => handleDeleteWorkflow(workflow)}
                      className="px-3 py-2 border border-red-300 rounded-lg text-sm text-red-700 hover:bg-red-50 transition-colors"
                    >
                      <Trash2 className="h-4 w-4" />
                    </button>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Workflow Modal */}
      <WorkflowModal
        isOpen={showWorkflowModal}
        onClose={() => {
          setShowWorkflowModal(false);
          setEditingWorkflow(null);
        }}
        onSubmit={editingWorkflow ? handleUpdateWorkflow : handleCreateWorkflow}
        workflow={editingWorkflow}
        mode={editingWorkflow ? 'edit' : 'create'}
      />

      {/* Toast notifications */}
      <div className="fixed bottom-4 right-4 z-50 space-y-2">
        {toasts.map((toast) => (
          <Toast
            key={toast.id}
            message={toast.message}
            type={toast.type}
            onClose={() => removeToast(toast.id)}
          />
        ))}
      </div>
      </>
      )}
      </div>
    </GmailLayout>
  );
}
