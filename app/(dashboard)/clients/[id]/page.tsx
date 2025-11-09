'use client';

import { useState, useEffect } from 'react';
import { useOrganization, useUser } from '@clerk/nextjs';
import { useRouter, useParams } from 'next/navigation';
import { usePanelContext } from '@/lib/contexts/PanelContext';
import GmailLayout from '@/components/layout/GmailLayout';
import Toast from '@/components/Toast';
import AssignUserModal from '@/components/clients/AssignUserModal';
import { Plus } from 'lucide-react';

interface Client {
  id: string;
  name: string;
  email?: string;
  phone?: string;
  address?: string;
  notes?: string;
  ein?: string;
  parent_client_id?: string;
  parent_client?: Client;
  created_at: string;
  updated_at: string;
}

interface ClientUser {
  id: string;
  user_id: string;
  client_id: string;
  assigned_by: string;
  assigned_at: string;
  user?: {
    id: string;
    firstName?: string;
    lastName?: string;
    emailAddress?: string;
    imageUrl?: string;
  };
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
  const { organization, isLoaded, membership } = useOrganization();
  const { user } = useUser();
  const router = useRouter();
  const params = useParams();
  const { setActiveNav } = usePanelContext();

  const isAdmin = membership?.role === 'org:admin';

  // Redirect non-admins
  useEffect(() => {
    if (isLoaded && !isAdmin) {
      router.push('/');
    }
  }, [isLoaded, isAdmin, router]);

  const clientId = params?.id as string;

  const [client, setClient] = useState<Client | null>(null);
  const [contracts, setContracts] = useState<Contract[]>([]);
  const [projects, setProjects] = useState<Project[]>([]);
  const [childClients, setChildClients] = useState<Client[]>([]);
  const [assignedUsers, setAssignedUsers] = useState<ClientUser[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadingChildren, setLoadingChildren] = useState(false);
  const [loadingUsers, setLoadingUsers] = useState(false);
  const [activeTab, setActiveTab] = useState<'overview' | 'contracts' | 'projects' | 'users'>('overview');
  const [toasts, setToasts] = useState<ToastMessage[]>([]);
  const [showAssignUserModal, setShowAssignUserModal] = useState(false);

  const showToast = (message: string, type: 'success' | 'error') => {
    const id = Date.now();
    setToasts((prev) => [...prev, { message, type, id }]);
  };

  const removeToast = (id: number) => {
    setToasts((prev) => prev.filter((toast) => toast.id !== id));
  };

  useEffect(() => {
    setActiveNav('clients');
  }, [setActiveNav]);

  useEffect(() => {
    if (clientId && organization?.id && isAdmin) {
      fetchClient();
      fetchContracts();
      fetchProjects();
      fetchChildClients();
      fetchAssignedUsers();
    }
  }, [clientId, organization?.id, isAdmin]);

  useEffect(() => {
    if (clientId && activeTab === 'users') {
      fetchAssignedUsers();
    }
  }, [clientId, activeTab]);

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

  const fetchChildClients = async () => {
    if (!clientId) return;
    setLoadingChildren(true);
    try {
      const response = await fetch(`/api/clients/${clientId}/children`);
      if (!response.ok) throw new Error('Failed to fetch child clients');
      const result = await response.json();
      setChildClients(result.data?.children || result.children || []);
    } catch (error) {
      console.error('Error fetching child clients:', error);
    } finally {
      setLoadingChildren(false);
    }
  };

  const fetchAssignedUsers = async () => {
    if (!clientId) return;
    setLoadingUsers(true);
    try {
      const response = await fetch(`/api/clients/${clientId}/users`);
      if (!response.ok) throw new Error('Failed to fetch assigned users');
      const result = await response.json();
      setAssignedUsers(result.data?.users || result.users || []);
    } catch (error) {
      console.error('Error fetching assigned users:', error);
    } finally {
      setLoadingUsers(false);
    }
  };

