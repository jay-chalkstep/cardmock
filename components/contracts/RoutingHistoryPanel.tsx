'use client';

import { useState, useEffect } from 'react';
import { ChevronDown, ChevronRight, Mail, MessageSquare, Clock } from 'lucide-react';

interface RoutingEvent {
  id: string;
  contract_id: string;
  document_id?: string;
  routed_by: string;
  routed_by_name?: string;
  routing_method: 'email' | 'slack' | 'both';
  recipients: Array<{ email: string; name?: string }>;
  slack_channel_id?: string;
  message?: string;
  ai_summary_included: boolean;
  created_at: string;
}

interface RoutingHistoryPanelProps {
  contractId: string;
}

export default function RoutingHistoryPanel({ contractId }: RoutingHistoryPanelProps) {
  const [events, setEvents] = useState<RoutingEvent[]>([]);
  const [loading, setLoading] = useState(true);
  const [expandedEvents, setExpandedEvents] = useState<Set<string>>(new Set());

  useEffect(() => {
    fetchRoutingHistory();
  }, [contractId]);

  const fetchRoutingHistory = async () => {
    setLoading(true);
    try {
      const response = await fetch(`/api/contracts/${contractId}/routing-history`);
      if (response.ok) {
        const result = await response.json();
        setEvents(result.data?.events || []);
      }
    } catch (error) {
      console.error('Error fetching routing history:', error);
    } finally {
      setLoading(false);
    }
  };

  const toggleEvent = (eventId: string) => {
    const newExpanded = new Set(expandedEvents);
    if (newExpanded.has(eventId)) {
      newExpanded.delete(eventId);
    } else {
      newExpanded.add(eventId);
    }
    setExpandedEvents(newExpanded);
  };

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
      hour: 'numeric',
      minute: '2-digit',
    });
  };

  const getMethodIcon = (method: string) => {
    if (method === 'email') return <Mail size={16} />;
    if (method === 'slack') return <MessageSquare size={16} />;
    return (
      <div className="flex items-center gap-1">
        <Mail size={14} />
        <MessageSquare size={14} />
      </div>
    );
  };

  const getMethodLabel = (method: string) => {
    if (method === 'email') return 'Email';
    if (method === 'slack') return 'Slack';
    return 'Email & Slack';
  };

  if (loading) {
    return (
      <div className="p-4 text-center text-gray-500">
        <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-blue-600 mx-auto mb-2"></div>
        Loading routing history...
      </div>
    );
  }

  if (events.length === 0) {
    return (
      <div className="p-4 text-center text-gray-500">
        <Clock size={24} className="mx-auto mb-2 text-gray-400" />
        <p className="text-sm">No routing history yet</p>
      </div>
    );
  }

  return (
    <div className="space-y-2">
      {events.map((event) => {
        const isExpanded = expandedEvents.has(event.id);
        return (
          <div
            key={event.id}
            className="border border-gray-200 rounded-lg overflow-hidden"
          >
            <button
              onClick={() => toggleEvent(event.id)}
              className="w-full flex items-center justify-between p-4 hover:bg-gray-50 transition-colors"
            >
              <div className="flex items-center gap-3 flex-1 text-left">
                {isExpanded ? (
                  <ChevronDown size={20} className="text-gray-400" />
                ) : (
                  <ChevronRight size={20} className="text-gray-400" />
                )}
                <div className="flex items-center gap-2 text-gray-600">
                  {getMethodIcon(event.routing_method)}
                </div>
                <div className="flex-1">
                  <div className="font-medium text-sm">
                    Routed via {getMethodLabel(event.routing_method)}
                  </div>
                  <div className="text-xs text-gray-500">
                    {formatDate(event.created_at)} • {event.routed_by_name || 'Unknown User'}
                  </div>
                </div>
                <div className="text-xs text-gray-500">
                  {event.recipients.length} recipient{event.recipients.length !== 1 ? 's' : ''}
                </div>
              </div>
            </button>

            {isExpanded && (
              <div className="p-4 bg-gray-50 border-t border-gray-200 space-y-3">
                <div>
                  <div className="text-xs font-medium text-gray-500 mb-1">Recipients</div>
                  <div className="space-y-1">
                    {event.recipients.map((recipient, index) => (
                      <div key={index} className="text-sm text-gray-700">
                        {recipient.email} {recipient.name && `(${recipient.name})`}
                      </div>
                    ))}
                  </div>
                </div>

                {event.slack_channel_id && (
                  <div>
                    <div className="text-xs font-medium text-gray-500 mb-1">Slack Channel</div>
                    <div className="text-sm text-gray-700">{event.slack_channel_id}</div>
                  </div>
                )}

                {event.message && (
                  <div>
                    <div className="text-xs font-medium text-gray-500 mb-1">Message</div>
                    <div className="text-sm text-gray-700 whitespace-pre-wrap">{event.message}</div>
                  </div>
                )}

                <div className="flex items-center gap-4 text-xs text-gray-500">
                  <div>
                    AI Summary: {event.ai_summary_included ? 'Included' : 'Not included'}
                  </div>
                  <div>
                    Method: {getMethodLabel(event.routing_method)}
                  </div>
                </div>
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
}

