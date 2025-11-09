'use client';

import { useState, useEffect } from 'react';
import { FileCheck, CheckCircle, XCircle, Clock, Send, ExternalLink } from 'lucide-react';

interface SignatureStatusProps {
  envelopeId?: string;
  status?: string;
  contractId: string;
  documentId: string;
  onRefresh?: () => void;
}

export default function SignatureStatus({
  envelopeId,
  status,
  contractId,
  documentId,
  onRefresh,
}: SignatureStatusProps) {
  const [signingUrl, setSigningUrl] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const getStatusColor = (status?: string) => {
    switch (status?.toLowerCase()) {
      case 'signed':
      case 'completed':
        return 'bg-green-100 text-green-800 border-green-200';
      case 'delivered':
        return 'bg-yellow-100 text-yellow-800 border-yellow-200';
      case 'declined':
        return 'bg-red-100 text-red-800 border-red-200';
      case 'voided':
        return 'bg-gray-100 text-gray-800 border-gray-200';
      case 'sent':
        return 'bg-blue-100 text-blue-800 border-blue-200';
      default:
        return 'bg-gray-100 text-gray-800 border-gray-200';
    }
  };

  const getStatusIcon = (status?: string) => {
    switch (status?.toLowerCase()) {
      case 'signed':
      case 'completed':
        return <CheckCircle size={18} className="text-green-600" />;
      case 'declined':
        return <XCircle size={18} className="text-red-600" />;
      case 'voided':
        return <XCircle size={18} className="text-gray-600" />;
      case 'delivered':
        return <Clock size={18} className="text-yellow-600" />;
      case 'sent':
        return <Send size={18} className="text-blue-600" />;
      default:
        return <FileCheck size={18} className="text-gray-600" />;
    }
  };

  const getStatusLabel = (status?: string) => {
    switch (status?.toLowerCase()) {
      case 'signed':
      case 'completed':
        return 'Signed';
      case 'delivered':
        return 'Delivered';
      case 'declined':
        return 'Declined';
      case 'voided':
        return 'Voided';
      case 'sent':
        return 'Sent';
      default:
        return 'Pending';
    }
  };

  const handleGetSigningUrl = async () => {
    if (!envelopeId) return;
    
    setLoading(true);
    try {
      const response = await fetch(`/api/contracts/${contractId}/documents/${documentId}/signing-url`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ envelopeId }),
      });

      if (!response.ok) {
        throw new Error('Failed to get signing URL');
      }

      const result = await response.json();
      const url = result.data?.url || result.url;
      
      if (url) {
        setSigningUrl(url);
        // Open in new tab
        window.open(url, '_blank');
      }
    } catch (error) {
      console.error('Error getting signing URL:', error);
    } finally {
      setLoading(false);
    }
  };

  if (!envelopeId) {
    return (
      <div className="p-4 border border-gray-200 rounded-lg bg-gray-50">
        <div className="flex items-center gap-2 text-gray-600">
          <FileCheck size={18} />
          <span className="text-sm">No DocuSign envelope created yet</span>
        </div>
      </div>
    );
  }

  return (
    <div className={`p-4 border rounded-lg ${getStatusColor(status)}`}>
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          {getStatusIcon(status)}
          <div>
            <div className="font-medium text-sm">DocuSign Status</div>
            <div className="text-xs opacity-75 mt-0.5">
              {getStatusLabel(status)} • Envelope ID: {envelopeId.substring(0, 8)}...
            </div>
          </div>
        </div>
        {(status === 'sent' || status === 'delivered') && (
          <button
            onClick={handleGetSigningUrl}
            disabled={loading}
            className="px-3 py-1.5 text-xs font-medium bg-white border border-current rounded-md hover:bg-opacity-10 disabled:opacity-50 flex items-center gap-2"
          >
            {loading ? (
              <>
                <Clock size={14} className="animate-spin" />
                Loading...
              </>
            ) : (
              <>
                <ExternalLink size={14} />
                Open Signing
              </>
            )}
          </button>
        )}
      </div>
      
      {signingUrl && (
        <div className="mt-3 pt-3 border-t border-current border-opacity-20">
          <a
            href={signingUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="text-xs underline hover:no-underline flex items-center gap-1"
          >
            <ExternalLink size={12} />
            Signing URL (opens in new tab)
          </a>
        </div>
      )}
    </div>
  );
}

