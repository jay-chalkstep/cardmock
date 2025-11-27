'use client';

import { useState, useRef, useEffect, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import GmailLayout from '@/components/layout/GmailLayout';
import Toast from '@/components/Toast';
import TemplateUploadFeedbackModal from '@/components/templates/TemplateUploadFeedbackModal';
import TagsInput from '@/components/templates/TagsInput';
import {
  Upload,
  X,
  Loader2,
  ImageIcon,
  Info,
  CreditCard,
  Wallet,
  AlertTriangle,
  CheckCircle,
  ArrowLeft,
} from 'lucide-react';
import {
  TEMPLATE_TYPES,
  type TemplateTypeId,
  type UploadAnalysis,
  analyzeUpload,
  getUploadPrompt,
  getAllSuggestedTags,
} from '@/lib/templateTypes';

interface ToastMessage {
  message: string;
  type: 'success' | 'error';
  id: number;
}

interface ScalingInfo {
  originalWidth: number;
  originalHeight: number;
  scaledWidth: number;
  scaledHeight: number;
  scaleFactor: number;
  qualityWarning: {
    level: 'success' | 'warning' | 'caution' | 'danger';
    message: string;
  };
}

interface UploadResult {
  template: {
    id: string;
    template_name: string;
    template_url: string;
  };
  scalingInfo: ScalingInfo;
  analysis: UploadAnalysis;
}

export default function AdminTemplateUploadPage() {
  const router = useRouter();
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Form state
  const [templateName, setTemplateName] = useState('');
  const [templateTypeId, setTemplateTypeId] = useState<TemplateTypeId>('prepaid-cr80');
  const [description, setDescription] = useState('');
  const [tags, setTags] = useState<string[]>([]);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);

  // Analysis state
  const [imageDimensions, setImageDimensions] = useState<{ width: number; height: number } | null>(null);
  const [analysis, setAnalysis] = useState<UploadAnalysis | null>(null);

  // Upload state
  const [uploading, setUploading] = useState(false);
  const [toasts, setToasts] = useState<ToastMessage[]>([]);

  // Feedback modal state
  const [showFeedbackModal, setShowFeedbackModal] = useState(false);
  const [uploadResult, setUploadResult] = useState<UploadResult | null>(null);

  // Available tags
  const [availableTags, setAvailableTags] = useState<string[]>([]);

  const showToast = (message: string, type: 'success' | 'error') => {
    const id = Date.now();
    setToasts(prev => [...prev, { message, type, id }]);
  };

  const removeToast = (id: number) => {
    setToasts(prev => prev.filter(toast => toast.id !== id));
  };

  // Fetch available tags
  useEffect(() => {
    const fetchTags = async () => {
      try {
        const response = await fetch('/api/templates/manage/tags');
        const result = await response.json();
        if (result.success) {
          const used = result.data.usedTags.map((t: { tag: string }) => t.tag);
          const suggested = result.data.suggestedTags;
          setAvailableTags([...new Set([...used, ...suggested])]);
        }
      } catch (error) {
        // Fall back to suggested tags
        setAvailableTags(getAllSuggestedTags());
      }
    };
    fetchTags();
  }, []);

  // Analyze image when file or template type changes
  useEffect(() => {
    if (imageDimensions) {
      const result = analyzeUpload(imageDimensions.width, imageDimensions.height, templateTypeId);
      setAnalysis(result);
    }
  }, [imageDimensions, templateTypeId]);

  const getImageDimensions = (file: File): Promise<{ width: number; height: number }> => {
    return new Promise((resolve, reject) => {
      const img = new Image();
      const url = URL.createObjectURL(file);

      img.onload = () => {
        URL.revokeObjectURL(url);
        resolve({ width: img.naturalWidth, height: img.naturalHeight });
      };

      img.onerror = () => {
        URL.revokeObjectURL(url);
        reject(new Error('Failed to load image'));
      };

      img.src = url;
    });
  };

  const handleFileSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      // Validate file type
      if (!file.type.startsWith('image/')) {
        showToast('Please select an image file', 'error');
        return;
      }

      // Validate file size (max 10MB)
      if (file.size > 10 * 1024 * 1024) {
        showToast('File size must be less than 10MB', 'error');
        return;
      }

      setSelectedFile(file);
      setPreviewUrl(URL.createObjectURL(file));

      // Get and analyze dimensions
      try {
        const dimensions = await getImageDimensions(file);
        setImageDimensions(dimensions);
      } catch (error) {
        showToast('Failed to read image dimensions', 'error');
      }

      // Auto-fill template name from filename if empty
      if (!templateName) {
        const nameWithoutExt = file.name.replace(/\.[^/.]+$/, '');
        setTemplateName(nameWithoutExt.replace(/[-_]/g, ' '));
      }
    }
  };

  const handleDrop = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    const file = e.dataTransfer.files?.[0];
    if (file) {
      const input = fileInputRef.current;
      if (input) {
        const dataTransfer = new DataTransfer();
        dataTransfer.items.add(file);
        input.files = dataTransfer.files;
        handleFileSelect({ target: input } as React.ChangeEvent<HTMLInputElement>);
      }
    }
  };

  const handleDragOver = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
  };

  const clearFile = () => {
    setSelectedFile(null);
    setPreviewUrl(null);
    setImageDimensions(null);
    setAnalysis(null);
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  const handleUpload = async () => {
    if (!selectedFile || !templateName.trim()) {
      showToast('Please provide a template name and image', 'error');
      return;
    }

    if (analysis?.status === 'not_compatible') {
      showToast('Please select a compatible template type or upload a different image', 'error');
      return;
    }

    setUploading(true);
    try {
      const formData = new FormData();
      formData.append('image', selectedFile);
      formData.append('templateName', templateName.trim());
      formData.append('templateTypeId', templateTypeId);
      if (description.trim()) {
        formData.append('description', description.trim());
      }
      if (tags.length > 0) {
        formData.append('tags', JSON.stringify(tags));
      }

      const response = await fetch('/api/templates/manage', {
        method: 'POST',
        body: formData,
      });

      const result = await response.json();

      if (!response.ok) {
        throw new Error(result.error || 'Failed to upload template');
      }

      // Show feedback modal with scaling info
      setUploadResult({
        template: result.data.template,
        scalingInfo: result.data.scalingInfo,
        analysis: result.data.analysis,
      });
      setShowFeedbackModal(true);
    } catch (err) {
      console.error('Error uploading template:', err);
      showToast(err instanceof Error ? err.message : 'Failed to upload template', 'error');
    } finally {
      setUploading(false);
    }
  };

  // Handle "Continue" from feedback modal
  const handleContinue = () => {
    setShowFeedbackModal(false);
    showToast('Template uploaded successfully!', 'success');

    // Redirect to templates list
    setTimeout(() => {
      router.push('/templates/manage');
    }, 1000);
  };

  // Handle "Upload Different" from feedback modal
  const handleUploadDifferent = async () => {
    // Delete the uploaded template
    if (uploadResult?.template.id) {
      try {
        await fetch(`/api/templates/manage?id=${uploadResult.template.id}`, {
          method: 'DELETE',
        });
      } catch (err) {
        console.error('Error deleting template:', err);
      }
    }

    setShowFeedbackModal(false);
    setUploadResult(null);
    clearFile();
  };

  // Get template type icon
  const getTypeIcon = (typeId: TemplateTypeId) => {
    const type = TEMPLATE_TYPES[typeId];
    if (type?.category === 'digital') {
      return <Wallet className="h-5 w-5" />;
    }
    return <CreditCard className="h-5 w-5" />;
  };

  // Get analysis status icon and color
  const getAnalysisDisplay = () => {
    if (!analysis) return null;

    const prompt = getUploadPrompt(analysis);
    const iconMap = {
      success: <CheckCircle className="h-5 w-5 text-green-500" />,
      info: <Info className="h-5 w-5 text-blue-500" />,
      warning: <AlertTriangle className="h-5 w-5 text-yellow-500" />,
      error: <X className="h-5 w-5 text-red-500" />,
    };

    const colorMap = {
      success: 'bg-green-50 border-green-200 text-green-800',
      info: 'bg-blue-50 border-blue-200 text-blue-800',
      warning: 'bg-yellow-50 border-yellow-200 text-yellow-800',
      error: 'bg-red-50 border-red-200 text-red-800',
    };

    return (
      <div className={`mt-3 p-3 rounded-lg border ${colorMap[prompt.variant]}`}>
        <div className="flex items-start gap-2">
          {iconMap[prompt.variant]}
          <div>
            <p className="font-medium">{prompt.title}</p>
            <p className="text-sm mt-1">{prompt.description}</p>
          </div>
        </div>
      </div>
    );
  };

  const selectedType = TEMPLATE_TYPES[templateTypeId];

  return (
    <GmailLayout>
      <div className="max-w-2xl mx-auto">
        {/* Back Link */}
        <button
          onClick={() => router.push('/templates/manage')}
          className="flex items-center gap-1 text-gray-600 hover:text-gray-900 mb-4"
        >
          <ArrowLeft className="h-4 w-4" />
          Back to Templates
        </button>

        {/* Header */}
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900">Upload Template</h1>
          <p className="text-gray-500 mt-1">
            Add a new template for cards or digital wallets
          </p>
        </div>

        {/* Upload Form */}
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6 space-y-6">
          {/* Template Type Selection */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Template Type
            </label>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              {Object.entries(TEMPLATE_TYPES).map(([id, type]) => (
                <button
                  key={id}
                  type="button"
                  onClick={() => setTemplateTypeId(id as TemplateTypeId)}
                  className={`p-4 rounded-lg border-2 text-left transition-all ${
                    templateTypeId === id
                      ? 'border-purple-600 bg-purple-50'
                      : 'border-gray-200 hover:border-gray-300'
                  }`}
                >
                  <div className="flex items-center gap-2 mb-1">
                    <span className={templateTypeId === id ? 'text-purple-600' : 'text-gray-400'}>
                      {getTypeIcon(id as TemplateTypeId)}
                    </span>
                    <span className="font-medium text-gray-900">{type.name}</span>
                  </div>
                  <p className="text-xs text-gray-500">
                    {type.width}×{type.height}px
                  </p>
                </button>
              ))}
            </div>
          </div>

          {/* Template Name */}
          <div>
            <label htmlFor="templateName" className="block text-sm font-medium text-gray-700 mb-2">
              Template Name
            </label>
            <input
              id="templateName"
              type="text"
              value={templateName}
              onChange={(e) => setTemplateName(e.target.value)}
              placeholder={`e.g., Standard ${selectedType.name}`}
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:border-purple-600 focus:ring-2 focus:ring-purple-200 transition-all"
            />
          </div>

          {/* Description */}
          <div>
            <label htmlFor="description" className="block text-sm font-medium text-gray-700 mb-2">
              Description (optional)
            </label>
            <textarea
              id="description"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Internal notes about this template..."
              rows={2}
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:border-purple-600 focus:ring-2 focus:ring-purple-200 transition-all resize-none"
            />
          </div>

          {/* Tags */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Tags (optional)
            </label>
            <TagsInput
              value={tags}
              onChange={setTags}
              suggestions={availableTags}
              placeholder="Add tags..."
            />
          </div>

          {/* File Upload */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Template Image
            </label>

            {previewUrl ? (
              <div className="relative">
                <div className="border-2 border-gray-200 rounded-lg overflow-hidden bg-gray-50">
                  <img
                    src={previewUrl}
                    alt="Template preview"
                    className="w-full h-auto max-h-80 object-contain"
                  />
                </div>
                <button
                  onClick={clearFile}
                  className="absolute top-2 right-2 p-1 bg-white rounded-full shadow-md hover:bg-gray-100 transition-colors"
                >
                  <X className="h-5 w-5 text-gray-600" />
                </button>
                <p className="mt-2 text-sm text-gray-500">
                  {selectedFile?.name}
                  {imageDimensions && (
                    <span className="ml-2">
                      ({imageDimensions.width}×{imageDimensions.height}px)
                    </span>
                  )}
                </p>

                {/* Analysis Result */}
                {getAnalysisDisplay()}
              </div>
            ) : (
              <div
                onClick={() => fileInputRef.current?.click()}
                onDrop={handleDrop}
                onDragOver={handleDragOver}
                className="border-2 border-dashed border-gray-300 rounded-lg p-8 text-center hover:border-purple-400 hover:bg-purple-50 transition-colors cursor-pointer"
              >
                <div className="w-12 h-12 mx-auto mb-4 bg-gray-100 rounded-full flex items-center justify-center">
                  <ImageIcon className="h-6 w-6 text-gray-400" />
                </div>
                <p className="text-gray-600 mb-2">
                  Drag and drop an image, or click to browse
                </p>
                <p className="text-sm text-gray-400">
                  PNG, JPG up to 10MB
                </p>
              </div>
            )}

            {/* Dimension Requirements Info */}
            <div className="mt-3 flex items-start gap-2 p-3 bg-blue-50 rounded-lg border border-blue-100">
              <Info className="h-4 w-4 text-blue-500 mt-0.5 flex-shrink-0" />
              <div className="text-xs text-blue-700">
                <p className="font-medium mb-1">{selectedType.name} Format</p>
                <p>
                  Images will be normalized to {selectedType.width}×{selectedType.height}px.
                  For best quality, upload at this size or larger with a {selectedType.aspectRatio.toFixed(2)}:1 aspect ratio.
                </p>
              </div>
            </div>

            <input
              ref={fileInputRef}
              type="file"
              accept="image/*"
              onChange={handleFileSelect}
              className="hidden"
            />
          </div>

          {/* Upload Button */}
          <div className="flex gap-3">
            <button
              onClick={() => router.push('/templates/manage')}
              className="px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors"
            >
              Cancel
            </button>
            <button
              onClick={handleUpload}
              disabled={
                uploading ||
                !selectedFile ||
                !templateName.trim() ||
                analysis?.status === 'not_compatible'
              }
              className="flex-1 flex items-center justify-center gap-2 px-4 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
            >
              {uploading ? (
                <>
                  <Loader2 className="h-5 w-5 animate-spin" />
                  Uploading...
                </>
              ) : (
                <>
                  <Upload className="h-5 w-5" />
                  Upload Template
                </>
              )}
            </button>
          </div>
        </div>
      </div>

      {/* Toast Notifications */}
      {toasts.map((toast) => (
        <Toast
          key={toast.id}
          message={toast.message}
          type={toast.type}
          onClose={() => removeToast(toast.id)}
        />
      ))}

      {/* Upload Feedback Modal */}
      {uploadResult && (
        <TemplateUploadFeedbackModal
          isOpen={showFeedbackModal}
          onClose={handleContinue}
          templateName={uploadResult.template.template_name}
          templateUrl={uploadResult.template.template_url}
          scalingInfo={uploadResult.scalingInfo}
          onContinue={handleContinue}
          onUploadDifferent={handleUploadDifferent}
        />
      )}
    </GmailLayout>
  );
}
