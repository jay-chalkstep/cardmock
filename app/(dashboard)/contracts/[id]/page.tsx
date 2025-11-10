'use client';

import { useState, useEffect } from 'react';
import { useOrganization, useUser } from '@clerk/nextjs';
import { useRouter, useParams } from 'next/navigation';
import { usePanelContext } from '@/lib/contexts/PanelContext';
import GmailLayout from '@/components/layout/GmailLayout';
import Toast from '@/components/Toast';
import { EmailMockupEditor, EmailMockupList, EmailMockupPreview } from '@/components/email-mockups';
import { DocumentViewer } from '@/components/contracts';
import PaymentMethodForm from '@/components/contracts/PaymentMethodForm';
import { Upload, Download, FileText, Trash2, Plus, Eye } from 'lucide-react';

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
  const [activeTab, setActiveTab] = useState<'overview' | 'documents' | 'email-mockups' | 'payment-methods' | 'assets' | 'comments'>('overview');
  const [toasts, setToasts] = useState<ToastMessage[]>([]);
  
  // Documents state
  const [documents, setDocuments] = useState<any[]>([]);
  const [documentsLoading, setDocumentsLoading] = useState(false);
  const [showDocumentUpload, setShowDocumentUpload] = useState(false);
  const [selectedDocument, setSelectedDocument] = useState<any | null>(null);
  
  // Email mockups state
  const [showEmailMockupEditor, setShowEmailMockupEditor] = useState(false);
  const [editingEmailMockup, setEditingEmailMockup] = useState<any | null>(null);
  const [previewingEmailMockup, setPreviewingEmailMockup] = useState<any | null>(null);
  
  // Payment methods state
  const [paymentMethods, setPaymentMethods] = useState<any[]>([]);
  const [paymentMethodsLoading, setPaymentMethodsLoading] = useState(false);
  const [showPaymentMethodModal, setShowPaymentMethodModal] = useState(false);
  
  // Assets state
  const [assets, setAssets] = useState<any[]>([]);
  const [assetsLoading, setAssetsLoading] = useState(false);
  
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
    } else if (contractId && activeTab === 'email-mockups') {
      // Email mockups are fetched by EmailMockupList component
    } else if (contractId && activeTab === 'payment-methods') {
      fetchPaymentMethods();
    } else if (contractId && activeTab === 'assets') {
      fetchAssets();
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
      setDocuments(result.data?.documents || result.documents || []);
    } catch (error) {
      console.error('Error fetching documents:', error);
      showToast('Failed to load documents', 'error');
    } finally {
      setDocumentsLoading(false);
    }
  };

  const fetchPaymentMethods = async () => {
    if (!contractId) return;
    setPaymentMethodsLoading(true);
    try {
      const response = await fetch(`/api/contracts/${contractId}/payment-methods`);
      if (!response.ok) throw new Error('Failed to fetch payment methods');
      const result = await response.json();
      setPaymentMethods(result.data?.payment_methods || result.payment_methods || []);
    } catch (error) {
      console.error('Error fetching payment methods:', error);
      showToast('Failed to load payment methods', 'error');
    } finally {
      setPaymentMethodsLoading(false);
    }
  };

  const fetchAssets = async () => {
    if (!contractId) return;
    setAssetsLoading(true);
    try {
      const response = await fetch(`/api/assets?contract_id=${contractId}`);
      if (!response.ok) throw new Error('Failed to fetch assets');
      const result = await response.json();
      setAssets(result.data?.assets || result.assets || []);
    } catch (error) {
      console.error('Error fetching assets:', error);
      showToast('Failed to load assets', 'error');
    } finally {
      setAssetsLoading(false);
    }
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

  const handleDocumentUpload = async (file: File) => {
    if (!contractId) return;
    try {
      const formData = new FormData();
      formData.append('file', file);

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

  const handleCreateEmailMockup = async (mockupData: any) => {
    try {
      const response = await fetch('/api/email-mockups', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ...mockupData,
          contract_id: contractId,
        }),
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.message || 'Failed to create email mockup');
      }

      setShowEmailMockupEditor(false);
      showToast('Email mockup created successfully', 'success');
    } catch (error: any) {
      console.error('Error creating email mockup:', error);
      showToast(error.message || 'Failed to create email mockup', 'error');
      throw error;
    }
  };

  const handleUpdateEmailMockup = async (mockupId: string, mockupData: any) => {
    try {
      const response = await fetch(`/api/email-mockups/${mockupId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(mockupData),
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.message || 'Failed to update email mockup');
      }

      setShowEmailMockupEditor(false);
      setEditingEmailMockup(null);
      showToast('Email mockup updated successfully', 'success');
    } catch (error: any) {
      console.error('Error updating email mockup:', error);
      showToast(error.message || 'Failed to update email mockup', 'error');
      throw error;
    }
  };

  const handleDeleteEmailMockup = async (mockupId: string) => {
    if (!confirm('Are you sure you want to delete this email mockup?')) return;
    try {
      const response = await fetch(`/api/email-mockups/${mockupId}`, {
        method: 'DELETE',
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.message || 'Failed to delete email mockup');
      }

      showToast('Email mockup deleted successfully', 'success');
    } catch (error: any) {
      console.error('Error deleting email mockup:', error);
      showToast(error.message || 'Failed to delete email mockup', 'error');
    }
  };

  const handleCreatePaymentMethod = async (paymentData: any) => {
    try {
      const response = await fetch(`/api/contracts/${contractId}/payment-methods`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(paymentData),
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.message || 'Failed to create payment method');
      }

      await fetchPaymentMethods();
      setShowPaymentMethodModal(false);
      showToast('Payment method created successfully', 'success');
    } catch (error: any) {
      console.error('Error creating payment method:', error);
      showToast(error.message || 'Failed to create payment method', 'error');
      throw error;
    }
  };

  const handleDeletePaymentMethod = async (paymentId: string) => {
    if (!confirm('Are you sure you want to delete this payment method?')) return;
    try {
      const response = await fetch(`/api/contracts/${contractId}/payment-methods/${paymentId}`, {
        method: 'DELETE',
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.message || 'Failed to delete payment method');
      }

      await fetchPaymentMethods();
      showToast('Payment method deleted successfully', 'success');
    } catch (error: any) {
      console.error('Error deleting payment method:', error);
      showToast(error.message || 'Failed to delete payment method', 'error');
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
      <div className="space-y-2 text-sm">
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
    </div>
  );

  const tabs = [
    { id: 'overview', label: 'Overview' },
    { id: 'documents', label: 'Documents' },
    { id: 'email-mockups', label: 'Email Mockups' },
    { id: 'payment-methods', label: 'Payment Methods' },
    { id: 'assets', label: 'Assets' },
    { id: 'comments', label: 'Comments' },
  ];

  const renderTabContent = () => {
    switch (activeTab) {
      case 'overview':
        return (
          <div className="p-6">
            <h3 className="text-lg font-semibold mb-4">Contract Overview</h3>
            <div className="space-y-4">
              <div>
                <h4 className="font-medium mb-2">Contract Details</h4>
                <div className="space-y-2 text-sm">
                  <div><span className="font-medium">Contract Number:</span> {contract.contract_number}</div>
                  {contract.title && <div><span className="font-medium">Title:</span> {contract.title}</div>}
                  {contract.description && (
                    <div><span className="font-medium">Description:</span> {contract.description}</div>
                  )}
                  {contract.start_date && (
                    <div><span className="font-medium">Start Date:</span> {new Date(contract.start_date).toLocaleDateString()}</div>
                  )}
                  {contract.end_date && (
                    <div><span className="font-medium">End Date:</span> {new Date(contract.end_date).toLocaleDateString()}</div>
                  )}
                </div>
              </div>
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
                    <button
                      onClick={() => setShowDocumentUpload(true)}
                      className="px-3 py-1.5 text-sm font-medium text-white bg-blue-600 rounded-md hover:bg-blue-700 flex items-center gap-2"
                    >
                      <Upload size={16} />
                      Upload New Version
                    </button>
                  </div>
                </div>
                <div className="flex-1 overflow-hidden">
                  <DocumentViewer
                    document={selectedDocument}
                    contractId={contractId}
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
                  <div className="space-y-3">
                    {documents.map((doc) => (
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
                              {doc.docu_sign_status && (
                                <span className={`px-2 py-0.5 rounded-full text-xs ${
                                  doc.docu_sign_status === 'signed' ? 'bg-blue-100 text-blue-800' :
                                  doc.docu_sign_status === 'delivered' ? 'bg-yellow-100 text-yellow-800' :
                                  'bg-gray-100 text-gray-800'
                                }`}>
                                  {doc.docu_sign_status}
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
                    ))}
                  </div>
                )}
              </div>
            )}
          </div>
        );
      case 'email-mockups':
        return (
          <div className="p-6">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-semibold">Email Mockups</h3>
              <button
                onClick={() => {
                  setEditingEmailMockup(null);
                  setShowEmailMockupEditor(true);
                }}
                className="px-3 py-1.5 text-sm font-medium text-white bg-blue-600 rounded-md hover:bg-blue-700 flex items-center gap-2"
              >
                <Plus size={16} />
                New Email Mockup
              </button>
            </div>
            <EmailMockupList
              contractId={contractId}
              onEdit={(mockup) => {
                setEditingEmailMockup(mockup);
                setShowEmailMockupEditor(true);
              }}
              onDelete={handleDeleteEmailMockup}
              onView={(mockup) => setPreviewingEmailMockup(mockup)}
            />
            {showEmailMockupEditor && (
              <EmailMockupEditor
                isOpen={showEmailMockupEditor}
                onClose={() => {
                  setShowEmailMockupEditor(false);
                  setEditingEmailMockup(null);
                }}
                onSave={editingEmailMockup
                  ? (data) => handleUpdateEmailMockup(editingEmailMockup.id, data)
                  : handleCreateEmailMockup}
                contractId={contractId}
                initialData={editingEmailMockup || undefined}
              />
            )}
            {previewingEmailMockup && (
              <EmailMockupPreview
                isOpen={!!previewingEmailMockup}
                onClose={() => setPreviewingEmailMockup(null)}
                mockup={previewingEmailMockup}
              />
            )}
          </div>
        );
      case 'payment-methods':
        return (
          <div className="p-6">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-semibold">Payment Methods</h3>
              <button
                onClick={() => setShowPaymentMethodModal(true)}
                className="px-3 py-1.5 text-sm font-medium text-white bg-blue-600 rounded-md hover:bg-blue-700 flex items-center gap-2"
              >
                <Plus size={16} />
                Add Payment Method
              </button>
            </div>
            {paymentMethodsLoading ? (
              <div className="text-center text-gray-500 py-8">Loading payment methods...</div>
            ) : paymentMethods.length === 0 ? (
              <div className="text-center text-gray-500 py-8">
                <p>No payment methods added yet.</p>
                <p className="text-sm mt-2">Add a payment method to get started.</p>
              </div>
            ) : (
              <div className="space-y-3">
                {paymentMethods.map((method) => (
                  <div
                    key={method.id}
                    className="p-4 border border-gray-200 rounded-md hover:bg-gray-50"
                  >
                    <div className="flex items-start justify-between">
                      <div className="flex-1">
                        <div className="flex items-center gap-2 mb-2">
                          <h4 className="font-medium text-gray-900 capitalize">
                            {method.type.replace('_', ' ')}
                          </h4>
                          <span className={`px-2 py-1 text-xs rounded-full ${
                            method.status === 'approved' ? 'bg-green-100 text-green-800' :
                            method.status === 'rejected' ? 'bg-red-100 text-red-800' :
                            'bg-yellow-100 text-yellow-800'
                          }`}>
                            {method.status.replace('_', ' ')}
                          </span>
                        </div>
                        <div className="text-sm text-gray-600 space-y-1">
                          {method.details?.amount && (
                            <div>Amount: ${parseFloat(method.details.amount).toFixed(2)}</div>
                          )}
                          {method.details?.card_number && (
                            <div>Card Number: {method.details.card_number}</div>
                          )}
                          {method.details?.check_number && (
                            <div>Check Number: {method.details.check_number}</div>
                          )}
                          {method.details?.payable_to && (
                            <div>Payable To: {method.details.payable_to}</div>
                          )}
                          {method.details?.description && (
                            <div>{method.details.description}</div>
                          )}
                          {method.details?.notes && (
                            <div className="text-gray-500 italic">{method.details.notes}</div>
                          )}
                        </div>
                        {method.approved_by && (
                          <div className="text-xs text-gray-500 mt-2">
                            Approved by {method.approved_by} on {method.approved_at ? new Date(method.approved_at).toLocaleDateString() : ''}
                          </div>
                        )}
                      </div>
                      <button
                        onClick={() => handleDeletePaymentMethod(method.id)}
                        className="p-2 text-red-600 hover:text-red-900 hover:bg-red-50 rounded ml-4"
                        title="Delete"
                      >
                        <Trash2 size={18} />
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}
            {showPaymentMethodModal && (
              <PaymentMethodForm
                isOpen={showPaymentMethodModal}
                onClose={() => setShowPaymentMethodModal(false)}
                onSubmit={handleCreatePaymentMethod}
              />
            )}
          </div>
        );
      case 'assets':
        return (
          <div className="p-6">
            <h3 className="text-lg font-semibold mb-4">Assets</h3>
            {assetsLoading ? (
              <div className="text-center text-gray-500 py-8">Loading assets...</div>
            ) : assets.length === 0 ? (
              <div className="text-center text-gray-500 py-8">
                <p>No assets linked to this contract.</p>
                <p className="text-sm mt-2">Assets can be linked to contracts when created or updated.</p>
              </div>
            ) : (
              <div className="space-y-3">
                {assets.map((asset) => (
                  <div
                    key={asset.id}
                    onClick={() => router.push(`/mockups/${asset.id}`)}
                    className="p-4 border border-gray-200 rounded-md hover:bg-gray-50 cursor-pointer"
                  >
                    <div className="flex items-center gap-3">
                      {asset.mockup_image_url && (
                        <img
                          src={asset.mockup_image_url}
                          alt={asset.mockup_name}
                          className="w-16 h-16 object-cover rounded"
                        />
                      )}
                      <div className="flex-1">
                        <h4 className="font-medium text-gray-900">{asset.mockup_name}</h4>
                        {asset.project?.name && (
                          <p className="text-sm text-gray-600">Project: {asset.project.name}</p>
                        )}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
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
    </>
  );
}

