'use client';

import { useState, useEffect } from 'react';
import { X } from 'lucide-react';
import { useOrganization } from '@/lib/hooks/useAuth';

interface Client {
  id: string;
  name: string;
  email?: string;
  phone?: string;
  address?: string;
  notes?: string;
  ein?: string;
  parent_client_id?: string;
}

interface ClientOption {
  id: string;
  name: string;
  parent_client_id?: string;
}

interface EditClientModalProps {
  isOpen: boolean;
  onClose: () => void;
  client: Client;
  onUpdate: (clientData: {
    name?: string;
    email?: string;
    phone?: string;
    address?: string;
    notes?: string;
    ein?: string;
    parent_client_id?: string;
  }) => Promise<void>;
}

export default function EditClientModal({ isOpen, onClose, client, onUpdate }: EditClientModalProps) {
  const { organization } = useOrganization();
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [phone, setPhone] = useState('');
  const [address, setAddress] = useState('');
  const [notes, setNotes] = useState('');
  const [ein, setEin] = useState('');
  const [parentClientId, setParentClientId] = useState<string>('');
  const [clients, setClients] = useState<ClientOption[]>([]);
  const [loading, setLoading] = useState(false);
  const [loadingClients, setLoadingClients] = useState(false);

  // Fetch clients for parent selector
  useEffect(() => {
    if (isOpen && organization?.id) {
      fetchClients();
    }
  }, [isOpen, organization?.id]);

  useEffect(() => {
    if (client) {
      setName(client.name || '');
      setEmail(client.email || '');
      setPhone(client.phone || '');
      setAddress(client.address || '');
      setNotes(client.notes || '');
      setEin(client.ein || '');
      setParentClientId(client.parent_client_id || '');
    }
  }, [client]);

  const fetchClients = async () => {
    if (!organization?.id) return;
    setLoadingClients(true);
    try {
      const response = await fetch('/api/clients');
      if (!response.ok) throw new Error('Failed to fetch clients');
      const result = await response.json();
      const fetchedClients = result.data?.clients || result.clients || [];
      // Filter out the current client from parent options (can't be its own parent)
      const filteredClients = fetchedClients.filter((c: ClientOption) => c.id !== client.id);
      setClients(filteredClients);
    } catch (error) {
      console.error('Error fetching clients:', error);
    } finally {
      setLoadingClients(false);
    }
  };

  if (!isOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) return;

    setLoading(true);
    try {
      await onUpdate({
        name: name.trim(),
        email: email.trim() || undefined,
        phone: phone.trim() || undefined,
        address: address.trim() || undefined,
        notes: notes.trim() || undefined,
        ein: ein.trim() || undefined,
        parent_client_id: parentClientId || undefined,
      });
      onClose();
    } catch (error) {
      console.error('Error updating client:', error);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg shadow-xl w-full max-w-md p-6">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-xl font-semibold">Edit Client</h2>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600"
          >
            <X size={20} />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label htmlFor="name" className="block text-sm font-medium mb-1">
              Name <span className="text-red-500">*</span>
            </label>
            <input
              id="name"
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              required
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              placeholder="Client name"
            />
          </div>

          <div>
            <label htmlFor="email" className="block text-sm font-medium mb-1">
              Email
            </label>
            <input
              id="email"
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              placeholder="client@example.com"
            />
          </div>

          <div>
            <label htmlFor="phone" className="block text-sm font-medium mb-1">
              Phone
            </label>
            <input
              id="phone"
              type="tel"
              value={phone}
              onChange={(e) => setPhone(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              placeholder="(555) 123-4567"
            />
          </div>

          <div>
            <label htmlFor="address" className="block text-sm font-medium mb-1">
              Address
            </label>
            <textarea
              id="address"
              value={address}
              onChange={(e) => setAddress(e.target.value)}
              rows={2}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              placeholder="Street address, City, State, ZIP"
            />
          </div>

          <div>
            <label htmlFor="ein" className="block text-sm font-medium mb-1">
              EIN (Employer Identification Number)
            </label>
            <input
              id="ein"
              type="text"
              value={ein}
              onChange={(e) => setEin(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              placeholder="12-3456789"
            />
          </div>

          <div>
            <label htmlFor="parent_client" className="block text-sm font-medium mb-1">
              Parent Client
            </label>
            <select
              id="parent_client"
              value={parentClientId}
              onChange={(e) => setParentClientId(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              disabled={loadingClients}
            >
              <option value="">None (Top-level client)</option>
              {clients.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.name}
                </option>
              ))}
            </select>
            <p className="mt-1 text-xs text-gray-500">
              Select a parent client to create a hierarchy. Cannot select self.
            </p>
          </div>

          <div>
            <label htmlFor="notes" className="block text-sm font-medium mb-1">
              Notes
            </label>
            <textarea
              id="notes"
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              rows={3}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              placeholder="Additional notes..."
            />
          </div>

          <div className="flex gap-3 pt-4">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 px-4 py-2 border border-gray-300 rounded-md hover:bg-gray-50"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={loading || !name.trim()}
              className="flex-1 px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {loading ? 'Updating...' : 'Update Client'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

