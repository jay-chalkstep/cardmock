'use client';

import { useState, useEffect } from 'react';
import { useOrganization, useUser } from '@clerk/nextjs';
import { useRouter, useParams } from 'next/navigation';
import { usePanelContext } from '@/lib/contexts/PanelContext';
import GmailLayout from '@/components/layout/GmailLayout';
import Toast from '@/components/Toast';

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
          <div className="p-6">
            <h3 className="text-lg font-semibold mb-4">Documents</h3>
            <p className="text-gray-500">Document management coming soon...</p>
          </div>
        );
      case 'email-mockups':
        return (
          <div className="p-6">
            <h3 className="text-lg font-semibold mb-4">Email Mockups</h3>
            <p className="text-gray-500">Email mockup management coming soon...</p>
          </div>
        );
      case 'payment-methods':
        return (
          <div className="p-6">
            <h3 className="text-lg font-semibold mb-4">Payment Methods</h3>
            <p className="text-gray-500">Payment method management coming soon...</p>
          </div>
        );
      case 'assets':
        return (
          <div className="p-6">
            <h3 className="text-lg font-semibold mb-4">Assets</h3>
            <p className="text-gray-500">Asset management coming soon...</p>
          </div>
        );
      case 'comments':
        return (
          <div className="p-6">
            <h3 className="text-lg font-semibold mb-4">Comments</h3>
            <p className="text-gray-500">Comments coming soon...</p>
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
    </>
  );
}

