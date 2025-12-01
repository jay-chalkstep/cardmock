'use client';

import { useState } from 'react';
import { X, Send, Loader2, Link2, Copy, Check } from 'lucide-react';
import type { CardMockData } from './CardMockDetailModal';

interface ShareModalProps {
  cardMock: CardMockData;
  isOpen: boolean;
  onClose: () => void;
}

export default function ShareModal({ cardMock, isOpen, onClose }: ShareModalProps) {
  const [emails, setEmails] = useState('');
  const [message, setMessage] = useState('');
  const [includeDownload, setIncludeDownload] = useState(true);
  const [expiresIn7Days, setExpiresIn7Days] = useState(false);
  const [requirePassword, setRequirePassword] = useState(false);
  const [password, setPassword] = useState('');
  const [isSending, setIsSending] = useState(false);
  const [shareLink, setShareLink] = useState('');
  const [copied, setCopied] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState(false);

  const name = cardMock.name || cardMock.mockup_name || 'Untitled';

  const handleSendEmail = async () => {
    if (!emails.trim()) {
      setError('Please enter at least one email address');
      return;
    }

    setIsSending(true);
    setError('');

    try {
      const response = await fetch('/api/mockups/share', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          mockupId: cardMock.id,
          emails: emails.split(',').map(e => e.trim()).filter(Boolean),
          message,
          includeDownload,
          expiresAt: expiresIn7Days ? new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString() : null,
          password: requirePassword ? password : null,
        }),
      });

      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.error || 'Failed to send share emails');
      }

      const data = await response.json();
      setShareLink(data.shareLink);
      setSuccess(true);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to send');
    } finally {
      setIsSending(false);
    }
  };

  const handleGetLink = async () => {
    setIsSending(true);
    setError('');

    try {
      const response = await fetch('/api/mockups/share', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          mockupId: cardMock.id,
          emails: [],
          includeDownload,
          expiresAt: expiresIn7Days ? new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString() : null,
          password: requirePassword ? password : null,
        }),
      });

      if (!response.ok) {
        throw new Error('Failed to generate share link');
      }

      const data = await response.json();
      setShareLink(data.shareLink);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to generate link');
    } finally {
      setIsSending(false);
    }
  };

  const handleCopyLink = async () => {
    await navigator.clipboard.writeText(shareLink);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

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
            <h3 className="text-lg font-semibold text-[var(--text-primary)]">Share CardMock</h3>
            <button
              onClick={onClose}
              className="p-2 hover:bg-[var(--bg-surface)] rounded-lg transition-colors"
            >
              <X size={20} className="text-[var(--text-secondary)]" />
            </button>
          </div>

          {/* Content */}
          <div className="p-6 space-y-4">
            {success ? (
              <div className="text-center py-4">
                <div className="w-12 h-12 mx-auto mb-4 bg-green-100 rounded-full flex items-center justify-center">
                  <Check size={24} className="text-green-600" />
                </div>
                <h4 className="text-lg font-medium text-[var(--text-primary)] mb-2">
                  Shared successfully!
                </h4>
                <p className="text-sm text-[var(--text-secondary)] mb-4">
                  Email invitations have been sent.
                </p>

                {shareLink && (
                  <div className="bg-[var(--bg-surface)] rounded-lg p-3">
                    <label className="block text-sm font-medium text-[var(--text-secondary)] mb-2">
                      Share Link
                    </label>
                    <div className="flex items-center gap-2">
                      <input
                        type="text"
                        value={shareLink}
                        readOnly
                        className="flex-1 px-3 py-2 bg-[var(--bg-elevated)] border border-[var(--border-default)] rounded-lg text-sm text-[var(--text-primary)]"
                      />
                      <button
                        onClick={handleCopyLink}
                        className="px-3 py-2 bg-[var(--accent-primary)] text-white rounded-lg hover:bg-[var(--accent-primary-hover)] transition-colors"
                      >
                        {copied ? <Check size={18} /> : <Copy size={18} />}
                      </button>
                    </div>
                  </div>
                )}

                <button
                  onClick={onClose}
                  className="mt-4 px-4 py-2 bg-[var(--bg-surface)] border border-[var(--border-default)] text-[var(--text-primary)] rounded-lg hover:bg-[var(--bg-elevated)] transition-colors"
                >
                  Done
                </button>
              </div>
            ) : (
              <>
                {/* Email Input */}
                <div>
                  <label className="block text-sm font-medium text-[var(--text-secondary)] mb-2">
                    Email to
                  </label>
                  <input
                    type="text"
                    value={emails}
                    onChange={(e) => setEmails(e.target.value)}
                    placeholder="sarah@client.com, mike@agency.com"
                    className="w-full px-4 py-3 bg-[var(--bg-surface)] border border-[var(--border-default)] rounded-lg text-[var(--text-primary)] placeholder:text-[var(--text-tertiary)] focus:outline-none focus:border-[var(--accent-primary)]"
                  />
                  <p className="mt-1 text-xs text-[var(--text-tertiary)]">
                    Separate multiple emails with commas
                  </p>
                </div>

                {/* Message */}
                <div>
                  <label className="block text-sm font-medium text-[var(--text-secondary)] mb-2">
                    Message (optional)
                  </label>
                  <textarea
                    value={message}
                    onChange={(e) => setMessage(e.target.value)}
                    placeholder="Here's the latest card design for your review."
                    rows={3}
                    className="w-full px-4 py-3 bg-[var(--bg-surface)] border border-[var(--border-default)] rounded-lg text-[var(--text-primary)] placeholder:text-[var(--text-tertiary)] focus:outline-none focus:border-[var(--accent-primary)] resize-none"
                  />
                </div>

                {/* Options */}
                <div className="space-y-3">
                  <label className="block text-sm font-medium text-[var(--text-secondary)]">
                    Options
                  </label>
                  <label className="flex items-center gap-3 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={includeDownload}
                      onChange={(e) => setIncludeDownload(e.target.checked)}
                      className="w-4 h-4 text-[var(--accent-primary)] rounded"
                    />
                    <span className="text-sm text-[var(--text-primary)]">
                      Include download link
                    </span>
                  </label>
                  <label className="flex items-center gap-3 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={expiresIn7Days}
                      onChange={(e) => setExpiresIn7Days(e.target.checked)}
                      className="w-4 h-4 text-[var(--accent-primary)] rounded"
                    />
                    <span className="text-sm text-[var(--text-primary)]">
                      Link expires in 7 days
                    </span>
                  </label>
                  <label className="flex items-center gap-3 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={requirePassword}
                      onChange={(e) => setRequirePassword(e.target.checked)}
                      className="w-4 h-4 text-[var(--accent-primary)] rounded"
                    />
                    <span className="text-sm text-[var(--text-primary)]">
                      Require password
                    </span>
                  </label>
                  {requirePassword && (
                    <input
                      type="password"
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      placeholder="Enter password"
                      className="w-full px-4 py-2 bg-[var(--bg-surface)] border border-[var(--border-default)] rounded-lg text-[var(--text-primary)] placeholder:text-[var(--text-tertiary)] focus:outline-none focus:border-[var(--accent-primary)]"
                    />
                  )}
                </div>

                {/* Share Link Section */}
                {shareLink && (
                  <div className="bg-[var(--bg-surface)] rounded-lg p-3">
                    <label className="block text-sm font-medium text-[var(--text-secondary)] mb-2">
                      Share Link
                    </label>
                    <div className="flex items-center gap-2">
                      <input
                        type="text"
                        value={shareLink}
                        readOnly
                        className="flex-1 px-3 py-2 bg-[var(--bg-elevated)] border border-[var(--border-default)] rounded-lg text-sm text-[var(--text-primary)]"
                      />
                      <button
                        onClick={handleCopyLink}
                        className="px-3 py-2 bg-[var(--accent-primary)] text-white rounded-lg hover:bg-[var(--accent-primary-hover)] transition-colors"
                      >
                        {copied ? <Check size={18} /> : <Copy size={18} />}
                      </button>
                    </div>
                  </div>
                )}

                {error && (
                  <p className="text-sm text-red-600">{error}</p>
                )}
              </>
            )}
          </div>

          {/* Footer */}
          {!success && (
            <div className="px-6 py-4 bg-[var(--bg-surface)] border-t border-[var(--border-default)] flex items-center justify-between">
              <button
                onClick={handleGetLink}
                disabled={isSending}
                className="flex items-center gap-2 px-4 py-2 text-[var(--text-secondary)] hover:text-[var(--text-primary)] hover:bg-[var(--bg-elevated)] rounded-lg transition-colors"
              >
                <Link2 size={16} />
                Get Link Only
              </button>
              <div className="flex items-center gap-3">
                <button
                  onClick={onClose}
                  className="px-4 py-2 text-[var(--text-secondary)] hover:text-[var(--text-primary)] transition-colors"
                >
                  Cancel
                </button>
                <button
                  onClick={handleSendEmail}
                  disabled={isSending || !emails.trim()}
                  className="flex items-center gap-2 px-4 py-2 bg-[var(--accent-primary)] text-white rounded-lg hover:bg-[var(--accent-primary-hover)] disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                >
                  {isSending ? (
                    <>
                      <Loader2 size={16} className="animate-spin" />
                      Sending...
                    </>
                  ) : (
                    <>
                      <Send size={16} />
                      Send Email
                    </>
                  )}
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </>
  );
}
