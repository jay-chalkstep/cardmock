'use client';

import { useState, useEffect } from 'react';
import { X, Search, UserPlus } from 'lucide-react';
import { useOrganization } from '@clerk/nextjs';
import { clerkClient } from '@clerk/nextjs/server';

interface User {
  id: string;
  firstName?: string;
  lastName?: string;
  emailAddress?: string;
  imageUrl?: string;
  role?: string;
}

interface AssignUserModalProps {
  isOpen: boolean;
  onClose: () => void;
  clientId: string;
  onAssign: () => Promise<void>;
  existingUserIds?: string[];
}

export default function AssignUserModal({
  isOpen,
  onClose,
  clientId,
  onAssign,
  existingUserIds = [],
}: AssignUserModalProps) {
  const { organization } = useOrganization();
  const [users, setUsers] = useState<User[]>([]);
  const [filteredUsers, setFilteredUsers] = useState<User[]>([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [loading, setLoading] = useState(false);
  const [assigning, setAssigning] = useState<string | null>(null);

  useEffect(() => {
    if (isOpen && organization?.id) {
      fetchUsers();
    }
  }, [isOpen, organization?.id]);

  useEffect(() => {
    let filtered = users;
    
    if (searchTerm) {
      filtered = filtered.filter(
        (user) =>
          user.firstName?.toLowerCase().includes(searchTerm.toLowerCase()) ||
          user.lastName?.toLowerCase().includes(searchTerm.toLowerCase()) ||
          user.emailAddress?.toLowerCase().includes(searchTerm.toLowerCase())
      );
    }
    
    setFilteredUsers(filtered);
  }, [searchTerm, users]);

  const fetchUsers = async () => {
    if (!organization?.id) return;
    setLoading(true);
    try {
      // Fetch organization members from Clerk
      const response = await fetch('/api/org/members');
      if (!response.ok) throw new Error('Failed to fetch users');
      const result = await response.json();
      const fetchedMembers = result.data?.members || result.members || [];
      
      // Filter to only users with Client role
      const clientUsers = fetchedMembers.filter(
        (member: any) => member.role === 'org:client'
      );
      
      // Transform to User format
      const transformedUsers: User[] = clientUsers.map((member: any) => ({
        id: member.id,
        firstName: member.name?.split(' ')[0],
        lastName: member.name?.split(' ').slice(1).join(' '),
        emailAddress: member.email,
        imageUrl: member.avatar,
        role: member.role,
      }));
      
      // Filter out users already assigned
      const availableUsers = transformedUsers.filter(
        (user: User) => !existingUserIds.includes(user.id)
      );
      
      setUsers(availableUsers);
    } catch (error) {
      console.error('Error fetching users:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleAssign = async (userId: string) => {
    setAssigning(userId);
    try {
      const response = await fetch(`/api/clients/${clientId}/users`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ user_id: userId }),
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.message || 'Failed to assign user');
      }

      await onAssign();
      onClose();
    } catch (error: any) {
      console.error('Error assigning user:', error);
      alert(error.message || 'Failed to assign user');
    } finally {
      setAssigning(null);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg shadow-xl w-full max-w-2xl max-h-[80vh] flex flex-col">
        <div className="p-6 border-b border-gray-200">
          <div className="flex items-center justify-between">
            <h2 className="text-xl font-semibold">Assign User to Client</h2>
            <button
              onClick={onClose}
              className="text-gray-400 hover:text-gray-600"
            >
              <X size={20} />
            </button>
          </div>
        </div>

        <div className="p-6 flex-1 overflow-y-auto">
          <div className="mb-4">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" size={18} />
              <input
                type="text"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                placeholder="Search users..."
                className="w-full pl-10 pr-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>
          </div>

          {loading ? (
            <div className="text-center text-gray-500 py-8">Loading users...</div>
          ) : filteredUsers.length === 0 ? (
            <div className="text-center text-gray-500 py-8">
              <p>No users available to assign.</p>
              <p className="text-sm mt-2">
                {searchTerm ? 'Try a different search term.' : 'All users with Client role are already assigned.'}
              </p>
            </div>
          ) : (
            <div className="space-y-2">
              {filteredUsers.map((user) => (
                <div
                  key={user.id}
                  className="p-3 border border-gray-200 rounded-md hover:bg-gray-50 flex items-center justify-between"
                >
                  <div className="flex items-center gap-3">
                    {user.imageUrl && (
                      <img
                        src={user.imageUrl}
                        alt={user.firstName || 'User'}
                        className="w-10 h-10 rounded-full"
                      />
                    )}
                    <div>
                      <h4 className="font-medium text-gray-900">
                        {user.firstName && user.lastName
                          ? `${user.firstName} ${user.lastName}`
                          : user.emailAddress || 'Unknown User'}
                      </h4>
                      {user.emailAddress && (
                        <p className="text-sm text-gray-500">{user.emailAddress}</p>
                      )}
                    </div>
                  </div>
                  <button
                    onClick={() => handleAssign(user.id)}
                    disabled={assigning === user.id}
                    className="px-3 py-1.5 text-sm font-medium text-white bg-blue-600 rounded-md hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
                  >
                    {assigning === user.id ? (
                      <>
                        <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                        Assigning...
                      </>
                    ) : (
                      <>
                        <UserPlus size={16} />
                        Assign
                      </>
                    )}
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