  // Don't render if not admin
  if (!isLoaded || !isAdmin) {
    return (
      <div className="flex items-center justify-center h-full">
        <div className="text-gray-500">Loading...</div>
      </div>
    );
  }

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
    { id: 'users', label: `Assigned Users (${assignedUsers.length})` },
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
                  {client.ein && <div><span className="font-medium">EIN:</span> {client.ein}</div>}
                  {client.email && <div><span className="font-medium">Email:</span> {client.email}</div>}
                  {client.phone && <div><span className="font-medium">Phone:</span> {client.phone}</div>}
                  {client.address && <div><span className="font-medium">Address:</span> {client.address}</div>}
                </div>
              </div>
              
              {/* Client Hierarchy */}
              {(client.parent_client_id || childClients.length > 0) && (
                <div>
                  <h4 className="font-medium mb-2">Client Hierarchy</h4>
                  <div className="space-y-2 text-sm">
                    {client.parent_client_id && (
                      <div>
                        <span className="font-medium">Parent Client:</span>{' '}
                        <button
                          onClick={() => router.push(`/clients/${client.parent_client_id}`)}
                          className="text-blue-600 hover:underline"
                        >
                          View Parent
                        </button>
                      </div>
                    )}
                    {childClients.length > 0 && (
                      <div>
                        <span className="font-medium">Child Clients ({childClients.length}):</span>
                        <div className="mt-1 space-y-1">
                          {childClients.map((child) => (
                            <button
                              key={child.id}
                              onClick={() => router.push(`/clients/${child.id}`)}
                              className="block text-blue-600 hover:underline text-left"
                            >
                              • {child.name}
                            </button>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              )}

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
                  <div><span className="font-medium">Assigned Users:</span> {assignedUsers.length}</div>
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
      case 'users':
        return (
          <div className="p-6">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-semibold">Assigned Users</h3>
              <button
                onClick={() => setShowAssignUserModal(true)}
                className="px-3 py-1.5 text-sm font-medium text-white bg-blue-600 rounded-md hover:bg-blue-700 flex items-center gap-2"
              >
                <Plus size={16} />
                Assign User
              </button>
            </div>
            {loadingUsers ? (
              <div className="text-center text-gray-500 py-8">Loading users...</div>
            ) : assignedUsers.length === 0 ? (
              <div className="text-center text-gray-500 py-8">
                <p>No users assigned to this client.</p>
                <p className="text-sm mt-2">Assign users with Client role to this client.</p>
              </div>
            ) : (
              <div className="space-y-3">
                {assignedUsers.map((assignment) => (
                  <div
                    key={assignment.id}
                    className="p-4 border border-gray-200 rounded-md hover:bg-gray-50"
                  >
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-3">
                        {assignment.user?.imageUrl && (
                          <img
                            src={assignment.user.imageUrl}
                            alt={assignment.user.firstName || 'User'}
                            className="w-10 h-10 rounded-full"
                          />
                        )}
                        <div>
                          <h4 className="font-medium text-gray-900">
                            {assignment.user?.firstName && assignment.user?.lastName
                              ? `${assignment.user.firstName} ${assignment.user.lastName}`
                              : assignment.user?.emailAddress || 'Unknown User'}
                          </h4>
                          {assignment.user?.emailAddress && (
                            <p className="text-sm text-gray-500">{assignment.user.emailAddress}</p>
                          )}
                          <p className="text-xs text-gray-400 mt-1">
                            Assigned on {new Date(assignment.assigned_at).toLocaleDateString()}
                          </p>
                        </div>
                      </div>
                      <button
                        onClick={async () => {
                          if (!confirm('Remove this user from the client?')) return;
                          try {
                            const response = await fetch(`/api/clients/${clientId}/users/${assignment.user_id}`, {
                              method: 'DELETE',
                            });
                            if (!response.ok) throw new Error('Failed to remove user');
                            await fetchAssignedUsers();
                            showToast('User removed successfully', 'success');
                          } catch (error: any) {
                            console.error('Error removing user:', error);
                            showToast(error.message || 'Failed to remove user', 'error');
                          }
                        }}
                        className="px-3 py-1.5 text-sm text-red-600 hover:bg-red-50 rounded-md"
                      >
                        Remove
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}
            {showAssignUserModal && (
              <AssignUserModal
                isOpen={showAssignUserModal}
                onClose={() => setShowAssignUserModal(false)}
                clientId={clientId}
                onAssign={fetchAssignedUsers}
                existingUserIds={assignedUsers.map(u => u.user_id)}
              />
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

