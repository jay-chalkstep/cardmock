'use client';

import { useState, useEffect } from 'react';
import { X, Eye, Code, Image as ImageIcon, Link as LinkIcon } from 'lucide-react';

interface Brand {
  id: string;
  name: string;
  colors?: Array<{ hex: string; type?: string }>;
  fonts?: Array<{ font_name: string }>;
  logo_variants?: Array<{ logo_url: string }>;
}

interface EmailMockupEditorProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: (mockupData: {
    contract_id?: string;
    project_id?: string;
    name: string;
    html_content: string;
    branding_data?: any;
    status?: string;
  }) => Promise<void>;
  contractId?: string;
  projectId?: string;
  initialData?: {
    id?: string;
    name?: string;
    html_content?: string;
    branding_data?: any;
    status?: string;
  };
}

export default function EmailMockupEditor({
  isOpen,
  onClose,
  onSave,
  contractId,
  projectId,
  initialData,
}: EmailMockupEditorProps) {
  const [name, setName] = useState('');
  const [htmlContent, setHtmlContent] = useState('');
  const [brands, setBrands] = useState<Brand[]>([]);
  const [selectedBrandId, setSelectedBrandId] = useState<string>('');
  const [selectedBrand, setSelectedBrand] = useState<Brand | null>(null);
  const [viewMode, setViewMode] = useState<'edit' | 'preview'>('edit');
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (isOpen) {
      fetchBrands();
      if (initialData) {
        setName(initialData.name || '');
        setHtmlContent(initialData.html_content || '');
        if (initialData.branding_data?.brand_id) {
          setSelectedBrandId(initialData.branding_data.brand_id);
        }
      } else {
        setName('');
        setHtmlContent('');
        setSelectedBrandId('');
      }
    }
  }, [isOpen, initialData]);

  useEffect(() => {
    if (selectedBrandId && brands.length > 0) {
      const brand = brands.find(b => b.id === selectedBrandId);
      setSelectedBrand(brand || null);
    } else {
      setSelectedBrand(null);
    }
  }, [selectedBrandId, brands]);

  const fetchBrands = async () => {
    try {
      const response = await fetch('/api/brands');
      const result = await response.json();
      setBrands(result.data?.brands || result.brands || []);
    } catch (error) {
      console.error('Error fetching brands:', error);
    }
  };

  if (!isOpen) return null;

  const handleSave = async () => {
    if (!name.trim() || !htmlContent.trim()) return;

    setLoading(true);
    try {
      const brandingData = selectedBrand ? {
        brand_id: selectedBrand.id,
        brand_name: selectedBrand.name,
        colors: selectedBrand.colors || [],
        fonts: selectedBrand.fonts || [],
        logo_url: selectedBrand.logo_variants?.[0]?.logo_url || null,
      } : {};

      await onSave({
        contract_id: contractId,
        project_id: projectId,
        name: name.trim(),
        html_content: htmlContent.trim(),
        branding_data: brandingData,
        status: initialData?.status || 'draft',
      });
      onClose();
    } catch (error) {
      console.error('Error saving email mockup:', error);
    } finally {
      setLoading(false);
    }
  };

  const insertVariable = (variable: string) => {
    const textarea = document.getElementById('html-content') as HTMLTextAreaElement;
    if (textarea) {
      const start = textarea.selectionStart;
      const end = textarea.selectionEnd;
      const text = htmlContent;
      const before = text.substring(0, start);
      const after = text.substring(end);
      setHtmlContent(before + `{${variable}}` + after);
      // Set cursor position after inserted variable
      setTimeout(() => {
        textarea.focus();
        textarea.setSelectionRange(start + variable.length + 2, start + variable.length + 2);
      }, 0);
    }
  };

  const insertImageTag = () => {
    const textarea = document.getElementById('html-content') as HTMLTextAreaElement;
    if (textarea) {
      const start = textarea.selectionStart;
      const end = textarea.selectionEnd;
      const text = htmlContent;
      const before = text.substring(0, start);
      const after = text.substring(end);
      const imageTag = '<img src="{image_url}" alt="Email image" style="max-width: 100%; height: auto;" />';
      setHtmlContent(before + imageTag + after);
      setTimeout(() => {
        textarea.focus();
        textarea.setSelectionRange(start + imageTag.length, start + imageTag.length);
      }, 0);
    }
  };

  const insertLinkTag = () => {
    const textarea = document.getElementById('html-content') as HTMLTextAreaElement;
    if (textarea) {
      const start = textarea.selectionStart;
      const end = textarea.selectionEnd;
      const text = htmlContent;
      const selectedText = text.substring(start, end) || 'Link Text';
      const before = text.substring(0, start);
      const after = text.substring(end);
      const linkTag = `<a href="{link_url}" style="color: ${selectedBrand?.colors?.[0]?.hex || '#0066cc'}; text-decoration: underline;">${selectedText}</a>`;
      setHtmlContent(before + linkTag + after);
      setTimeout(() => {
        textarea.focus();
        textarea.setSelectionRange(start + linkTag.length, start + linkTag.length);
      }, 0);
    }
  };

  const variables = [
    'client_name',
    'contract_number',
    'activation_link',
    'support_email',
    'company_name',
  ];

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg shadow-xl w-full max-w-4xl h-[90vh] flex flex-col">
        <div className="flex items-center justify-between p-4 border-b border-gray-200">
          <h2 className="text-xl font-semibold">
            {initialData?.id ? 'Edit Email Mockup' : 'New Email Mockup'}
          </h2>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600"
          >
            <X size={20} />
          </button>
        </div>

        <div className="flex-1 overflow-hidden flex flex-col">
          {/* Toolbar */}
          <div className="p-4 border-b border-gray-200 bg-gray-50">
            <div className="flex items-center gap-4 mb-4">
              <div className="flex-1">
                <label htmlFor="mockup-name" className="block text-sm font-medium mb-1">
                  Name <span className="text-red-500">*</span>
                </label>
                <input
                  id="mockup-name"
                  type="text"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  required
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                  placeholder="Email mockup name"
                />
              </div>
              <div className="flex-1">
                <label htmlFor="brand-select" className="block text-sm font-medium mb-1">
                  Client Branding
                </label>
                <select
                  id="brand-select"
                  value={selectedBrandId}
                  onChange={(e) => setSelectedBrandId(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                >
                  <option value="">No branding</option>
                  {brands.map((brand) => (
                    <option key={brand.id} value={brand.id}>
                      {brand.name}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            <div className="flex items-center gap-2">
              <button
                onClick={() => setViewMode('edit')}
                className={`px-3 py-1.5 text-sm font-medium rounded-md ${
                  viewMode === 'edit'
                    ? 'bg-blue-600 text-white'
                    : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
                }`}
              >
                <Code size={16} className="inline mr-1" />
                Edit
              </button>
              <button
                onClick={() => setViewMode('preview')}
                className={`px-3 py-1.5 text-sm font-medium rounded-md ${
                  viewMode === 'preview'
                    ? 'bg-blue-600 text-white'
                    : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
                }`}
              >
                <Eye size={16} className="inline mr-1" />
                Preview
              </button>
              <div className="ml-4 flex items-center gap-2">
                <span className="text-sm text-gray-600">Variables:</span>
                {variables.map((variable) => (
                  <button
                    key={variable}
                    onClick={() => insertVariable(variable)}
                    className="px-2 py-1 text-xs bg-gray-100 hover:bg-gray-200 rounded border border-gray-300"
                    title={`Insert {${variable}}`}
                  >
                    {`{${variable}}`}
                  </button>
                ))}
              </div>
              <div className="ml-4 flex items-center gap-2">
                <button
                  onClick={insertImageTag}
                  className="px-2 py-1 text-xs bg-gray-100 hover:bg-gray-200 rounded border border-gray-300 flex items-center gap-1"
                  title="Insert image tag"
                >
                  <ImageIcon size={14} />
                  Image
                </button>
                <button
                  onClick={insertLinkTag}
                  className="px-2 py-1 text-xs bg-gray-100 hover:bg-gray-200 rounded border border-gray-300 flex items-center gap-1"
                  title="Insert link tag"
                >
                  <LinkIcon size={14} />
                  Link
                </button>
              </div>
            </div>
          </div>

          {/* Content Area */}
          <div className="flex-1 overflow-hidden">
            {viewMode === 'edit' ? (
              <div className="h-full p-4">
                <label htmlFor="html-content" className="block text-sm font-medium mb-2">
                  HTML Content <span className="text-red-500">*</span>
                </label>
                <textarea
                  id="html-content"
                  value={htmlContent}
                  onChange={(e) => setHtmlContent(e.target.value)}
                  required
                  className="w-full h-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 font-mono text-sm"
                  placeholder="Enter HTML content for email..."
                />
              </div>
            ) : (
              <div className="h-full p-4 overflow-y-auto bg-gray-50">
                <div className="bg-white p-6 rounded-md shadow-sm max-w-2xl mx-auto">
                  <div
                    dangerouslySetInnerHTML={{ __html: htmlContent || '<p class="text-gray-500">No content to preview</p>' }}
                    style={{
                      fontFamily: selectedBrand?.fonts?.[0]?.font_name || 'Arial, sans-serif',
                      color: selectedBrand?.colors?.[0]?.hex || '#000000',
                    }}
                  />
                </div>
              </div>
            )}
          </div>

          {/* Footer */}
          <div className="p-4 border-t border-gray-200 flex items-center justify-between">
            <div className="text-sm text-gray-500">
              {selectedBrand && (
                <span>
                  Using branding: <strong>{selectedBrand.name}</strong>
                </span>
              )}
            </div>
            <div className="flex gap-3">
              <button
                onClick={onClose}
                className="px-4 py-2 border border-gray-300 rounded-md hover:bg-gray-50"
              >
                Cancel
              </button>
              <button
                onClick={handleSave}
                disabled={loading || !name.trim() || !htmlContent.trim()}
                className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {loading ? 'Saving...' : 'Save Email Mockup'}
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

