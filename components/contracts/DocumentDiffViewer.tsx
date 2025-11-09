'use client';

import { useState } from 'react';
import { FileText, ChevronDown, ChevronUp, Sparkles } from 'lucide-react';

interface DocumentDiffViewerProps {
  diffSummary: string;
  previousVersion: number;
  currentVersion: number;
  previousFileName?: string;
  currentFileName?: string;
}

export default function DocumentDiffViewer({
  diffSummary,
  previousVersion,
  currentVersion,
  previousFileName,
  currentFileName,
}: DocumentDiffViewerProps) {
  const [expanded, setExpanded] = useState(true);

  return (
    <div className="border border-gray-200 rounded-lg bg-white">
      {/* Header */}
      <button
        onClick={() => setExpanded(!expanded)}
        className="w-full flex items-center justify-between p-4 hover:bg-gray-50 transition-colors"
      >
        <div className="flex items-center gap-3">
          <div className="p-2 bg-blue-100 rounded-lg">
            <Sparkles size={18} className="text-blue-600" />
          </div>
          <div className="text-left">
            <h4 className="font-medium text-gray-900">AI-Generated Summary</h4>
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
          </div>
        </div>
      )}
    </div>
  );
}

