'use client';

import { useState, useEffect, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import GmailLayout from '@/components/layout/GmailLayout';
import GuidePresetsEditor, { GuidePreset } from '@/components/admin/GuidePresetsEditor';
import Toast from '@/components/Toast';
import {
  CreditCard,
  Wallet,
  ChevronLeft,
  Save,
  Loader2,
  RotateCcw,
  Ruler,
  Layout,
  Hash,
} from 'lucide-react';

interface TemplateType {
  id: string;
  name: string;
  width: number;
  height: number;
  aspect_ratio: number;
  category: 'physical' | 'digital';
  description: string;
  guide_presets: Record<string, GuidePreset> | Record<string, number> | null;
  templateCount?: number;
}

interface ToastMessage {
  message: string;
  type: 'success' | 'error';
  id: number;
}

// Convert legacy format (simple key: value) to new format (key: GuidePreset)
function normalizeGuidePresets(
  presets: Record<string, GuidePreset> | Record<string, number> | null,
  templateWidth: number,
  templateHeight: number
): Record<string, GuidePreset> {
  if (!presets) return {};

  const normalized: Record<string, GuidePreset> = {};

  for (const [key, value] of Object.entries(presets)) {
    if (typeof value === 'number') {
      // Legacy format - guess orientation based on key name and value
      const isHorizontal = key.toLowerCase().includes('top') ||
        key.toLowerCase().includes('bottom') ||
        key.toLowerCase().includes('height') ||
        value <= templateHeight;

      // Better heuristic: if value > height, it's likely vertical
      const orientation: 'vertical' | 'horizontal' =
        key.toLowerCase().includes('top') || key.toLowerCase().includes('bottom')
          ? 'horizontal'
          : key.toLowerCase().includes('left') || key.toLowerCase().includes('right') || key.toLowerCase().includes('midpoint')
            ? 'vertical'
            : value > templateHeight ? 'vertical' : 'horizontal';

      normalized[key] = {
        position: value,
        label: key.split('_').map(w => w.charAt(0).toUpperCase() + w.slice(1)).join(' '),
        color: orientation === 'vertical' ? '#22d3ee' : '#f59e0b',
        orientation,
      };
    } else if (typeof value === 'object' && value !== null) {
      // Already in new format
      normalized[key] = value as GuidePreset;
    }
  }

  return normalized;
}

export default function TemplateTypesPage() {
  const router = useRouter();
  const [templateTypes, setTemplateTypes] = useState<TemplateType[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [selectedType, setSelectedType] = useState<TemplateType | null>(null);
  const [editedPresets, setEditedPresets] = useState<Record<string, GuidePreset>>({});
  const [hasChanges, setHasChanges] = useState(false);
  const [toasts, setToasts] = useState<ToastMessage[]>([]);

  const showToast = (message: string, type: 'success' | 'error') => {
    const id = Date.now();
    setToasts(prev => [...prev, { message, type, id }]);
  };

  const removeToast = (id: number) => {
    setToasts(prev => prev.filter(toast => toast.id !== id));
  };

  const fetchTemplateTypes = useCallback(async () => {
    setLoading(true);
    try {
      const response = await fetch('/api/admin/template-types');
      const result = await response.json();

      if (result.success) {
        setTemplateTypes(result.data.templateTypes);
        // Auto-select first type if none selected
        if (!selectedType && result.data.templateTypes.length > 0) {
          const first = result.data.templateTypes[0];
          setSelectedType(first);
          setEditedPresets(normalizeGuidePresets(first.guide_presets, first.width, first.height));
        }
      } else {
        showToast(result.error || 'Failed to fetch template types', 'error');
      }
    } catch (error) {
      showToast('Failed to fetch template types', 'error');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchTemplateTypes();
  }, [fetchTemplateTypes]);

  const handleSelectType = (type: TemplateType) => {
    if (hasChanges) {
      if (!confirm('You have unsaved changes. Discard them?')) {
        return;
      }
    }
    setSelectedType(type);
    setEditedPresets(normalizeGuidePresets(type.guide_presets, type.width, type.height));
    setHasChanges(false);
  };

  const handlePresetsChange = (presets: Record<string, GuidePreset>) => {
    setEditedPresets(presets);
    setHasChanges(true);
  };

  const handleReset = () => {
    if (!selectedType) return;
    if (!confirm('Reset guide presets to last saved values?')) return;
    setEditedPresets(normalizeGuidePresets(selectedType.guide_presets, selectedType.width, selectedType.height));
    setHasChanges(false);
  };

  const handleSave = async () => {
    if (!selectedType) return;

    setSaving(true);
    try {
      const response = await fetch(`/api/admin/template-types/${selectedType.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ guide_presets: editedPresets }),
      });

      const result = await response.json();

      if (result.success) {
        showToast('Guide presets saved successfully', 'success');
        setHasChanges(false);

        // Update local state
        setTemplateTypes(prev =>
          prev.map(t =>
            t.id === selectedType.id
              ? { ...t, guide_presets: editedPresets }
              : t
          )
        );
        setSelectedType(prev =>
          prev ? { ...prev, guide_presets: editedPresets } : null
        );
      } else {
        showToast(result.error || 'Failed to save guide presets', 'error');
      }
    } catch (error) {
      showToast('Failed to save guide presets', 'error');
    } finally {
      setSaving(false);
    }
  };

  const getCategoryIcon = (category: string) => {
    return category === 'physical' ? (
      <CreditCard className="w-5 h-5" />
    ) : (
      <Wallet className="w-5 h-5" />
    );
  };

  return (
    <GmailLayout>
      <div className="flex flex-col h-full">
        {/* Header */}
        <div className="flex-shrink-0 border-b border-gray-200 bg-white px-6 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <button
                onClick={() => router.push('/templates/manage')}
                className="p-2 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-lg transition-colors"
              >
                <ChevronLeft className="w-5 h-5" />
              </button>
              <div>
                <h1 className="text-xl font-semibold text-gray-900">Template Types</h1>
                <p className="text-sm text-gray-500 mt-0.5">
                  Configure guide presets for each template format
                </p>
              </div>
            </div>

            {selectedType && (
              <div className="flex items-center gap-3">
                {hasChanges && (
                  <button
                    onClick={handleReset}
                    disabled={saving}
                    className="flex items-center gap-2 px-3 py-2 text-sm text-gray-600 hover:bg-gray-100 rounded-lg transition-colors"
                  >
                    <RotateCcw className="w-4 h-4" />
                    Reset
                  </button>
                )}
                <button
                  onClick={handleSave}
                  disabled={saving || !hasChanges}
                  className="flex items-center gap-2 px-4 py-2 bg-purple-600 text-white text-sm font-medium rounded-lg hover:bg-purple-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                >
                  {saving ? (
                    <Loader2 className="w-4 h-4 animate-spin" />
                  ) : (
                    <Save className="w-4 h-4" />
                  )}
                  Save Changes
                </button>
              </div>
            )}
          </div>
        </div>

        {/* Content */}
        <div className="flex-1 flex overflow-hidden">
          {/* Sidebar - Template Type List */}
          <div className="w-72 border-r border-gray-200 bg-gray-50 overflow-y-auto">
            {loading ? (
              <div className="flex items-center justify-center h-32">
                <Loader2 className="w-6 h-6 text-gray-400 animate-spin" />
              </div>
            ) : (
              <div className="p-4 space-y-2">
                {templateTypes.map((type) => (
                  <button
                    key={type.id}
                    onClick={() => handleSelectType(type)}
                    className={`
                      w-full text-left p-4 rounded-lg border transition-all
                      ${selectedType?.id === type.id
                        ? 'border-purple-300 bg-purple-50 shadow-sm'
                        : 'border-transparent bg-white hover:border-gray-200 hover:shadow-sm'
                      }
                    `}
                  >
                    <div className="flex items-start gap-3">
                      <div className={`
                        p-2 rounded-lg
                        ${type.category === 'physical' ? 'bg-blue-100 text-blue-600' : 'bg-amber-100 text-amber-600'}
                      `}>
                        {getCategoryIcon(type.category)}
                      </div>
                      <div className="flex-1 min-w-0">
                        <h3 className="font-medium text-gray-900 truncate">{type.name}</h3>
                        <p className="text-xs text-gray-500 mt-0.5">
                          {type.width} x {type.height}px
                        </p>
                        <p className="text-xs text-gray-400 mt-1">
                          {type.templateCount || 0} templates
                        </p>
                      </div>
                    </div>
                  </button>
                ))}
              </div>
            )}
          </div>

          {/* Main Content - Guide Editor */}
          <div className="flex-1 overflow-y-auto bg-white">
            {selectedType ? (
              <div className="p-6 max-w-3xl">
                {/* Type Info */}
                <div className="mb-8">
                  <div className="flex items-center gap-3 mb-4">
                    <div className={`
                      p-3 rounded-xl
                      ${selectedType.category === 'physical' ? 'bg-blue-100 text-blue-600' : 'bg-amber-100 text-amber-600'}
                    `}>
                      {getCategoryIcon(selectedType.category)}
                    </div>
                    <div>
                      <h2 className="text-lg font-semibold text-gray-900">{selectedType.name}</h2>
                      <p className="text-sm text-gray-500">{selectedType.description}</p>
                    </div>
                  </div>

                  {/* Specs */}
                  <div className="grid grid-cols-3 gap-4">
                    <div className="flex items-center gap-3 p-3 bg-gray-50 rounded-lg">
                      <Layout className="w-5 h-5 text-gray-400" />
                      <div>
                        <p className="text-xs text-gray-500">Dimensions</p>
                        <p className="text-sm font-medium text-gray-900">
                          {selectedType.width} x {selectedType.height}px
                        </p>
                      </div>
                    </div>
                    <div className="flex items-center gap-3 p-3 bg-gray-50 rounded-lg">
                      <Hash className="w-5 h-5 text-gray-400" />
                      <div>
                        <p className="text-xs text-gray-500">Aspect Ratio</p>
                        <p className="text-sm font-medium text-gray-900">
                          {selectedType.aspect_ratio.toFixed(4)}
                        </p>
                      </div>
                    </div>
                    <div className="flex items-center gap-3 p-3 bg-gray-50 rounded-lg">
                      <Ruler className="w-5 h-5 text-gray-400" />
                      <div>
                        <p className="text-xs text-gray-500">Guide Presets</p>
                        <p className="text-sm font-medium text-gray-900">
                          {Object.keys(editedPresets).length}
                        </p>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Guide Presets Editor */}
                <div>
                  <h3 className="text-sm font-medium text-gray-900 mb-4">Guide Presets</h3>
                  <GuidePresetsEditor
                    presets={editedPresets}
                    onChange={handlePresetsChange}
                    templateWidth={selectedType.width}
                    templateHeight={selectedType.height}
                    disabled={saving}
                  />
                </div>
              </div>
            ) : (
              <div className="flex items-center justify-center h-full text-gray-400">
                <p>Select a template type to edit guide presets</p>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Toasts */}
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
    </GmailLayout>
  );
}
