'use client';

import { useState, useEffect } from 'react';
import { useOrganization, useUser } from '@clerk/nextjs';
import { useRouter } from 'next/navigation';
import { usePanelContext } from '@/lib/contexts/PanelContext';
import GmailLayout from '@/components/layout/GmailLayout';
import ListView from '@/components/lists/ListView';
import ListToolbar from '@/components/lists/ListToolbar';
import Toast from '@/components/Toast';
import { NewClientModal, EditClientModal } from '@/components/clients';

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

interface ToastMessage {
  message: string;
  type: 'success' | 'error';
  id: number;
}

export default function ClientsPage() {
  const { organization, isLoaded, membership } = useOrganization();
  const { user } = useUser();
  const router = useRouter();
  const { selectedIds, setSelectedIds, setActiveNav } = usePanelContext();

  const isAdmin = membership?.role === 'org:admin';

  // Redirect non-admins
  useEffect(() => {
    if (isLoaded && !isAdmin) {
      router.push('/');
    }
  }, [isLoaded, isAdmin, router]);

  const [clients, setClients] = useState<Client[]>([]);
  const [filteredClients, setFilteredClients] = useState<Client[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [showNewClientModal, setShowNewClientModal] = useState(false);
  const [editingClient, setEditingClient] = useState<Client | null>(null);
  const [toasts, setToasts] = useState<ToastMessage[]>([]);

  const showToast = (message: string, type: 'success' | 'error') => {
    const id = Date.now();
    setToasts((prev) => [...prev, { message, type, id }]);
  };

  const removeToast = (id: number) => {
    setToasts((prev) => prev.filter((toast) => toast.id !== id));
  };

  useEffect(() => {
    setActiveNav('clients');
    setSelectedIds([]);
  }, [setActiveNav, setSelectedIds]);

  useEffect(() => {
    if (organization?.id && user?.id && isAdmin) {
      fetchClients();
    }
  }, [organization?.id, user?.id, isAdmin]);

  useEffect(() => {
    let filtered = clients;
    
    if (searchTerm) {
      filtered = filtered.filter(
        (client) =>
          client.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
          client.email?.toLowerCase().includes(searchTerm.toLowerCase()) ||
          client.phone?.toLowerCase().includes(searchTerm.toLowerCase())
      );
    }
    
    setFilteredClients(filtered);
  }, [searchTerm, clients]);

  const fetchClients = async () => {
    if (!organization?.id) return;
    setLoading(true);
    try {
      const response = await fetch('/api/clients');
      if (!response.ok) throw new Error('Failed to fetch clients');
      const result = await response.json();
      const fetchedClients = result.data?.clients || result.clients || [];
      setClients(fetchedClients);
    } catch (error) {
      console.error('Error fetching clients:', error);
      showToast('Failed to load clients', 'error');
    } finally {
      setLoading(false);
    }
  };

  const handleClientClick = (clientId: string) => {
    router.push(`/clients/${clientId}`);
  };

  const handleCreateClient = async (clientData: {
    name: string;
    email?: string;
    phone?: string;
    address?: string;
    notes?: string;
  }) => {
    try {
      const response = await fetch('/api/clients', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(clientData),
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.message || 'Failed to create client');
      }

      await fetchClients();
      showToast('Client created successfully', 'success');
    } catch (error: any) {
      console.error('Error creating client:', error);
      showToast(error.message || 'Failed to create client', 'error');
      throw error;
    }
  };

  const handleUpdateClient = async (clientId: string, clientData: {
    name?: string;
    email?: string;
    phone?: string;
    address?: string;
    notes?: string;
  }) => {
    try {
      const response = await fetch(`/api/clients/${clientId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(clientData),
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.message || 'Failed to update client');
      }

      await fetchClients();
      setEditingClient(null);
      showToast('Client updated successfully', 'success');
    } catch (error: any) {
      console.error('Error updating client:', error);
      showToast(error.message || 'Failed to update client', 'error');
      throw error;
    }
  };

  const handleDeleteClient = async (clientId: string) => {
    if (!confirm('Are you sure you want to delete this client? This will also delete all associated contracts.')) {
      return;
    }

    try {
      const response = await fetch(`/api/clients/${clientId}`, {
        method: 'DELETE',
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.message || 'Failed to delete client');
      }

      await fetchClients();
      showToast('Client deleted successfully', 'success');
    } catch (error: any) {
      console.error('Error deleting client:', error);
      showToast(error.message || 'Failed to delete client', 'error');
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

  // Context Panel
  const contextPanelContent = (
    <div className="p-4">
      <div className="flex items-center justify-between mb-4">
        <h2 className="text-lg font-semibold">Clients</h2>
        <button
          onClick={() => setShowNewClientModal(true)}
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
            placeholder="Search clients..."
            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
        </div>
        <div className="pt-2 border-t border-gray-200">
          <div className="text-xs text-gray-500">
            <div>Total: {clients.length}</div>
            <div>Filtered: {filteredClients.length}</div>
          </div>
        </div>
      </div>
    </div>
  );

  const listViewContent = (
    <ListView
      items={filteredClients}
      itemHeight={80}
      loading={loading}
      emptyMessage="No clients found. Create your first client to get started."
      toolbar={
        <ListToolbar
          totalCount={filteredClients.length}
          onSelectAll={() => setSelectedIds(filteredClients.map(c => c.id))}
          onClearSelection={() => setSelectedIds([])}
          actions={
            <button
              onClick={() => setShowNewClientModal(true)}
              className="px-3 py-1.5 text-sm font-medium text-white bg-blue-600 rounded-md hover:bg-blue-700"
            >
              New Client
            </button>
          }
        />
      }
      renderItem={(client, index, isSelected) => (
        <div 
          className={`p-4 border-b border-gray-200 hover:bg-gray-50 ${isSelected ? 'bg-blue-50' : ''}`}
          onClick={() => handleClientClick(client.id)}
        >
          <div className="flex items-start justify-between">
            <div className="flex-1">
              <div className="flex items-center gap-2 mb-1">
                <h3 className="font-semibold text-gray-900">{client.name}</h3>
              </div>
              {client.email && (
                <p className="text-sm text-gray-600 mb-1">{client.email}</p>
              )}
              {client.phone && (
                <p className="text-sm text-gray-500">{client.phone}</p>
              )}
            </div>
            <div className="flex items-center gap-2">
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  setEditingClient(client);
                }}
                className="px-2 py-1 text-xs text-blue-600 hover:bg-blue-50 rounded"
              >
                Edit
              </button>
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  handleDeleteClient(client.id);
                }}
                className="px-2 py-1 text-xs text-red-600 hover:bg-red-50 rounded"
              >
                Delete
              </button>
              <div className="text-xs text-gray-400">
                {new Date(client.created_at).toLocaleDateString()}
              </div>
            </div>
          </div>
        </div>
      )}
    />
  );

  return (
    <>
      <GmailLayout
        contextPanel={contextPanelContent}
        listView={listViewContent}
      />
      {toasts.map((toast) => (
        <Toast
          key={toast.id}
          message={toast.message}
          type={toast.type}
          onClose={() => removeToast(toast.id)}
        />
      ))}
      <NewClientModal
        isOpen={showNewClientModal}
        onClose={() => setShowNewClientModal(false)}
        onCreate={handleCreateClient}
      />
      {editingClient && (
        <EditClientModal
          isOpen={!!editingClient}
          onClose={() => setEditingClient(null)}
          client={editingClient}
          onUpdate={(data) => handleUpdateClient(editingClient.id, data)}
        />
      )}
    </>
  );
}

