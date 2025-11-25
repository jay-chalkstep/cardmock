'use client';

import { useState, useEffect } from 'react';
import { X, Briefcase, Loader2, Workflow as WorkflowIcon } from 'lucide-react';
import type { Project, ProjectStatus, Workflow } from '@/lib/supabase';

interface EditProjectModalProps {
  isOpen: boolean;
  onClose: () => void;
  project: Project;
  onSubmit: (projectData: {
    name: string;
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

export default function EditProjectModal({
  isOpen,
  onClose,
  project,
  onSubmit,
}: EditProjectModalProps) {
  const [name, setName] = useState(project.name || '');
  const [description, setDescription] = useState(project.description || '');
  const [status, setStatus] = useState<ProjectStatus>(project.status || 'active');
  const [color, setColor] = useState(project.color || '#3B82F6');
  const [workflowId, setWorkflowId] = useState<string>(project.workflow?.id || '');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [workflows, setWorkflows] = useState<Workflow[]>([]);
  const [loadingWorkflows, setLoadingWorkflows] = useState(false);

  // Fetch workflows on mount
  useEffect(() => {
    if (isOpen) {
      fetchWorkflows();
      // Reset form to project values when opened
      setName(project.name || '');
      setDescription(project.description || '');
      setStatus(project.status || 'active');
      setColor(project.color || '#3B82F6');
      setWorkflowId(project.workflow?.id || '');
    }
  }, [isOpen, project]);

  const fetchWorkflows = async () => {
    setLoadingWorkflows(true);
    try {
      const response = await fetch('/api/workflows?is_archived=false');
      const result = await response.json();

      if (response.ok && result.success) {
        const fetchedWorkflows = result.data?.workflows || [];
        setWorkflows(fetchedWorkflows);
      }
    } catch (error) {
      console.error('Error fetching workflows:', error);
    } finally {
      setLoadingWorkflows(false);
    }
  };

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

    setIsSubmitting(true);
    try {
      await onSubmit({
        name: name.trim(),
        description: description.trim() || undefined,
        status,
        color,
        workflow_id: workflowId || null,
      });
      onClose();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to update project');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleClose = () => {
    if (!isSubmitting) {
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
              Edit Project
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
              disabled={isSubmitting || !name.trim()}
              className="flex-1 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
            >
              {isSubmitting ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin" />
                  Saving...
                </>
              ) : (
                'Save Changes'
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
