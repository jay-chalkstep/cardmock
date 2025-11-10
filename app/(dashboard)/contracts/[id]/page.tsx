'use client';

import { useState, useEffect } from 'react';
import { useOrganization, useUser } from '@clerk/nextjs';
import { useRouter, useParams } from 'next/navigation';
import { usePanelContext } from '@/lib/contexts/PanelContext';
import GmailLayout from '@/components/layout/GmailLayout';
import Toast from '@/components/Toast';
import { DocumentViewer } from '@/components/contracts';
import RouteForCommentModal from '@/components/contracts/RouteForCommentModal';
import RoutingHistoryPanel from '@/components/contracts/RoutingHistoryPanel';
import { Upload, Download, FileText, Trash2, Plus, Eye, Sparkles, ChevronDown, ChevronRight, Send } from 'lucide-react';

interface Client {
  id: string;
  name: string;
  email?: string;
}

interface Contract {
  id: string;
  client_id: string;
  project_id?: string;
  contract_number: string;
  status: string;
  type: string;
  parent_contract_id?: string;
  title?: string;
  description?: string;
  start_date?: string;
  end_date?: string;
  created_at: string;
  updated_at: string;
  ai_summary?: string;
  ai_summary_generated_at?: string;
  ai_changelog?: string;
  ai_changelog_generated_at?: string;
  clients?: Client;
  projects?: { id: string; name: string };
}

interface ToastMessage {
  message: string;
  type: 'success' | 'error';
  id: number;
}

