'use client';

import { useState, useRef, ChangeEvent, useCallback } from 'react';
import { Upload, CreditCard, Loader2, X, CheckCircle } from 'lucide-react';
import {
  classifyTemplate,
  getImageDimensions,
  ClassificationResult,
  CR80_SPECS,
} from '@/lib/templateNormalization';
import { normalizeTemplate, processedImageToFile, CropRect } from '@/lib/imageProcessor';
import TemplateNormalizationBanner from './TemplateNormalizationBanner';
import CropPreviewModal from './CropPreviewModal';

interface TemplateUploadModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
}

type UploadState = 'idle' | 'analyzing' | 'classified' | 'processing' | 'uploading';

export default function TemplateUploadModal({
  isOpen,
  onClose,
  onSuccess,
}: TemplateUploadModalProps) {
  const [file, setFile] = useState<File | null>(null);
  const [preview, setPreview] = useState<string | null>(null);
  const [templateName, setTemplateName] = useState('');
  const [uploadState, setUploadState] = useState<UploadState>('idle');
  const [dragActive, setDragActive] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Classification state
  const [classification, setClassification] = useState<ClassificationResult | null>(null);
  const [imageDimensions, setImageDimensions] = useState<{ width: number; height: number } | null>(null);

  // Crop preview modal state
  const [showCropPreview, setShowCropPreview] = useState(false);

  // Track whether to use normalized or original file
  const [useNormalized, setUseNormalized] = useState(false);
  const [normalizedFile, setNormalizedFile] = useState<File | null>(null);

  const handleDrag = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.type === 'dragenter' || e.type === 'dragover') {
      setDragActive(true);
    } else if (e.type === 'dragleave') {
      setDragActive(false);
    }
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(false);

    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      handleFile(e.dataTransfer.files[0]);
    }
  };

  const handleFileInput = (e: ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      handleFile(e.target.files[0]);
    }
  };

  const handleFile = async (selectedFile: File) => {
    setError(null);
    setClassification(null);
    setNormalizedFile(null);
    setUseNormalized(false);

    // Validate file type
    const validTypes = ['image/png', 'image/jpeg', 'image/jpg', 'image/webp'];
    if (!validTypes.includes(selectedFile.type)) {
      setError('Please upload a valid image file (PNG, JPG, or WebP). SVG and GIF are not supported for templates.');
      return;
    }

    // Validate file size (10MB max for card templates)
    if (selectedFile.size > 10 * 1024 * 1024) {
      setError('File size must be less than 10MB');
      return;
    }

    setFile(selectedFile);
    setUploadState('analyzing');

    // Create preview
    const reader = new FileReader();
    reader.onload = (e) => {
      setPreview(e.target?.result as string);
    };
    reader.readAsDataURL(selectedFile);

    // Analyze dimensions and classify
    try {
      const dimensions = await getImageDimensions(selectedFile);
      setImageDimensions(dimensions);

      const classificationResult = classifyTemplate(dimensions.width, dimensions.height);
      setClassification(classificationResult);
      setUploadState('classified');

      // Auto-set to use normalized if it's exact_300
      if (classificationResult.classification === 'exact_300') {
        setUseNormalized(false); // No normalization needed
      }
    } catch (err) {
      console.error('Failed to analyze image:', err);
      setError('Failed to analyze image dimensions');
      setUploadState('idle');
    }
  };

  const removeFile = () => {
    setFile(null);
    setPreview(null);
    setClassification(null);
    setImageDimensions(null);
    setNormalizedFile(null);
    setUseNormalized(false);
    setUploadState('idle');
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  const handleNormalizationAction = useCallback(
    async (action: string) => {
      if (!file || !classification) return;

      switch (action) {
        case 'normalize':
        case 'upscale':
        case 'use_anyway':
          // Process the image
          setUploadState('processing');
          try {
            const cropRect = classification.cropNeeded?.cropRect;
            const processed = await normalizeTemplate(file, cropRect);
            const normalized = processedImageToFile(processed, file.name);
            setNormalizedFile(normalized);
            setUseNormalized(true);
            setPreview(processed.dataUrl);
            setUploadState('classified');

            // Update classification to show success
            setClassification({
              ...classification,
              classification: 'exact_300',
              message: `Normalized to ${CR80_SPECS.DPI_300.width}×${CR80_SPECS.DPI_300.height}px. Ready to upload.`,
              actionButtons: [{ label: 'Upload', action: 'keep_original', variant: 'primary' }],
            });
          } catch (err) {
            console.error('Failed to normalize image:', err);
            setError('Failed to process image');
            setUploadState('classified');
          }
          break;

        case 'preview_crop':
          setShowCropPreview(true);
          break;

        case 'keep_original':
          setUseNormalized(false);
          setNormalizedFile(null);
          // Proceed to upload with original
          break;

        case 'upload_different':
          removeFile();
          break;
      }
    },
    [file, classification]
  );

  const handleCropConfirm = useCallback(
    async (cropRect: CropRect) => {
      if (!file) return;

      setShowCropPreview(false);
      setUploadState('processing');

      try {
        const processed = await normalizeTemplate(file, cropRect);
        const normalized = processedImageToFile(processed, file.name);
        setNormalizedFile(normalized);
        setUseNormalized(true);
        setPreview(processed.dataUrl);
        setUploadState('classified');

        // Update classification to show success
        setClassification({
          ...classification!,
          classification: 'exact_300',
          message: `Cropped and normalized to ${CR80_SPECS.DPI_300.width}×${CR80_SPECS.DPI_300.height}px. Ready to upload.`,
          actionButtons: [{ label: 'Upload', action: 'keep_original', variant: 'primary' }],
        });
      } catch (err) {
        console.error('Failed to process image:', err);
        setError('Failed to crop and normalize image');
        setUploadState('classified');
      }
    },
    [file, classification]
  );

  const handleUpload = async () => {
    const uploadFile = useNormalized && normalizedFile ? normalizedFile : file;

    if (!uploadFile || !templateName.trim()) {
      setError('Please select a file and enter a template name');
      return;
    }

    setUploadState('uploading');
    setError(null);

    try {
      // Create FormData
      const formData = new FormData();
      formData.append('file', uploadFile);
      formData.append('templateName', templateName.trim());

      // Include original dimensions if available
      if (imageDimensions) {
        formData.append('originalWidth', imageDimensions.width.toString());
        formData.append('originalHeight', imageDimensions.height.toString());
      }

      // Include normalized flag
      formData.append('isNormalized', useNormalized.toString());

      // Upload to API
      const response = await fetch('/api/card-upload', {
        method: 'POST',
        body: formData,
      });

      let data;
      const contentType = response.headers.get('content-type');

      if (contentType?.includes('application/json')) {
        data = await response.json();
      } else {
        const text = await response.text();
        data = { error: `Non-JSON response: ${text.substring(0, 200)}` };
      }

      if (!response.ok) {
        const errorMessage = data.details
          ? `${data.error}: ${data.details}`
          : data.error || `Upload failed with status ${response.status}`;

        throw new Error(errorMessage);
      }

      // Reset form and close modal
      setFile(null);
      setPreview(null);
      setTemplateName('');
      setClassification(null);
      setImageDimensions(null);
      setNormalizedFile(null);
      setUseNormalized(false);
      setUploadState('idle');
      onSuccess();
      onClose();
    } catch (error) {
      console.error('Upload error:', error);
      setError(error instanceof Error ? error.message : 'Failed to upload card template');
      setUploadState('classified');
    }
  };

  const handleClose = () => {
    if (uploadState !== 'uploading' && uploadState !== 'processing') {
      setFile(null);
      setPreview(null);
      setTemplateName('');
      setError(null);
      setClassification(null);
      setImageDimensions(null);
      setNormalizedFile(null);
      setUseNormalized(false);
      setUploadState('idle');
      onClose();
    }
  };

  const isProcessing = uploadState === 'analyzing' || uploadState === 'processing' || uploadState === 'uploading';
  const canUpload = file && templateName.trim() && !isProcessing && classification;

  if (!isOpen) return null;

  return (
    <>
      <div className="fixed inset-0 z-50 flex items-center justify-center">
        {/* Backdrop */}
        <div
          className="absolute inset-0 bg-black/50 backdrop-blur-sm"
          onClick={handleClose}
        />

        {/* Modal */}
        <div className="relative bg-white rounded-lg shadow-xl w-full max-w-2xl max-h-[90vh] overflow-y-auto m-4">
          {/* Header */}
          <div className="sticky top-0 bg-white border-b border-[var(--border-main)] px-6 py-4 flex items-center justify-between z-10">
            <div>
              <h2 className="text-xl font-semibold text-[var(--text-primary)]">
                Upload Card Template
              </h2>
              <p className="text-sm text-[var(--text-tertiary)] mt-1">
                Add a new template to your library
              </p>
            </div>
            <button
              onClick={handleClose}
              disabled={isProcessing}
              className="p-2 text-[var(--text-tertiary)] hover:text-[var(--text-primary)] hover:bg-[var(--bg-hover)] rounded-lg transition-colors disabled:opacity-50"
            >
              <X size={20} />
            </button>
          </div>

          {/* Content */}
          <div className="p-6 space-y-6">
            {/* Error Message */}
            {error && (
              <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg text-sm">
                {error}
              </div>
            )}

            {/* Template Name */}
            <div>
              <label htmlFor="template-name" className="block text-sm font-medium text-[var(--text-primary)] mb-2">
                Template Name <span className="text-red-500">*</span>
              </label>
              <input
                id="template-name"
                type="text"
                value={templateName}
                onChange={(e) => setTemplateName(e.target.value)}
                placeholder="e.g., Visa Gift Card Template, Mastercard Prepaid Design"
                className="w-full px-4 py-2 border border-[var(--border-main)] rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                disabled={isProcessing}
              />
            </div>

            {/* Drop Zone */}
            <div>
              <label className="block text-sm font-medium text-[var(--text-primary)] mb-2">
                Template File <span className="text-red-500">*</span>
              </label>
              <div
                className={`relative border-2 border-dashed rounded-lg p-8 text-center transition-colors ${
                  dragActive
                    ? 'border-blue-500 bg-blue-50'
                    : 'border-[var(--border-main)] hover:border-blue-300'
                }`}
                onDragEnter={handleDrag}
                onDragLeave={handleDrag}
                onDragOver={handleDrag}
                onDrop={handleDrop}
              >
                <input
                  ref={fileInputRef}
                  type="file"
                  accept="image/png,image/jpeg,image/jpg,image/webp"
                  onChange={handleFileInput}
                  className="hidden"
                  disabled={isProcessing}
                />

                {preview ? (
                  <div className="space-y-4">
                    <div className="relative inline-block">
                      <img
                        src={preview}
                        alt="Card template preview"
                        className="max-h-60 max-w-full mx-auto object-contain rounded-lg shadow-md"
                      />
                      {!isProcessing && (
                        <button
                          onClick={removeFile}
                          className="absolute -top-2 -right-2 p-1 bg-red-500 text-white rounded-full hover:bg-red-600 transition-colors"
                        >
                          <X className="h-4 w-4" />
                        </button>
                      )}
                    </div>
                    <div className="text-sm text-[var(--text-secondary)]">
                      {useNormalized && normalizedFile
                        ? `${normalizedFile.name} (${(normalizedFile.size / 1024).toFixed(1)} KB)`
                        : `${file?.name} (${((file?.size ?? 0) / 1024).toFixed(1)} KB)`}
                      {useNormalized && (
                        <span className="ml-2 text-green-600 text-xs font-medium">
                          ✓ Normalized
                        </span>
                      )}
                    </div>
                  </div>
                ) : (
                  <>
                    <CreditCard className="mx-auto h-12 w-12 text-[var(--text-tertiary)]" />
                    <p className="mt-2 text-sm text-[var(--text-secondary)]">
                      Drag and drop your card template here, or{' '}
                      <button
                        onClick={() => fileInputRef.current?.click()}
                        className="text-blue-500 hover:text-blue-600 font-medium"
                        disabled={isProcessing}
                      >
                        browse
                      </button>
                    </p>
                    <p className="text-xs text-[var(--text-tertiary)] mt-1">
                      PNG, JPG, or WebP up to 10MB
                    </p>
                  </>
                )}

                {/* Loading overlay */}
                {(uploadState === 'analyzing' || uploadState === 'processing') && (
                  <div className="absolute inset-0 bg-white/80 rounded-lg flex items-center justify-center">
                    <div className="flex flex-col items-center gap-2">
                      <Loader2 className="h-8 w-8 animate-spin text-blue-500" />
                      <span className="text-sm text-gray-600">
                        {uploadState === 'analyzing' ? 'Analyzing image...' : 'Processing...'}
                      </span>
                    </div>
                  </div>
                )}
              </div>
            </div>

            {/* Normalization Banner */}
            {classification && uploadState === 'classified' && (
              <TemplateNormalizationBanner
                classification={classification}
                onAction={handleNormalizationAction}
                isProcessing={isProcessing}
              />
            )}

            {/* Guidelines */}
            <div className="bg-[var(--bg-secondary)] rounded-lg p-4">
              <h3 className="text-sm font-semibold text-[var(--text-primary)] mb-2 flex items-center gap-2">
                <CheckCircle className="h-4 w-4 text-green-500" />
                CR80 Card Specifications
              </h3>
              <ul className="text-sm text-[var(--text-secondary)] space-y-1 list-disc list-inside">
                <li>Standard size: {CR80_SPECS.DPI_300.width}×{CR80_SPECS.DPI_300.height}px at 300 DPI</li>
                <li>Physical dimensions: {CR80_SPECS.PHYSICAL.widthInches}" × {CR80_SPECS.PHYSICAL.heightInches}"</li>
                <li>Aspect ratio: ~{CR80_SPECS.ASPECT_RATIO}:1 (landscape)</li>
                <li>Supported formats: PNG, JPG, WebP</li>
                <li>Images will be automatically analyzed and can be normalized</li>
              </ul>
            </div>
          </div>

          {/* Footer */}
          <div className="sticky bottom-0 bg-white border-t border-[var(--border-main)] px-6 py-4 flex gap-3 z-10">
            <button
              onClick={handleUpload}
              disabled={!canUpload}
              className="flex-1 px-4 py-2.5 bg-blue-500 text-white rounded-lg hover:bg-blue-600 disabled:opacity-50 disabled:cursor-not-allowed transition-colors flex items-center justify-center gap-2 font-medium"
            >
              {uploadState === 'uploading' ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin" />
                  Uploading...
                </>
              ) : (
                <>
                  <Upload className="h-4 w-4" />
                  Upload Template
                </>
              )}
            </button>
            <button
              onClick={handleClose}
              disabled={isProcessing}
              className="px-4 py-2.5 bg-[var(--bg-secondary)] text-[var(--text-secondary)] rounded-lg hover:bg-[var(--bg-hover)] transition-colors font-medium disabled:opacity-50"
            >
              Cancel
            </button>
          </div>
        </div>
      </div>

      {/* Crop Preview Modal */}
      {showCropPreview && file && classification?.cropNeeded && imageDimensions && (
        <CropPreviewModal
          isOpen={showCropPreview}
          file={file}
          initialCropRect={classification.cropNeeded.cropRect}
          originalDimensions={imageDimensions}
          onConfirm={handleCropConfirm}
          onCancel={() => setShowCropPreview(false)}
        />
      )}
    </>
  );
}
