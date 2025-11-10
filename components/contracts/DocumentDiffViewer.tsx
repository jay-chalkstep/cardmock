'use client';

import { useState } from 'react';
import { FileText, ChevronDown, ChevronUp, Sparkles, AlertCircle, RefreshCw } from 'lucide-react';

interface DocumentDiffViewerProps {
  diffSummary?: string | null;
  previousVersion: number;
  currentVersion: number;
  previousFileName?: string;
  currentFileName?: string;
  loading?: boolean;
  error?: string | null;
  onRetry?: () => void;
}

export default function DocumentDiffViewer({
  diffSummary,
  previousVersion,
  currentVersion,
  previousFileName,
  currentFileName,
  loading = false,
  error = null,
  onRetry,
}: DocumentDiffViewerProps) {
  const [expanded, setExpanded] = useState(true);

  return (
    <div className="border border-gray-200 rounded-lg bg-white">
      {/* Header */}
      <button
        onClick={() => setExpanded(!expanded)}
        className="w-full flex items-center justify-between p-4 hover:bg-gray-50 transition-colors"
        disabled={loading}
      >
        <div className="flex items-center gap-3">
          <div className={`p-2 rounded-lg ${
            error ? 'bg-red-100' : loading ? 'bg-blue-100' : 'bg-blue-100'
          }`}>
            {error ? (
              <AlertCircle size={18} className="text-red-600" />
            ) : loading ? (
              <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-blue-600"></div>
            ) : (
              <Sparkles size={18} className="text-blue-600" />
            )}
          </div>
          <div className="text-left">
            <h4 className="font-medium text-gray-900">
              {error ? 'Summary Error' : loading ? 'Generating Summary...' : 'AI-Generated Summary'}
            </h4>
            <p className="text-sm text-gray-500">
              Changes from Version {previousVersion} to Version {currentVersion}
            </p>
          </div>
        </div>
        {expanded ? (
          <ChevronUp size={20} className="text-gray-400" />
        ) : (
          <ChevronDown size={20} className="text-gray-400" />
        )}
      </button>

      {/* Content */}
      {expanded && (
        <div className="px-4 pb-4 border-t border-gray-200">
          <div className="pt-4">
            {loading && (
              <div className="bg-blue-50 rounded-lg p-4">
                <div className="flex items-center gap-2">
                  <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-blue-600"></div>
                  <p className="text-sm text-blue-700">Generating summary...</p>
                </div>
              </div>
            )}
            
            {error && !loading && (
              <div className="bg-red-50 rounded-lg p-4">
                <div className="flex items-start gap-3">
                  <AlertCircle size={16} className="text-red-600 mt-0.5" />
                  <div className="flex-1">
                    <h5 className="font-medium text-red-900 mb-1">Failed to Generate Summary</h5>
                    <p className="text-sm text-red-700 mb-3">{error}</p>
                    {onRetry && (
                      <button
                        onClick={onRetry}
                        className="px-3 py-1.5 text-sm font-medium text-white bg-red-600 rounded-md hover:bg-red-700 flex items-center gap-2"
                      >
                        <RefreshCw size={14} />
                        Retry
                      </button>
                    )}
                  </div>
                </div>
              </div>
            )}
            
            {diffSummary && !loading && !error && (
              <>
                <div className="bg-gray-50 rounded-lg p-4">
                  <div className="flex items-start gap-3 mb-3">
                    <FileText size={16} className="text-gray-400 mt-0.5" />
                    <div className="flex-1">
                      {previousFileName && currentFileName && (
                        <div className="text-xs text-gray-500 mb-2">
                          <span className="font-medium">Previous:</span> {previousFileName} (v{previousVersion})<br />
                          <span className="font-medium">Current:</span> {currentFileName} (v{currentVersion})
                        </div>
                      )}
                      <p className="text-sm text-gray-700 whitespace-pre-wrap leading-relaxed">
                        {diffSummary}
                      </p>
                    </div>
                  </div>
                </div>
                <p className="text-xs text-gray-400 mt-2 italic">
                  This summary was generated using AI. Please review the actual documents for complete details.
                </p>
              </>
            )}
            
            {!diffSummary && !loading && !error && previousVersion === 1 && (
              <div className="bg-gray-50 rounded-lg p-4">
                <p className="text-sm text-gray-500">This is the first version. No previous version to compare.</p>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

