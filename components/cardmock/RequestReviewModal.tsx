'use client';

import { useState, useEffect } from 'react';
import { X, Search, Loader2, Calendar, User, Check } from 'lucide-react';
import type { CardMockData } from './CardMockDetailModal';

interface TeamMember {
  id: string;
  name: string;
  email: string;
  avatar?: string;
}

interface RequestReviewModalProps {
  cardMock: CardMockData;
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
}

export default function RequestReviewModal({
  cardMock,
  isOpen,
  onClose,
  onSuccess,
}: RequestReviewModalProps) {
  const [searchQuery, setSearchQuery] = useState('');
  const [teamMembers, setTeamMembers] = useState<TeamMember[]>([]);
  const [selectedReviewers, setSelectedReviewers] = useState<string[]>([]);
  const [dueDate, setDueDate] = useState('');
  const [message, setMessage] = useState('');
  const [reviewType, setReviewType] = useState<'all' | 'any'>('all');
  const [isLoading, setIsLoading] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState('');

  const name = cardMock.name || cardMock.mockup_name || 'Untitled';

  useEffect(() => {
    if (isOpen) {
      fetchTeamMembers();
    }
  }, [isOpen]);

  const fetchTeamMembers = async () => {
    setIsLoading(true);
    try {
      const response = await fetch('/api/team/members');
      if (response.ok) {
        const data = await response.json();
        setTeamMembers(data.members || []);
      }
    } catch (error) {
      console.error('Error fetching team members:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const toggleReviewer = (memberId: string) => {
    setSelectedReviewers((prev) =>
      prev.includes(memberId)
        ? prev.filter((id) => id !== memberId)
        : [...prev, memberId]
    );
  };

  const handleSubmit = async () => {
    if (selectedReviewers.length === 0) {
      setError('Please select at least one reviewer');
      return;
    }

    setIsSubmitting(true);
    setError('');

    try {
      const response = await fetch('/api/mockups/request-review', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          mockupId: cardMock.id,
          reviewerIds: selectedReviewers,
          dueDate: dueDate || null,
          message,
          reviewType,
        }),
      });

      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.error || 'Failed to request review');
      }

      onSuccess();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to request review');
    } finally {
      setIsSubmitting(false);
    }
  };

  const filteredMembers = teamMembers.filter((member) =>
    member.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    member.email.toLowerCase().includes(searchQuery.toLowerCase())
  );

  if (!isOpen) return null;

  return (
    <>
      {/* Backdrop */}
      <div className="fixed inset-0 bg-black/50 z-[60]" onClick={onClose} />

      {/* Modal */}
      <div className="fixed inset-0 z-[70] flex items-center justify-center p-4">
        <div
          className="bg-[var(--bg-elevated)] w-full max-w-lg rounded-xl shadow-2xl overflow-hidden"
          onClick={(e) => e.stopPropagation()}
        >
          {/* Header */}
          <div className="flex items-center justify-between px-6 py-4 border-b border-[var(--border-default)]">
            <h3 className="text-lg font-semibold text-[var(--text-primary)]">Request Review</h3>
            <button
              onClick={onClose}
              className="p-2 hover:bg-[var(--bg-surface)] rounded-lg transition-colors"
            >
              <X size={20} className="text-[var(--text-secondary)]" />
            </button>
          </div>

          {/* Content */}
          <div className="p-6 space-y-4 max-h-[60vh] overflow-y-auto">
            {/* Reviewer Search */}
            <div>
              <label className="block text-sm font-medium text-[var(--text-secondary)] mb-2">
                Select Reviewers
              </label>
              <div className="relative mb-3">
                <Search
                  size={16}
                  className="absolute left-3 top-1/2 -translate-y-1/2 text-[var(--text-tertiary)]"
                />
                <input
                  type="text"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder="Search team members..."
                  className="w-full pl-9 pr-4 py-2.5 bg-[var(--bg-surface)] border border-[var(--border-default)] rounded-lg text-[var(--text-primary)] placeholder:text-[var(--text-tertiary)] focus:outline-none focus:border-[var(--accent-primary)]"
                />
              </div>

              {/* Team Members List */}
              <div className="border border-[var(--border-default)] rounded-lg max-h-48 overflow-y-auto">
                {isLoading ? (
                  <div className="flex items-center justify-center py-8">
                    <Loader2 size={24} className="animate-spin text-[var(--text-tertiary)]" />
                  </div>
                ) : filteredMembers.length === 0 ? (
                  <div className="py-8 text-center text-sm text-[var(--text-tertiary)]">
                    {searchQuery ? 'No members found' : 'No team members available'}
                  </div>
                ) : (
                  <div className="divide-y divide-[var(--border-default)]">
                    {filteredMembers.map((member) => {
                      const isSelected = selectedReviewers.includes(member.id);
                      return (
                        <button
                          key={member.id}
                          onClick={() => toggleReviewer(member.id)}
                          className={`w-full flex items-center gap-3 px-4 py-3 hover:bg-[var(--bg-surface)] transition-colors ${
                            isSelected ? 'bg-[var(--status-info-muted)]' : ''
                          }`}
                        >
                          <div className={`w-5 h-5 rounded border flex items-center justify-center ${
                            isSelected
                              ? 'bg-[var(--accent-primary)] border-[var(--accent-primary)]'
                              : 'border-[var(--border-default)]'
                          }`}>
                            {isSelected && <Check size={12} className="text-white" />}
                          </div>
                          {member.avatar ? (
                            <img
                              src={member.avatar}
                              alt={member.name}
                              className="w-8 h-8 rounded-full"
                            />
                          ) : (
                            <div className="w-8 h-8 rounded-full bg-[var(--bg-surface)] flex items-center justify-center">
                              <User size={14} className="text-[var(--text-tertiary)]" />
                            </div>
                          )}
                          <div className="flex-1 text-left">
                            <div className="text-sm font-medium text-[var(--text-primary)]">
                              {member.name}
                            </div>
                            <div className="text-xs text-[var(--text-tertiary)]">
                              {member.email}
                            </div>
                          </div>
                        </button>
                      );
                    })}
                  </div>
                )}
              </div>
              {selectedReviewers.length > 0 && (
                <p className="mt-2 text-xs text-[var(--text-secondary)]">
                  {selectedReviewers.length} reviewer{selectedReviewers.length > 1 ? 's' : ''} selected
                </p>
              )}
            </div>

            {/* Due Date */}
            <div>
              <label className="block text-sm font-medium text-[var(--text-secondary)] mb-2">
                Due date (optional)
              </label>
              <div className="relative">
                <Calendar
                  size={16}
                  className="absolute left-3 top-1/2 -translate-y-1/2 text-[var(--text-tertiary)]"
                />
                <input
                  type="date"
                  value={dueDate}
                  onChange={(e) => setDueDate(e.target.value)}
                  min={new Date().toISOString().split('T')[0]}
                  className="w-full pl-9 pr-4 py-2.5 bg-[var(--bg-surface)] border border-[var(--border-default)] rounded-lg text-[var(--text-primary)] focus:outline-none focus:border-[var(--accent-primary)]"
                />
              </div>
            </div>

            {/* Message */}
            <div>
              <label className="block text-sm font-medium text-[var(--text-secondary)] mb-2">
                Message to reviewers
              </label>
              <textarea
                value={message}
                onChange={(e) => setMessage(e.target.value)}
                placeholder="Please review the updated card design and check the legal copy..."
                rows={3}
                className="w-full px-4 py-3 bg-[var(--bg-surface)] border border-[var(--border-default)] rounded-lg text-[var(--text-primary)] placeholder:text-[var(--text-tertiary)] focus:outline-none focus:border-[var(--accent-primary)] resize-none"
              />
            </div>

            {/* Review Type */}
            <div>
              <label className="block text-sm font-medium text-[var(--text-secondary)] mb-2">
                Review type
              </label>
              <div className="space-y-2">
                <label className="flex items-center gap-3 cursor-pointer">
                  <input
                    type="radio"
                    name="reviewType"
                    value="all"
                    checked={reviewType === 'all'}
                    onChange={() => setReviewType('all')}
                    className="text-[var(--accent-primary)]"
                  />
                  <span className="text-sm text-[var(--text-primary)]">
                    All must approve
                  </span>
                </label>
                <label className="flex items-center gap-3 cursor-pointer">
                  <input
                    type="radio"
                    name="reviewType"
                    value="any"
                    checked={reviewType === 'any'}
                    onChange={() => setReviewType('any')}
                    className="text-[var(--accent-primary)]"
                  />
                  <span className="text-sm text-[var(--text-primary)]">
                    Any one can approve
                  </span>
                </label>
              </div>
            </div>

            {error && (
              <p className="text-sm text-red-600">{error}</p>
            )}
          </div>

          {/* Footer */}
          <div className="px-6 py-4 bg-[var(--bg-surface)] border-t border-[var(--border-default)] flex items-center justify-end gap-3">
            <button
              onClick={onClose}
              className="px-4 py-2 text-[var(--text-secondary)] hover:text-[var(--text-primary)] transition-colors"
            >
              Cancel
            </button>
            <button
              onClick={handleSubmit}
              disabled={isSubmitting || selectedReviewers.length === 0}
              className="flex items-center gap-2 px-4 py-2 bg-[var(--accent-primary)] text-white rounded-lg hover:bg-[var(--accent-primary-hover)] disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
            >
              {isSubmitting ? (
                <>
                  <Loader2 size={16} className="animate-spin" />
                  Sending...
                </>
              ) : (
                'Send Review Request'
              )}
            </button>
          </div>
        </div>
      </div>
    </>
  );
}
