'use client';

import { useState } from 'react';
import { Loader2, Check, X } from 'lucide-react';
import Toast from '@/components/Toast';

interface GmailConnectButtonProps {
  isConnected: boolean;
  onConnect?: () => void;
  onDisconnect?: () => void;
}

export default function GmailConnectButton({
  isConnected,
  onConnect,
  onDisconnect,
}: GmailConnectButtonProps) {
  const [loading, setLoading] = useState(false);
  const [toast, setToast] = useState<{ message: string; type: 'success' | 'error' } | null>(null);
  
  const handleConnect = async () => {
    setLoading(true);
    
    try {
      const response = await fetch('/api/integrations/gmail/connect', {
        method: 'POST',
      });
      
      const data = await response.json();
      
      if (!response.ok) {
        setToast({ message: data.error || 'Failed to initiate connection', type: 'error' });
        setLoading(false);
        return;
      }
      
      // Redirect to OAuth URL
      window.location.href = data.data.authorizationUrl;
    } catch (err) {
      setToast({ message: 'Failed to connect to Gmail', type: 'error' });
      setLoading(false);
    }
  };
  
  const handleDisconnect = async () => {
    if (!confirm('Are you sure you want to disconnect Gmail? This will remove all Gmail integration settings.')) {
      return;
    }
    
    setLoading(true);
    
    try {
      const response = await fetch('/api/integrations/gmail/disconnect', {
        method: 'DELETE',
      });
      
      const data = await response.json();
      
      if (!response.ok) {
        setToast({ message: data.error || 'Failed to disconnect', type: 'error' });
        setLoading(false);
        return;
      }
      
      setToast({ message: 'Gmail disconnected successfully', type: 'success' });
      onDisconnect?.();
      setLoading(false);
    } catch (err) {
      setToast({ message: 'Failed to disconnect Gmail', type: 'error' });
      setLoading(false);
    }
  };
  
  return (
    <>
      {isConnected ? (
        <button
          onClick={handleDisconnect}
          disabled={loading}
          className="px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 disabled:opacity-50 flex items-center gap-2"
        >
          {loading ? (
            <>
              <Loader2 className="h-4 w-4 animate-spin" />
              Disconnecting...
            </>
          ) : (
            <>
              <X className="h-4 w-4" />
              Disconnect Gmail
            </>
          )}
        </button>
      ) : (
        <button
          onClick={handleConnect}
          disabled={loading}
          className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 flex items-center gap-2"
        >
          {loading ? (
            <>
              <Loader2 className="h-4 w-4 animate-spin" />
              Connecting...
            </>
          ) : (
            <>
              <Check className="h-4 w-4" />
              Connect Gmail
            </>
          )}
        </button>
      )}
      
      {toast && (
        <div className="fixed bottom-4 right-4 z-50">
          <Toast message={toast.message} type={toast.type} />
        </div>
      )}
    </>
  );
}

