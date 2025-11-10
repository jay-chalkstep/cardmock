'use client';

import { useState, useEffect } from 'react';
import { useOrganization, useUser } from '@clerk/nextjs';
import { useRouter } from 'next/navigation';
import { usePanelContext } from '@/lib/contexts/PanelContext';
import GmailLayout from '@/components/layout/GmailLayout';
import ListView from '@/components/lists/ListView';
import ListToolbar from '@/components/lists/ListToolbar';
import Toast from '@/components/Toast';
import { NewContractModal } from '@/components/contracts';

interface Client {
  id: string;
  name: string;
  email?: string;
  phone?: string;
  created_at: string;
}

interface Contract {
  id: string;
  client_id: string;
  project_id?: string;
  contract_number: string;
  status: 'draft' | 'pending_signature' | 'signed' | 'amended' | 'expired' | 'voided';
  type: 'new' | 'amendment';
  parent_contract_id?: string;
  title?: string;
  description?: string;
  start_date?: string;
  end_date?: string;
  organization_id: string;
  created_by: string;
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

export default function ContractsPage() {
  const { organization, isLoaded, membership } = useOrganization();
  const { user } = useUser();
  const router = useRouter();
  const { selectedIds, setSelectedIds, setActiveNav } = usePanelContext();

  const [contracts, setContracts] = useState<Contract[]>([]);
  const [filteredContracts, setFilteredContracts] = useState<Contract[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [typeFilter, setTypeFilter] = useState<string>('all');
  const [showNewContractModal, setShowNewContractModal] = useState(false);
  const [toasts, setToasts] = useState<ToastMessage[]>([]);
  const [selectedContract, setSelectedContract] = useState<Contract | null>(null);
  const [aiSummary, setAiSummary] = useState<string | null>(null);
  const [summaryLoading, setSummaryLoading] = useState(false);

  const showToast = (message: string, type: 'success' | 'error') => {
    const id = Date.now();
    setToasts((prev) => [...prev, { message, type, id }]);
  };

  const removeToast = (id: number) => {
    setToasts((prev) => prev.filter((toast) => toast.id !== id));
  };

  useEffect(() => {
    setActiveNav('contracts');
    setSelectedIds([]);
  }, [setActiveNav, setSelectedIds]);

  useEffect(() => {
    if (organization?.id && user?.id) {
      fetchContracts();
    }
  }, [organization?.id, user?.id]);

  useEffect(() => {
    let filtered = contracts;
    
    if (statusFilter !== 'all') {
      filtered = filtered.filter((c) => c.status === statusFilter);
    }
    
    if (typeFilter !== 'all') {
      filtered = filtered.filter((c) => c.type === typeFilter);
    }
    
    if (searchTerm) {
      filtered = filtered.filter(
        (contract) =>
          contract.contract_number.toLowerCase().includes(searchTerm.toLowerCase()) ||
          contract.title?.toLowerCase().includes(searchTerm.toLowerCase()) ||
          contract.description?.toLowerCase().includes(searchTerm.toLowerCase()) ||
          contract.clients?.name.toLowerCase().includes(searchTerm.toLowerCase())
      );
    }
    
    setFilteredContracts(filtered);
  }, [searchTerm, statusFilter, typeFilter, contracts]);

  const fetchContracts = async () => {
    if (!organization?.id) return;
    setLoading(true);
    try {
      const response = await fetch('/api/contracts');
      if (!response.ok) throw new Error('Failed to fetch contracts');
      const result = await response.json();
      const fetchedContracts = result.data?.contracts || result.contracts || [];
      setContracts(fetchedContracts);
    } catch (error) {
      console.error('Error fetching contracts:', error);
      showToast('Failed to load contracts', 'error');
    } finally {
      setLoading(false);
    }
  };

  const handleContractClick = (contractId: string, e?: React.MouseEvent) => {
    // Don't navigate if clicking on delete button
    if (e && (e.target as HTMLElement).closest('button')) {
      return;
    }
    
    const contract = filteredContracts.find(c => c.id === contractId);
    if (contract) {
      setSelectedContract(contract);
      fetchContractSummary(contractId);
    }
  };

  const handleDeleteContract = async (contractId: string, e: React.MouseEvent) => {
    e.stopPropagation();
    
    if (!confirm('Are you sure you want to delete this contract? This action cannot be undone.')) {
      return;
    }

    try {
      const response = await fetch(`/api/contracts/${contractId}`, {
        method: 'DELETE',
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.message || 'Failed to delete contract');
      }

      // Remove from local state
      setContracts(prev => prev.filter(c => c.id !== contractId));
      if (selectedContract?.id === contractId) {
        setSelectedContract(null);
        setAiSummary(null);
      }
      showToast('Contract deleted successfully', 'success');
    } catch (error: any) {
      console.error('Error deleting contract:', error);
      showToast(error.message || 'Failed to delete contract', 'error');
    }
  };

  const fetchContractSummary = async (contractId: string) => {
    setSummaryLoading(true);
    setAiSummary(null);
    
    try {
      // First, try to get the contract with its stored summary
      const contractResponse = await fetch(`/api/contracts/${contractId}`);
      if (contractResponse.ok) {
        const contractResult = await contractResponse.json();
        const contract = contractResult.data?.contract || contractResult.contract;
        
        if (contract?.ai_summary) {
          setAiSummary(contract.ai_summary);
          setSummaryLoading(false);
          return;
        }
      }

      // If no stored summary, try to generate one
      const summaryResponse = await fetch(`/api/contracts/${contractId}/summary`, {
        method: 'POST',
      });

      if (summaryResponse.ok) {
        const summaryResult = await summaryResponse.json();
        const summary = summaryResult.data?.summary || summaryResult.summary;
        if (summary) {
          setAiSummary(summary);
        } else {
          setAiSummary('No summary available. Please generate a summary from the contract detail page.');
        }
      } else {
        setAiSummary('Summary not available. Please generate a summary from the contract detail page.');
      }
    } catch (error) {
      console.error('Error fetching contract summary:', error);
      setAiSummary('Failed to load summary. Please try again later.');
    } finally {
      setSummaryLoading(false);
    }
  };

  const canDeleteContract = (contract: Contract): boolean => {
    if (!user?.id) return false;
    const isAdmin = membership?.role === 'org:admin';
    return contract.created_by === user.id || isAdmin;
  };

  const handleCreateContract = async (contractData: {
    client_id: string;
    project_id?: string;
    contract_number?: string;
    type: 'new' | 'amendment';
    parent_contract_id?: string;
    title?: string;
    description?: string;
  }): Promise<{ id: string }> => {
    try {
      const response = await fetch('/api/contracts', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(contractData),
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.message || 'Failed to create contract');
      }

      const result = await response.json();
      await fetchContracts();
      showToast('Contract created successfully', 'success');
      return { id: result.data?.contract?.id || result.data?.id || '' };
    } catch (error: any) {
      console.error('Error creating contract:', error);
      showToast(error.message || 'Failed to create contract', 'error');
      throw error;
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

  // Context Panel
  const contextPanelContent = (
    <div className="p-4">
      <div className="flex items-center justify-between mb-4">
        <h2 className="text-lg font-semibold">Contracts</h2>
        <button
          onClick={() => setShowNewContractModal(true)}
          className="px-3 py-1.5 text-sm font-medium text-white bg-blue-600 rounded-md hover:bg-blue-700"
        >
          New
        </button>
      </div>
      <div className="space-y-4">
        <div>
          <label className="block text-sm font-medium mb-2">Search</label>
          <input
            type="text"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            placeholder="Search contracts..."
            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
        </div>
        <div>
          <label className="block text-sm font-medium mb-2">Status</label>
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
          >
            <option value="all">All Statuses</option>
            <option value="draft">Draft</option>
            <option value="pending_signature">Pending Signature</option>
            <option value="signed">Signed</option>
            <option value="amended">Amended</option>
            <option value="expired">Expired</option>
            <option value="voided">Voided</option>
          </select>
        </div>
        <div>
          <label className="block text-sm font-medium mb-2">Type</label>
          <select
            value={typeFilter}
            onChange={(e) => setTypeFilter(e.target.value)}
            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
          >
            <option value="all">All Types</option>
            <option value="new">New Contract</option>
            <option value="amendment">Amendment</option>
          </select>
        </div>
        <div className="pt-2 border-t border-gray-200">
          <div className="text-xs text-gray-500">
            <div>Total: {contracts.length}</div>
            <div>Filtered: {filteredContracts.length}</div>
          </div>
        </div>
      </div>
    </div>
  );

  const listViewContent = (
    <ListView
      items={filteredContracts}
      itemHeight={80}
      loading={loading}
      emptyMessage="No contracts found. Create your first contract to get started."
      toolbar={
        <ListToolbar
          totalCount={filteredContracts.length}
          onSelectAll={() => setSelectedIds(filteredContracts.map(c => c.id))}
          onClearSelection={() => setSelectedIds([])}
          actions={
            <button
              onClick={() => setShowNewContractModal(true)}
              className="px-3 py-1.5 text-sm font-medium text-white bg-blue-600 rounded-md hover:bg-blue-700"
            >
              New Contract
            </button>
          }
        />
      }
      renderItem={(contract, index, isSelected) => (
        <div 
          className={`p-4 border-b border-gray-200 hover:bg-gray-50 ${isSelected ? 'bg-blue-50' : ''} ${selectedContract?.id === contract.id ? 'bg-blue-50' : ''}`}
          onClick={(e) => handleContractClick(contract.id, e)}
        >
          <div className="flex items-start justify-between">
            <div className="flex-1">
              <div className="flex items-center gap-2 mb-1">
                <h3 className="font-semibold text-gray-900">
                  {contract.contract_number}
                </h3>
                <span className={`px-2 py-1 text-xs rounded-full ${getStatusColor(contract.status)}`}>
                  {contract.status.replace('_', ' ')}
                </span>
                {contract.type === 'amendment' && (
                  <span className="px-2 py-1 text-xs rounded-full bg-purple-100 text-purple-800">
                    Amendment
                  </span>
                )}
              </div>
              {contract.title && (
                <p className="text-sm text-gray-600 mb-1">{contract.title}</p>
              )}
              {contract.clients && (
                <p className="text-sm text-gray-500">Client: {contract.clients.name}</p>
              )}
              {contract.projects && (
                <p className="text-sm text-gray-500">Project: {contract.projects.name}</p>
              )}
            </div>
            <div className="flex items-center gap-2">
              <div className="text-xs text-gray-400">
                {new Date(contract.created_at).toLocaleDateString()}
              </div>
              {canDeleteContract(contract) && (
                <button
                  onClick={(e) => handleDeleteContract(contract.id, e)}
                  className="p-1.5 text-red-600 hover:text-red-800 hover:bg-red-50 rounded transition-colors"
                  title="Delete contract"
                >
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                  </svg>
                </button>
              )}
            </div>
          </div>
        </div>
      )}
    />
  );

  // Preview Panel - AI Summary
  const previewPanelContent = selectedContract ? (
    <div className="h-full flex flex-col">
      <div className="p-4 border-b border-gray-200 bg-white">
        <div className="flex items-center justify-between mb-2">
          <h2 className="text-lg font-semibold">AI Summary</h2>
          <button
            onClick={() => router.push(`/contracts/${selectedContract.id}`)}
            className="text-sm text-blue-600 hover:text-blue-800"
          >
            View Details →
          </button>
        </div>
        <div className="text-sm text-gray-600">
          <p className="font-medium">{selectedContract.contract_number}</p>
          {selectedContract.title && (
            <p className="text-gray-500">{selectedContract.title}</p>
          )}
        </div>
      </div>
      <div className="flex-1 overflow-y-auto p-4">
        {summaryLoading ? (
          <div className="flex items-center justify-center h-full">
            <div className="text-center">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto mb-2"></div>
              <p className="text-sm text-gray-500">Loading summary...</p>
            </div>
          </div>
        ) : aiSummary ? (
          <div className="prose prose-sm max-w-none">
            <div className="whitespace-pre-wrap text-gray-700 leading-relaxed">
              {aiSummary}
            </div>
          </div>
        ) : (
          <div className="text-center text-gray-500 py-8">
            <p className="mb-2">No summary available</p>
            <p className="text-sm">Click "View Details" to generate a summary</p>
          </div>
        )}
      </div>
    </div>
  ) : (
    <div className="h-full flex items-center justify-center text-gray-400">
      <div className="text-center">
        <p className="text-sm">Select a contract to view its AI summary</p>
      </div>
    </div>
  );

  return (
    <>
      <GmailLayout
        contextPanel={contextPanelContent}
        listView={listViewContent}
        previewArea={previewPanelContent}
      />
      {toasts.map((toast) => (
        <Toast
          key={toast.id}
          message={toast.message}
          type={toast.type}
          onClose={() => removeToast(toast.id)}
        />
      ))}
      <NewContractModal
        isOpen={showNewContractModal}
        onClose={() => setShowNewContractModal(false)}
        onCreate={handleCreateContract}
      />
    </>
  );
}

