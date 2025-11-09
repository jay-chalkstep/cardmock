'use client';

import { useState } from 'react';
import { Loader2, Check, X } from 'lucide-react';
import Toast from '@/components/Toast';

interface SlackInstallButtonProps {
  isInstalled: boolean;
  onInstall?: () => void;
  onUninstall?: () => void;
}

export default function SlackInstallButton({
  isInstalled,
  onInstall,
  onUninstall,
}: SlackInstallButtonProps) {
  const [loading, setLoading] = useState(false);
  const [toast, setToast] = useState<{ message: string; type: 'success' | 'error' } | null>(null);
  
  const handleInstall = async () => {
    setLoading(true);
    
    try {
      const response = await fetch('/api/integrations/slack/install');
      
      const data = await response.json();
      
      if (!response.ok) {
        setToast({ message: data.error || 'Failed to initiate installation', type: 'error' });
        setLoading(false);
        return;
      }
      
      // Redirect to OAuth URL
      window.location.href = data.data.authorizationUrl;
    } catch (err) {
      setToast({ message: 'Failed to install Slack app', type: 'error' });
      setLoading(false);
    }
  };
  
  const handleUninstall = async () => {
    if (!confirm('Are you sure you want to uninstall Slack? This will remove all Slack integration settings.')) {
      return;
    }
    
    setLoading(true);
    
    try {
      const response = await fetch('/api/integrations/slack/uninstall', {
        method: 'POST',
      });
      
      const data = await response.json();
      
      if (!response.ok) {
        setToast({ message: data.error || 'Failed to uninstall', type: 'error' });
        setLoading(false);
        return;
      }
      
      setToast({ message: 'Slack uninstalled successfully', type: 'success' });
      onUninstall?.();
      setLoading(false);
    } catch (err) {
      setToast({ message: 'Failed to uninstall Slack', type: 'error' });
      setLoading(false);
    }
  };
  
  return (
    <>
      {isInstalled ? (
        <button
          onClick={handleUninstall}
          disabled={loading}
          className="px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 disabled:opacity-50 flex items-center gap-2"
        >
          {loading ? (
            <>
              <Loader2 className="h-4 w-4 animate-spin" />
              Uninstalling...
            </>
          ) : (
            <>
              <X className="h-4 w-4" />
              Uninstall Slack
            </>
          )}
        </button>
      ) : (
        <button
          onClick={handleInstall}
          disabled={loading}
          className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 flex items-center gap-2"
        >
          {loading ? (
            <>
              <Loader2 className="h-4 w-4 animate-spin" />
              Installing...
            </>
          ) : (
            <>
              <Check className="h-4 w-4" />
              Install Slack App
            </>
          )}
        </button>
      )}
      
      {toast && (
        <div className="fixed bottom-4 right-4 z-50">
          <Toast message={toast.message} type={toast.type} onClose={() => setToast(null)} />
        </div>
      )}
    </>
  );
}

