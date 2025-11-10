'use client';

import { useState, useEffect } from 'react';
import { X, Mail, MessageSquare, Plus, Trash2, Check } from 'lucide-react';

interface RouteForCommentModalProps {
  isOpen: boolean;
  onClose: () => void;
  contractId: string;
  documentId?: string;
  onSuccess?: () => void;
}

interface Recipient {
  id?: string;
  email: string;
  name?: string;
}

interface SlackChannel {
  id: string;
  name: string;
  is_private: boolean;
}

export default function RouteForCommentModal({
  isOpen,
  onClose,
  contractId,
  documentId,
  onSuccess,
}: RouteForCommentModalProps) {
  const [routingMethod, setRoutingMethod] = useState<'email' | 'slack' | 'both'>('email');
  const [useSavedRecipients, setUseSavedRecipients] = useState(true);
  const [savedRecipients, setSavedRecipients] = useState<Recipient[]>([]);
  const [additionalRecipients, setAdditionalRecipients] = useState<Recipient[]>([]);
  const [newRecipientEmail, setNewRecipientEmail] = useState('');
  const [newRecipientName, setNewRecipientName] = useState('');
  const [slackChannels, setSlackChannels] = useState<SlackChannel[]>([]);
  const [selectedSlackChannel, setSelectedSlackChannel] = useState('');
  const [slackIntegrationConnected, setSlackIntegrationConnected] = useState(false);
  const [message, setMessage] = useState('');
  const [includeAiSummary, setIncludeAiSummary] = useState(true);
  const [loading, setLoading] = useState(false);
  const [loadingRecipients, setLoadingRecipients] = useState(false);
  const [loadingChannels, setLoadingChannels] = useState(false);

  useEffect(() => {
    if (isOpen) {
      fetchSavedRecipients();
      if (routingMethod === 'slack' || routingMethod === 'both') {
        fetchSlackChannels();
      }
    }
  }, [isOpen, routingMethod]);

  const fetchSavedRecipients = async () => {
    setLoadingRecipients(true);
    try {
      const response = await fetch(`/api/contracts/${contractId}/routing-recipients`);
      if (response.ok) {
        const result = await response.json();
        setSavedRecipients(result.data?.recipients || []);
      }
    } catch (error) {
      console.error('Error fetching saved recipients:', error);
    } finally {
      setLoadingRecipients(false);
    }
  };

  const fetchSlackChannels = async () => {
    setLoadingChannels(true);
    try {
      const response = await fetch('/api/integrations/slack/channels');
      if (response.ok) {
        const result = await response.json();
        const channels = result.data?.channels || [];
        setSlackChannels(channels);
        setSlackIntegrationConnected(channels.length > 0);
      } else {
        setSlackIntegrationConnected(false);
      }
    } catch (error) {
      console.error('Error fetching Slack channels:', error);
      setSlackIntegrationConnected(false);
    } finally {
      setLoadingChannels(false);
    }
  };

  const handleAddRecipient = () => {
    if (!newRecipientEmail || !newRecipientEmail.includes('@')) {
      return;
    }

    const newRecipient: Recipient = {
      email: newRecipientEmail.trim().toLowerCase(),
      name: newRecipientName.trim() || undefined,
    };

    // Check if already exists
    const exists = additionalRecipients.some(
      r => r.email.toLowerCase() === newRecipient.email.toLowerCase()
    );
    if (exists) {
      return;
    }

    setAdditionalRecipients([...additionalRecipients, newRecipient]);
    setNewRecipientEmail('');
    setNewRecipientName('');
  };

  const handleRemoveRecipient = (index: number) => {
    setAdditionalRecipients(additionalRecipients.filter((_, i) => i !== index));
  };

  const handleRemoveSavedRecipient = async (recipientId: string) => {
    try {
      const response = await fetch(
        `/api/contracts/${contractId}/routing-recipients/${recipientId}`,
        { method: 'DELETE' }
      );
      if (response.ok) {
        setSavedRecipients(savedRecipients.filter(r => r.id !== recipientId));
      }
    } catch (error) {
      console.error('Error removing recipient:', error);
    }
  };

  const handleSaveRecipient = async (recipient: Recipient) => {
    try {
      const response = await fetch(`/api/contracts/${contractId}/routing-recipients`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(recipient),
      });
      if (response.ok) {
        await fetchSavedRecipients();
      }
    } catch (error) {
      console.error('Error saving recipient:', error);
    }
  };

  const handleSubmit = async () => {
    // Validate
    if ((routingMethod === 'email' || routingMethod === 'both') && 
        useSavedRecipients && savedRecipients.length === 0 && additionalRecipients.length === 0) {
      alert('Please add at least one recipient');
      return;
    }

    if ((routingMethod === 'slack' || routingMethod === 'both') && !selectedSlackChannel) {
      alert('Please select a Slack channel');
      return;
    }

    setLoading(true);
    try {
      const recipients = useSavedRecipients
        ? [...savedRecipients, ...additionalRecipients].map(r => r.email)
        : additionalRecipients.map(r => r.email);

      const response = await fetch(`/api/contracts/${contractId}/route-for-comment`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          document_id: documentId,
          routing_method: routingMethod,
          recipients: recipients.length > 0 ? recipients : undefined,
          slack_channel_id: (routingMethod === 'slack' || routingMethod === 'both') ? selectedSlackChannel : undefined,
          message: message.trim() || undefined,
          include_ai_summary: includeAiSummary,
          use_saved_recipients: useSavedRecipients,
        }),
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.message || 'Failed to route contract');
      }

      // Save new recipients
      for (const recipient of additionalRecipients) {
        await handleSaveRecipient(recipient);
      }

      if (onSuccess) {
        onSuccess();
      }
      onClose();
    } catch (error: any) {
      alert(error.message || 'Failed to route contract');
    } finally {
      setLoading(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-50">
      <div className="bg-white rounded-lg shadow-xl w-full max-w-2xl max-h-[90vh] overflow-hidden flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-gray-200">
          <h2 className="text-xl font-semibold">Route Contract for Comment</h2>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600 transition-colors"
          >
            <X size={20} />
          </button>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-6 space-y-6">
          {/* Routing Method Selection */}
          <div>
            <label className="block text-sm font-medium mb-2">Routing Method</label>
            <div className="flex gap-4">
              <button
                type="button"
                onClick={() => setRoutingMethod('email')}
                className={`flex-1 px-4 py-3 border-2 rounded-lg transition-colors ${
                  routingMethod === 'email'
                    ? 'border-blue-600 bg-blue-50'
                    : 'border-gray-200 hover:border-gray-300'
                }`}
              >
                <Mail className="mx-auto mb-2" size={24} />
                <div className="font-medium">Email</div>
              </button>
              <button
                type="button"
                onClick={() => setRoutingMethod('slack')}
                className={`flex-1 px-4 py-3 border-2 rounded-lg transition-colors ${
                  routingMethod === 'slack'
                    ? 'border-blue-600 bg-blue-50'
                    : 'border-gray-200 hover:border-gray-300'
                }`}
              >
                <MessageSquare className="mx-auto mb-2" size={24} />
                <div className="font-medium">Slack</div>
              </button>
              <button
                type="button"
                onClick={() => setRoutingMethod('both')}
                className={`flex-1 px-4 py-3 border-2 rounded-lg transition-colors ${
                  routingMethod === 'both'
                    ? 'border-blue-600 bg-blue-50'
                    : 'border-gray-200 hover:border-gray-300'
                }`}
              >
                <div className="flex items-center justify-center gap-2 mb-2">
                  <Mail size={20} />
                  <MessageSquare size={20} />
                </div>
                <div className="font-medium">Both</div>
              </button>
            </div>
          </div>

          {/* Email Recipients */}
          {(routingMethod === 'email' || routingMethod === 'both') && (
            <div>
              <div className="flex items-center justify-between mb-2">
                <label className="block text-sm font-medium">Email Recipients</label>
                <label className="flex items-center gap-2 text-sm text-gray-600">
                  <input
                    type="checkbox"
                    checked={useSavedRecipients}
                    onChange={(e) => setUseSavedRecipients(e.target.checked)}
                    className="rounded"
                  />
                  Use saved recipients
                </label>
              </div>

              {useSavedRecipients && (
                <div className="mb-4 space-y-2">
                  {loadingRecipients ? (
                    <div className="text-sm text-gray-500">Loading recipients...</div>
                  ) : savedRecipients.length > 0 ? (
                    savedRecipients.map((recipient) => (
                      <div
                        key={recipient.id}
                        className="flex items-center justify-between p-2 bg-gray-50 rounded border border-gray-200"
                      >
                        <div>
                          <div className="font-medium text-sm">{recipient.email}</div>
                          {recipient.name && (
                            <div className="text-xs text-gray-500">{recipient.name}</div>
                          )}
                        </div>
                        <button
                          onClick={() => recipient.id && handleRemoveSavedRecipient(recipient.id)}
                          className="text-red-600 hover:text-red-800"
                        >
                          <Trash2 size={16} />
                        </button>
                      </div>
                    ))
                  ) : (
                    <div className="text-sm text-gray-500">No saved recipients</div>
                  )}
                </div>
              )}

              {/* Add Recipient */}
              <div className="flex gap-2 mb-4">
                <input
                  type="email"
                  placeholder="Email address"
                  value={newRecipientEmail}
                  onChange={(e) => setNewRecipientEmail(e.target.value)}
                  onKeyPress={(e) => e.key === 'Enter' && handleAddRecipient()}
                  className="flex-1 px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
                <input
                  type="text"
                  placeholder="Name (optional)"
                  value={newRecipientName}
                  onChange={(e) => setNewRecipientName(e.target.value)}
                  onKeyPress={(e) => e.key === 'Enter' && handleAddRecipient()}
                  className="flex-1 px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
                <button
                  onClick={handleAddRecipient}
                  className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700"
                >
                  <Plus size={20} />
                </button>
              </div>

              {/* Additional Recipients List */}
              {additionalRecipients.length > 0 && (
                <div className="space-y-2">
                  {additionalRecipients.map((recipient, index) => (
                    <div
                      key={index}
                      className="flex items-center justify-between p-2 bg-blue-50 rounded border border-blue-200"
                    >
                      <div>
                        <div className="font-medium text-sm">{recipient.email}</div>
                        {recipient.name && (
                          <div className="text-xs text-gray-500">{recipient.name}</div>
                        )}
                      </div>
                      <button
                        onClick={() => handleRemoveRecipient(index)}
                        className="text-red-600 hover:text-red-800"
                      >
                        <Trash2 size={16} />
                      </button>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* Slack Channel Selection */}
          {(routingMethod === 'slack' || routingMethod === 'both') && (
            <div>
              <label className="block text-sm font-medium mb-2">Slack Channel</label>
              {loadingChannels ? (
                <div className="text-sm text-gray-500">Loading channels...</div>
              ) : !slackIntegrationConnected ? (
                <div className="p-4 bg-yellow-50 border border-yellow-200 rounded-md text-sm text-yellow-800">
                  Slack integration not connected. Please connect Slack in Settings → Integrations.
                </div>
              ) : (
                <select
                  value={selectedSlackChannel}
                  onChange={(e) => setSelectedSlackChannel(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                >
                  <option value="">Select a channel...</option>
                  {slackChannels.map((channel) => (
                    <option key={channel.id} value={channel.id}>
                      #{channel.name} {channel.is_private ? '(Private)' : ''}
                    </option>
                  ))}
                </select>
              )}
            </div>
          )}

          {/* Custom Message */}
          <div>
            <label className="block text-sm font-medium mb-2">Custom Message (Optional)</label>
            <textarea
              value={message}
              onChange={(e) => setMessage(e.target.value)}
              placeholder="Add a custom message to include with the routing..."
              rows={4}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>

          {/* Options */}
          <div>
            <label className="flex items-center gap-2 text-sm">
              <input
                type="checkbox"
                checked={includeAiSummary}
                onChange={(e) => setIncludeAiSummary(e.target.checked)}
                className="rounded"
              />
              Include AI summary of changes
            </label>
          </div>
        </div>

        {/* Footer */}
        <div className="flex items-center justify-end gap-3 p-6 border-t border-gray-200">
          <button
            onClick={onClose}
            className="px-4 py-2 text-gray-700 bg-gray-100 rounded-md hover:bg-gray-200 transition-colors"
          >
            Cancel
          </button>
          <button
            onClick={handleSubmit}
            disabled={loading}
            className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
          >
            {loading ? 'Routing...' : 'Route for Comment'}
          </button>
        </div>
      </div>
    </div>
  );
}

