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
  phone?: string;
  address?: string;
  notes?: string;
  created_at: string;
  updated_at: string;
}

interface Contract {
  id: string;
  contract_number: string;
  status: string;
  title?: string;
  created_at: string;
}

interface Project {
  id: string;
  name: string;
  status: string;
  created_at: string;
}

interface ToastMessage {
  message: string;
  type: 'success' | 'error';
  id: number;
}

export default function ClientDetailPage() {
  const { organization } = useOrganization();
  const { user } = useUser();
  const router = useRouter();
  const params = useParams();
  const { setActiveNav } = usePanelContext();

  const clientId = params?.id as string;

  const [client, setClient] = useState<Client | null>(null);
  const [contracts, setContracts] = useState<Contract[]>([]);
  const [projects, setProjects] = useState<Project[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<'overview' | 'contracts' | 'projects'>('overview');
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
    if (clientId && organization?.id) {
      fetchClient();
      fetchContracts();
      fetchProjects();
    }
  }, [clientId, organization?.id]);

  const fetchClient = async () => {
    if (!clientId) return;
    setLoading(true);
    try {
      const response = await fetch(`/api/clients/${clientId}`);
      if (!response.ok) throw new Error('Failed to fetch client');
      const result = await response.json();
      setClient(result.data?.client || result.client);
    } catch (error) {
      console.error('Error fetching client:', error);
      showToast('Failed to load client', 'error');
    } finally {
      setLoading(false);
    }
  };

  const fetchContracts = async () => {
    if (!clientId) return;
    try {
      const response = await fetch(`/api/contracts?client_id=${clientId}`);
      if (!response.ok) throw new Error('Failed to fetch contracts');
      const result = await response.json();
      setContracts(result.data?.contracts || result.contracts || []);
    } catch (error) {
      console.error('Error fetching contracts:', error);
    }
  };

  const fetchProjects = async () => {
    if (!clientId) return;
    try {
      // Fetch projects that might be linked to this client's contracts
      const response = await fetch('/api/projects');
      if (!response.ok) throw new Error('Failed to fetch projects');
      const result = await response.json();
      const allProjects = result.data?.projects || result.projects || [];
      // Filter projects by client name match (since projects have client_name field)
      const clientProjects = allProjects.filter((p: any) => 
        p.client_name?.toLowerCase() === client?.name.toLowerCase()
      );
      setProjects(clientProjects);
    } catch (error) {
      console.error('Error fetching projects:', error);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-full">
        <div className="text-gray-500">Loading client...</div>
      </div>
    );
  }

  if (!client) {
    return (
      <div className="flex items-center justify-center h-full">
        <div className="text-gray-500">Client not found</div>
      </div>
    );
  }

  const contextPanelContent = (
    <div className="p-4">
      <div className="mb-4">
        <button
          onClick={() => router.push('/clients')}
          className="text-sm text-gray-600 hover:text-gray-900"
        >
          ← Back to Clients
        </button>
      </div>
      <h2 className="text-lg font-semibold mb-2">{client.name}</h2>
      <div className="space-y-2 text-sm">
        {client.email && (
          <div>
            <span className="font-medium">Email:</span> {client.email}
          </div>
        )}
        {client.phone && (
          <div>
            <span className="font-medium">Phone:</span> {client.phone}
          </div>
        )}
        {client.address && (
          <div>
            <span className="font-medium">Address:</span> {client.address}
          </div>
        )}
      </div>
    </div>
  );

  const tabs = [
    { id: 'overview', label: 'Overview' },
    { id: 'contracts', label: `Contracts (${contracts.length})` },
    { id: 'projects', label: `Projects (${projects.length})` },
  ];

  const renderTabContent = () => {
    switch (activeTab) {
      case 'overview':
        return (
          <div className="p-6">
            <h3 className="text-lg font-semibold mb-4">Client Overview</h3>
            <div className="space-y-4">
              <div>
                <h4 className="font-medium mb-2">Contact Information</h4>
                <div className="space-y-2 text-sm">
                  <div><span className="font-medium">Name:</span> {client.name}</div>
                  {client.email && <div><span className="font-medium">Email:</span> {client.email}</div>}
                  {client.phone && <div><span className="font-medium">Phone:</span> {client.phone}</div>}
                  {client.address && <div><span className="font-medium">Address:</span> {client.address}</div>}
                </div>
              </div>
              {client.notes && (
                <div>
                  <h4 className="font-medium mb-2">Notes</h4>
                  <p className="text-sm text-gray-600 whitespace-pre-wrap">{client.notes}</p>
                </div>
              )}
              <div>
                <h4 className="font-medium mb-2">Statistics</h4>
                <div className="space-y-2 text-sm">
                  <div><span className="font-medium">Total Contracts:</span> {contracts.length}</div>
                  <div><span className="font-medium">Total Projects:</span> {projects.length}</div>
                  <div><span className="font-medium">Created:</span> {new Date(client.created_at).toLocaleDateString()}</div>
                </div>
              </div>
            </div>
          </div>
        );
      case 'contracts':
        return (
          <div className="p-6">
            <h3 className="text-lg font-semibold mb-4">Contracts</h3>
            {contracts.length === 0 ? (
              <p className="text-gray-500">No contracts found for this client.</p>
            ) : (
              <div className="space-y-2">
                {contracts.map((contract) => (
                  <div
                    key={contract.id}
                    onClick={() => router.push(`/contracts/${contract.id}`)}
                    className="p-3 border border-gray-200 rounded-md hover:bg-gray-50 cursor-pointer"
                  >
                    <div className="flex items-center justify-between">
                      <div>
                        <h4 className="font-medium">{contract.contract_number}</h4>
                        {contract.title && <p className="text-sm text-gray-600">{contract.title}</p>}
                      </div>
                      <span className={`px-2 py-1 text-xs rounded-full ${
                        contract.status === 'signed' ? 'bg-green-100 text-green-800' :
                        contract.status === 'pending_signature' ? 'bg-yellow-100 text-yellow-800' :
                        'bg-gray-100 text-gray-800'
                      }`}>
                        {contract.status.replace('_', ' ')}
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        );
      case 'projects':
        return (
          <div className="p-6">
            <h3 className="text-lg font-semibold mb-4">Projects</h3>
            {projects.length === 0 ? (
              <p className="text-gray-500">No projects found for this client.</p>
            ) : (
              <div className="space-y-2">
                {projects.map((project) => (
                  <div
                    key={project.id}
                    onClick={() => router.push(`/projects/${project.id}`)}
                    className="p-3 border border-gray-200 rounded-md hover:bg-gray-50 cursor-pointer"
                  >
                    <div className="flex items-center justify-between">
                      <div>
                        <h4 className="font-medium">{project.name}</h4>
                      </div>
                      <span className={`px-2 py-1 text-xs rounded-full ${
                        project.status === 'active' ? 'bg-green-100 text-green-800' :
                        project.status === 'completed' ? 'bg-blue-100 text-blue-800' :
                        'bg-gray-100 text-gray-800'
                      }`}>
                        {project.status}
                      </span>
                    </div>
                  </div>
                ))}
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
    </>
  );
}

