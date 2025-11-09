'use client';

import { useState, useEffect, useRef } from 'react';
import { X, Upload, FileText } from 'lucide-react';

interface Client {
  id: string;
  name: string;
}

interface Project {
  id: string;
  name: string;
}

interface NewContractModalProps {
  isOpen: boolean;
  onClose: () => void;
  onCreate: (contractData: {
    client_id: string;
    project_id?: string;
    contract_number?: string;
    type: 'new' | 'amendment';
    parent_contract_id?: string;
    title?: string;
    description?: string;
  }) => Promise<{ id: string }>;
}

export default function NewContractModal({ isOpen, onClose, onCreate }: NewContractModalProps) {
  const [clients, setClients] = useState<Client[]>([]);
  const [projects, setProjects] = useState<Project[]>([]);
  const [contracts, setContracts] = useState<any[]>([]);
  const [clientId, setClientId] = useState('');
  const [projectId, setProjectId] = useState('');
  const [type, setType] = useState<'new' | 'amendment'>('new');
  const [parentContractId, setParentContractId] = useState('');
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [loading, setLoading] = useState(false);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [uploading, setUploading] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (isOpen) {
      fetchClients();
      fetchProjects();
      if (type === 'amendment') {
        fetchContracts();
      }
    }
  }, [isOpen, type]);

  const fetchClients = async () => {
    try {
      const response = await fetch('/api/clients');
      const result = await response.json();
      setClients(result.data?.clients || []);
    } catch (error) {
      console.error('Error fetching clients:', error);
    }
  };

  const fetchProjects = async () => {
    try {
      const response = await fetch('/api/projects');
      const result = await response.json();
      setProjects(result.data?.projects || []);
    } catch (error) {
      console.error('Error fetching projects:', error);
    }
  };

  const fetchContracts = async () => {
    try {
      const response = await fetch('/api/contracts');
      const result = await response.json();
      setContracts(result.data?.contracts || []);
    } catch (error) {
      console.error('Error fetching contracts:', error);
    }
  };

  if (!isOpen) return null;

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      // Validate file type
      const allowedTypes = [
        'application/vnd.openxmlformats-officedocument.wordprocessingml.document', // .docx
        'application/msword', // .doc
      ];
      
      if (!allowedTypes.includes(file.type)) {
        alert('Only Word documents (.docx, .doc) are allowed');
        return;
      }
      
      // Validate file size (10MB max)
      const maxSize = 10 * 1024 * 1024; // 10MB
      if (file.size > maxSize) {
        alert('File size must be less than 10MB');
        return;
      }
      
      setSelectedFile(file);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!clientId) return;
    if (type === 'amendment' && !parentContractId) return;

    setLoading(true);
    try {
      // Create contract first
      const result = await onCreate({
        client_id: clientId,
        project_id: projectId || undefined,
        type,
        parent_contract_id: type === 'amendment' ? parentContractId : undefined,
        title: title.trim() || undefined,
        description: description.trim() || undefined,
      });
      
      // If a file was selected, upload it
      if (selectedFile && result?.id) {
        setUploading(true);
        try {
          const formData = new FormData();
          formData.append('file', selectedFile);

          const uploadResponse = await fetch(`/api/contracts/${result.id}/documents`, {
            method: 'POST',
            body: formData,
          });

          if (!uploadResponse.ok) {
            const error = await uploadResponse.json();
            throw new Error(error.message || 'Failed to upload document');
          }
        } catch (uploadError: any) {
          console.error('Error uploading document:', uploadError);
          // Contract was created but upload failed - show warning but don't fail
          alert(`Contract created but document upload failed: ${uploadError.message}`);
        } finally {
          setUploading(false);
        }
      }
      
      // Reset form
      setClientId('');
      setProjectId('');
      setType('new');
      setParentContractId('');
      setTitle('');
      setDescription('');
      setSelectedFile(null);
      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }
      onClose();
    } catch (error) {
      console.error('Error creating contract:', error);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg shadow-xl w-full max-w-md p-6 max-h-[90vh] overflow-y-auto">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-xl font-semibold">New Contract</h2>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600"
          >
            <X size={20} />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label htmlFor="type" className="block text-sm font-medium mb-1">
              Type <span className="text-red-500">*</span>
            </label>
            <select
              id="type"
              value={type}
              onChange={(e) => {
                setType(e.target.value as 'new' | 'amendment');
                if (e.target.value === 'new') {
                  setParentContractId('');
                }
              }}
              required
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              <option value="new">New Contract</option>
              <option value="amendment">Amendment</option>
            </select>
          </div>

          <div>
            <label htmlFor="client" className="block text-sm font-medium mb-1">
              Client <span className="text-red-500">*</span>
            </label>
            <select
              id="client"
              value={clientId}
              onChange={(e) => setClientId(e.target.value)}
              required
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              <option value="">Select a client</option>
              {clients.map((client) => (
                <option key={client.id} value={client.id}>
                  {client.name}
                </option>
              ))}
            </select>
          </div>

          {type === 'amendment' && (
            <div>
              <label htmlFor="parentContract" className="block text-sm font-medium mb-1">
                Parent Contract <span className="text-red-500">*</span>
              </label>
              <select
                id="parentContract"
                value={parentContractId}
                onChange={(e) => setParentContractId(e.target.value)}
                required
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                <option value="">Select a contract</option>
                {contracts
                  .filter((c) => c.client_id === clientId)
                  .map((contract) => (
                    <option key={contract.id} value={contract.id}>
                      {contract.contract_number} - {contract.title || 'Untitled'}
                    </option>
                  ))}
              </select>
            </div>
          )}

          <div>
            <label htmlFor="project" className="block text-sm font-medium mb-1">
              Project
            </label>
            <select
              id="project"
              value={projectId}
              onChange={(e) => setProjectId(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              <option value="">No project</option>
              {projects.map((project) => (
                <option key={project.id} value={project.id}>
                  {project.name}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label htmlFor="title" className="block text-sm font-medium mb-1">
              Title
            </label>
            <input
              id="title"
              type="text"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              placeholder="Contract title"
            />
          </div>

          <div>
            <label htmlFor="description" className="block text-sm font-medium mb-1">
              Description
            </label>
            <textarea
              id="description"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              rows={3}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              placeholder="Contract description"
            />
          </div>

          <div>
            <label htmlFor="document" className="block text-sm font-medium mb-1">
              Contract Document
            </label>
            <div className="space-y-2">
              <input
                ref={fileInputRef}
                id="document"
                type="file"
                accept=".doc,.docx,application/msword,application/vnd.openxmlformats-officedocument.wordprocessingml.document"
                onChange={handleFileSelect}
                className="hidden"
              />
              <button
                type="button"
                onClick={() => fileInputRef.current?.click()}
                className="w-full px-4 py-2 border-2 border-dashed border-gray-300 rounded-md hover:border-blue-500 hover:bg-blue-50 transition-colors flex items-center justify-center gap-2"
              >
                <Upload size={18} className="text-gray-500" />
                <span className="text-sm font-medium text-gray-700">
                  {selectedFile ? selectedFile.name : 'Upload Contract Document'}
                </span>
              </button>
              {selectedFile && (
                <div className="flex items-center gap-2 p-2 bg-blue-50 border border-blue-200 rounded-md">
                  <FileText size={16} className="text-blue-600" />
                  <span className="text-sm text-blue-900 flex-1 truncate">{selectedFile.name}</span>
                  <button
                    type="button"
                    onClick={() => {
                      setSelectedFile(null);
                      if (fileInputRef.current) {
                        fileInputRef.current.value = '';
                      }
                    }}
                    className="text-blue-600 hover:text-blue-800"
                  >
                    <X size={16} />
                  </button>
                </div>
              )}
              <p className="text-xs text-gray-500">
                Word documents (.doc, .docx) only. Max 10MB.
              </p>
            </div>
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
              disabled={loading || uploading || !clientId || (type === 'amendment' && !parentContractId)}
              className="flex-1 px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {uploading ? 'Uploading...' : loading ? 'Creating...' : 'Create Contract'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

