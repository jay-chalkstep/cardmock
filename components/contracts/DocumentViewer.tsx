'use client';

import { useState, useEffect } from 'react';
import { FileText, Download, History, Eye, ChevronRight, Clock, User, FileCheck } from 'lucide-react';

interface DocumentVersion {
  id: string;
  version_number: number;
  file_url: string;
  file_name: string;
  created_at: string;
  created_by: string;
  diff_summary?: string;
  diff_summary_generated_at?: string;
}

interface ContractDocument {
  id: string;
  contract_id: string;
  version_number: number;
  file_url: string;
  file_name: string;
  file_size?: number;
  mime_type?: string;
  docu_sign_envelope_id?: string;
  docu_sign_status?: string;
  is_current: boolean;
  uploaded_by: string;
  created_at: string;
  updated_at: string;
}

interface DocumentViewerProps {
  document: ContractDocument;
  contractId: string;
  onVersionSelect?: (version: DocumentVersion) => void;
  onDownload?: (url: string, fileName: string) => void;
  onSendForSignature?: (docId: string) => void;
}

export default function DocumentViewer({
  document,
  contractId,
  onVersionSelect,
  onDownload,
  onSendForSignature,
}: DocumentViewerProps) {
  const [versions, setVersions] = useState<DocumentVersion[]>([]);
  const [loadingVersions, setLoadingVersions] = useState(false);
  const [selectedVersion, setSelectedVersion] = useState<DocumentVersion | null>(null);
  const [showVersionHistory, setShowVersionHistory] = useState(false);
  const [diffSummary, setDiffSummary] = useState<string | null>(null);
  const [loadingDiff, setLoadingDiff] = useState(false);

  useEffect(() => {
    if (document?.id) {
      fetchVersions();
    }
  }, [document?.id]);

  const fetchVersions = async () => {
    if (!document?.id) return;
    setLoadingVersions(true);
    try {
      const response = await fetch(`/api/contracts/${contractId}/documents/${document.id}/versions`);
      if (!response.ok) throw new Error('Failed to fetch versions');
      const result = await response.json();
      const fetchedVersions = result.data?.versions || result.versions || [];
      setVersions(fetchedVersions);
      
      // Set current version as selected by default
      const currentVersion = fetchedVersions.find((v: DocumentVersion) => v.version_number === document.version_number);
      if (currentVersion) {
        setSelectedVersion(currentVersion);
      }
    } catch (error) {
      console.error('Error fetching versions:', error);
    } finally {
      setLoadingVersions(false);
    }
  };

  const handleVersionClick = async (version: DocumentVersion) => {
    setSelectedVersion(version);
    if (onVersionSelect) {
      onVersionSelect(version);
    }

    // Fetch diff summary if available
    if (version.diff_summary) {
      setDiffSummary(version.diff_summary);
    } else if (version.version_number > 1) {
      // Try to generate diff summary
      await fetchDiffSummary(version.id);
    } else {
      setDiffSummary(null);
    }
  };

  const fetchDiffSummary = async (versionId: string) => {
    setLoadingDiff(true);
    try {
      const response = await fetch(`/api/contracts/documents/${versionId}/diff`, {
        method: 'POST',
      });
      if (!response.ok) throw new Error('Failed to generate diff summary');
      const result = await response.json();
      setDiffSummary(result.data?.diff_summary || result.diff_summary || null);
    } catch (error) {
      console.error('Error fetching diff summary:', error);
      setDiffSummary(null);
    } finally {
      setLoadingDiff(false);
    }
  };

  const handleDownload = (url: string, fileName: string) => {
    if (onDownload) {
      onDownload(url, fileName);
    } else {
      // Default download behavior
      const link = window.document.createElement('a');
      link.href = url;
      link.download = fileName;
      link.target = '_blank';
      window.document.body.appendChild(link);
      link.click();
      window.document.body.removeChild(link);
    }
  };

  const formatFileSize = (bytes?: number) => {
    if (!bytes) return 'Unknown size';
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
    return `${(bytes / 1024 / 1024).toFixed(1)} MB`;
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  return (
    <div className="flex h-full bg-white">
      {/* Main Document View */}
      <div className="flex-1 flex flex-col">
        {/* Document Header */}
        <div className="border-b border-gray-200 p-4 bg-gray-50">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <FileText size={24} className="text-blue-600" />
              <div>
                <h3 className="font-semibold text-gray-900">{document.file_name}</h3>
                <div className="flex items-center gap-3 text-sm text-gray-500 mt-1">
                  <span>Version {document.version_number}</span>
                  {document.is_current && (
                    <span className="px-2 py-0.5 bg-green-100 text-green-800 rounded-full text-xs font-medium">
                      Current
                    </span>
                  )}
                  {document.docu_sign_status && (
                    <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${
                      document.docu_sign_status === 'signed' ? 'bg-blue-100 text-blue-800' :
                      document.docu_sign_status === 'delivered' ? 'bg-yellow-100 text-yellow-800' :
                      document.docu_sign_status === 'declined' ? 'bg-red-100 text-red-800' :
                      'bg-gray-100 text-gray-800'
                    }`}>
                      {document.docu_sign_status}
                    </span>
                  )}
                  <span>{formatFileSize(document.file_size)}</span>
                  <span>{formatDate(document.created_at)}</span>
                </div>
              </div>
            </div>
            <div className="flex items-center gap-2">
              {document.docu_sign_envelope_id && (
                <button
                  onClick={() => onSendForSignature?.(document.id)}
                  className="px-3 py-1.5 text-sm font-medium text-blue-600 bg-blue-50 rounded-md hover:bg-blue-100 flex items-center gap-2"
                  title="View DocuSign Status"
                >
                  <FileCheck size={16} />
                  DocuSign
                </button>
              )}
              {!document.docu_sign_envelope_id && onSendForSignature && (
                <button
                  onClick={() => onSendForSignature(document.id)}
                  className="px-3 py-1.5 text-sm font-medium text-white bg-blue-600 rounded-md hover:bg-blue-700 flex items-center gap-2"
                >
                  <FileCheck size={16} />
                  Send for Signature
                </button>
              )}
              <button
                onClick={() => handleDownload(document.file_url, document.file_name)}
                className="px-3 py-1.5 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-md hover:bg-gray-50 flex items-center gap-2"
              >
                <Download size={16} />
                Download
              </button>
              <button
                onClick={() => setShowVersionHistory(!showVersionHistory)}
                className="px-3 py-1.5 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-md hover:bg-gray-50 flex items-center gap-2"
              >
                <History size={16} />
                History
              </button>
            </div>
          </div>
        </div>

        {/* Document Preview/Info */}
        <div className="flex-1 p-6 overflow-auto">
          {selectedVersion ? (
            <div className="space-y-4">
              {/* Selected Version Info */}
              <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                <div className="flex items-center gap-2 mb-2">
                  <Eye size={18} className="text-blue-600" />
                  <span className="font-medium text-blue-900">Viewing Version {selectedVersion.version_number}</span>
                </div>
                <div className="text-sm text-blue-700">
                  <div className="flex items-center gap-4">
                    <span className="flex items-center gap-1">
                      <Clock size={14} />
                      {formatDate(selectedVersion.created_at)}
                    </span>
                    <span className="flex items-center gap-1">
                      <User size={14} />
                      Uploaded by {selectedVersion.created_by}
                    </span>
                  </div>
                </div>
              </div>

              {/* Diff Summary */}
              {diffSummary && (
                <div className="bg-gray-50 border border-gray-200 rounded-lg p-4">
                  <h4 className="font-medium text-gray-900 mb-2">Changes from Previous Version</h4>
                  <p className="text-sm text-gray-700 whitespace-pre-wrap">{diffSummary}</p>
                </div>
              )}
              {loadingDiff && (
                <div className="bg-gray-50 border border-gray-200 rounded-lg p-4">
                  <p className="text-sm text-gray-500">Generating diff summary...</p>
                </div>
              )}

              {/* Document Preview Placeholder */}
              <div className="border border-gray-200 rounded-lg p-8 bg-gray-50 text-center">
                <FileText size={48} className="mx-auto text-gray-400 mb-4" />
                <p className="text-gray-600 mb-4">
                  Document preview not available. Click download to view the file.
                </p>
                <button
                  onClick={() => handleDownload(selectedVersion.file_url, selectedVersion.file_name)}
                  className="px-4 py-2 text-sm font-medium text-white bg-blue-600 rounded-md hover:bg-blue-700 flex items-center gap-2 mx-auto"
                >
                  <Download size={16} />
                  Download Version {selectedVersion.version_number}
                </button>
              </div>
            </div>
          ) : (
            <div className="border border-gray-200 rounded-lg p-8 bg-gray-50 text-center">
              <FileText size={48} className="mx-auto text-gray-400 mb-4" />
              <p className="text-gray-600 mb-4">
                Document preview not available. Click download to view the file.
              </p>
              <button
                onClick={() => handleDownload(document.file_url, document.file_name)}
                className="px-4 py-2 text-sm font-medium text-white bg-blue-600 rounded-md hover:bg-blue-700 flex items-center gap-2 mx-auto"
              >
                <Download size={16} />
                Download Document
              </button>
            </div>
          )}
        </div>
      </div>

      {/* Version History Sidebar */}
      {showVersionHistory && (
        <div className="w-80 border-l border-gray-200 bg-gray-50 flex flex-col">
          <div className="p-4 border-b border-gray-200 bg-white">
            <div className="flex items-center justify-between">
              <h4 className="font-semibold text-gray-900">Version History</h4>
              <button
                onClick={() => setShowVersionHistory(false)}
                className="text-gray-400 hover:text-gray-600"
              >
                ×
              </button>
            </div>
          </div>
          <div className="flex-1 overflow-auto p-4">
            {loadingVersions ? (
              <div className="text-center text-gray-500 py-8">Loading versions...</div>
            ) : versions.length === 0 ? (
              <div className="text-center text-gray-500 py-8">No version history</div>
            ) : (
              <div className="space-y-2">
                {versions
                  .sort((a, b) => b.version_number - a.version_number)
                  .map((version) => (
                    <button
                      key={version.id}
                      onClick={() => handleVersionClick(version)}
                      className={`w-full text-left p-3 rounded-lg border transition-colors ${
                        selectedVersion?.id === version.id
                          ? 'bg-blue-50 border-blue-200'
                          : 'bg-white border-gray-200 hover:bg-gray-50'
                      }`}
                    >
                      <div className="flex items-center justify-between mb-1">
                        <span className="font-medium text-gray-900">
                          Version {version.version_number}
                        </span>
                        {version.version_number === document.version_number && (
                          <span className="px-2 py-0.5 bg-green-100 text-green-800 rounded-full text-xs font-medium">
                            Current
                          </span>
                        )}
                      </div>
                      <div className="text-xs text-gray-500 space-y-1">
                        <div className="flex items-center gap-1">
                          <Clock size={12} />
                          {formatDate(version.created_at)}
                        </div>
                        {version.diff_summary && (
                          <div className="flex items-center gap-1 mt-1">
                            <FileText size={12} />
                            <span className="text-blue-600">Diff available</span>
                          </div>
                        )}
                      </div>
                      {selectedVersion?.id === version.id && (
                        <div className="mt-2 pt-2 border-t border-blue-200">
                          <ChevronRight size={16} className="text-blue-600" />
                        </div>
                      )}
                    </button>
                  ))}
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

