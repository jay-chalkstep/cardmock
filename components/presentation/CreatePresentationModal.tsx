'use client';

import { useState } from 'react';
import { X, Loader2 } from 'lucide-react';
import Toast from '@/components/Toast';

interface CreatePresentationModalProps {
  isOpen: boolean;
  onClose: () => void;
  onCreated?: (sessionId: string) => void;
  availableAssets: Array<{ id: string; name: string; imageUrl: string }>;
}

export default function CreatePresentationModal({
  isOpen,
  onClose,
  onCreated,
  availableAssets,
}: CreatePresentationModalProps) {
  const [name, setName] = useState('');
  const [selectedAssetIds, setSelectedAssetIds] = useState<string[]>([]);
  const [presentationMode, setPresentationMode] = useState<'side_by_side' | 'overlay' | 'timeline' | 'grid'>('side_by_side');
  const [presenterNotes, setPresenterNotes] = useState('');
  const [creating, setCreating] = useState(false);
  const [toast, setToast] = useState<{ message: string; type: 'success' | 'error' } | null>(null);
  
  if (!isOpen) return null;
  
  const handleToggleAsset = (assetId: string) => {
    setSelectedAssetIds((prev) =>
      prev.includes(assetId)
        ? prev.filter((id) => id !== assetId)
        : [...prev, assetId]
    );
  };
  
  const handleCreate = async () => {
    if (!name.trim()) {
      setToast({ message: 'Please enter a presentation name', type: 'error' });
      return;
    }
    
    if (selectedAssetIds.length === 0) {
      setToast({ message: 'Please select at least one asset', type: 'error' });
      return;
    }
    
    setCreating(true);
    
    try {
      const response = await fetch('/api/presentations', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name,
          assetIds: selectedAssetIds,
          presentationMode,
          presenterNotes: presenterNotes || undefined,
        }),
      });
      
      const data = await response.json();
      
      if (!response.ok) {
        setToast({ message: data.error || 'Failed to create presentation', type: 'error' });
        setCreating(false);
        return;
      }
      
      setToast({ message: 'Presentation created successfully', type: 'success' });
      onCreated?.(data.data.session.id);
      onClose();
    } catch (err) {
      setToast({ message: 'Failed to create presentation', type: 'error' });
      setCreating(false);
    }
  };
  
  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg p-6 max-w-3xl w-full mx-4 max-h-[90vh] overflow-y-auto">
        <div className="flex items-center justify-between mb-6">
          <h2 className="text-2xl font-semibold">Create Presentation</h2>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600"
          >
            <X className="h-5 w-5" />
          </button>
        </div>
        
        <div className="space-y-6">
          {/* Name */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Presentation Name <span className="text-red-500">*</span>
            </label>
            <input
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="e.g., Q4 Campaign Options"
              className="w-full px-4 py-2 border border-gray-300 rounded-lg"
              required
            />
          </div>
          
          {/* Presentation Mode */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Presentation Mode
            </label>
            <select
              value={presentationMode}
              onChange={(e) => setPresentationMode(e.target.value as typeof presentationMode)}
              className="w-full px-4 py-2 border border-gray-300 rounded-lg"
            >
              <option value="side_by_side">Side by Side</option>
              <option value="overlay">Overlay/Onion Skin</option>
              <option value="timeline">Timeline View</option>
              <option value="grid">Grid View</option>
            </select>
          </div>
          
          {/* Asset Selection */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Select Assets ({selectedAssetIds.length} selected)
            </label>
            <div className="grid grid-cols-2 md:grid-cols-3 gap-4 max-h-64 overflow-y-auto border border-gray-200 rounded-lg p-4">
              {availableAssets.map((asset) => (
                <div
                  key={asset.id}
                  onClick={() => handleToggleAsset(asset.id)}
                  className={`relative cursor-pointer rounded-lg border-2 transition-colors ${
                    selectedAssetIds.includes(asset.id)
                      ? 'border-blue-600 bg-blue-50'
                      : 'border-gray-200 hover:border-gray-300'
                  }`}
                >
                  <img
                    src={asset.imageUrl}
                    alt={asset.name}
                    className="w-full h-32 object-cover rounded-t-lg"
                  />
                  <div className="p-2">
                    <p className="text-xs font-medium text-gray-900 truncate">{asset.name}</p>
                  </div>
                  {selectedAssetIds.includes(asset.id) && (
                    <div className="absolute top-2 right-2 bg-blue-600 text-white rounded-full p-1">
                      <X className="h-3 w-3" />
                    </div>
                  )}
                </div>
              ))}
            </div>
          </div>
          
          {/* Presenter Notes */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Presenter Notes (Private)
            </label>
            <textarea
              value={presenterNotes}
              onChange={(e) => setPresenterNotes(e.target.value)}
              placeholder="Add private notes for your presentation..."
              className="w-full px-4 py-2 border border-gray-300 rounded-lg min-h-[100px]"
            />
          </div>
          
          <div className="flex gap-2">
            <button
              onClick={onClose}
              className="flex-1 px-4 py-2 border border-gray-300 rounded-lg text-gray-700 hover:bg-gray-50"
              disabled={creating}
            >
              Cancel
            </button>
            <button
              onClick={handleCreate}
              disabled={creating || !name.trim() || selectedAssetIds.length === 0}
              className="flex-1 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50"
            >
              {creating ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin inline mr-2" />
                  Creating...
                </>
              ) : (
                'Create Presentation'
              )}
            </button>
          </div>
        </div>
        
        {toast && (
          <div className="mt-4">
            <Toast message={toast.message} type={toast.type} onClose={() => setToast(null)} />
          </div>
        )}
      </div>
    </div>
  );
}

