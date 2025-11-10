'use client';

import { useState, useEffect } from 'react';
import { X, Loader2, CheckCircle, FileText, Image, ChevronRight, ChevronLeft } from 'lucide-react';
import Toast from '@/components/Toast';
import ProjectSelector from '@/components/projects/ProjectSelector';
import FolderSelector from '@/components/folders/FolderSelector';
import { Project, Folder } from '@/lib/supabase';

interface FigmaImportModalProps {
  isOpen: boolean;
  onClose: () => void;
  onImport: () => void;
  projects: Project[];
  folders: Folder[];
}

interface FigmaFrame {
  nodeId: string;
  name: string;
  type: string;
  bounds?: {
    x: number;
    y: number;
    width: number;
    height: number;
  };
  thumbnail_url?: string;
}

type Step = 'file' | 'frames' | 'settings';

export default function FigmaImportModal({
  isOpen,
  onClose,
  onImport,
  projects,
  folders,
}: FigmaImportModalProps) {
  const [step, setStep] = useState<Step>('file');
  const [loading, setLoading] = useState(false);
  const [toast, setToast] = useState<{ message: string; type: 'success' | 'error' } | null>(null);
  
  // Step 1: File selection
  const [fileKey, setFileKey] = useState('');
  const [fileName, setFileName] = useState('');
  
  // Step 2: Frame selection
  const [frames, setFrames] = useState<FigmaFrame[]>([]);
  const [selectedFrames, setSelectedFrames] = useState<Set<string>>(new Set());
  
  // Step 3: Import settings
  const [selectedProjectId, setSelectedProjectId] = useState<string | null>(null);
  const [selectedFolderId, setSelectedFolderId] = useState<string | null>(null);
  
  // Check if Figma is connected
  const [isConnected, setIsConnected] = useState(false);
  const [checkingConnection, setCheckingConnection] = useState(true);

  useEffect(() => {
    if (isOpen) {
      checkConnection();
      // Reset state when modal opens
      setStep('file');
      setFileKey('');
      setFileName('');
      setFrames([]);
      setSelectedFrames(new Set());
      setSelectedProjectId(null);
      setSelectedFolderId(null);
    }
  }, [isOpen]);

  const checkConnection = async () => {
    setCheckingConnection(true);
    try {
      const response = await fetch('/api/integrations/figma/status');
      if (response.ok) {
        const data = await response.json();
        setIsConnected(data.data?.connected || false);
      } else {
        setIsConnected(false);
      }
    } catch (err) {
      setIsConnected(false);
    } finally {
      setCheckingConnection(false);
    }
  };

  const handleFileKeySubmit = async () => {
    if (!fileKey.trim()) {
      setToast({ message: 'Please enter a Figma file key', type: 'error' });
      return;
    }

    setLoading(true);
    try {
      const response = await fetch(`/api/integrations/figma/files/${fileKey}`);
      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.error || 'Failed to fetch Figma file');
      }

      const data = await response.json();
      setFileName(data.data?.fileName || 'Untitled File');
      setFrames(data.data?.frames || []);
      
      if (data.data?.frames?.length === 0) {
        setToast({ message: 'No frames found in this file', type: 'error' });
        setLoading(false);
        return;
      }

      setStep('frames');
    } catch (err) {
      setToast({ 
        message: err instanceof Error ? err.message : 'Failed to load Figma file', 
        type: 'error' 
      });
    } finally {
      setLoading(false);
    }
  };

  const handleFrameToggle = (nodeId: string) => {
    const newSelected = new Set(selectedFrames);
    if (newSelected.has(nodeId)) {
      newSelected.delete(nodeId);
    } else {
      newSelected.add(nodeId);
    }
    setSelectedFrames(newSelected);
  };

  const handleSelectAll = () => {
    if (selectedFrames.size === frames.length) {
      setSelectedFrames(new Set());
    } else {
      setSelectedFrames(new Set(frames.map(f => f.nodeId)));
    }
  };

  const handleImport = async () => {
    if (selectedFrames.size === 0) {
      setToast({ message: 'Please select at least one frame to import', type: 'error' });
      return;
    }

    setLoading(true);
    try {
      const response = await fetch('/api/integrations/figma/import', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          fileKey,
          nodeIds: Array.from(selectedFrames),
          projectId: selectedProjectId || undefined,
          folderId: selectedFolderId || undefined,
        }),
      });

      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.error || 'Failed to import frames');
      }

      const data = await response.json();
      const importedCount = data.data?.imported || 0;
      const errors = data.data?.errors || [];

      if (errors.length > 0) {
        setToast({ 
          message: `Imported ${importedCount} frame(s). ${errors.length} error(s) occurred.`, 
          type: 'error' 
        });
      } else {
        setToast({ 
          message: `Successfully imported ${importedCount} frame(s)`, 
          type: 'success' 
        });
      }

      onImport();
      onClose();
    } catch (err) {
      setToast({ 
        message: err instanceof Error ? err.message : 'Failed to import frames', 
        type: 'error' 
      });
    } finally {
      setLoading(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg shadow-xl max-w-4xl w-full mx-4 max-h-[90vh] overflow-hidden flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-200">
          <h2 className="text-2xl font-semibold text-gray-900">Import from Figma</h2>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600 transition-colors"
            disabled={loading}
          >
            <X className="h-6 w-6" />
          </button>
        </div>

        {/* Progress Steps */}
        <div className="px-6 py-4 border-b border-gray-200 bg-gray-50">
          <div className="flex items-center justify-between">
            <div className={`flex items-center gap-2 ${step === 'file' ? 'text-blue-600' : step === 'frames' || step === 'settings' ? 'text-green-600' : 'text-gray-400'}`}>
              <div className={`w-8 h-8 rounded-full flex items-center justify-center ${step === 'file' ? 'bg-blue-600 text-white' : step === 'frames' || step === 'settings' ? 'bg-green-600 text-white' : 'bg-gray-200 text-gray-500'}`}>
                {step === 'file' ? '1' : <CheckCircle className="h-5 w-5" />}
              </div>
              <span className="font-medium">Select File</span>
            </div>
            <ChevronRight className="h-5 w-5 text-gray-400" />
            <div className={`flex items-center gap-2 ${step === 'frames' ? 'text-blue-600' : step === 'settings' ? 'text-green-600' : 'text-gray-400'}`}>
              <div className={`w-8 h-8 rounded-full flex items-center justify-center ${step === 'frames' ? 'bg-blue-600 text-white' : step === 'settings' ? 'bg-green-600 text-white' : 'bg-gray-200 text-gray-500'}`}>
                {step === 'frames' ? '2' : step === 'settings' ? <CheckCircle className="h-5 w-5" /> : '2'}
              </div>
              <span className="font-medium">Select Frames</span>
            </div>
            <ChevronRight className="h-5 w-5 text-gray-400" />
            <div className={`flex items-center gap-2 ${step === 'settings' ? 'text-blue-600' : 'text-gray-400'}`}>
              <div className={`w-8 h-8 rounded-full flex items-center justify-center ${step === 'settings' ? 'bg-blue-600 text-white' : 'bg-gray-200 text-gray-500'}`}>
                3
              </div>
              <span className="font-medium">Import Settings</span>
            </div>
          </div>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-6">
          {checkingConnection ? (
            <div className="flex items-center justify-center py-12">
              <Loader2 className="h-8 w-8 animate-spin text-gray-400" />
            </div>
          ) : !isConnected ? (
            <div className="text-center py-12">
              <p className="text-gray-600 mb-4">Figma integration is not connected.</p>
              <button
                onClick={() => {
                  onClose();
                  window.location.href = '/settings/integrations/figma';
                }}
                className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
              >
                Connect Figma
              </button>
            </div>
          ) : step === 'file' ? (
            <div className="space-y-6">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Figma File Key <span className="text-red-500">*</span>
                </label>
                <p className="text-sm text-gray-500 mb-3">
                  Enter the Figma file key from the file URL. Example: <code className="bg-gray-100 px-1 rounded">https://www.figma.com/file/ABC123xyz/My-Design</code> → File key is <code className="bg-gray-100 px-1 rounded">ABC123xyz</code>
                </p>
                <input
                  type="text"
                  value={fileKey}
                  onChange={(e) => setFileKey(e.target.value)}
                  placeholder="Enter Figma file key"
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                  onKeyDown={(e) => {
                    if (e.key === 'Enter' && !loading) {
                      handleFileKeySubmit();
                    }
                  }}
                />
              </div>
            </div>
          ) : step === 'frames' ? (
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="text-lg font-semibold text-gray-900">{fileName}</h3>
                  <p className="text-sm text-gray-600">{frames.length} frame(s) found</p>
                </div>
                <button
                  onClick={handleSelectAll}
                  className="text-sm text-blue-600 hover:text-blue-700"
                >
                  {selectedFrames.size === frames.length ? 'Deselect All' : 'Select All'}
                </button>
              </div>

              {frames.length === 0 ? (
                <div className="text-center py-12 text-gray-500">
                  No frames found in this file
                </div>
              ) : (
                <div className="grid grid-cols-2 md:grid-cols-3 gap-4 max-h-96 overflow-y-auto">
                  {frames.map((frame) => {
                    const isSelected = selectedFrames.has(frame.nodeId);
                    return (
                      <button
                        key={frame.nodeId}
                        onClick={() => handleFrameToggle(frame.nodeId)}
                        className={`p-4 border-2 rounded-lg transition-all ${
                          isSelected
                            ? 'border-blue-600 bg-blue-50'
                            : 'border-gray-200 hover:border-gray-300'
                        }`}
                      >
                        <div className="flex items-center gap-2 mb-2">
                          <input
                            type="checkbox"
                            checked={isSelected}
                            onChange={() => handleFrameToggle(frame.nodeId)}
                            className="rounded"
                          />
                          <span className="text-sm font-medium text-gray-900 truncate">
                            {frame.name}
                          </span>
                        </div>
                        <div className="text-xs text-gray-500">
                          {frame.type}
                        </div>
                      </button>
                    );
                  })}
                </div>
              )}
            </div>
          ) : step === 'settings' ? (
            <div className="space-y-6">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Project (Optional)
                </label>
                <ProjectSelector
                  projects={projects}
                  selectedProjectId={selectedProjectId}
                  onSelect={setSelectedProjectId}
                  placeholder="No project"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Folder (Optional)
                </label>
                <FolderSelector
                  folders={folders}
                  selectedFolderId={selectedFolderId}
                  onSelect={setSelectedFolderId}
                  placeholder="Unsorted"
                />
              </div>

              <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                <p className="text-sm text-blue-800">
                  <strong>Ready to import:</strong> {selectedFrames.size} frame(s) will be imported as new assets.
                </p>
              </div>
            </div>
          ) : null}
        </div>

        {/* Footer */}
        <div className="flex items-center justify-between px-6 py-4 border-t border-gray-200 bg-gray-50">
          <button
            onClick={() => {
              if (step === 'frames') {
                setStep('file');
              } else if (step === 'settings') {
                setStep('frames');
              }
            }}
            disabled={step === 'file' || loading}
            className="px-4 py-2 text-gray-700 border border-gray-300 rounded-lg hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
          >
            <ChevronLeft className="h-4 w-4" />
            Back
          </button>

          <div className="flex items-center gap-3">
            <button
              onClick={onClose}
              disabled={loading}
              className="px-4 py-2 text-gray-700 border border-gray-300 rounded-lg hover:bg-gray-50 disabled:opacity-50"
            >
              Cancel
            </button>
            {step === 'file' ? (
              <button
                onClick={handleFileKeySubmit}
                disabled={loading || !fileKey.trim()}
                className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
              >
                {loading ? (
                  <>
                    <Loader2 className="h-4 w-4 animate-spin" />
                    Loading...
                  </>
                ) : (
                  <>
                    Next
                    <ChevronRight className="h-4 w-4" />
                  </>
                )}
              </button>
            ) : step === 'frames' ? (
              <button
                onClick={() => setStep('settings')}
                disabled={loading || selectedFrames.size === 0}
                className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
              >
                Next
                <ChevronRight className="h-4 w-4" />
              </button>
            ) : (
              <button
                onClick={handleImport}
                disabled={loading || selectedFrames.size === 0}
                className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
              >
                {loading ? (
                  <>
                    <Loader2 className="h-4 w-4 animate-spin" />
                    Importing...
                  </>
                ) : (
                  <>
                    <CheckCircle className="h-4 w-4" />
                    Import {selectedFrames.size} Frame(s)
                  </>
                )}
              </button>
            )}
          </div>
        </div>

        {toast && (
          <div className="fixed bottom-4 right-4 z-50">
            <Toast message={toast.message} type={toast.type} onClose={() => setToast(null)} />
          </div>
        )}
      </div>
    </div>
  );
}

