'use client';

import { useState } from 'react';
import { X, Mail, Loader2, UserPlus, Shield, User } from 'lucide-react';

interface InviteMemberModalProps {
  isOpen: boolean;
  onClose: () => void;
  onInvite: (email: string, role: string) => Promise<void>;
}

export function InviteMemberModal({ isOpen, onClose, onInvite }: InviteMemberModalProps) {
  const [email, setEmail] = useState('');
  const [role, setRole] = useState<'org:admin' | 'org:member'>('org:member');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  if (!isOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    // Basic validation
    if (!email.trim()) {
      setError('Email is required');
      return;
    }

    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      setError('Please enter a valid email address');
      return;
    }

    setLoading(true);
    try {
      await onInvite(email.trim(), role);
      // Reset form on success
      setEmail('');
      setRole('org:member');
      onClose();
    } catch (err: any) {
      setError(err.message || 'Failed to send invitation');
    } finally {
      setLoading(false);
    }
  };

  const handleClose = () => {
    if (!loading) {
      setEmail('');
      setRole('org:member');
      setError(null);
      onClose();
    }
  };

  return (
    <>
      {/* Backdrop */}
      <div
        className="fixed inset-0 bg-[var(--bg-overlay)] z-50"
        onClick={handleClose}
      />

      {/* Modal */}
      <div className="fixed inset-0 flex items-center justify-center z-50 p-4">
        <div
          className="bg-[var(--bg-elevated)] border border-[var(--border-default)]
                     rounded-[var(--radius-lg)] shadow-[var(--shadow-lg)]
                     w-full max-w-md"
          onClick={(e) => e.stopPropagation()}
        >
          {/* Header */}
          <div className="flex items-center justify-between px-6 py-4 border-b border-[var(--border-default)]">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-[var(--radius-md)] bg-[var(--status-info-muted)]
                              flex items-center justify-center">
                <UserPlus size={20} className="text-[var(--accent-primary)]" />
              </div>
              <div>
                <h2 className="text-[16px] font-semibold text-[var(--text-primary)]">
                  Invite Team Member
                </h2>
                <p className="text-[13px] text-[var(--text-tertiary)]">
                  Send an invitation to join your organization
                </p>
              </div>
            </div>
            <button
              onClick={handleClose}
              disabled={loading}
              className="p-2 rounded-[var(--radius-sm)] hover:bg-[var(--bg-surface)]
                         text-[var(--text-tertiary)] hover:text-[var(--text-primary)]
                         transition-colors disabled:opacity-50"
            >
              <X size={18} />
            </button>
          </div>

          {/* Form */}
          <form onSubmit={handleSubmit} className="p-6 space-y-4">
            {/* Email Input */}
            <div>
              <label
                htmlFor="email"
                className="block text-[13px] font-medium text-[var(--text-primary)] mb-1.5"
              >
                Email Address
              </label>
              <div className="relative">
                <Mail
                  size={16}
                  className="absolute left-3 top-1/2 -translate-y-1/2 text-[var(--text-tertiary)]"
                />
                <input
                  id="email"
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="colleague@company.com"
                  disabled={loading}
                  className="w-full h-10 pl-10 pr-4 text-[13px]
                             bg-[var(--bg-surface)] text-[var(--text-primary)]
                             border border-[var(--border-default)] rounded-[var(--radius-md)]
                             focus:outline-none focus:border-[var(--border-focus)]
                             placeholder:text-[var(--text-tertiary)]
                             disabled:opacity-50"
                />
              </div>
            </div>

            {/* Role Selection */}
            <div>
              <label className="block text-[13px] font-medium text-[var(--text-primary)] mb-1.5">
                Role
              </label>
              <div className="grid grid-cols-2 gap-3">
                {/* Member Option */}
                <button
                  type="button"
                  onClick={() => setRole('org:member')}
                  disabled={loading}
                  className={`flex items-center gap-3 p-3 rounded-[var(--radius-md)]
                             border transition-all text-left
                             ${role === 'org:member'
                               ? 'border-[var(--accent-primary)] bg-[var(--status-info-muted)]'
                               : 'border-[var(--border-default)] hover:border-[var(--border-focus)]/50'
                             }
                             disabled:opacity-50`}
                >
                  <div className={`w-8 h-8 rounded-[var(--radius-sm)] flex items-center justify-center
                                  ${role === 'org:member'
                                    ? 'bg-[var(--accent-primary)] text-white'
                                    : 'bg-[var(--bg-surface)] text-[var(--text-secondary)]'
                                  }`}>
                    <User size={16} />
                  </div>
                  <div>
                    <p className="text-[13px] font-medium text-[var(--text-primary)]">Member</p>
                    <p className="text-[11px] text-[var(--text-tertiary)]">Can view and edit</p>
                  </div>
                </button>

                {/* Admin Option */}
                <button
                  type="button"
                  onClick={() => setRole('org:admin')}
                  disabled={loading}
                  className={`flex items-center gap-3 p-3 rounded-[var(--radius-md)]
                             border transition-all text-left
                             ${role === 'org:admin'
                               ? 'border-[var(--accent-primary)] bg-[var(--status-info-muted)]'
                               : 'border-[var(--border-default)] hover:border-[var(--border-focus)]/50'
                             }
                             disabled:opacity-50`}
                >
                  <div className={`w-8 h-8 rounded-[var(--radius-sm)] flex items-center justify-center
                                  ${role === 'org:admin'
                                    ? 'bg-[var(--accent-primary)] text-white'
                                    : 'bg-[var(--bg-surface)] text-[var(--text-secondary)]'
                                  }`}>
                    <Shield size={16} />
                  </div>
                  <div>
                    <p className="text-[13px] font-medium text-[var(--text-primary)]">Admin</p>
                    <p className="text-[11px] text-[var(--text-tertiary)]">Full access</p>
                  </div>
                </button>
              </div>
            </div>

            {/* Error Message */}
            {error && (
              <div className="p-3 bg-[var(--status-error-muted)] border border-[var(--status-error)]/20
                              rounded-[var(--radius-md)]">
                <p className="text-[13px] text-[var(--status-error)]">{error}</p>
              </div>
            )}

            {/* Actions */}
            <div className="flex items-center justify-end gap-3 pt-2">
              <button
                type="button"
                onClick={handleClose}
                disabled={loading}
                className="px-4 py-2 text-[13px] font-medium
                           text-[var(--text-secondary)] hover:text-[var(--text-primary)]
                           hover:bg-[var(--bg-surface)] rounded-[var(--radius-sm)]
                           transition-colors disabled:opacity-50"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={loading || !email.trim()}
                className="flex items-center gap-2 px-4 py-2 text-[13px] font-medium
                           bg-[var(--accent-primary)] text-white
                           hover:bg-[var(--accent-primary-hover)]
                           rounded-[var(--radius-sm)] transition-colors
                           disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {loading ? (
                  <>
                    <Loader2 size={14} className="animate-spin" />
                    Sending...
                  </>
                ) : (
                  <>
                    <Mail size={14} />
                    Send Invitation
                  </>
                )}
              </button>
            </div>
          </form>
        </div>
      </div>
    </>
  );
}
