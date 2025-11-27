'use client';

import { useState, useEffect, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { useAdminStatus } from '@/lib/hooks/useAuth';
import GmailLayout from '@/components/layout/GmailLayout';
import Toast from '@/components/Toast';
import {
  Plus,
  Search,
  Filter,
  Archive,
  ArchiveRestore,
  Trash2,
  Edit,
  MoreVertical,
  X,
  Loader2,
  CreditCard,
  Wallet,
  Tag,
  ChevronLeft,
  ChevronRight,
} from 'lucide-react';
import { TEMPLATE_TYPES, type TemplateTypeId, type Template } from '@/lib/templateTypes';

interface ToastMessage {
  message: string;
  type: 'success' | 'error';
  id: number;
}

interface Pagination {
  page: number;
  limit: number;
  total: number;
  totalPages: number;
}

export default function AdminTemplatesListPage() {
  const router = useRouter();
  // Use dedicated admin status hook for consistent checking
  const { isAdmin, isLoaded, organization } = useAdminStatus();

  // Data state
  const [templates, setTemplates] = useState<Template[]>([]);
  const [loading, setLoading] = useState(true);
  const [pagination, setPagination] = useState<Pagination>({
    page: 1,
    limit: 24,
    total: 0,
    totalPages: 0,
  });

  // Filter state
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedType, setSelectedType] = useState<TemplateTypeId | ''>('');
  const [selectedTags, setSelectedTags] = useState<string[]>([]);
  const [showArchived, setShowArchived] = useState(false);
  const [availableTags, setAvailableTags] = useState<{ tag: string; count: number }[]>([]);

  // UI state
  const [toasts, setToasts] = useState<ToastMessage[]>([]);
  const [selectedTemplates, setSelectedTemplates] = useState<Set<string>>(new Set());
  const [showFilters, setShowFilters] = useState(false);
  const [actionMenuId, setActionMenuId] = useState<string | null>(null);
  const [deleteConfirmId, setDeleteConfirmId] = useState<string | null>(null);

  const showToast = (message: string, type: 'success' | 'error') => {
    const id = Date.now();
    setToasts(prev => [...prev, { message, type, id }]);
  };

  const removeToast = (id: number) => {
    setToasts(prev => prev.filter(toast => toast.id !== id));
  };

  // Fetch templates
  const fetchTemplates = useCallback(async () => {
    if (!isAdmin) return;

    setLoading(true);
    try {
      const params = new URLSearchParams();
      params.set('page', pagination.page.toString());
      params.set('limit', pagination.limit.toString());

      if (selectedType) params.set('type', selectedType);
      if (showArchived) params.set('archived', 'true');
      if (selectedTags.length > 0) params.set('tags', selectedTags.join(','));
      if (searchQuery) params.set('search', searchQuery);

      const response = await fetch(`/api/admin/templates?${params}`);
      const result = await response.json();

      if (result.success) {
        setTemplates(result.data.templates);
        setPagination(prev => ({
          ...prev,
          ...result.data.pagination,
        }));
      } else {
        showToast(result.error || 'Failed to fetch templates', 'error');
      }
    } catch (error) {
      showToast('Failed to fetch templates', 'error');
    } finally {
      setLoading(false);
    }
  }, [isAdmin, pagination.page, pagination.limit, selectedType, showArchived, selectedTags, searchQuery]);

  // Fetch available tags
  const fetchTags = useCallback(async () => {
    if (!isAdmin) return;

    try {
      const response = await fetch('/api/admin/templates/tags');
      const result = await response.json();

      if (result.success) {
        setAvailableTags(result.data.usedTags);
      }
    } catch (error) {
      console.error('Failed to fetch tags:', error);
    }
  }, [isAdmin]);

  useEffect(() => {
    if (isLoaded && isAdmin) {
      fetchTemplates();
      fetchTags();
    }
  }, [isLoaded, isAdmin, fetchTemplates, fetchTags]);

  // Handle archive/restore
  const handleArchive = async (templateId: string, archive: boolean) => {
    try {
      const response = await fetch('/api/admin/templates', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id: templateId, is_archived: archive }),
      });

      const result = await response.json();

      if (result.success) {
        showToast(archive ? 'Template archived' : 'Template restored', 'success');
        fetchTemplates();
      } else {
        showToast(result.error || 'Operation failed', 'error');
      }
    } catch (error) {
      showToast('Operation failed', 'error');
    }
    setActionMenuId(null);
  };

  // Handle delete
  const handleDelete = async (templateId: string, force = false) => {
    try {
      const params = new URLSearchParams({ id: templateId });
      if (force) params.set('force', 'true');

      const response = await fetch(`/api/admin/templates?${params}`, {
        method: 'DELETE',
      });

      const result = await response.json();

      if (result.success) {
        showToast('Template deleted', 'success');
        fetchTemplates();
        setDeleteConfirmId(null);
      } else if (result.error?.includes('used in')) {
        // Template is in use - show confirmation
        setDeleteConfirmId(templateId);
      } else {
        showToast(result.error || 'Delete failed', 'error');
      }
    } catch (error) {
      showToast('Delete failed', 'error');
    }
    setActionMenuId(null);
  };

  // Bulk archive
  const handleBulkArchive = async (archive: boolean) => {
    for (const id of selectedTemplates) {
      await handleArchive(id, archive);
    }
    setSelectedTemplates(new Set());
  };

  // Get template type icon
  const getTypeIcon = (typeId: TemplateTypeId) => {
    const type = TEMPLATE_TYPES[typeId];
    if (type?.category === 'digital') {
      return <Wallet className="h-4 w-4" />;
    }
    return <CreditCard className="h-4 w-4" />;
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

  // Loading state
  if (!isLoaded) {
    return (
      <GmailLayout>
        <div className="flex items-center justify-center h-64">
          <Loader2 className="h-8 w-8 animate-spin text-purple-600" />
        </div>
      </GmailLayout>
    );
  }

  // Access denied
  if (!isAdmin) {
    return (
      <GmailLayout>
        <div className="max-w-2xl mx-auto text-center py-16">
          <div className="w-16 h-16 mx-auto mb-4 bg-red-100 rounded-full flex items-center justify-center">
            <X className="h-8 w-8 text-red-600" />
          </div>
          <h1 className="text-2xl font-bold text-gray-900 mb-2">Access Denied</h1>
          <p className="text-gray-600 mb-6">
            You need administrator privileges to manage templates.
          </p>
          <button
            onClick={() => router.push('/templates')}
            className="px-4 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 transition-colors"
          >
            Back to Templates
          </button>
        </div>
      </GmailLayout>
    );
  }

  return (
    <GmailLayout>
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="flex items-center justify-between mb-6">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">Template Management</h1>
            <p className="text-gray-500 mt-1">
              Manage templates for cards and digital wallets
            </p>
          </div>
          <button
            onClick={() => router.push('/admin/templates/new')}
            className="flex items-center gap-2 px-4 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 transition-colors"
          >
            <Plus className="h-5 w-5" />
            New Template
          </button>
        </div>

        {/* Filters Bar */}
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-4 mb-6">
          <div className="flex flex-wrap items-center gap-4">
            {/* Search */}
            <div className="relative flex-1 min-w-64">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
              <input
                type="text"
                placeholder="Search templates..."
                value={searchQuery}
                onChange={(e) => {
                  setSearchQuery(e.target.value);
                  setPagination(prev => ({ ...prev, page: 1 }));
                }}
                className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:border-purple-600 focus:ring-2 focus:ring-purple-200"
              />
            </div>

            {/* Type Filter */}
            <select
              value={selectedType}
              onChange={(e) => {
                setSelectedType(e.target.value as TemplateTypeId | '');
                setPagination(prev => ({ ...prev, page: 1 }));
              }}
              className="px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:border-purple-600 bg-white"
            >
              <option value="">All Types</option>
              {Object.entries(TEMPLATE_TYPES).map(([id, type]) => (
                <option key={id} value={id}>
                  {type.name}
                </option>
              ))}
            </select>

            {/* Tags Filter Toggle */}
            <button
              onClick={() => setShowFilters(!showFilters)}
              className={`flex items-center gap-2 px-3 py-2 border rounded-lg transition-colors ${
                selectedTags.length > 0
                  ? 'border-purple-600 bg-purple-50 text-purple-700'
                  : 'border-gray-300 hover:bg-gray-50'
              }`}
            >
              <Tag className="h-4 w-4" />
              Tags
              {selectedTags.length > 0 && (
                <span className="bg-purple-600 text-white text-xs px-1.5 py-0.5 rounded-full">
                  {selectedTags.length}
                </span>
              )}
            </button>

            {/* Show Archived */}
            <label className="flex items-center gap-2 cursor-pointer">
              <input
                type="checkbox"
                checked={showArchived}
                onChange={(e) => {
                  setShowArchived(e.target.checked);
                  setPagination(prev => ({ ...prev, page: 1 }));
                }}
                className="w-4 h-4 rounded border-gray-300 text-purple-600 focus:ring-purple-500"
              />
              <span className="text-sm text-gray-600">Show Archived</span>
            </label>
          </div>

          {/* Tags Filter Panel */}
          {showFilters && availableTags.length > 0 && (
            <div className="mt-4 pt-4 border-t border-gray-200">
              <div className="flex flex-wrap gap-2">
                {availableTags.map(({ tag, count }) => (
                  <button
                    key={tag}
                    onClick={() => {
                      setSelectedTags(prev =>
                        prev.includes(tag)
                          ? prev.filter(t => t !== tag)
                          : [...prev, tag]
                      );
                      setPagination(prev => ({ ...prev, page: 1 }));
                    }}
                    className={`flex items-center gap-1 px-2 py-1 text-sm rounded-full transition-colors ${
                      selectedTags.includes(tag)
                        ? 'bg-purple-600 text-white'
                        : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                    }`}
                  >
                    #{tag}
                    <span className="text-xs opacity-75">({count})</span>
                  </button>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* Bulk Actions */}
        {selectedTemplates.size > 0 && (
          <div className="bg-purple-50 border border-purple-200 rounded-lg p-3 mb-4 flex items-center justify-between">
            <span className="text-purple-700">
              {selectedTemplates.size} template{selectedTemplates.size > 1 ? 's' : ''} selected
            </span>
            <div className="flex gap-2">
              <button
                onClick={() => handleBulkArchive(true)}
                className="flex items-center gap-1 px-3 py-1 text-sm bg-white border border-purple-300 text-purple-700 rounded hover:bg-purple-100"
              >
                <Archive className="h-4 w-4" />
                Archive
              </button>
              <button
                onClick={() => setSelectedTemplates(new Set())}
                className="px-3 py-1 text-sm text-purple-700 hover:underline"
              >
                Clear Selection
              </button>
            </div>
          </div>
        )}

        {/* Templates Grid */}
        {loading ? (
          <div className="flex items-center justify-center h-64">
            <Loader2 className="h-8 w-8 animate-spin text-purple-600" />
          </div>
        ) : templates.length === 0 ? (
          <div className="text-center py-16 bg-white rounded-lg border border-gray-200">
            <div className="w-16 h-16 mx-auto mb-4 bg-gray-100 rounded-full flex items-center justify-center">
              <CreditCard className="h-8 w-8 text-gray-400" />
            </div>
            <h2 className="text-xl font-semibold text-gray-900 mb-2">No templates found</h2>
            <p className="text-gray-500 mb-6">
              {searchQuery || selectedType || selectedTags.length > 0
                ? 'Try adjusting your filters'
                : 'Get started by uploading your first template'}
            </p>
            <button
              onClick={() => router.push('/admin/templates/new')}
              className="inline-flex items-center gap-2 px-4 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700"
            >
              <Plus className="h-5 w-5" />
              Upload Template
            </button>
          </div>
        ) : (
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-6 gap-4">
            {templates.map((template) => (
              <div
                key={template.id}
                className={`bg-white rounded-lg border overflow-hidden group relative ${
                  template.is_archived ? 'opacity-60' : ''
                } ${
                  selectedTemplates.has(template.id)
                    ? 'border-purple-600 ring-2 ring-purple-200'
                    : 'border-gray-200 hover:border-gray-300'
                }`}
              >
                {/* Selection Checkbox */}
                <div className="absolute top-2 left-2 z-10">
                  <input
                    type="checkbox"
                    checked={selectedTemplates.has(template.id)}
                    onChange={(e) => {
                      setSelectedTemplates(prev => {
                        const next = new Set(prev);
                        if (e.target.checked) {
                          next.add(template.id);
                        } else {
                          next.delete(template.id);
                        }
                        return next;
                      });
                    }}
                    className="w-4 h-4 rounded border-gray-300 text-purple-600 focus:ring-purple-500 bg-white shadow-sm"
                  />
                </div>

                {/* Action Menu */}
                <div className="absolute top-2 right-2 z-10">
                  <button
                    onClick={() => setActionMenuId(actionMenuId === template.id ? null : template.id)}
                    className="p-1 bg-white rounded shadow-sm opacity-0 group-hover:opacity-100 hover:bg-gray-100 transition-opacity"
                  >
                    <MoreVertical className="h-4 w-4 text-gray-500" />
                  </button>

                  {actionMenuId === template.id && (
                    <div className="absolute right-0 mt-1 w-40 bg-white rounded-lg shadow-lg border border-gray-200 py-1 z-20">
                      <button
                        onClick={() => router.push(`/admin/templates/${template.id}`)}
                        className="w-full flex items-center gap-2 px-3 py-2 text-sm text-gray-700 hover:bg-gray-50"
                      >
                        <Edit className="h-4 w-4" />
                        Edit Details
                      </button>
                      <button
                        onClick={() => handleArchive(template.id, !template.is_archived)}
                        className="w-full flex items-center gap-2 px-3 py-2 text-sm text-gray-700 hover:bg-gray-50"
                      >
                        {template.is_archived ? (
                          <>
                            <ArchiveRestore className="h-4 w-4" />
                            Restore
                          </>
                        ) : (
                          <>
                            <Archive className="h-4 w-4" />
                            Archive
                          </>
                        )}
                      </button>
                      <button
                        onClick={() => handleDelete(template.id)}
                        className="w-full flex items-center gap-2 px-3 py-2 text-sm text-red-600 hover:bg-red-50"
                      >
                        <Trash2 className="h-4 w-4" />
                        Delete
                      </button>
                    </div>
                  )}
                </div>

                {/* Thumbnail */}
                <div
                  className="aspect-[1.6/1] bg-gray-100 cursor-pointer"
                  onClick={() => router.push(`/admin/templates/${template.id}`)}
                >
                  <img
                    src={template.template_url}
                    alt={template.template_name}
                    className="w-full h-full object-cover"
                  />
                </div>

                {/* Info */}
                <div className="p-3">
                  <div className="flex items-start gap-2">
                    <span className="text-gray-400">
                      {getTypeIcon(template.template_type_id)}
                    </span>
                    <div className="flex-1 min-w-0">
                      <h3 className="font-medium text-sm text-gray-900 truncate">
                        {template.template_name}
                      </h3>
                      <p className="text-xs text-gray-500">
                        {TEMPLATE_TYPES[template.template_type_id]?.name || 'Unknown'}
                      </p>
                    </div>
                  </div>

                  {/* Tags */}
                  {template.tags && template.tags.length > 0 && (
                    <div className="mt-2 flex flex-wrap gap-1">
                      {template.tags.slice(0, 3).map((tag) => (
                        <span
                          key={tag}
                          className="text-xs bg-gray-100 text-gray-600 px-1.5 py-0.5 rounded"
                        >
                          #{tag}
                        </span>
                      ))}
                      {template.tags.length > 3 && (
                        <span className="text-xs text-gray-400">
                          +{template.tags.length - 3}
                        </span>
                      )}
                    </div>
                  )}

                  {/* Quality Badge */}
                  {template.upload_quality && (
                    <div className="mt-2">
                      <span
                        className={`text-xs px-1.5 py-0.5 rounded ${getQualityColor(
                          template.upload_quality
                        )}`}
                      >
                        {template.upload_quality}
                      </span>
                    </div>
                  )}

                  {/* Archived Badge */}
                  {template.is_archived && (
                    <div className="mt-2">
                      <span className="text-xs bg-gray-200 text-gray-600 px-1.5 py-0.5 rounded">
                        Archived
                      </span>
                    </div>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}

        {/* Pagination */}
        {pagination.totalPages > 1 && (
          <div className="mt-6 flex items-center justify-between">
            <p className="text-sm text-gray-500">
              Showing {((pagination.page - 1) * pagination.limit) + 1} to{' '}
              {Math.min(pagination.page * pagination.limit, pagination.total)} of{' '}
              {pagination.total} templates
            </p>
            <div className="flex items-center gap-2">
              <button
                onClick={() => setPagination(prev => ({ ...prev, page: prev.page - 1 }))}
                disabled={pagination.page === 1}
                className="p-2 border border-gray-300 rounded-lg hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                <ChevronLeft className="h-4 w-4" />
              </button>
              <span className="text-sm text-gray-600">
                Page {pagination.page} of {pagination.totalPages}
              </span>
              <button
                onClick={() => setPagination(prev => ({ ...prev, page: prev.page + 1 }))}
                disabled={pagination.page === pagination.totalPages}
                className="p-2 border border-gray-300 rounded-lg hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                <ChevronRight className="h-4 w-4" />
              </button>
            </div>
          </div>
        )}

        {/* Delete Confirmation Modal */}
        {deleteConfirmId && (
          <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
            <div className="bg-white rounded-lg shadow-xl p-6 max-w-md w-full mx-4">
              <h3 className="text-lg font-semibold text-gray-900 mb-2">
                Delete Template?
              </h3>
              <p className="text-gray-600 mb-4">
                This template is being used by existing mockups. Deleting it may affect those mockups. Are you sure you want to delete it?
              </p>
              <div className="flex justify-end gap-3">
                <button
                  onClick={() => setDeleteConfirmId(null)}
                  className="px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50"
                >
                  Cancel
                </button>
                <button
                  onClick={() => handleDelete(deleteConfirmId, true)}
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

        {/* Click outside to close action menu */}
        {actionMenuId && (
          <div
            className="fixed inset-0 z-0"
            onClick={() => setActionMenuId(null)}
          />
        )}
      </div>
    </GmailLayout>
  );
}
