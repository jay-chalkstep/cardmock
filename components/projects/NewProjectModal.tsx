'use client';

import { useState, useEffect } from 'react';
import { X, Briefcase, Loader2, Workflow as WorkflowIcon, Users } from 'lucide-react';
import type { ProjectStatus, Workflow, Client } from '@/lib/supabase';

interface NewProjectModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSubmit: (projectData: {
    name: string;
    client_id: string;
    client_name?: string;
    description?: string;
    status?: ProjectStatus;
    color?: string;
    workflow_id?: string | null;
  }) => Promise<void>;
}

const STATUS_OPTIONS: { value: ProjectStatus; label: string }[] = [
  { value: 'active', label: 'Active' },
  { value: 'completed', label: 'Completed' },
  { value: 'archived', label: 'Archived' },
];

const COLOR_PRESETS = [
  { name: 'Blue', hex: '#3B82F6' },
  { name: 'Purple', hex: '#A855F7' },
  { name: 'Pink', hex: '#EC4899' },
  { name: 'Green', hex: '#10B981' },
  { name: 'Orange', hex: '#F59E0B' },
  { name: 'Red', hex: '#EF4444' },
  { name: 'Indigo', hex: '#6366F1' },
  { name: 'Teal', hex: '#14B8A6' },
];

export default function NewProjectModal({
  isOpen,
  onClose,
  onSubmit,
}: NewProjectModalProps) {
  const [name, setName] = useState('');
  const [clientId, setClientId] = useState<string>('');
  const [clientName, setClientName] = useState('');
  const [description, setDescription] = useState('');
  const [status, setStatus] = useState<ProjectStatus>('active');
  const [color, setColor] = useState('#3B82F6');
  const [workflowId, setWorkflowId] = useState<string>('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [workflows, setWorkflows] = useState<Workflow[]>([]);
  const [loadingWorkflows, setLoadingWorkflows] = useState(false);
  const [clients, setClients] = useState<Client[]>([]);
  const [loadingClients, setLoadingClients] = useState(false);

  // Fetch workflows and clients on mount
  useEffect(() => {
    if (isOpen) {
      fetchWorkflows();
      fetchClients();
    }
  }, [isOpen]);

  const fetchWorkflows = async () => {
    setLoadingWorkflows(true);
    try {
      const response = await fetch('/api/workflows?is_archived=false');
      const result = await response.json();

      if (response.ok && result.success) {
        // Extract data from the response structure { success: true, data: { workflows: [...] } }
        const fetchedWorkflows = result.data?.workflows || [];
        setWorkflows(fetchedWorkflows);

        // Pre-select default workflow if exists
        const defaultWorkflow = fetchedWorkflows.find((w: Workflow) => w.is_default);
        if (defaultWorkflow) {
          setWorkflowId(defaultWorkflow.id);
        }
      }
    } catch (error) {
      console.error('Error fetching workflows:', error);
    } finally {
      setLoadingWorkflows(false);
    }
  };

  const fetchClients = async () => {
    setLoadingClients(true);
    try {
      const response = await fetch('/api/clients');
      const result = await response.json();

      if (response.ok && result.success) {
        // Extract data from the response structure { success: true, data: { clients: [...] } }
        const fetchedClients = result.data?.clients || [];
        setClients(fetchedClients);
      }
    } catch (error) {
      console.error('Error fetching clients:', error);
    } finally {
      setLoadingClients(false);
    }
  };

  // Auto-populate client_name when client is selected
  useEffect(() => {
    if (clientId) {
      const selectedClient = clients.find((c) => c.id === clientId);
      if (selectedClient) {
        setClientName(selectedClient.name);
      }
    }
  }, [clientId, clients]);

  const selectedWorkflow = workflows.find((w) => w.id === workflowId);

  if (!isOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    if (!name.trim()) {
      setError('Project name is required');
      return;
    }

    if (name.trim().length > 100) {
      setError('Project name must be less than 100 characters');
      return;
    }

    if (!clientId) {
      setError('Client selection is required');
      return;
    }

    setIsSubmitting(true);
    try {
      await onSubmit({
        name: name.trim(),
        client_id: clientId,
        client_name: clientName.trim() || undefined,
        description: description.trim() || undefined,
        status,
        color,
        workflow_id: workflowId || null,
      });
      // Reset form
      setName('');
      setClientId('');
      setClientName('');
      setDescription('');
      setStatus('active');
      setColor('#3B82F6');
      setWorkflowId('');
      onClose();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to create project');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleClose = () => {
    if (!isSubmitting) {
      setName('');
      setClientId('');
      setClientName('');
      setDescription('');
      setStatus('active');
      setColor('#3B82F6');
      setWorkflowId('');
      setError(null);
      onClose();
    }
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-lg max-w-lg w-full shadow-xl max-h-[90vh] overflow-y-auto">
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-gray-200 sticky top-0 bg-white">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-blue-100 rounded-lg">
              <Briefcase className="h-5 w-5 text-blue-600" />
            </div>
            <h2 className="text-xl font-semibold text-gray-900">
              Create New Project
            </h2>
          </div>
          <button
            onClick={handleClose}
            disabled={isSubmitting}
            className="p-2 hover:bg-gray-100 rounded-lg transition-colors disabled:opacity-50"
          >
            <X className="h-5 w-5 text-gray-500" />
          </button>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          {/* Project Name */}
          <div>
            <label
              htmlFor="projectName"
              className="block text-sm font-medium text-gray-700 mb-2"
            >
              Project Name <span className="text-red-500">*</span>
            </label>
            <input
              id="projectName"
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Enter project name..."
              disabled={isSubmitting}
              autoFocus
              maxLength={100}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:opacity-50 disabled:bg-gray-50"
            />
          </div>

          {/* Client Selection */}
          <div>
            <label
              htmlFor="clientId"
              className="block text-sm font-medium text-gray-700 mb-2"
            >
              Client <span className="text-red-500">*</span>
            </label>
            {loadingClients ? (
              <div className="flex items-center justify-center py-4 text-sm text-gray-500">
                <Loader2 className="h-4 w-4 animate-spin mr-2" />
                Loading clients...
              </div>
            ) : (
              <select
                id="clientId"
                value={clientId}
                onChange={(e) => setClientId(e.target.value)}
                disabled={isSubmitting}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:opacity-50 disabled:bg-gray-50"
              >
                <option value="">Select a client...</option>
                {clients.map((client) => (
                  <option key={client.id} value={client.id}>
                    {client.name}
                  </option>
                ))}
              </select>
            )}
            {clients.length === 0 && !loadingClients && (
              <p className="mt-1 text-xs text-gray-500">
                No clients found. Please create a client first.
              </p>
            )}
          </div>

          {/* Client Name (optional display field) */}
          <div>
            <label
              htmlFor="clientName"
              className="block text-sm font-medium text-gray-700 mb-2"
            >
              Client Name (Display) <span className="text-gray-400 text-xs">(optional)</span>
            </label>
            <input
              id="clientName"
              type="text"
              value={clientName}
              onChange={(e) => setClientName(e.target.value)}
              placeholder="Auto-populated from selected client..."
              disabled={isSubmitting}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:opacity-50 disabled:bg-gray-50"
            />
            <p className="mt-1 text-xs text-gray-500">
              Optional display name. Defaults to selected client name.
            </p>
          </div>

          {/* Description */}
          <div>
            <label
              htmlFor="description"
              className="block text-sm font-medium text-gray-700 mb-2"
            >
              Description <span className="text-gray-400 text-xs">(optional)</span>
            </label>
            <textarea
              id="description"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Brief description of the project..."
              disabled={isSubmitting}
              rows={3}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:opacity-50 disabled:bg-gray-50 resize-none"
            />
          </div>

          {/* Status */}
          <div>
            <label
              htmlFor="status"
              className="block text-sm font-medium text-gray-700 mb-2"
            >
              Status
            </label>
            <select
              id="status"
              value={status}
              onChange={(e) => setStatus(e.target.value as ProjectStatus)}
              disabled={isSubmitting}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:opacity-50 disabled:bg-gray-50"
            >
              {STATUS_OPTIONS.map((option) => (
                <option key={option.value} value={option.value}>
                  {option.label}
                </option>
              ))}
            </select>
          </div>

          {/* Color Picker */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Project Color
            </label>
            <div className="grid grid-cols-4 gap-2">
              {COLOR_PRESETS.map((preset) => (
                <button
                  key={preset.hex}
                  type="button"
                  onClick={() => setColor(preset.hex)}
                  disabled={isSubmitting}
                  className={`
                    h-10 rounded-lg transition-all disabled:opacity-50
                    ${color === preset.hex ? 'ring-2 ring-offset-2 ring-gray-900' : 'hover:scale-105'}
                  `}
                  style={{ backgroundColor: preset.hex }}
                  title={preset.name}
                />
              ))}
            </div>
          </div>

          {/* Workflow Dropdown */}
          <div>
            <label
              htmlFor="workflow"
              className="block text-sm font-medium text-gray-700 mb-2"
            >
              Workflow Template <span className="text-gray-400 text-xs">(optional)</span>
            </label>
            {loadingWorkflows ? (
              <div className="flex items-center justify-center py-4 text-sm text-gray-500">
                <Loader2 className="h-4 w-4 animate-spin mr-2" />
                Loading workflows...
              </div>
            ) : (
              <>
                <select
                  id="workflow"
                  value={workflowId}
                  onChange={(e) => setWorkflowId(e.target.value)}
                  disabled={isSubmitting}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:opacity-50 disabled:bg-gray-50"
                >
                  <option value="">No Workflow</option>
                  {workflows.map((workflow) => (
                    <option key={workflow.id} value={workflow.id}>
                      {workflow.name} ({workflow.stages.length} stages)
                      {workflow.is_default ? ' - Default' : ''}
                    </option>
                  ))}
                </select>

                {/* Workflow Preview */}
                {selectedWorkflow && (
                  <div className="mt-3 p-3 bg-purple-50 border border-purple-200 rounded-lg">
                    <div className="flex items-center gap-2 text-xs font-medium text-purple-900 mb-2">
                      <WorkflowIcon className="h-4 w-4" />
                      {selectedWorkflow.stages.length} Stage Workflow
                    </div>
                    <div className="flex gap-1.5 overflow-x-auto">
                      {selectedWorkflow.stages.map((stage, index) => (
                        <span
                          key={index}
                          className="inline-flex items-center gap-1 px-2 py-1 bg-white rounded text-xs whitespace-nowrap"
                        >
                          <span className="font-semibold text-gray-700">{stage.order}.</span>
                          <span className="text-gray-900">{stage.name}</span>
                        </span>
                      ))}
                    </div>
                  </div>
                )}
              </>
            )}
          </div>

          {error && (
            <div className="p-3 bg-red-50 border border-red-200 rounded-lg">
              <p className="text-sm text-red-600">{error}</p>
            </div>
          )}

          {/* Actions */}
          <div className="flex gap-3 pt-2">
            <button
              type="button"
              onClick={handleClose}
              disabled={isSubmitting}
              className="flex-1 px-4 py-2 border border-gray-300 rounded-lg text-gray-700 hover:bg-gray-50 transition-colors disabled:opacity-50"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={isSubmitting || !name.trim() || !clientId}
              className="flex-1 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
            >
              {isSubmitting ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin" />
                  Creating...
                </>
              ) : (
                'Create Project'
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
