'use client';

import { useState, useRef, ChangeEvent } from 'react';
import Toast from '@/components/Toast';
import GmailLayout from '@/components/layout/GmailLayout';
import { Upload, Image, Loader2, X, CheckCircle } from 'lucide-react';
import { useRouter } from 'next/navigation';

interface ToastMessage {
  message: string;
  type: 'success' | 'error';
  id: number;
}

export default function UploadPage() {
  const [file, setFile] = useState<File | null>(null);
  const [preview, setPreview] = useState<string | null>(null);
  const [companyName, setCompanyName] = useState('');
  const [domain, setDomain] = useState('');
  const [logoType, setLogoType] = useState<string>('logo');
  const [uploading, setUploading] = useState(false);
  const [dragActive, setDragActive] = useState(false);
  const [toasts, setToasts] = useState<ToastMessage[]>([]);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const router = useRouter();

  const showToast = (message: string, type: 'success' | 'error') => {
    const id = Date.now();
    setToasts(prev => [...prev, { message, type, id }]);
  };

  const removeToast = (id: number) => {
    setToasts(prev => prev.filter(toast => toast.id !== id));
  };

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

  const handleFile = (file: File) => {
    // Validate file type
    const validTypes = ['image/png', 'image/jpeg', 'image/jpg', 'image/svg+xml', 'image/webp'];
    if (!validTypes.includes(file.type)) {
      showToast('Please upload a valid image file (PNG, JPG, SVG, WebP)', 'error');
      return;
    }

    // Validate file size (5MB max)
    if (file.size > 5 * 1024 * 1024) {
      showToast('File size must be less than 5MB', 'error');
      return;
    }

    setFile(file);

    // Create preview
    const reader = new FileReader();
    reader.onload = (e) => {
      setPreview(e.target?.result as string);
    };
    reader.readAsDataURL(file);
  };

  const removeFile = () => {
    setFile(null);
    setPreview(null);
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  const handleUpload = async () => {
    if (!file || !companyName.trim()) {
      showToast('Please select a file and enter a company name', 'error');
      return;
    }

    setUploading(true);
    try {
      // Create FormData
      const formData = new FormData();
      formData.append('file', file);
      formData.append('companyName', companyName.trim());
      formData.append('domain', domain.trim());
      formData.append('logoType', logoType);

      // Upload to API
      const response = await fetch('/api/upload', {
        method: 'POST',
        body: formData,
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Upload failed');
      }

      showToast('Brand uploaded successfully!', 'success');

      // Reset form and redirect to library brands tab
      setTimeout(() => {
        router.push('/library?tab=brands');
      }, 1500);
    } catch (error) {
      console.error('Upload error:', error);
      showToast(error instanceof Error ? error.message : 'Failed to upload brand', 'error');
    } finally {
      setUploading(false);
    }
  };

  return (
    <GmailLayout>
      <div className="max-w-4xl mx-auto">
        <h2 className="text-3xl font-bold text-gray-900 mb-8">Upload Brand</h2>

        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6 space-y-6">
          {/* Drop Zone */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Brand File
            </label>
            <div
              className={`relative border-2 border-dashed rounded-lg p-8 text-center transition-colors ${
                dragActive
                  ? 'border-[#374151] bg-[#f3f4f6]'
                  : 'border-gray-300 hover:border-gray-400'
              }`}
              onDragEnter={handleDrag}
              onDragLeave={handleDrag}
              onDragOver={handleDrag}
              onDrop={handleDrop}
            >
              <input
                ref={fileInputRef}
                type="file"
                accept="image/png,image/jpeg,image/jpg,image/svg+xml,image/webp"
                onChange={handleFileInput}
                className="hidden"
              />

              {preview ? (
                <div className="space-y-4">
                  <div className="relative inline-block">
                    <img
                      src={preview}
                      alt="Brand preview"
                      className="max-h-40 max-w-full mx-auto object-contain"
                    />
                    <button
                      onClick={removeFile}
                      className="absolute -top-2 -right-2 p-1 bg-red-500 text-white rounded-full hover:bg-red-600 transition-colors"
                    >
                      <X className="h-4 w-4" />
                    </button>
                  </div>
                  <div className="text-sm text-gray-600">
                    {file?.name} ({(file?.size ?? 0 / 1024).toFixed(1)} KB)
                  </div>
                </div>
              ) : (
                <>
                  <Upload className="mx-auto h-12 w-12 text-gray-400" />
                  <p className="mt-2 text-sm text-gray-600">
                    Drag and drop your brand assets here, or{' '}
                    <button
                      onClick={() => fileInputRef.current?.click()}
                      className="text-[#374151] hover:text-[#374151] font-medium"
                    >
                      browse
                    </button>
                  </p>
                  <p className="text-xs text-gray-500">
                    PNG, JPG, SVG, WebP up to 5MB
                  </p>
                </>
              )}
            </div>
          </div>

          {/* Company Name */}
          <div>
            <label htmlFor="company-name" className="block text-sm font-medium text-gray-700 mb-2">
              Company Name <span className="text-red-500">*</span>
            </label>
            <input
              id="company-name"
              type="text"
              value={companyName}
              onChange={(e) => setCompanyName(e.target.value)}
              placeholder="e.g., Apple Inc."
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#374151] focus:border-transparent"
            />
          </div>

          {/* Domain */}
          <div>
            <label htmlFor="domain" className="block text-sm font-medium text-gray-700 mb-2">
              Domain (Optional)
            </label>
            <input
              id="domain"
              type="text"
              value={domain}
              onChange={(e) => setDomain(e.target.value)}
              placeholder="e.g., apple.com"
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#374151] focus:border-transparent"
            />
          </div>

          {/* Brand Type */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Brand Type
            </label>
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
              {['logo', 'icon', 'symbol'].map((type) => (
                <button
                  key={type}
                  onClick={() => setLogoType(type)}
                  className={`px-4 py-2 rounded-lg font-medium capitalize transition-colors ${
                    logoType === type
                      ? 'bg-[#374151] text-white'
                      : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                  }`}
                >
                  {type}
                </button>
              ))}
            </div>
          </div>

          {/* Actions */}
          <div className="flex gap-4 pt-4">
            <button
              onClick={handleUpload}
              disabled={!file || !companyName.trim() || uploading}
              className="flex-1 px-4 py-2 bg-[#374151] text-white rounded-lg hover:bg-[#1f2937] disabled:opacity-50 disabled:cursor-not-allowed transition-colors flex items-center justify-center gap-2"
            >
              {uploading ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin" />
                  Uploading...
                </>
              ) : (
                <>
                  <Upload className="h-4 w-4" />
                  Upload Brand
                </>
              )}
            </button>
            <button
              onClick={() => router.push('/search')}
              className="px-4 py-2 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 transition-colors"
            >
              Cancel
            </button>
          </div>
        </div>

        {/* Instructions */}
        <div className="mt-6 bg-[#f3f4f6] rounded-lg p-6">
          <h3 className="text-sm font-semibold text-[#030712] mb-2 flex items-center gap-2">
            <CheckCircle className="h-4 w-4" />
            Tips for Best Results
          </h3>
          <ul className="text-sm text-[#111827] space-y-1 list-disc list-inside">
            <li>Use high-quality images with transparent backgrounds when possible</li>
            <li>SVG format is preferred for scalability</li>
            <li>Keep file sizes under 5MB for optimal performance</li>
            <li>Use the correct logo type (icon for app icons, logo for full logos)</li>
          </ul>
        </div>
      </div>

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