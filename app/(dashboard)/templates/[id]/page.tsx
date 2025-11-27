'use client';

import { useState, useEffect } from 'react';
import { useRouter, useParams } from 'next/navigation';
import Link from 'next/link';
import Image from 'next/image';
import GmailLayout from '@/components/layout/GmailLayout';
import Toast from '@/components/Toast';
import { useAdminStatus } from '@/lib/hooks/useAuth';
import { TEMPLATE_TYPES, type TemplateTypeId } from '@/lib/templateTypes';
import {
  ArrowLeft,
  Loader2,
  CreditCard,
  Wallet,
  Calendar,
  Maximize2,
  Tag,
  BarChart3,
  X,
} from 'lucide-react';

interface Template {
  id: string;
  template_name: string;
  template_url: string;
  template_type_id?: TemplateTypeId;
  tags?: string[];
  description?: string;
  width?: number;
  height?: number;
  original_width?: number;
  original_height?: number;
  upload_quality?: string;
  uploaded_date: string;
  created_at: string;
}

interface ToastMessage {
  message: string;
  type: 'success' | 'error';
  id: number;
}

export default function TemplateDetailPage() {
  const router = useRouter();
  const params = useParams();
  const templateId = params.id as string;
  const { isAdmin } = useAdminStatus();

  const [template, setTemplate] = useState<Template | null>(null);
  const [usageCount, setUsageCount] = useState(0);
  const [loading, setLoading] = useState(true);
  const [creating, setCreating] = useState(false);
  const [showFullPreview, setShowFullPreview] = useState(false);
  const [toasts, setToasts] = useState<ToastMessage[]>([]);

  const showToast = (message: string, type: 'success' | 'error') => {
    const id = Date.now();
    setToasts(prev => [...prev, { message, type, id }]);
  };

  const removeToast = (id: number) => {
    setToasts(prev => prev.filter(toast => toast.id !== id));
  };

  // Fetch template data
  useEffect(() => {
    if (templateId) {
      fetchTemplate();
    }
  }, [templateId]);

  const fetchTemplate = async () => {
    setLoading(true);
    try {
      const response = await fetch(`/api/templates/${templateId}`);
      const result = await response.json();

      if (!response.ok || !result.success) {
        throw new Error(result.error || 'Template not found');
      }

      setTemplate(result.data.template);
      setUsageCount(result.data.usageCount || 0);
    } catch (error) {
      console.error('Error fetching template:', error);
      showToast('Failed to load template', 'error');
    } finally {
      setLoading(false);
    }
  };

  const handleCreateCardMock = () => {
    if (!template) return;

    setCreating(true);
    // Navigate to designer with template pre-selected
    router.push(`/designer?templateId=${template.id}`);
  };

  const formatDate = (dateString: string): string => {
    return new Intl.DateTimeFormat('en-US', {
      month: 'long',
      day: 'numeric',
      year: 'numeric',
    }).format(new Date(dateString));
  };

  const getQualityColor = (quality?: string) => {
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

  const getTypeIcon = (typeId?: TemplateTypeId) => {
    if (!typeId) return <CreditCard className="h-5 w-5" />;
    const type = TEMPLATE_TYPES[typeId];
    if (type?.category === 'digital') {
      return <Wallet className="h-5 w-5" />;
    }
    return <CreditCard className="h-5 w-5" />;
  };

  const getTypeName = (typeId?: TemplateTypeId): string => {
    if (!typeId) return 'Card Template';
    return TEMPLATE_TYPES[typeId]?.name || 'Card Template';
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

  // Not found state
  if (!template) {
    return (
      <GmailLayout>
        <div className="max-w-2xl mx-auto text-center py-16">
          <div className="w-16 h-16 mx-auto mb-4 bg-gray-100 rounded-full flex items-center justify-center">
            <CreditCard className="h-8 w-8 text-gray-400" />
          </div>
          <h1 className="text-2xl font-bold text-gray-900 mb-2">Template Not Found</h1>
          <p className="text-gray-600 mb-6">
            The template you're looking for doesn't exist or has been removed.
          </p>
          <Link
            href="/templates"
            className="inline-flex items-center gap-2 px-4 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 transition-colors"
          >
            <ArrowLeft className="h-4 w-4" />
            Back to Templates
          </Link>
        </div>
      </GmailLayout>
    );
  }

  return (
    <GmailLayout>
      <div className="max-w-5xl mx-auto">
        {/* Back Link */}
        <Link
          href="/templates"
          className="inline-flex items-center gap-1 text-gray-600 hover:text-gray-900 mb-6 transition-colors"
        >
          <ArrowLeft className="h-4 w-4" />
          <span>Back to Templates</span>
        </Link>

        {/* Main Content Grid */}
        <div className="grid md:grid-cols-[1fr_320px] gap-8">
          {/* Preview Section */}
          <div className="bg-gray-100 rounded-xl p-6 flex items-center justify-center min-h-[300px]">
            <div className="relative max-w-full cursor-pointer group" onClick={() => setShowFullPreview(true)}>
              <Image
                src={template.template_url}
                alt={template.template_name}
                width={template.width || 800}
                height={template.height || 504}
                className="rounded-lg shadow-lg max-w-full h-auto"
                unoptimized
              />
              <div className="absolute inset-0 bg-black/0 group-hover:bg-black/10 rounded-lg transition-colors flex items-center justify-center">
                <div className="opacity-0 group-hover:opacity-100 transition-opacity bg-white/90 px-3 py-1.5 rounded-full text-sm font-medium text-gray-700 flex items-center gap-1.5">
                  <Maximize2 className="h-4 w-4" />
                  View Full Size
                </div>
              </div>
            </div>
          </div>

          {/* Info Panel */}
          <div className="space-y-6">
            {/* Title and Type */}
            <div>
              <h1 className="text-2xl font-bold text-gray-900">{template.template_name}</h1>
              <div className="flex items-center gap-2 mt-2 text-gray-600">
                {getTypeIcon(template.template_type_id)}
                <span>{getTypeName(template.template_type_id)}</span>
              </div>
            </div>

            {/* Tags */}
            {template.tags && template.tags.length > 0 && (
              <div className="flex flex-wrap gap-2">
                {template.tags.map(tag => (
                  <span
                    key={tag}
                    className="inline-flex items-center gap-1 px-2.5 py-1 bg-gray-100 text-gray-700 text-sm rounded-full"
                  >
                    <Tag className="h-3 w-3" />
                    {tag}
                  </span>
                ))}
              </div>
            )}

            {/* Usage Count */}
            <div className="flex items-center gap-2 text-gray-600">
              <BarChart3 className="h-4 w-4" />
              <span>Used in {usageCount} CardMock{usageCount !== 1 ? 's' : ''}</span>
            </div>

            {/* Primary CTA */}
            <button
              onClick={handleCreateCardMock}
              disabled={creating}
              className="w-full flex items-center justify-center gap-2 px-6 py-3 bg-purple-600 text-white font-medium rounded-lg hover:bg-purple-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
            >
              {creating ? (
                <>
                  <Loader2 className="h-5 w-5 animate-spin" />
                  Creating...
                </>
              ) : (
                <>
                  <CreditCard className="h-5 w-5" />
                  Create CardMock
                </>
              )}
            </button>

            {/* Admin Edit Button */}
            {isAdmin && (
              <Link
                href={`/templates/manage/${template.id}`}
                className="w-full flex items-center justify-center gap-2 px-6 py-3 border border-gray-300 text-gray-700 font-medium rounded-lg hover:bg-gray-50 transition-colors"
              >
                Edit Template
              </Link>
            )}
          </div>
        </div>

        {/* Description */}
        {template.description && (
          <div className="mt-8">
            <h2 className="text-sm font-medium text-gray-500 uppercase tracking-wider mb-2">
              Description
            </h2>
            <p className="text-gray-700">{template.description}</p>
          </div>
        )}

        {/* Technical Details */}
        <div className="mt-8 pt-6 border-t border-gray-200">
          <h2 className="text-sm font-medium text-gray-500 uppercase tracking-wider mb-4">
            Template Details
          </h2>
          <dl className="grid grid-cols-2 md:grid-cols-4 gap-6">
            {/* Dimensions */}
            <div>
              <dt className="text-sm text-gray-500">Dimensions</dt>
              <dd className="mt-1 text-gray-900 font-medium">
                {template.width || '—'} × {template.height || '—'}px
              </dd>
            </div>

            {/* Upload Date */}
            <div>
              <dt className="text-sm text-gray-500 flex items-center gap-1">
                <Calendar className="h-3.5 w-3.5" />
                Uploaded
              </dt>
              <dd className="mt-1 text-gray-900 font-medium">
                {formatDate(template.uploaded_date || template.created_at)}
              </dd>
            </div>

            {/* Quality */}
            {template.upload_quality && (
              <div>
                <dt className="text-sm text-gray-500">Quality</dt>
                <dd className="mt-1">
                  <span className={`inline-flex px-2 py-0.5 text-sm font-medium rounded capitalize ${getQualityColor(template.upload_quality)}`}>
                    {template.upload_quality}
                  </span>
                </dd>
              </div>
            )}

            {/* Original Size (for admins) */}
            {isAdmin && template.original_width && template.original_height && (
              <div>
                <dt className="text-sm text-gray-500">Original Size</dt>
                <dd className="mt-1 text-gray-900 font-medium">
                  {template.original_width} × {template.original_height}px
                </dd>
              </div>
            )}
          </dl>
        </div>
      </div>

      {/* Full Preview Modal */}
      {showFullPreview && (
        <div
          className="fixed inset-0 bg-black/80 z-50 flex items-center justify-center p-4"
          onClick={() => setShowFullPreview(false)}
        >
          <button
            onClick={() => setShowFullPreview(false)}
            className="absolute top-4 right-4 p-2 bg-white/10 hover:bg-white/20 rounded-full text-white transition-colors"
          >
            <X className="h-6 w-6" />
          </button>
          <Image
            src={template.template_url}
            alt={template.template_name}
            width={template.width || 1013}
            height={template.height || 638}
            className="max-w-full max-h-[90vh] object-contain rounded-lg"
            unoptimized
            onClick={(e) => e.stopPropagation()}
          />
        </div>
      )}

      {/* Toast Notifications */}
      {toasts.map(toast => (
        <Toast
          key={toast.id}
          message={toast.message}
          type={toast.type}
          onClose={() => removeToast(toast.id)}
        />
      ))}
    </GmailLayout>
  );
}
