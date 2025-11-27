'use client';

import { useState, useEffect, useCallback } from 'react';
import { useRouter, useParams } from 'next/navigation';
import GmailLayout from '@/components/layout/GmailLayout';
import Toast from '@/components/Toast';
import TagsInput from '@/components/templates/TagsInput';
import {
  ArrowLeft,
  Save,
  X,
  Loader2,
  CreditCard,
  Wallet,
  Archive,
  ArchiveRestore,
  Trash2,
  ExternalLink,
  Calendar,
  User,
  Maximize2,
} from 'lucide-react';
import {
  TEMPLATE_TYPES,
  type TemplateTypeId,
  type Template,
  getAllSuggestedTags,
} from '@/lib/templateTypes';

interface ToastMessage {
  message: string;
  type: 'success' | 'error';
  id: number;
}

export default function AdminTemplateDetailPage() {
  const router = useRouter();
  const params = useParams();
  const templateId = params.id as string;

  // Template data
  const [template, setTemplate] = useState<Template | null>(null);
  const [loading, setLoading] = useState(true);

  // Form state
  const [templateName, setTemplateName] = useState('');
  const [description, setDescription] = useState('');
  const [tags, setTags] = useState<string[]>([]);

  // UI state
  const [saving, setSaving] = useState(false);
  const [toasts, setToasts] = useState<ToastMessage[]>([]);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [showFullPreview, setShowFullPreview] = useState(false);
  const [availableTags, setAvailableTags] = useState<string[]>([]);
  const [hasChanges, setHasChanges] = useState(false);

  const showToast = (message: string, type: 'success' | 'error') => {
    const id = Date.now();
    setToasts((prev) => [...prev, { message, type, id }]);
  };

  const removeToast = (id: number) => {
    setToasts((prev) => prev.filter((toast) => toast.id !== id));
  };

  // Fetch template
  const fetchTemplate = useCallback(async () => {
    if (!templateId) return;

    setLoading(true);
    try {
      const response = await fetch(`/api/templates/manage/${templateId}`);
      const result = await response.json();

      if (result.success && result.data.template) {
        const found = result.data.template;
        setTemplate(found);
        setTemplateName(found.template_name);
        setDescription(found.description || '');
        setTags(found.tags || []);
      } else {
        showToast('Template not found', 'error');
        router.push('/templates/manage');
      }
    } catch (error) {
      showToast('Failed to fetch template', 'error');
    } finally {
      setLoading(false);
    }
  }, [templateId, router]);

  // Fetch available tags
  const fetchTags = useCallback(async () => {
    try {
      const response = await fetch('/api/templates/manage/tags');
      const result = await response.json();
      if (result.success) {
        const used = result.data.usedTags.map((t: { tag: string }) => t.tag);
        const suggested = result.data.suggestedTags;
        setAvailableTags([...new Set([...used, ...suggested])]);
      }
    } catch (error) {
      setAvailableTags(getAllSuggestedTags());
    }
  }, []);

  useEffect(() => {
    fetchTemplate();
    fetchTags();
  }, [fetchTemplate, fetchTags]);

  // Track changes
  useEffect(() => {
    if (template) {
      const nameChanged = templateName !== template.template_name;
      const descChanged = description !== (template.description || '');
      const tagsChanged =
        JSON.stringify(tags.sort()) !==
        JSON.stringify((template.tags || []).sort());
      setHasChanges(nameChanged || descChanged || tagsChanged);
    }
  }, [templateName, description, tags, template]);

  // Save changes
  const handleSave = async () => {
    if (!template) return;

    setSaving(true);
    try {
      const response = await fetch('/api/templates/manage', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          id: template.id,
          template_name: templateName,
          description: description || null,
          tags,
        }),
      });

      const result = await response.json();

      if (result.success) {
        showToast('Template saved successfully', 'success');
        setTemplate(result.data.template);
        setHasChanges(false);
      } else {
        showToast(result.error || 'Failed to save', 'error');
      }
    } catch (error) {
      showToast('Failed to save', 'error');
    } finally {
      setSaving(false);
    }
  };

  // Archive/Restore
  const handleArchive = async () => {
    if (!template) return;

    try {
      const response = await fetch('/api/templates/manage', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          id: template.id,
          is_archived: !template.is_archived,
        }),
      });

      const result = await response.json();

      if (result.success) {
        showToast(
          template.is_archived ? 'Template restored' : 'Template archived',
          'success'
        );
        setTemplate(result.data.template);
      } else {
        showToast(result.error || 'Operation failed', 'error');
      }
    } catch (error) {
      showToast('Operation failed', 'error');
    }
  };

  // Delete
  const handleDelete = async (force = false) => {
    if (!template) return;

    try {
      const params = new URLSearchParams({ id: template.id });
      if (force) params.set('force', 'true');

      const response = await fetch(`/api/templates/manage?${params}`, {
        method: 'DELETE',
      });

      const result = await response.json();

      if (result.success) {
        showToast('Template deleted', 'success');
        setTimeout(() => router.push('/templates/manage'), 1000);
      } else if (result.error?.includes('used in')) {
        setShowDeleteConfirm(true);
      } else {
        showToast(result.error || 'Delete failed', 'error');
      }
    } catch (error) {
      showToast('Delete failed', 'error');
    }
  };

  // Get type icon
  const getTypeIcon = (typeId: TemplateTypeId) => {
    const type = TEMPLATE_TYPES[typeId];
    if (type?.category === 'digital') {
      return <Wallet className="h-5 w-5" />;
    }
    return <CreditCard className="h-5 w-5" />;
  };

  // Get quality badge color
  const getQualityColor = (quality: string | null) => {
    switch (quality) {
      case 'excellent':
        return 'bg-green-100 text-green-800';
      case 'good':
        return 'bg-blue-100 text-blue-800';
      case 'fair':
        return 'bg-yellow-100 text-yellow-800';
      case 'poor':
        return 'bg-red-100 text-red-800';
      default:
        return 'bg-gray-100 text-gray-600';
    }
  };

  // Format date
  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  // Loading state
  if (loading) {
    return (
      <GmailLayout>
        <div className="flex items-center justify-center h-64">
          <Loader2 className="h-8 w-8 animate-spin text-purple-600" />
        </div>
      </GmailLayout>
    );
  }

  if (!template) {
    return (
      <GmailLayout>
        <div className="text-center py-16">
          <h1 className="text-2xl font-bold text-gray-900 mb-2">
            Template Not Found
          </h1>
          <button
            onClick={() => router.push('/templates/manage')}
            className="text-purple-600 hover:underline"
          >
            Back to Templates
          </button>
        </div>
      </GmailLayout>
    );
  }

  const templateType = TEMPLATE_TYPES[template.template_type_id];

  return (
    <GmailLayout>
      <div className="max-w-5xl mx-auto">
        {/* Back Link */}
        <button
          onClick={() => router.push('/templates/manage')}
          className="flex items-center gap-1 text-gray-600 hover:text-gray-900 mb-4"
        >
          <ArrowLeft className="h-4 w-4" />
          Back to Templates
        </button>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Left Column - Preview */}
          <div className="lg:col-span-2">
            <div className="bg-white rounded-lg shadow-sm border border-gray-200 overflow-hidden">
              {/* Image Preview */}
              <div className="relative bg-gray-100">
                <img
                  src={template.template_url}
                  alt={template.template_name}
                  className="w-full h-auto"
                />
                <button
                  onClick={() => setShowFullPreview(true)}
                  className="absolute top-4 right-4 p-2 bg-white/90 rounded-lg shadow hover:bg-white transition-colors"
                  title="View full size"
                >
                  <Maximize2 className="h-4 w-4" />
                </button>
                {template.is_archived && (
                  <div className="absolute top-4 left-4 px-3 py-1 bg-gray-900/80 text-white text-sm rounded-lg">
                    Archived
                  </div>
                )}
              </div>

              {/* Metadata */}
              <div className="p-4 border-t border-gray-200 bg-gray-50">
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 text-sm">
                  <div>
                    <p className="text-gray-500">Type</p>
                    <div className="flex items-center gap-1 mt-1">
                      {getTypeIcon(template.template_type_id)}
                      <span className="font-medium">
                        {templateType?.name || 'Unknown'}
                      </span>
                    </div>
                  </div>
                  <div>
                    <p className="text-gray-500">Dimensions</p>
                    <p className="font-medium mt-1">
                      {template.width}×{template.height}px
                    </p>
                  </div>
                  <div>
                    <p className="text-gray-500">Original Size</p>
                    <p className="font-medium mt-1">
                      {template.original_width && template.original_height
                        ? `${template.original_width}×${template.original_height}px`
                        : 'N/A'}
                    </p>
                  </div>
                  <div>
                    <p className="text-gray-500">Quality</p>
                    {template.upload_quality ? (
                      <span
                        className={`inline-block mt-1 px-2 py-0.5 rounded text-xs font-medium ${getQualityColor(
                          template.upload_quality
                        )}`}
                      >
                        {template.upload_quality}
                      </span>
                    ) : (
                      <p className="font-medium mt-1">N/A</p>
                    )}
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Right Column - Edit Form */}
          <div className="space-y-6">
            {/* Edit Form */}
            <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
              <h2 className="text-lg font-semibold text-gray-900 mb-4">
                Edit Template
              </h2>

              <div className="space-y-4">
                {/* Template Name */}
                <div>
                  <label
                    htmlFor="templateName"
                    className="block text-sm font-medium text-gray-700 mb-1"
                  >
                    Name
                  </label>
                  <input
                    id="templateName"
                    type="text"
                    value={templateName}
                    onChange={(e) => setTemplateName(e.target.value)}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:border-purple-600 focus:ring-2 focus:ring-purple-200"
                  />
                </div>

                {/* Description */}
                <div>
                  <label
                    htmlFor="description"
                    className="block text-sm font-medium text-gray-700 mb-1"
                  >
                    Description
                  </label>
                  <textarea
                    id="description"
                    value={description}
                    onChange={(e) => setDescription(e.target.value)}
                    placeholder="Internal notes..."
                    rows={3}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:border-purple-600 focus:ring-2 focus:ring-purple-200 resize-none"
                  />
                </div>

                {/* Tags */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Tags
                  </label>
                  <TagsInput
                    value={tags}
                    onChange={setTags}
                    suggestions={availableTags}
                    placeholder="Add tags..."
                  />
                </div>

                {/* Save Button */}
                <button
                  onClick={handleSave}
                  disabled={saving || !hasChanges}
                  className="w-full flex items-center justify-center gap-2 px-4 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                >
                  {saving ? (
                    <>
                      <Loader2 className="h-4 w-4 animate-spin" />
                      Saving...
                    </>
                  ) : (
                    <>
                      <Save className="h-4 w-4" />
                      Save Changes
                    </>
                  )}
                </button>
              </div>
            </div>

            {/* Info Panel */}
            <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
              <h2 className="text-lg font-semibold text-gray-900 mb-4">
                Information
              </h2>

              <div className="space-y-3 text-sm">
                <div className="flex items-start gap-3">
                  <Calendar className="h-4 w-4 text-gray-400 mt-0.5" />
                  <div>
                    <p className="text-gray-500">Created</p>
                    <p className="font-medium">
                      {formatDate(template.uploaded_date || template.created_at)}
                    </p>
                  </div>
                </div>

                {template.archived_at && (
                  <div className="flex items-start gap-3">
                    <Archive className="h-4 w-4 text-gray-400 mt-0.5" />
                    <div>
                      <p className="text-gray-500">Archived</p>
                      <p className="font-medium">
                        {formatDate(template.archived_at)}
                      </p>
                    </div>
                  </div>
                )}

                <div className="flex items-start gap-3">
                  <ExternalLink className="h-4 w-4 text-gray-400 mt-0.5" />
                  <div>
                    <p className="text-gray-500">File Size</p>
                    <p className="font-medium">
                      {template.file_size
                        ? `${(template.file_size / 1024).toFixed(1)} KB`
                        : 'Unknown'}
                    </p>
                  </div>
                </div>
              </div>
            </div>

            {/* Actions Panel */}
            <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
              <h2 className="text-lg font-semibold text-gray-900 mb-4">
                Actions
              </h2>

              <div className="space-y-3">
                <button
                  onClick={handleArchive}
                  className="w-full flex items-center justify-center gap-2 px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors"
                >
                  {template.is_archived ? (
                    <>
                      <ArchiveRestore className="h-4 w-4" />
                      Restore Template
                    </>
                  ) : (
                    <>
                      <Archive className="h-4 w-4" />
                      Archive Template
                    </>
                  )}
                </button>

                <button
                  onClick={() => handleDelete(false)}
                  className="w-full flex items-center justify-center gap-2 px-4 py-2 border border-red-300 text-red-600 rounded-lg hover:bg-red-50 transition-colors"
                >
                  <Trash2 className="h-4 w-4" />
                  Delete Template
                </button>
              </div>
            </div>
          </div>
        </div>

        {/* Full Preview Modal */}
        {showFullPreview && (
          <div
            className="fixed inset-0 bg-black/80 flex items-center justify-center z-50 p-4"
            onClick={() => setShowFullPreview(false)}
          >
            <div className="relative max-w-full max-h-full overflow-auto">
              <img
                src={template.template_url}
                alt={template.template_name}
                className="max-w-none"
                onClick={(e) => e.stopPropagation()}
              />
              <button
                onClick={() => setShowFullPreview(false)}
                className="absolute top-4 right-4 p-2 bg-white rounded-full shadow-lg hover:bg-gray-100"
              >
                <X className="h-5 w-5" />
              </button>
            </div>
          </div>
        )}

        {/* Delete Confirmation Modal */}
        {showDeleteConfirm && (
          <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
            <div className="bg-white rounded-lg shadow-xl p-6 max-w-md w-full mx-4">
              <h3 className="text-lg font-semibold text-gray-900 mb-2">
                Delete Template?
              </h3>
              <p className="text-gray-600 mb-4">
                This template is being used by existing mockups. Deleting it may
                affect those mockups. Are you sure you want to delete it?
              </p>
              <div className="flex justify-end gap-3">
                <button
                  onClick={() => setShowDeleteConfirm(false)}
                  className="px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50"
                >
                  Cancel
                </button>
                <button
                  onClick={() => {
                    setShowDeleteConfirm(false);
                    handleDelete(true);
                  }}
                  className="px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700"
                >
                  Delete Anyway
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Toast Notifications */}
        {toasts.map((toast) => (
          <Toast
            key={toast.id}
            message={toast.message}
            type={toast.type}
            onClose={() => removeToast(toast.id)}
          />
        ))}
      </div>
    </GmailLayout>
  );
}
