'use client';

import { useState, useEffect, useCallback } from 'react';
import { FileText, Download, History, Eye, ChevronRight, Clock, User, FileCheck } from 'lucide-react';

interface DocumentVersion {
  id: string;
  version_number: number;
  file_url: string;
  file_name: string;
  created_at: string;
  created_by: string;
  created_by_name?: string;
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
  version_owner?: 'cdco' | 'client';
}

interface DocumentViewerProps {
  document: ContractDocument;
  contractId: string;
  initialVersionId?: string | null;
  onVersionSelect?: (version: DocumentVersion) => void;
  onDownload?: (url: string, fileName: string) => void;
  onSendForSignature?: (docId: string) => void;
}

export default function DocumentViewer({
  document,
  contractId,
  initialVersionId,
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
  const [diffError, setDiffError] = useState<string | null>(null);
  const [viewerUrl, setViewerUrl] = useState<string | null>(null);
  const [documentHtml, setDocumentHtml] = useState<string | null>(null);
  const [useFallback, setUseFallback] = useState(false);
  const [loadingPreview, setLoadingPreview] = useState(false);
  const [previewError, setPreviewError] = useState<string | null>(null);
  const [viewerError, setViewerError] = useState(false);
  const [isCurrentVersion, setIsCurrentVersion] = useState(true);

  const fetchDocumentPreview = useCallback(async (versionId?: string, forceFallback = false) => {
    if (!document?.id) return;
    setLoadingPreview(true);
    setViewerUrl(null);
    setDocumentHtml(null);
    setPreviewError(null);
    setViewerError(false);
    
    try {
      // If fallback is forced, fetch HTML
      if (forceFallback) {
        const url = versionId 
          ? `/api/contracts/documents/${document.id}/preview?version_id=${versionId}&fallback=true`
          : `/api/contracts/documents/${document.id}/preview?fallback=true`;
        
        const response = await fetch(url);
        const result = await response.json();
        
        if (!response.ok) {
          const errorMessage = result.message || result.error || 'Failed to load document preview';
          setPreviewError(errorMessage);
          setDocumentHtml(null);
          return;
        }
        
        setDocumentHtml(result.data?.html || result.html || null);
        const isCurrent = result.data?.isCurrentVersion !== false; // Default to true if not provided
        setIsCurrentVersion(isCurrent);
        setViewerUrl(null);
        setUseFallback(true);
        setPreviewError(null);
        return;
      }

      // Try Office Online viewer first
      const url = versionId 
        ? `/api/contracts/documents/${document.id}/preview?version_id=${versionId}`
        : `/api/contracts/documents/${document.id}/preview`;
      
      const response = await fetch(url);
      const result = await response.json();
      
      if (!response.ok) {
        const errorMessage = result.message || result.error || 'Failed to load document preview';
        setPreviewError(errorMessage);
        setViewerUrl(null);
        // Try fallback on error
        await fetchDocumentPreview(versionId, true);
        return;
      }
      
      const viewerUrl = result.data?.viewerUrl || result.viewerUrl;
      const isCurrent = result.data?.isCurrentVersion !== false; // Default to true if not provided
      setIsCurrentVersion(isCurrent);
      if (viewerUrl) {
        setViewerUrl(viewerUrl);
        setDocumentHtml(null);
        setUseFallback(false);
        setPreviewError(null);
      } else {
        // If no viewer URL, try fallback
        await fetchDocumentPreview(versionId, true);
      }
    } catch (error) {
      console.error('Error fetching document preview:', error);
      const errorMessage = error instanceof Error ? error.message : 'Failed to load document preview';
      setPreviewError(errorMessage);
      setViewerUrl(null);
      // Try fallback on error
      await fetchDocumentPreview(versionId, true);
    } finally {
      setLoadingPreview(false);
    }
  }, [document?.id]);

  useEffect(() => {
    if (document?.id) {
      fetchVersions();
      fetchDocumentPreview();
      // Reset to current version when document changes
      setIsCurrentVersion(true);
    }
  }, [document?.id, fetchDocumentPreview]);

  useEffect(() => {
    if (selectedVersion?.id) {
      fetchDocumentPreview(selectedVersion.id);
    }
  }, [selectedVersion?.id, fetchDocumentPreview]);

  // Watch for changes to initialVersionId and update selected version
  useEffect(() => {
    if (initialVersionId && versions.length > 0) {
      const versionToSelect = versions.find((v: DocumentVersion) => v.id === initialVersionId);
      if (versionToSelect && versionToSelect.id !== selectedVersion?.id) {
        setSelectedVersion(versionToSelect);
        const isCurrent = versionToSelect.version_number === document.version_number;
        setIsCurrentVersion(isCurrent);
      }
    }
  }, [initialVersionId, versions, document.version_number, selectedVersion?.id]);

  const fetchVersions = async () => {
    if (!document?.id) return;
    setLoadingVersions(true);
    try {
      const response = await fetch(`/api/contracts/${contractId}/documents/${document.id}/versions`);
      if (!response.ok) throw new Error('Failed to fetch versions');
      const result = await response.json();
      const fetchedVersions = result.data?.versions || result.versions || [];
      setVersions(fetchedVersions);
      
      // Set selected version: use initialVersionId if provided, otherwise use current version
      let versionToSelect: DocumentVersion | undefined;
      if (initialVersionId) {
        versionToSelect = fetchedVersions.find((v: DocumentVersion) => v.id === initialVersionId);
      }
      if (!versionToSelect) {
        versionToSelect = fetchedVersions.find((v: DocumentVersion) => v.version_number === document.version_number);
      }
      if (versionToSelect) {
        setSelectedVersion(versionToSelect);
      }
    } catch (error) {
      console.error('Error fetching versions:', error);
    } finally {
      setLoadingVersions(false);
    }
  };

  const handleVersionClick = async (version: DocumentVersion) => {
    setSelectedVersion(version);
    setDiffError(null);
    // Check if this version is the current version
    const isCurrent = version.version_number === document.version_number;
    setIsCurrentVersion(isCurrent);
    if (onVersionSelect) {
      onVersionSelect(version);
    }

    // Fetch diff summary if available
    if (version.diff_summary) {
      setDiffSummary(version.diff_summary);
      setDiffError(null);
    } else if (version.version_number > 1) {
      // Try to generate diff summary - use document.id, not version.id
      await fetchDiffSummary(document.id);
    } else {
      setDiffSummary(null);
      setDiffError(null);
    }
  };

  const fetchDiffSummary = async (docId: string) => {
    setLoadingDiff(true);
    setDiffSummary(null);
    setDiffError(null);
    try {
      const response = await fetch(`/api/contracts/documents/${docId}/diff`, {
        method: 'POST',
      });
      
      const result = await response.json();
      
      if (!response.ok) {
        // Handle error response
        const errorMessage = result.message || result.error || 'Failed to generate diff summary';
        setDiffError(errorMessage);
        setDiffSummary(null);
        return;
      }
      
      // Check if there's a message indicating no previous version
      if (result.data?.message === 'No previous version to compare' || result.message === 'No previous version to compare') {
        setDiffSummary(null);
        setDiffError(null);
        return;
      }
      
      setDiffSummary(result.data?.diff_summary || result.diff_summary || null);
      setDiffError(null);
    } catch (error) {
      console.error('Error fetching diff summary:', error);
      // Store error message for display
      const errorMessage = error instanceof Error ? error.message : 'Failed to generate diff summary';
      setDiffError(errorMessage);
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
                  {document.version_owner && (
                    <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${
                      document.version_owner === 'client' ? 'bg-yellow-100 text-yellow-800' : 'bg-blue-100 text-blue-800'
                    }`}>
                      {document.version_owner === 'client' ? "Client's Version" : "CDCO's Version"}
                    </span>
                  )}
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
                      Uploaded by {selectedVersion.created_by_name || selectedVersion.created_by}
                    </span>
                  </div>
                </div>
              </div>

              {/* Diff Summary */}
              {loadingDiff && (
                <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                  <div className="flex items-center gap-2">
                    <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-blue-600"></div>
                    <p className="text-sm text-blue-700">Generating summary...</p>
                  </div>
                </div>
              )}
              {diffError && !loadingDiff && (
                <div className="bg-red-50 border border-red-200 rounded-lg p-4">
                  <div className="flex items-start justify-between gap-4">
                    <div className="flex-1">
                      <h4 className="font-medium text-red-900 mb-1">Failed to Generate Summary</h4>
                      <p className="text-sm text-red-700 mb-3">{diffError}</p>
                      <button
                        onClick={() => fetchDiffSummary(document.id)}
                        className="px-3 py-1.5 text-sm font-medium text-white bg-red-600 rounded-md hover:bg-red-700 flex items-center gap-2"
                      >
                        Retry
                      </button>
                    </div>
                  </div>
                </div>
              )}
              {diffSummary && !loadingDiff && !diffError && (
                <div className="bg-gray-50 border border-gray-200 rounded-lg p-4">
                  <h4 className="font-medium text-gray-900 mb-2">Changes from Previous Version</h4>
                  <p className="text-sm text-gray-700 whitespace-pre-wrap">{diffSummary}</p>
                </div>
              )}
              {selectedVersion && selectedVersion.version_number === 1 && !loadingDiff && (
                <div className="bg-gray-50 border border-gray-200 rounded-lg p-4">
                  <p className="text-sm text-gray-500">This is the first version. No previous version to compare.</p>
                </div>
              )}

              {/* Document Preview */}
              {loadingPreview ? (
                <div className="border border-gray-200 rounded-lg p-8 bg-gray-50 text-center">
                  <div className="flex items-center justify-center gap-2 text-gray-600">
                    <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-blue-600"></div>
                    <span>Loading document preview...</span>
                  </div>
                </div>
              ) : previewError ? (
                <div className="border border-gray-200 rounded-lg p-8 bg-red-50 text-center">
                  <p className="text-red-600 mb-4">{previewError}</p>
                  <div className="flex gap-2 justify-center">
                    <button
                      onClick={() => fetchDocumentPreview(selectedVersion.id)}
                      className="px-4 py-2 text-sm font-medium text-white bg-red-600 rounded-md hover:bg-red-700 flex items-center gap-2"
                    >
                      Retry
                    </button>
                    <button
                      onClick={() => fetchDocumentPreview(selectedVersion.id, true)}
                      className="px-4 py-2 text-sm font-medium text-white bg-blue-600 rounded-md hover:bg-blue-700 flex items-center gap-2"
                    >
                      Use HTML Preview
                    </button>
                  </div>
                </div>
              ) : viewerUrl && !useFallback ? (
                <div className="border border-gray-200 rounded-lg bg-white overflow-hidden">
                  <div className="relative w-full" style={{ height: 'calc(100vh - 400px)', minHeight: '600px' }}>
                    <iframe
                      src={viewerUrl}
                      className="w-full h-full border-0"
                      title={`Document Preview - Version ${selectedVersion.version_number}`}
                      onError={() => {
                        setViewerError(true);
                        fetchDocumentPreview(selectedVersion.id, true);
                      }}
                      onLoad={() => setViewerError(false)}
                    />
                    {!isCurrentVersion && (
                      <div 
                        className="absolute inset-0 pointer-events-none flex items-center justify-center"
                        style={{
                          background: 'repeating-linear-gradient(45deg, transparent, transparent 10px, rgba(255, 0, 0, 0.03) 10px, rgba(255, 0, 0, 0.03) 20px)',
                        }}
                      >
                        <div 
                          className="text-6xl font-bold text-red-400 opacity-20 select-none"
                          style={{
                            transform: 'rotate(-45deg)',
                            letterSpacing: '0.1em',
                            textShadow: '2px 2px 4px rgba(0,0,0,0.1)',
                          }}
                        >
                          PREVIOUS VERSION
                        </div>
                      </div>
                    )}
                    {viewerError && (
                      <div className="absolute inset-0 bg-white flex items-center justify-center">
                        <div className="text-center">
                          <p className="text-gray-600 mb-4">Office Online viewer failed to load</p>
                          <button
                            onClick={() => fetchDocumentPreview(selectedVersion.id, true)}
                            className="px-4 py-2 text-sm font-medium text-white bg-blue-600 rounded-md hover:bg-blue-700"
                          >
                            Use HTML Preview
                          </button>
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              ) : documentHtml ? (
                <div className="border border-gray-200 rounded-lg bg-white overflow-hidden">
                  <div className="p-4 bg-gray-50 border-b border-gray-200 flex items-center justify-between">
                    <p className="text-sm text-gray-600">Using HTML preview (fallback mode)</p>
                    <button
                      onClick={() => {
                        setUseFallback(false);
                        fetchDocumentPreview(selectedVersion.id);
                      }}
                      className="px-3 py-1 text-xs font-medium text-blue-600 hover:text-blue-700"
                    >
                      Try Office Viewer
                    </button>
                  </div>
                  <div className="relative p-6 overflow-y-auto max-h-[calc(100vh-400px)]">
                    {!isCurrentVersion && (
                      <div 
                        className="absolute inset-0 pointer-events-none flex items-center justify-center z-10"
                        style={{
                          background: 'repeating-linear-gradient(45deg, transparent, transparent 10px, rgba(255, 0, 0, 0.03) 10px, rgba(255, 0, 0, 0.03) 20px)',
                        }}
                      >
                        <div 
                          className="text-6xl font-bold text-red-400 opacity-20 select-none"
                          style={{
                            transform: 'rotate(-45deg)',
                            letterSpacing: '0.1em',
                            textShadow: '2px 2px 4px rgba(0,0,0,0.1)',
                          }}
                        >
                          PREVIOUS VERSION
                        </div>
                      </div>
                    )}
                    <div 
                      dangerouslySetInnerHTML={{ __html: documentHtml }}
                      className="document-content"
                      style={{
                        fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif',
                        lineHeight: '1.6',
                        color: '#333',
                      }}
                    />
                  </div>
                </div>
              ) : (
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
              )}
            </div>
          ) : (
            <div className="border border-gray-200 rounded-lg bg-white overflow-hidden">
              {loadingPreview ? (
                <div className="p-8 bg-gray-50 text-center">
                  <div className="flex items-center justify-center gap-2 text-gray-600">
                    <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-blue-600"></div>
                    <span>Loading document preview...</span>
                  </div>
                </div>
              ) : previewError ? (
                <div className="p-8 bg-red-50 text-center">
                  <p className="text-red-600 mb-4">{previewError}</p>
                  <div className="flex gap-2 justify-center">
                    <button
                      onClick={() => fetchDocumentPreview()}
                      className="px-4 py-2 text-sm font-medium text-white bg-red-600 rounded-md hover:bg-red-700 flex items-center gap-2"
                    >
                      Retry
                    </button>
                    <button
                      onClick={() => fetchDocumentPreview(undefined, true)}
                      className="px-4 py-2 text-sm font-medium text-white bg-blue-600 rounded-md hover:bg-blue-700 flex items-center gap-2"
                    >
                      Use HTML Preview
                    </button>
                  </div>
                </div>
              ) : viewerUrl && !useFallback ? (
                <div className="relative w-full" style={{ height: 'calc(100vh - 400px)', minHeight: '600px' }}>
                  <iframe
                    src={viewerUrl}
                    className="w-full h-full border-0"
                    title={`Document Preview - ${document.file_name}`}
                    onError={() => {
                      setViewerError(true);
                      fetchDocumentPreview(undefined, true);
                    }}
                    onLoad={() => setViewerError(false)}
                  />
                  {!isCurrentVersion && (
                    <div 
                      className="absolute inset-0 pointer-events-none flex items-center justify-center"
                      style={{
                        background: 'repeating-linear-gradient(45deg, transparent, transparent 10px, rgba(255, 0, 0, 0.03) 10px, rgba(255, 0, 0, 0.03) 20px)',
                      }}
                    >
                      <div 
                        className="text-6xl font-bold text-red-400 opacity-20 select-none"
                        style={{
                          transform: 'rotate(-45deg)',
                          letterSpacing: '0.1em',
                          textShadow: '2px 2px 4px rgba(0,0,0,0.1)',
                        }}
                      >
                        PREVIOUS VERSION
                      </div>
                    </div>
                  )}
                  {viewerError && (
                    <div className="absolute inset-0 bg-white flex items-center justify-center">
                      <div className="text-center">
                        <p className="text-gray-600 mb-4">Office Online viewer failed to load</p>
                        <button
                          onClick={() => fetchDocumentPreview(undefined, true)}
                          className="px-4 py-2 text-sm font-medium text-white bg-blue-600 rounded-md hover:bg-blue-700"
                        >
                          Use HTML Preview
                        </button>
                      </div>
                    </div>
                  )}
                </div>
              ) : documentHtml ? (
                <div>
                  <div className="p-4 bg-gray-50 border-b border-gray-200 flex items-center justify-between">
                    <p className="text-sm text-gray-600">Using HTML preview (fallback mode)</p>
                    <button
                      onClick={() => {
                        setUseFallback(false);
                        fetchDocumentPreview();
                      }}
                      className="px-3 py-1 text-xs font-medium text-blue-600 hover:text-blue-700"
                    >
                      Try Office Viewer
                    </button>
                  </div>
                  <div className="relative p-6 overflow-y-auto max-h-[calc(100vh-400px)]">
                    {!isCurrentVersion && (
                      <div 
                        className="absolute inset-0 pointer-events-none flex items-center justify-center z-10"
                        style={{
                          background: 'repeating-linear-gradient(45deg, transparent, transparent 10px, rgba(255, 0, 0, 0.03) 10px, rgba(255, 0, 0, 0.03) 20px)',
                        }}
                      >
                        <div 
                          className="text-6xl font-bold text-red-400 opacity-20 select-none"
                          style={{
                            transform: 'rotate(-45deg)',
                            letterSpacing: '0.1em',
                            textShadow: '2px 2px 4px rgba(0,0,0,0.1)',
                          }}
                        >
                          PREVIOUS VERSION
                        </div>
                      </div>
                    )}
                    <div 
                      dangerouslySetInnerHTML={{ __html: documentHtml }}
                      className="document-content"
                      style={{
                        fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif',
                        lineHeight: '1.6',
                        color: '#333',
                      }}
                    />
                  </div>
                </div>
              ) : (
                <div className="p-8 bg-gray-50 text-center">
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
                        <div className="flex items-center gap-1">
                          <User size={12} />
                          {version.created_by_name || version.created_by}
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