export default function ContractDetailPage() {
  const { organization } = useOrganization();
  const { user } = useUser();
  const router = useRouter();
  const params = useParams();
  const { setActiveNav } = usePanelContext();

  const contractId = params?.id as string;

  const [contract, setContract] = useState<Contract | null>(null);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<'overview' | 'documents' | 'comments'>('overview');
  const [toasts, setToasts] = useState<ToastMessage[]>([]);
  
  // Documents state
  const [documents, setDocuments] = useState<any[]>([]);
  const [documentsWithVersions, setDocumentsWithVersions] = useState<any[]>([]);
  const [documentsLoading, setDocumentsLoading] = useState(false);
  const [showDocumentUpload, setShowDocumentUpload] = useState(false);
  const [selectedDocument, setSelectedDocument] = useState<any | null>(null);
  const [selectedVersionId, setSelectedVersionId] = useState<string | null>(null);
  const [versionDiffSummaries, setVersionDiffSummaries] = useState<Record<string, string>>({});
  const [loadingSummaries, setLoadingSummaries] = useState<Record<string, boolean>>({});
  const [summaryErrors, setSummaryErrors] = useState<Record<string, string>>({});
  const [documentSummaries, setDocumentSummaries] = useState<Record<string, string>>({});
  const [loadingDocumentSummaries, setLoadingDocumentSummaries] = useState<Record<string, boolean>>({});
  const [documentSummaryErrors, setDocumentSummaryErrors] = useState<Record<string, string>>({});
  const [expandedSections, setExpandedSections] = useState<Record<string, boolean>>({
    documentSummary: true,
    versionChanges: true,
    contractSummary: true,
    contractChangelog: true,
  });
  
  // Contract AI summary state
  const [loadingContractSummary, setLoadingContractSummary] = useState(false);
  const [contractSummaryError, setContractSummaryError] = useState<string | null>(null);
  const [loadingContractChangelog, setLoadingContractChangelog] = useState(false);
  const [contractChangelogError, setContractChangelogError] = useState<string | null>(null);
  
  // Comments state
  const [comments, setComments] = useState<any[]>([]);
  const [commentsLoading, setCommentsLoading] = useState(false);
  const [newComment, setNewComment] = useState('');

  const showToast = (message: string, type: 'success' | 'error') => {
    const id = Date.now();
    setToasts((prev) => [...prev, { message, type, id }]);
  };

  const removeToast = (id: number) => {
    setToasts((prev) => prev.filter((toast) => toast.id !== id));
  };

  useEffect(() => {
    setActiveNav('contracts');
  }, [setActiveNav]);

  useEffect(() => {
    if (contractId && organization?.id) {
      fetchContract();
    }
  }, [contractId, organization?.id]);

  useEffect(() => {
    if (contractId && activeTab === 'documents') {
      fetchDocuments();
    }
  }, [contractId, activeTab]);

  // Reset selectedVersionId when document changes (unless clicking a version)
  useEffect(() => {
    if (selectedDocument?.id && !selectedVersionId) {
      // Document was selected without a specific version, so reset to show current version
      setSelectedVersionId(null);
    }
  }, [selectedDocument?.id]);

  useEffect(() => {
    if (selectedDocument?.id && activeTab === 'documents') {
      const docId = selectedDocument.id;
      
      // Auto-fetch document summary when document is selected
      if (!documentSummaries[docId] && !loadingDocumentSummaries[docId]) {
        console.log('Fetching document summary for:', docId);
        fetchDocumentSummary(docId);
      }
      
      // Auto-fetch latest version diff summary
      const doc = documentsWithVersions.find((d: any) => d.id === docId);
      if (doc?.versions && doc.versions.length > 0) {
        const versions = doc.versions.sort((a: any, b: any) => b.version_number - a.version_number);
        const latestVersion = versions[0];
        if (latestVersion && latestVersion.version_number > 1) {
          const cacheKey = `${docId}-${latestVersion.id}`;
          if (!versionDiffSummaries[cacheKey] && !loadingSummaries[cacheKey] && !latestVersion.diff_summary) {
            console.log('Fetching version diff summary for:', docId, latestVersion.version_number);
            fetchVersionDiffSummary(docId, latestVersion);
          }
        }
      }
    }
  }, [selectedDocument?.id, activeTab, documentsWithVersions]);

  useEffect(() => {
    if (contractId && activeTab === 'documents') {
      fetchDocuments();
    } else if (contractId && activeTab === 'comments') {
      fetchComments();
    }
  }, [contractId, activeTab]);

  const fetchContract = async () => {
    if (!contractId) return;
    setLoading(true);
    try {
      const response = await fetch(`/api/contracts/${contractId}`);
      if (!response.ok) throw new Error('Failed to fetch contract');
      const result = await response.json();
      setContract(result.data?.contract || result.contract);
    } catch (error) {
      console.error('Error fetching contract:', error);
      showToast('Failed to load contract', 'error');
    } finally {
      setLoading(false);
    }
  };

  const fetchDocuments = async () => {
    if (!contractId) return;
    setDocumentsLoading(true);
    try {
      const response = await fetch(`/api/contracts/${contractId}/documents`);
      if (!response.ok) throw new Error('Failed to fetch documents');
      const result = await response.json();
      const fetchedDocuments = result.data?.documents || result.documents || [];
      setDocuments(fetchedDocuments);

      // Fetch all versions for each document
      const documentsWithVersionsData = await Promise.all(
        fetchedDocuments.map(async (doc: any) => {
          try {
            const versionsResponse = await fetch(`/api/contracts/${contractId}/documents/${doc.id}/versions`);
            if (versionsResponse.ok) {
              const versionsResult = await versionsResponse.json();
              const versions = versionsResult.data?.versions || versionsResult.versions || [];
              return {
                ...doc,
                versions: versions.sort((a: any, b: any) => b.version_number - a.version_number),
              };
            }
            return { ...doc, versions: [] };
          } catch (error) {
            console.error(`Error fetching versions for document ${doc.id}:`, error);
            return { ...doc, versions: [] };
          }
        })
      );

      setDocumentsWithVersions(documentsWithVersionsData);
    } catch (error) {
      console.error('Error fetching documents:', error);
      showToast('Failed to load documents', 'error');
    } finally {
      setDocumentsLoading(false);
    }
  };

  const fetchDocumentSummary = async (docId: string) => {
    if (documentSummaries[docId]) {
      return documentSummaries[docId];
    }

    setLoadingDocumentSummaries((prev) => ({ ...prev, [docId]: true }));
    setDocumentSummaryErrors((prev) => {
      const newErrors = { ...prev };
      delete newErrors[docId];
      return newErrors;
    });

    try {
      const response = await fetch(`/api/contracts/documents/${docId}/summary`, {
        method: 'POST',
      });
      
      const result = await response.json();
      
      if (response.ok) {
        const summary = result.data?.summary || result.summary;
        if (summary) {
          setDocumentSummaries((prev) => ({ ...prev, [docId]: summary }));
          setLoadingDocumentSummaries((prev) => {
            const newLoading = { ...prev };
            delete newLoading[docId];
            return newLoading;
          });
          return summary;
        }
      } else {
        const errorMsg = result.message || result.error || 'Failed to generate summary';
        setDocumentSummaryErrors((prev) => ({ ...prev, [docId]: errorMsg }));
      }
    } catch (error) {
      const errorMsg = error instanceof Error ? error.message : 'Failed to fetch summary';
      setDocumentSummaryErrors((prev) => ({ ...prev, [docId]: errorMsg }));
      console.error('Error fetching document summary:', error);
    } finally {
      setLoadingDocumentSummaries((prev) => {
        const newLoading = { ...prev };
        delete newLoading[docId];
        return newLoading;
      });
    }
    return null;
  };

  const fetchContractSummary = async () => {
    if (!contractId) return;
    setLoadingContractSummary(true);
    setContractSummaryError(null);
    try {
      const response = await fetch(`/api/contracts/${contractId}/summary`, {
        method: 'POST',
      });
      const result = await response.json();
      
      if (!response.ok) {
        const errorMsg = result.message || result.error || 'Failed to generate summary';
        setContractSummaryError(errorMsg);
        return;
      }
      
      // Update contract with new summary
      if (contract) {
        setContract({
          ...contract,
          ai_summary: result.data?.summary || result.summary,
          ai_summary_generated_at: result.data?.generated_at || result.generated_at,
        });
      }
    } catch (error) {
      const errorMsg = error instanceof Error ? error.message : 'Failed to fetch summary';
      setContractSummaryError(errorMsg);
      console.error('Error fetching contract summary:', error);
    } finally {
      setLoadingContractSummary(false);
    }
  };

  const fetchContractChangelog = async () => {
    if (!contractId) return;
    setLoadingContractChangelog(true);
    setContractChangelogError(null);
    try {
      const response = await fetch(`/api/contracts/${contractId}/changelog`, {
        method: 'POST',
      });
      const result = await response.json();
      
      if (!response.ok) {
        const errorMsg = result.message || result.error || 'Failed to generate changelog';
        setContractChangelogError(errorMsg);
        return;
      }
      
      // Update contract with new changelog
      if (contract) {
        setContract({
          ...contract,
          ai_changelog: result.data?.changelog || result.changelog,
          ai_changelog_generated_at: result.data?.generated_at || result.generated_at,
        });
      }
    } catch (error) {
      const errorMsg = error instanceof Error ? error.message : 'Failed to fetch changelog';
      setContractChangelogError(errorMsg);
      console.error('Error fetching contract changelog:', error);
    } finally {
      setLoadingContractChangelog(false);
    }
  };

  const fetchVersionDiffSummary = async (docId: string, version: any) => {
    const cacheKey = `${docId}-${version.id}`;
    
    // If we already have the summary cached, return it
    if (versionDiffSummaries[cacheKey]) {
      return versionDiffSummaries[cacheKey];
    }

    // If the version already has a diff_summary, use it
    if (version.diff_summary) {
      setVersionDiffSummaries((prev) => ({ ...prev, [cacheKey]: version.diff_summary }));
      setSummaryErrors((prev) => {
        const newErrors = { ...prev };
        delete newErrors[cacheKey];
        return newErrors;
      });
      return version.diff_summary;
    }

    // Only fetch if version > 1 (no previous version for v1)
    if (version.version_number <= 1) {
      return null;
    }

    // Set loading state
    setLoadingSummaries((prev) => ({ ...prev, [cacheKey]: true }));
    setSummaryErrors((prev) => {
      const newErrors = { ...prev };
      delete newErrors[cacheKey];
      return newErrors;
    });

    // Try to generate the diff summary for this specific version
    try {
      const response = await fetch(`/api/contracts/documents/${docId}/versions/${version.id}/diff`, {
        method: 'POST',
      });
      
      const result = await response.json();
      
      if (response.ok) {
        const summary = result.data?.diff_summary || result.diff_summary;
        if (summary) {
          setVersionDiffSummaries((prev) => ({ ...prev, [cacheKey]: summary }));
          setLoadingSummaries((prev) => {
            const newLoading = { ...prev };
            delete newLoading[cacheKey];
            return newLoading;
          });
          return summary;
        } else {
          // No summary returned
          const errorMsg = result.data?.message || result.message || 'No summary available';
          setSummaryErrors((prev) => ({ ...prev, [cacheKey]: errorMsg }));
        }
      } else {
        // API returned an error
        const errorMsg = result.message || result.error || 'Failed to generate summary';
        setSummaryErrors((prev) => ({ ...prev, [cacheKey]: errorMsg }));
        console.error('Error fetching diff summary:', result);
      }
    } catch (error) {
      const errorMsg = error instanceof Error ? error.message : 'Failed to fetch summary';
      setSummaryErrors((prev) => ({ ...prev, [cacheKey]: errorMsg }));
      console.error('Error fetching diff summary:', error);
    } finally {
      setLoadingSummaries((prev) => {
        const newLoading = { ...prev };
        delete newLoading[cacheKey];
        return newLoading;
      });
    }
    return null;
  };


  const fetchComments = async () => {
    if (!contractId) return;
    setCommentsLoading(true);
    try {
      // TODO: Implement comments API endpoint
      // For now, just set empty array
      setComments([]);
    } catch (error) {
      console.error('Error fetching comments:', error);
      showToast('Failed to load comments', 'error');
    } finally {
      setCommentsLoading(false);
    }
  };

  const [versionOwner, setVersionOwner] = useState<'cdco' | 'client'>('cdco');
  const [showRouteForCommentModal, setShowRouteForCommentModal] = useState(false);

  const handleDocumentUpload = async (file: File) => {
    if (!contractId) return;
    try {
      const formData = new FormData();
      formData.append('file', file);
      formData.append('version_owner', versionOwner);

      // If a document is selected, upload as a new version of that document
      // Otherwise, create a new document
      const endpoint = selectedDocument
        ? `/api/contracts/${contractId}/documents/${selectedDocument.id}/versions`
        : `/api/contracts/${contractId}/documents`;

      const response = await fetch(endpoint, {
        method: 'POST',
        body: formData,
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.message || 'Failed to upload document');
      }

      await fetchDocuments();
      setShowDocumentUpload(false);
      setVersionOwner('cdco'); // Reset to default
      showToast(
        selectedDocument 
          ? 'New version uploaded successfully' 
          : 'Document uploaded successfully', 
        'success'
      );
    } catch (error: any) {
      console.error('Error uploading document:', error);
      showToast(error.message || 'Failed to upload document', 'error');
    }
  };

  const handleDeleteDocument = async (docId: string) => {
    if (!confirm('Are you sure you want to delete this document?')) return;
    try {
      const response = await fetch(`/api/contracts/${contractId}/documents/${docId}`, {
        method: 'DELETE',
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.message || 'Failed to delete document');
      }

      await fetchDocuments();
      showToast('Document deleted successfully', 'success');
    } catch (error: any) {
      console.error('Error deleting document:', error);
      showToast(error.message || 'Failed to delete document', 'error');
    }
  };


  const handleAddComment = async () => {
    if (!newComment.trim() || !contractId) return;
    try {
      // TODO: Implement comments API endpoint
      // For now, just show a toast
      showToast('Comments feature coming soon', 'success');
      setNewComment('');
    } catch (error: any) {
      console.error('Error adding comment:', error);
      showToast(error.message || 'Failed to add comment', 'error');
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'draft':
        return 'bg-gray-100 text-gray-800';
      case 'pending_signature':
        return 'bg-yellow-100 text-yellow-800';
      case 'signed':
        return 'bg-green-100 text-green-800';
      case 'amended':
        return 'bg-blue-100 text-blue-800';
      case 'expired':
        return 'bg-red-100 text-red-800';
      case 'voided':
        return 'bg-gray-100 text-gray-600';
      default:
        return 'bg-gray-100 text-gray-800';
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-full">
        <div className="text-gray-500">Loading contract...</div>
      </div>
    );
  }

  if (!contract) {
    return (
      <div className="flex items-center justify-center h-full">
        <div className="text-gray-500">Contract not found</div>
      </div>
    );
  }

  const contextPanelContent = (
    <div className="p-4">
      <div className="mb-4">
        <button
          onClick={() => router.push('/contracts')}
          className="text-sm text-gray-600 hover:text-gray-900"
        >
          ← Back to Contracts
        </button>
      </div>
      <h2 className="text-lg font-semibold mb-2">{contract.contract_number}</h2>
      {contract.title && (
        <p className="text-sm text-gray-600 mb-4">{contract.title}</p>
      )}
      <div className="space-y-2 text-sm mb-6">
        <div>
          <span className="font-medium">Status:</span>{' '}
          <span className={`px-2 py-1 rounded-full text-xs ${getStatusColor(contract.status)}`}>
            {contract.status.replace('_', ' ')}
          </span>
        </div>
        {contract.clients && (
          <div>
            <span className="font-medium">Client:</span> {contract.clients.name}
          </div>
        )}
        {contract.projects && (
          <div>
            <span className="font-medium">Project:</span> {contract.projects.name}
          </div>
        )}
        {contract.type === 'amendment' && (
          <div>
            <span className="font-medium">Type:</span> Amendment
          </div>
        )}
      </div>

      {/* Document Summaries - Show when Documents tab is active */}
      {activeTab === 'documents' && (
        <div className="border-t border-gray-200 pt-3">
          {selectedDocument ? (
            <div className="space-y-2">
              {/* Document Summary Section */}
              <div>
                <button
                  onClick={() => setExpandedSections(prev => ({ ...prev, documentSummary: !prev.documentSummary }))}
                  className="w-full flex items-center justify-between p-2 hover:bg-gray-50 rounded transition-colors"
                >
                  <div className="flex items-center gap-2">
                    <Sparkles size={14} className="text-blue-600" />
                    <span className="text-xs font-medium text-gray-900">Document Summary</span>
                  </div>
                  {expandedSections.documentSummary ? (
                    <ChevronDown size={14} className="text-gray-400" />
                  ) : (
                    <ChevronRight size={14} className="text-gray-400" />
                  )}
                </button>
                
                {expandedSections.documentSummary && (
                  <div className="px-2 pb-2">
                    {loadingDocumentSummaries[selectedDocument.id] ? (
                      <div className="flex items-center gap-2 py-2 text-xs text-gray-500">
                        <div className="animate-spin rounded-full h-3 w-3 border-b-2 border-blue-600"></div>
                        <span>Generating...</span>
                      </div>
                    ) : documentSummaryErrors[selectedDocument.id] ? (
                      <div className="py-2 text-xs text-red-600">
                        <p className="mb-1">{documentSummaryErrors[selectedDocument.id]}</p>
                        <button
                          onClick={() => fetchDocumentSummary(selectedDocument.id)}
                          className="text-blue-600 hover:text-blue-700 underline"
                        >
                          Retry
                        </button>
                      </div>
                    ) : documentSummaries[selectedDocument.id] ? (
                      <div className="bg-gray-50 rounded p-2.5 text-xs text-gray-700 whitespace-pre-wrap leading-relaxed max-h-48 overflow-y-auto">
                        {documentSummaries[selectedDocument.id]}
                      </div>
                    ) : (
                      <button
                        onClick={() => fetchDocumentSummary(selectedDocument.id)}
                        className="text-xs text-blue-600 hover:text-blue-700 underline py-2"
                      >
                        Generate Summary
                      </button>
                    )}
                  </div>
                )}
              </div>

              {/* Version Changes Section */}
              {(() => {
                const doc = documentsWithVersions.find((d: any) => d.id === selectedDocument.id);
                if (!doc?.versions || doc.versions.length === 0) return null;
                
                const versions = doc.versions.sort((a: any, b: any) => b.version_number - a.version_number);
                const latestVersion = versions[0];
                const previousVersion = versions.find((v: any) => v.version_number === latestVersion?.version_number - 1);
                
                if (latestVersion && latestVersion.version_number > 1 && previousVersion) {
                  const cacheKey = `${selectedDocument.id}-${latestVersion.id}`;
                  const diffSummary = versionDiffSummaries[cacheKey] || latestVersion.diff_summary;
                  const isLoading = loadingSummaries[cacheKey];
                  const error = summaryErrors[cacheKey];

                  return (
                    <div>
                      <button
                        onClick={() => setExpandedSections(prev => ({ ...prev, versionChanges: !prev.versionChanges }))}
                        className="w-full flex items-center justify-between p-2 hover:bg-gray-50 rounded transition-colors"
                      >
                        <div className="flex items-center gap-2">
                          <Sparkles size={14} className="text-blue-600" />
                          <span className="text-xs font-medium text-gray-900">
                            Latest Changes (v{previousVersion.version_number} → v{latestVersion.version_number})
                          </span>
                        </div>
                        {expandedSections.versionChanges ? (
                          <ChevronDown size={14} className="text-gray-400" />
                        ) : (
                          <ChevronRight size={14} className="text-gray-400" />
                        )}
                      </button>
                      
                      {expandedSections.versionChanges && (
                        <div className="px-2 pb-2">
                          {isLoading ? (
                            <div className="flex items-center gap-2 py-2 text-xs text-gray-500">
                              <div className="animate-spin rounded-full h-3 w-3 border-b-2 border-blue-600"></div>
                              <span>Generating...</span>
                            </div>
                          ) : error ? (
                            <div className="py-2 text-xs text-red-600">
                              <p className="mb-1">{error}</p>
                              <button
                                onClick={() => fetchVersionDiffSummary(selectedDocument.id, latestVersion)}
                                className="text-blue-600 hover:text-blue-700 underline"
                              >
                                Retry
                              </button>
                            </div>
                          ) : diffSummary ? (
                            <div className="bg-blue-50 rounded p-2.5 text-xs text-gray-700 whitespace-pre-wrap leading-relaxed max-h-48 overflow-y-auto">
                              {diffSummary}
                            </div>
                          ) : (
                            <button
                              onClick={() => fetchVersionDiffSummary(selectedDocument.id, latestVersion)}
                              className="text-xs text-blue-600 hover:text-blue-700 underline py-2"
                            >
                              Generate Changes
                            </button>
                          )}
                        </div>
                      )}
                    </div>
                  );
                }
                return null;
              })()}
            </div>
          ) : (
            <div className="pt-2 text-xs text-gray-500">
              Select a document to view AI summaries
            </div>
          )}
        </div>
      )}
    </div>
  );

  const tabs = [
    { id: 'overview', label: 'Overview' },
    { id: 'documents', label: 'Documents' },
    { id: 'routing', label: 'Routing History' },
    { id: 'comments', label: 'Comments' },
  ];

  const renderTabContent = () => {
    switch (activeTab) {
      case 'overview':
        return (
          <div className="p-6 space-y-6">
            <h3 className="text-lg font-semibold mb-4">Contract Overview</h3>
            
            {/* Contract Details Table */}
            <div className="bg-white border border-gray-200 rounded-lg overflow-hidden">
              <table className="w-full">
                <tbody className="divide-y divide-gray-200">
                  <tr>
                    <td className="px-4 py-3 text-sm font-medium text-gray-700 bg-gray-50 w-1/3">Contract Number</td>
                    <td className="px-4 py-3 text-sm text-gray-900">{contract.contract_number}</td>
                  </tr>
                  {contract.title && (
                    <tr>
                      <td className="px-4 py-3 text-sm font-medium text-gray-700 bg-gray-50">Title</td>
                      <td className="px-4 py-3 text-sm text-gray-900">{contract.title}</td>
                    </tr>
                  )}
                  {contract.description && (
                    <tr>
                      <td className="px-4 py-3 text-sm font-medium text-gray-700 bg-gray-50">Description</td>
                      <td className="px-4 py-3 text-sm text-gray-900">{contract.description}</td>
                    </tr>
                  )}
                  {contract.start_date && (
                    <tr>
                      <td className="px-4 py-3 text-sm font-medium text-gray-700 bg-gray-50">Start Date</td>
                      <td className="px-4 py-3 text-sm text-gray-900">{new Date(contract.start_date).toLocaleDateString()}</td>
                    </tr>
                  )}
                  {contract.end_date && (
                    <tr>
                      <td className="px-4 py-3 text-sm font-medium text-gray-700 bg-gray-50">End Date</td>
                      <td className="px-4 py-3 text-sm text-gray-900">{new Date(contract.end_date).toLocaleDateString()}</td>
                    </tr>
                  )}
                  <tr>
                    <td className="px-4 py-3 text-sm font-medium text-gray-700 bg-gray-50">Status</td>
                    <td className="px-4 py-3 text-sm">
                      <span className={`px-2 py-1 text-xs rounded-full ${
                        contract.status === 'signed' ? 'bg-green-100 text-green-800' :
                        contract.status === 'pending_signature' ? 'bg-yellow-100 text-yellow-800' :
                        contract.status === 'draft' ? 'bg-gray-100 text-gray-800' :
                        'bg-blue-100 text-blue-800'
                      }`}>
                        {contract.status.replace('_', ' ')}
                      </span>
                    </td>
                  </tr>
                  <tr>
                    <td className="px-4 py-3 text-sm font-medium text-gray-700 bg-gray-50">Type</td>
                    <td className="px-4 py-3 text-sm text-gray-900 capitalize">{contract.type}</td>
                  </tr>
                </tbody>
              </table>
            </div>

            {/* AI Contract Summary */}
            <div className="bg-white border border-gray-200 rounded-lg overflow-hidden">
              <div className="px-4 py-3 bg-gray-50 border-b border-gray-200 flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Sparkles size={16} className="text-blue-600" />
                  <h4 className="font-medium text-sm">AI Contract Summary</h4>
                  {contract.ai_summary_generated_at && (
                    <span className="text-xs text-gray-500">
                      (Generated {new Date(contract.ai_summary_generated_at).toLocaleDateString()})
                    </span>
                  )}
                </div>
                <button
                  onClick={() => setExpandedSections(prev => ({ ...prev, contractSummary: !prev.contractSummary }))}
                  className="text-gray-400 hover:text-gray-600"
                >
                  {expandedSections.contractSummary ? (
                    <ChevronDown size={16} />
                  ) : (
                    <ChevronRight size={16} />
                  )}
                </button>
              </div>
              
              {expandedSections.contractSummary && (
                <div className="p-4">
                  {loadingContractSummary ? (
                    <div className="flex items-center gap-2 py-4 text-sm text-gray-500">
                      <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-blue-600"></div>
                      <span>Generating comprehensive summary...</span>
                    </div>
                  ) : contractSummaryError ? (
                    <div className="py-2 text-sm text-red-600">
                      <p className="mb-2">{contractSummaryError}</p>
                      <button
                        onClick={fetchContractSummary}
                        className="text-blue-600 hover:text-blue-700 underline"
                      >
                        Retry
                      </button>
                    </div>
                  ) : contract.ai_summary ? (
                    <div className="text-sm text-gray-700 leading-relaxed whitespace-pre-line">
                      {contract.ai_summary.split('\n').map((paragraph, index) => (
                        paragraph.trim() ? (
                          <p key={index} className="mb-3 last:mb-0">
                            {paragraph.trim()}
                          </p>
                        ) : null
                      ))}
                    </div>
                  ) : (
                    <div className="py-2 text-sm text-gray-500">
                      <p className="mb-2">No summary available. Generate a comprehensive AI summary from all contract documents.</p>
                      <button
                        onClick={fetchContractSummary}
                        className="px-3 py-1.5 text-sm font-medium text-white bg-blue-600 rounded-md hover:bg-blue-700"
                      >
                        Generate Summary
                      </button>
                    </div>
                  )}
                </div>
              )}
            </div>

            {/* AI Changelog */}
            <div className="bg-white border border-gray-200 rounded-lg overflow-hidden">
              <div className="px-4 py-3 bg-gray-50 border-b border-gray-200 flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Sparkles size={16} className="text-blue-600" />
                  <h4 className="font-medium text-sm">Version Changelog</h4>
                  {contract.ai_changelog_generated_at && (
                    <span className="text-xs text-gray-500">
                      (Generated {new Date(contract.ai_changelog_generated_at).toLocaleDateString()})
                    </span>
                  )}
                </div>
                <button
                  onClick={() => setExpandedSections(prev => ({ ...prev, contractChangelog: !prev.contractChangelog }))}
                  className="text-gray-400 hover:text-gray-600"
                >
                  {expandedSections.contractChangelog ? (
                    <ChevronDown size={16} />
                  ) : (
                    <ChevronRight size={16} />
                  )}
                </button>
              </div>
              
              {expandedSections.contractChangelog && (
                <div className="p-4">
                  {loadingContractChangelog ? (
                    <div className="flex items-center gap-2 py-4 text-sm text-gray-500">
                      <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-blue-600"></div>
                      <span>Generating comprehensive changelog...</span>
                    </div>
                  ) : contractChangelogError ? (
                    <div className="py-2 text-sm text-red-600">
                      <p className="mb-2">{contractChangelogError}</p>
                      <button
                        onClick={fetchContractChangelog}
                        className="text-blue-600 hover:text-blue-700 underline"
                      >
                        Retry
                      </button>
                    </div>
                  ) : contract.ai_changelog ? (
                    <div className="text-sm text-gray-700 leading-relaxed max-h-96 overflow-y-auto whitespace-pre-line">
                      {contract.ai_changelog.split('\n').map((line, index) => {
                        // Check if line looks like a version header (starts with "Version" or "v")
                        if (line.trim().match(/^(Version|v\d+)/i)) {
                          return (
                            <h5 key={index} className="font-semibold mt-4 mb-2 first:mt-0">
                              {line.trim()}
                            </h5>
                          );
                        }
                        // Check if line looks like a bullet point
                        if (line.trim().startsWith('-') || line.trim().startsWith('•')) {
                          return (
                            <div key={index} className="ml-4 mb-1">
                              {line.trim()}
                            </div>
                          );
                        }
                        // Regular paragraph
                        if (line.trim()) {
                          return (
                            <p key={index} className="mb-2">
                              {line.trim()}
                            </p>
                          );
                        }
                        return null;
                      })}
                    </div>
                  ) : (
                    <div className="py-2 text-sm text-gray-500">
                      <p className="mb-2">No changelog available. Generate a comprehensive AI changelog from all version changes.</p>
                      <button
                        onClick={fetchContractChangelog}
                        className="px-3 py-1.5 text-sm font-medium text-white bg-blue-600 rounded-md hover:bg-blue-700"
                      >
                        Generate Changelog
                      </button>
                    </div>
                  )}
                </div>
              )}
            </div>
          </div>
        );
      case 'documents':
        return (
          <div className="flex flex-col h-full">
            {selectedDocument ? (
              <div className="flex-1 flex flex-col">
                <div className="p-4 border-b border-gray-200 bg-white">
                  <div className="flex items-center justify-between">
                    <button
                      onClick={() => setSelectedDocument(null)}
                      className="text-sm text-gray-600 hover:text-gray-900 flex items-center gap-2"
                    >
                      ← Back to Documents
                    </button>
                    <div className="flex items-center gap-2">
                      {selectedDocument?.is_current && (
                        <button
                          onClick={() => setShowRouteForCommentModal(true)}
                          className="px-3 py-1.5 text-sm font-medium text-white bg-green-600 rounded-md hover:bg-green-700 flex items-center gap-2"
                        >
                          <Send size={16} />
                          Route for Comment
                        </button>
                      )}
                      <button
                        onClick={() => setShowDocumentUpload(true)}
                        className="px-3 py-1.5 text-sm font-medium text-white bg-blue-600 rounded-md hover:bg-blue-700 flex items-center gap-2"
                      >
                        <Upload size={16} />
                        Upload New Version
                      </button>
                    </div>
                  </div>
                </div>
                <div className="flex-1 overflow-hidden">
                  <DocumentViewer
                    document={selectedDocument}
                    contractId={contractId}
                    initialVersionId={selectedVersionId}
                    onVersionSelect={(version) => {
                      // Handle version selection if needed
                    }}
                    onDownload={(url, fileName) => {
                      const link = document.createElement('a');
                      link.href = url;
                      link.download = fileName;
                      link.target = '_blank';
                      document.body.appendChild(link);
                      link.click();
                      document.body.removeChild(link);
                    }}
                    onSendForSignature={(docId) => {
                      // TODO: Implement DocuSign integration
                      showToast('DocuSign integration coming soon', 'error');
                    }}
                  />
                </div>
              </div>
            ) : (
              <div className="p-6">
                <div className="flex items-center justify-between mb-4">
                  <h3 className="text-lg font-semibold">Documents</h3>
                  <button
                    onClick={() => setShowDocumentUpload(true)}
                    className="px-3 py-1.5 text-sm font-medium text-white bg-blue-600 rounded-md hover:bg-blue-700 flex items-center gap-2"
                  >
                    <Upload size={16} />
                    Upload Document
                  </button>
                </div>
                {documentsLoading ? (
                  <div className="text-center text-gray-500 py-8">Loading documents...</div>
                ) : documents.length === 0 ? (
                  <div className="text-center text-gray-500 py-8">
                    <FileText size={48} className="mx-auto mb-4 text-gray-300" />
                    <p>No documents uploaded yet.</p>
                    <p className="text-sm mt-2">Upload a Word document to get started.</p>
                  </div>
                ) : (
                  <div className="space-y-4">
                    {documentsWithVersions.length > 0 ? (
                      documentsWithVersions.map((doc) => (
                        <div key={doc.id} className="border border-gray-200 rounded-md overflow-hidden">
                          {/* Document Header */}
                          <div
                            className="p-4 bg-white hover:bg-gray-50 flex items-center justify-between cursor-pointer"
                            onClick={() => setSelectedDocument(doc)}
                          >
                            <div className="flex items-center gap-3 flex-1">
                              <FileText size={24} className="text-gray-400" />
                              <div className="flex-1">
                                <h4 className="font-medium text-gray-900">{doc.file_name}</h4>
                                <div className="flex items-center gap-4 text-sm text-gray-500 mt-1">
                                  <span>{doc.versions?.length || 0} version{doc.versions?.length !== 1 ? 's' : ''}</span>
                                  {doc.is_current && (
                                    <span className="px-2 py-0.5 bg-green-100 text-green-800 rounded-full text-xs">
                                      Current: Version {doc.version_number}
                                    </span>
                                  )}
                                  {doc.version_owner && (
                                    <span className={`px-2 py-0.5 rounded-full text-xs ${
                                      doc.version_owner === 'client' ? 'bg-yellow-100 text-yellow-800' : 'bg-blue-100 text-blue-800'
                                    }`}>
                                      {doc.version_owner === 'client' ? "Client's Version" : "CDCO's Version"}
                                    </span>
                                  )}
                                  {doc.docu_sign_status && (
                                    <span className={`px-2 py-0.5 rounded-full text-xs ${
                                      doc.docu_sign_status === 'signed' ? 'bg-blue-100 text-blue-800' :
                                      doc.docu_sign_status === 'delivered' ? 'bg-yellow-100 text-yellow-800' :
                                      'bg-gray-100 text-gray-800'
                                    }`}>
                                      {doc.docu_sign_status}
                                    </span>
                                  )}
                                </div>
                              </div>
                            </div>
                            <div className="flex items-center gap-2">
                              {doc.is_current && (
                                <button
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    setSelectedDocument(doc);
                                    setShowRouteForCommentModal(true);
                                  }}
                                  className="p-2 text-blue-600 hover:text-blue-800 hover:bg-blue-50 rounded"
                                  title="Route for Comment"
                                >
                                  <Send size={18} />
                                </button>
                              )}
                              <button
                                onClick={(e) => {
                                  e.stopPropagation();
                                  setSelectedDocument(doc);
                                }}
                                className="p-2 text-gray-600 hover:text-gray-900 hover:bg-gray-100 rounded"
                                title="View"
                              >
                                <Eye size={18} />
                              </button>
                              <a
                                href={doc.file_url}
                                target="_blank"
                                rel="noopener noreferrer"
                                onClick={(e) => e.stopPropagation()}
                                className="p-2 text-gray-600 hover:text-gray-900 hover:bg-gray-100 rounded"
                                title="Download"
                              >
                                <Download size={18} />
                              </a>
                              <button
                                onClick={(e) => {
                                  e.stopPropagation();
                                  handleDeleteDocument(doc.id);
                                }}
                                className="p-2 text-red-600 hover:text-red-900 hover:bg-red-50 rounded"
                                title="Delete"
                              >
                                <Trash2 size={18} />
                              </button>
                            </div>
                          </div>

                          {/* Version History */}
                          {doc.versions && doc.versions.length > 0 && (
                            <div className="border-t border-gray-200 bg-gray-50">
                              <div className="p-2 text-xs font-medium text-gray-600 px-4">Version History</div>
                              <div className="divide-y divide-gray-200">
                                {doc.versions.map((version: any, index: number) => {
                                  return (
                                    <div
                                      key={version.id}
                                      className="px-4 py-3 hover:bg-white transition-colors cursor-pointer"
                                      onClick={(e) => {
                                        e.stopPropagation();
                                        setSelectedDocument(doc);
                                        setSelectedVersionId(version.id);
                                      }}
                                    >
                                      <div className="flex items-center justify-between">
                                        <div className="flex items-center gap-3 flex-1">
                                          <div className="flex items-center gap-2">
                                            {version.version_number === doc.version_number && doc.is_current ? (
                                              <span className="w-2 h-2 bg-green-500 rounded-full"></span>
                                            ) : (
                                              <span className="w-2 h-2 bg-gray-300 rounded-full"></span>
                                            )}
                                            <span className="text-sm font-medium text-gray-900">
                                              Version {version.version_number}
                                            </span>
                                            {version.version_number === doc.version_number && doc.is_current && (
                                              <span className="px-2 py-0.5 bg-green-100 text-green-800 rounded-full text-xs">
                                                Current
                                              </span>
                                            )}
                                          </div>
                                          <span className="text-xs text-gray-500">
                                            {new Date(version.created_at).toLocaleDateString('en-US', {
                                              year: 'numeric',
                                              month: 'short',
                                              day: 'numeric',
                                              hour: '2-digit',
                                              minute: '2-digit',
                                            })}
                                          </span>
                                        </div>
                                        <div className="flex items-center gap-2">
                                          <a
                                            href={version.file_url}
                                            target="_blank"
                                            rel="noopener noreferrer"
                                            onClick={(e) => e.stopPropagation()}
                                            className="p-1.5 text-gray-600 hover:text-gray-900 hover:bg-gray-100 rounded"
                                            title="Download Version"
                                          >
                                            <Download size={16} />
                                          </a>
                                        </div>
                                      </div>
                                    </div>
                                  );
                                })}
                              </div>
                            </div>
                          )}
                        </div>
                      ))
                    ) : documents.length > 0 ? (
                      // Fallback to old view if versions haven't loaded yet
                      documents.map((doc) => (
                        <div
                          key={doc.id}
                          className="p-4 border border-gray-200 rounded-md hover:bg-gray-50 flex items-center justify-between cursor-pointer"
                          onClick={() => setSelectedDocument(doc)}
                        >
                          <div className="flex items-center gap-3 flex-1">
                            <FileText size={24} className="text-gray-400" />
                            <div className="flex-1">
                              <h4 className="font-medium text-gray-900">{doc.file_name}</h4>
                              <div className="flex items-center gap-4 text-sm text-gray-500 mt-1">
                                <span>Version {doc.version_number}</span>
                                {doc.is_current && (
                                  <span className="px-2 py-0.5 bg-green-100 text-green-800 rounded-full text-xs">
                                    Current
                                  </span>
                                )}
                                <span>{new Date(doc.created_at).toLocaleDateString()}</span>
                              </div>
                            </div>
                          </div>
                          <div className="flex items-center gap-2">
                            <button
                              onClick={(e) => {
                                e.stopPropagation();
                                setSelectedDocument(doc);
                              }}
                              className="p-2 text-gray-600 hover:text-gray-900 hover:bg-gray-100 rounded"
                              title="View"
                            >
                              <Eye size={18} />
                            </button>
                            <a
                              href={doc.file_url}
                              target="_blank"
                              rel="noopener noreferrer"
                              onClick={(e) => e.stopPropagation()}
                              className="p-2 text-gray-600 hover:text-gray-900 hover:bg-gray-100 rounded"
                              title="Download"
                            >
                              <Download size={18} />
                            </a>
                            <button
                              onClick={(e) => {
                                e.stopPropagation();
                                handleDeleteDocument(doc.id);
                              }}
                              className="p-2 text-red-600 hover:text-red-900 hover:bg-red-50 rounded"
                              title="Delete"
                            >
                              <Trash2 size={18} />
                            </button>
                          </div>
                        </div>
                      ))
                    ) : null}
                  </div>
                )}
              </div>
            )}
          </div>
        );
      case 'routing':
        return (
          <div className="p-6">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-semibold">Routing History</h3>
              <button
                onClick={() => setShowRouteForCommentModal(true)}
                className="px-3 py-1.5 text-sm font-medium text-white bg-blue-600 rounded-md hover:bg-blue-700 flex items-center gap-2"
              >
                <Send size={16} />
                Route for Comment
              </button>
            </div>
            <RoutingHistoryPanel contractId={contractId} />
          </div>
        );
      case 'comments':
        return (
          <div className="p-6">
            <h3 className="text-lg font-semibold mb-4">Comments</h3>
            {commentsLoading ? (
              <div className="text-center text-gray-500 py-8">Loading comments...</div>
            ) : (
              <div className="space-y-4">
                <div className="border border-gray-200 rounded-md p-4">
                  <textarea
                    value={newComment}
                    onChange={(e) => setNewComment(e.target.value)}
                    placeholder="Add a comment..."
                    rows={3}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                  <button
                    onClick={handleAddComment}
                    disabled={!newComment.trim()}
                    className="mt-2 px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    Add Comment
                  </button>
                </div>
                {comments.length === 0 ? (
                  <div className="text-center text-gray-500 py-8">
                    <p>No comments yet.</p>
                    <p className="text-sm mt-2">Be the first to add a comment.</p>
                  </div>
                ) : (
                  <div className="space-y-3">
                    {comments.map((comment) => (
                      <div key={comment.id} className="p-4 border border-gray-200 rounded-md">
                        <div className="flex items-start justify-between mb-2">
                          <div className="font-medium text-gray-900">{comment.user_name || 'User'}</div>
                          <div className="text-sm text-gray-500">
                            {new Date(comment.created_at).toLocaleDateString()}
                          </div>
                        </div>
                        <p className="text-gray-700">{comment.content}</p>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}
          </div>
        );
      default:
        return null;
    }
  };

  const previewArea = (
    <div className="flex flex-col h-full">
      <div className="border-b border-gray-200 bg-white">
        <div className="flex gap-1 px-4">
          {tabs.map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id as any)}
              className={`px-4 py-3 text-sm font-medium border-b-2 transition-colors ${
                activeTab === tab.id
                  ? 'border-blue-500 text-blue-600'
                  : 'border-transparent text-gray-500 hover:text-gray-700'
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>
      </div>
      <div className="flex-1 overflow-y-auto">
        {renderTabContent()}
      </div>
    </div>
  );

  return (
    <>
      <GmailLayout
        contextPanel={contextPanelContent}
        previewArea={previewArea}
      />
      {toasts.map((toast) => (
        <Toast
          key={toast.id}
          message={toast.message}
          type={toast.type}
          onClose={() => removeToast(toast.id)}
        />
      ))}
      {showDocumentUpload && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg shadow-xl w-full max-w-md p-6">
            <h3 className="text-lg font-semibold mb-4">
              {selectedDocument ? 'Upload New Version' : 'Upload Document'}
            </h3>
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium mb-2">Version Owner</label>
                <div className="flex gap-4">
                  <label className="flex items-center gap-2 cursor-pointer">
                    <input
                      type="radio"
                      name="version_owner"
                      value="cdco"
                      checked={versionOwner === 'cdco'}
                      onChange={() => setVersionOwner('cdco')}
                      className="text-blue-600 focus:ring-blue-500"
                    />
                    <span className="text-sm">CDCO's Version</span>
                  </label>
                  <label className="flex items-center gap-2 cursor-pointer">
                    <input
                      type="radio"
                      name="version_owner"
                      value="client"
                      checked={versionOwner === 'client'}
                      onChange={() => setVersionOwner('client')}
                      className="text-blue-600 focus:ring-blue-500"
                    />
                    <span className="text-sm">Client's Version</span>
                  </label>
                </div>
                <p className="text-xs text-gray-500 mt-1">
                  Indicates whether this version represents CDCO's or the client's latest offering
                </p>
              </div>
              <input
                type="file"
                accept=".doc,.docx,application/msword,application/vnd.openxmlformats-officedocument.wordprocessingml.document"
                onChange={(e) => {
                  const file = e.target.files?.[0];
                  if (file) {
                    handleDocumentUpload(file);
                  }
                }}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>
            <div className="flex gap-3 mt-4">
              <button
                onClick={() => setShowDocumentUpload(false)}
                className="flex-1 px-4 py-2 border border-gray-300 rounded-md hover:bg-gray-50"
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}
      <RouteForCommentModal
        isOpen={showRouteForCommentModal}
        onClose={() => setShowRouteForCommentModal(false)}
        contractId={contractId}
        documentId={selectedDocument?.id}
        onSuccess={() => {
          // Refresh routing history if on routing tab
          if (activeTab === 'routing') {
            // Component will auto-refresh
          }
        }}
      />
    </>
  );
}

