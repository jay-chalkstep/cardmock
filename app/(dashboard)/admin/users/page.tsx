'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useAdminStatus } from '@/lib/hooks/useAdminStatus';
import { useUser } from '@/lib/hooks/useAuth';
import GmailLayout from '@/components/layout/GmailLayout';
import { InviteMemberModal } from '@/components/admin/InviteMemberModal';
import Toast from '@/components/Toast';
import {
  Users,
  UserPlus,
  Shield,
  User,
  MoreHorizontal,
  Trash2,
  Mail,
  Clock,
  Loader2,
  ChevronDown,
  X,
  AlertCircle,
} from 'lucide-react';

interface ToastMessage {
  message: string;
  type: 'success' | 'error';
  id: number;
}

interface OrgMember {
  id: string;
  name: string;
  email: string;
  avatar: string | null;
  role: string;
  createdAt: string;
}

interface OrgInvitation {
  id: string;
  email: string;
  role: string;
  status: string;
  createdAt: string;
}

export default function ManageUsersPage() {
  const router = useRouter();
  const { isAdmin, isLoaded: adminLoaded } = useAdminStatus();
  const { user } = useUser();

  const [members, setMembers] = useState<OrgMember[]>([]);
  const [invitations, setInvitations] = useState<OrgInvitation[]>([]);
  const [loading, setLoading] = useState(true);
  const [toasts, setToasts] = useState<ToastMessage[]>([]);

  // Modal state
  const [inviteModalOpen, setInviteModalOpen] = useState(false);

  // Dropdown state
  const [openDropdown, setOpenDropdown] = useState<string | null>(null);

  // Action loading states
  const [actionLoading, setActionLoading] = useState<string | null>(null);

  const showToast = (message: string, type: 'success' | 'error') => {
    const id = Date.now();
    setToasts((prev) => [...prev, { message, type, id }]);
  };

  const removeToast = (id: number) => {
    setToasts((prev) => prev.filter((toast) => toast.id !== id));
  };

  // Redirect non-admins
  useEffect(() => {
    if (adminLoaded && !isAdmin) {
      router.push('/');
    }
  }, [adminLoaded, isAdmin, router]);

  // Fetch members and invitations
  useEffect(() => {
    if (adminLoaded && isAdmin) {
      fetchUsers();
    }
  }, [adminLoaded, isAdmin]);

  const fetchUsers = async () => {
    setLoading(true);
    try {
      const response = await fetch('/api/admin/users');
      const result = await response.json();

      if (!response.ok || !result.success) {
        throw new Error(result.error || 'Failed to fetch users');
      }

      setMembers(result.data.members || []);
      setInvitations(result.data.invitations || []);
    } catch (err: any) {
      console.error('Error fetching users:', err);
      showToast(err.message || 'Failed to load users', 'error');
    } finally {
      setLoading(false);
    }
  };

  const handleInvite = async (email: string, role: string) => {
    const response = await fetch('/api/admin/users/invite', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email, role }),
    });

    const result = await response.json();

    if (!response.ok || !result.success) {
      throw new Error(result.error || 'Failed to send invitation');
    }

    showToast(`Invitation sent to ${email}`, 'success');
    fetchUsers();
  };

  const handleRoleChange = async (memberId: string, newRole: string) => {
    setActionLoading(memberId);
    setOpenDropdown(null);

    try {
      const response = await fetch(`/api/admin/users/${memberId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ role: newRole }),
      });

      const result = await response.json();

      if (!response.ok || !result.success) {
        throw new Error(result.error || 'Failed to update role');
      }

      showToast('Role updated successfully', 'success');
      fetchUsers();
    } catch (err: any) {
      showToast(err.message || 'Failed to update role', 'error');
    } finally {
      setActionLoading(null);
    }
  };

  const handleRemoveMember = async (memberId: string, memberName: string) => {
    const confirmed = window.confirm(
      `Remove ${memberName} from the organization?\n\nThey will lose access to all organization resources.`
    );

    if (!confirmed) return;

    setActionLoading(memberId);
    setOpenDropdown(null);

    try {
      const response = await fetch(`/api/admin/users/${memberId}`, {
        method: 'DELETE',
      });

      const result = await response.json();

      if (!response.ok || !result.success) {
        throw new Error(result.error || 'Failed to remove member');
      }

      showToast(`${memberName} has been removed`, 'success');
      fetchUsers();
    } catch (err: any) {
      showToast(err.message || 'Failed to remove member', 'error');
    } finally {
      setActionLoading(null);
    }
  };

  const handleRevokeInvitation = async (invitationId: string, email: string) => {
    const confirmed = window.confirm(`Revoke invitation to ${email}?`);

    if (!confirmed) return;

    setActionLoading(invitationId);

    try {
      const response = await fetch(`/api/admin/users/invite/${invitationId}`, {
        method: 'DELETE',
      });

      const result = await response.json();

      if (!response.ok || !result.success) {
        throw new Error(result.error || 'Failed to revoke invitation');
      }

      showToast('Invitation revoked', 'success');
      fetchUsers();
    } catch (err: any) {
      showToast(err.message || 'Failed to revoke invitation', 'error');
    } finally {
      setActionLoading(null);
    }
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
    });
  };

  const getRoleBadge = (role: string) => {
    if (role === 'org:admin') {
      return (
        <span className="inline-flex items-center gap-1 px-2 py-0.5 text-[11px] font-medium
                        bg-[var(--status-warning-muted)] text-[var(--status-warning)]
                        rounded-[var(--radius-sm)]">
          <Shield size={10} />
          Admin
        </span>
      );
    }
    return (
      <span className="inline-flex items-center gap-1 px-2 py-0.5 text-[11px] font-medium
                      bg-[var(--bg-surface)] text-[var(--text-secondary)]
                      rounded-[var(--radius-sm)]">
        <User size={10} />
        Member
      </span>
    );
  };

  // Show loading or redirect if not admin
  if (!adminLoaded || !isAdmin) {
    return (
      <GmailLayout>
        <div className="flex items-center justify-center h-64">
          <Loader2 className="h-8 w-8 animate-spin text-[var(--accent-primary)]" />
        </div>
      </GmailLayout>
    );
  }

  return (
    <GmailLayout>
      <div className="h-full flex flex-col">
        {/* Header */}
        <div className="bg-[var(--bg-elevated)] border-b border-[var(--border-default)] px-6 py-4
                        flex items-center justify-between">
          <div>
            <h1 className="text-[18px] font-semibold text-[var(--text-primary)]">Manage Users</h1>
            <p className="text-[13px] text-[var(--text-secondary)] mt-1">
              Invite and manage team members in your organization
            </p>
          </div>
          <button
            onClick={() => setInviteModalOpen(true)}
            className="flex items-center gap-2 px-4 py-2
                       bg-[var(--accent-primary)] text-white text-[13px] font-medium
                       rounded-[var(--radius-sm)] hover:bg-[var(--accent-primary-hover)]
                       transition-colors"
          >
            <UserPlus size={16} />
            Invite Member
          </button>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-6">
          {loading ? (
            <div className="flex items-center justify-center h-64">
              <Loader2 className="h-8 w-8 animate-spin text-[var(--accent-primary)]" />
            </div>
          ) : (
            <div className="space-y-8">
              {/* Members Section */}
              <div>
                <div className="flex items-center gap-2 mb-4">
                  <Users size={16} className="text-[var(--text-tertiary)]" />
                  <h2 className="text-[14px] font-medium text-[var(--text-primary)]">
                    Team Members
                  </h2>
                  <span className="text-[13px] text-[var(--text-tertiary)]">
                    ({members.length})
                  </span>
                </div>

                <div className="bg-[var(--bg-elevated)] border border-[var(--border-default)]
                                rounded-[var(--radius-lg)] divide-y divide-[var(--border-default)]">
                  {members.length === 0 ? (
                    <div className="p-8 text-center">
                      <Users size={32} className="mx-auto mb-3 text-[var(--text-tertiary)]" />
                      <p className="text-[var(--text-secondary)]">No team members yet</p>
                    </div>
                  ) : (
                    members.map((member) => {
                      const isCurrentUser = member.id === user?.id;
                      const isLoading = actionLoading === member.id;

                      return (
                        <div
                          key={member.id}
                          className="flex items-center justify-between px-4 py-3
                                     hover:bg-[var(--bg-surface)] transition-colors"
                        >
                          {/* Member Info */}
                          <div className="flex items-center gap-3">
                            {member.avatar ? (
                              <img
                                src={member.avatar}
                                alt={member.name}
                                className="w-10 h-10 rounded-full object-cover"
                              />
                            ) : (
                              <div className="w-10 h-10 rounded-full bg-[var(--bg-surface)]
                                              flex items-center justify-center">
                                <User size={18} className="text-[var(--text-tertiary)]" />
                              </div>
                            )}
                            <div>
                              <div className="flex items-center gap-2">
                                <p className="text-[13px] font-medium text-[var(--text-primary)]">
                                  {member.name}
                                </p>
                                {isCurrentUser && (
                                  <span className="text-[11px] text-[var(--text-tertiary)]">(you)</span>
                                )}
                              </div>
                              <p className="text-[12px] text-[var(--text-tertiary)]">{member.email}</p>
                            </div>
                          </div>

                          {/* Role & Actions */}
                          <div className="flex items-center gap-3">
                            {getRoleBadge(member.role)}

                            <span className="text-[11px] text-[var(--text-tertiary)]">
                              Joined {formatDate(member.createdAt)}
                            </span>

                            {/* Actions Dropdown */}
                            <div className="relative">
                              <button
                                onClick={() => setOpenDropdown(openDropdown === member.id ? null : member.id)}
                                disabled={isLoading}
                                className="p-1.5 rounded-[var(--radius-sm)]
                                           hover:bg-[var(--bg-surface)] text-[var(--text-tertiary)]
                                           hover:text-[var(--text-primary)] transition-colors
                                           disabled:opacity-50"
                              >
                                {isLoading ? (
                                  <Loader2 size={16} className="animate-spin" />
                                ) : (
                                  <MoreHorizontal size={16} />
                                )}
                              </button>

                              {openDropdown === member.id && (
                                <>
                                  <div
                                    className="fixed inset-0 z-40"
                                    onClick={() => setOpenDropdown(null)}
                                  />
                                  <div className="absolute right-0 top-full mt-1 z-50 min-w-[160px]
                                                  bg-[var(--bg-elevated)] border border-[var(--border-default)]
                                                  rounded-[var(--radius-md)] shadow-[var(--shadow-lg)] py-1">
                                    {/* Role Change */}
                                    <button
                                      onClick={() => handleRoleChange(
                                        member.id,
                                        member.role === 'org:admin' ? 'org:member' : 'org:admin'
                                      )}
                                      className="w-full flex items-center gap-2 px-3 py-2 text-[13px]
                                                 text-[var(--text-secondary)] hover:bg-[var(--bg-surface)]
                                                 hover:text-[var(--text-primary)] transition-colors"
                                    >
                                      {member.role === 'org:admin' ? (
                                        <>
                                          <User size={14} />
                                          Make Member
                                        </>
                                      ) : (
                                        <>
                                          <Shield size={14} />
                                          Make Admin
                                        </>
                                      )}
                                    </button>

                                    {/* Remove (not for self) */}
                                    {!isCurrentUser && (
                                      <button
                                        onClick={() => handleRemoveMember(member.id, member.name)}
                                        className="w-full flex items-center gap-2 px-3 py-2 text-[13px]
                                                   text-[var(--status-error)] hover:bg-[var(--status-error-muted)]
                                                   transition-colors"
                                      >
                                        <Trash2 size={14} />
                                        Remove
                                      </button>
                                    )}
                                  </div>
                                </>
                              )}
                            </div>
                          </div>
                        </div>
                      );
                    })
                  )}
                </div>
              </div>

              {/* Pending Invitations Section */}
              {invitations.length > 0 && (
                <div>
                  <div className="flex items-center gap-2 mb-4">
                    <Mail size={16} className="text-[var(--text-tertiary)]" />
                    <h2 className="text-[14px] font-medium text-[var(--text-primary)]">
                      Pending Invitations
                    </h2>
                    <span className="text-[13px] text-[var(--text-tertiary)]">
                      ({invitations.length})
                    </span>
                  </div>

                  <div className="bg-[var(--bg-elevated)] border border-[var(--border-default)]
                                  rounded-[var(--radius-lg)] divide-y divide-[var(--border-default)]">
                    {invitations.map((invitation) => {
                      const isLoading = actionLoading === invitation.id;

                      return (
                        <div
                          key={invitation.id}
                          className="flex items-center justify-between px-4 py-3
                                     hover:bg-[var(--bg-surface)] transition-colors"
                        >
                          {/* Invitation Info */}
                          <div className="flex items-center gap-3">
                            <div className="w-10 h-10 rounded-full bg-[var(--status-info-muted)]
                                            flex items-center justify-center">
                              <Mail size={18} className="text-[var(--accent-primary)]" />
                            </div>
                            <div>
                              <p className="text-[13px] font-medium text-[var(--text-primary)]">
                                {invitation.email}
                              </p>
                              <div className="flex items-center gap-2 text-[12px] text-[var(--text-tertiary)]">
                                <Clock size={12} />
                                Invited {formatDate(invitation.createdAt)}
                              </div>
                            </div>
                          </div>

                          {/* Role & Actions */}
                          <div className="flex items-center gap-3">
                            {getRoleBadge(invitation.role)}

                            <span className="inline-flex items-center gap-1 px-2 py-0.5 text-[11px] font-medium
                                           bg-[var(--status-info-muted)] text-[var(--accent-primary)]
                                           rounded-[var(--radius-sm)]">
                              <AlertCircle size={10} />
                              Pending
                            </span>

                            <button
                              onClick={() => handleRevokeInvitation(invitation.id, invitation.email)}
                              disabled={isLoading}
                              className="p-1.5 rounded-[var(--radius-sm)]
                                         hover:bg-[var(--status-error-muted)]
                                         text-[var(--text-tertiary)] hover:text-[var(--status-error)]
                                         transition-colors disabled:opacity-50"
                              title="Revoke invitation"
                            >
                              {isLoading ? (
                                <Loader2 size={16} className="animate-spin" />
                              ) : (
                                <X size={16} />
                              )}
                            </button>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}
            </div>
          )}
        </div>
      </div>

      {/* Invite Modal */}
      <InviteMemberModal
        isOpen={inviteModalOpen}
        onClose={() => setInviteModalOpen(false)}
        onInvite={handleInvite}
      />

      {/* Toast Notifications */}
      {toasts.map((toast) => (
        <Toast
          key={toast.id}
          message={toast.message}
          type={toast.type}
          onClose={() => removeToast(toast.id)}
        />
      ))}
    </GmailLayout>
  );
}
