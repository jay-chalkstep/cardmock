'use client';

import { useState, useEffect, Suspense } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { ArrowLeft, CheckCircle, XCircle, Loader2 } from 'lucide-react';
import FigmaConnectButton from '@/components/integrations/FigmaConnectButton';
import Toast from '@/components/Toast';

function FigmaIntegrationContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [isConnected, setIsConnected] = useState(false);
  const [loading, setLoading] = useState(true);
  const [toast, setToast] = useState<{ message: string; type: 'success' | 'error' } | null>(null);
  
  useEffect(() => {
    // Check connection status
    const checkStatus = async () => {
      try {
        // Check if integration exists
        const response = await fetch('/api/integrations/figma/status');
        if (response.ok) {
          const data = await response.json();
          setIsConnected(data.data?.connected || false);
        }
      } catch (err) {
        // Integration not connected
        setIsConnected(false);
      } finally {
        setLoading(false);
      }
    };
    
    checkStatus();
    
    // Check for OAuth callback success/error
    const success = searchParams.get('success');
    const error = searchParams.get('error');
    
    if (success === 'true') {
      setToast({ message: 'Figma connected successfully!', type: 'success' });
      setIsConnected(true);
      // Remove query param
      router.replace('/settings/integrations/figma');
    } else if (error) {
      setToast({ message: `Connection failed: ${error}`, type: 'error' });
      router.replace('/settings/integrations/figma');
    }
  }, [router, searchParams]);
  
  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Header */}
        <div className="mb-6">
          <button
            onClick={() => router.back()}
            className="flex items-center gap-2 text-gray-600 hover:text-gray-900 mb-4"
          >
            <ArrowLeft className="h-4 w-4" />
            Back
          </button>
          <h1 className="text-3xl font-bold text-gray-900">Figma Integration</h1>
          <p className="text-gray-600 mt-2">
            Connect your Figma account to send frames directly for approval
          </p>
        </div>
        
        {/* Status Card */}
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6 mb-6">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-lg font-semibold text-gray-900 mb-1">Connection Status</h2>
              {loading ? (
                <div className="flex items-center gap-2 text-gray-600">
                  <Loader2 className="h-4 w-4 animate-spin" />
                  Checking status...
                </div>
              ) : isConnected ? (
                <div className="flex items-center gap-2 text-green-600">
                  <CheckCircle className="h-5 w-5" />
                  Connected
                </div>
              ) : (
                <div className="flex items-center gap-2 text-gray-600">
                  <XCircle className="h-5 w-5" />
                  Not Connected
                </div>
              )}
            </div>
            <FigmaConnectButton
              isConnected={isConnected}
              onConnect={() => setIsConnected(true)}
              onDisconnect={() => setIsConnected(false)}
            />
          </div>
        </div>
        
        {/* Features */}
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
          <h2 className="text-lg font-semibold text-gray-900 mb-4">Features</h2>
          <ul className="space-y-3 text-gray-700">
            <li className="flex items-start gap-3">
              <CheckCircle className="h-5 w-5 text-green-600 mt-0.5 flex-shrink-0" />
              <div>
                <div className="font-medium">Direct Frame Upload</div>
                <div className="text-sm text-gray-600">
                  Send Figma frames directly for approval without exporting files
                </div>
              </div>
            </li>
            <li className="flex items-start gap-3">
              <CheckCircle className="h-5 w-5 text-green-600 mt-0.5 flex-shrink-0" />
              <div>
                <div className="font-medium">Status Sync</div>
                <div className="text-sm text-gray-600">
                  Track approval status without leaving Figma
                </div>
              </div>
            </li>
            <li className="flex items-start gap-3">
              <CheckCircle className="h-5 w-5 text-green-600 mt-0.5 flex-shrink-0" />
              <div>
                <div className="font-medium">Version Detection</div>
                <div className="text-sm text-gray-600">
                  Automatically detect and track design changes
                </div>
              </div>
            </li>
            <li className="flex items-start gap-3">
              <CheckCircle className="h-5 w-5 text-green-600 mt-0.5 flex-shrink-0" />
              <div>
                <div className="font-medium">Comment Sync</div>
                <div className="text-sm text-gray-600">
                  Sync comments between Figma and Aiproval
                </div>
              </div>
            </li>
          </ul>
        </div>
        
        {/* Instructions */}
        {!isConnected && (
          <div className="bg-blue-50 border border-blue-200 rounded-lg p-6 mt-6">
            <h3 className="text-lg font-semibold text-blue-900 mb-2">Getting Started</h3>
            <ol className="list-decimal list-inside space-y-2 text-blue-800">
              <li>Click "Connect Figma" above to authorize the integration</li>
              <li>Install the Aiproval Figma plugin from the Figma Community</li>
              <li>Select frames in Figma and click "Send to Aiproval"</li>
              <li>Choose your project and workflow in the plugin</li>
              <li>Frames will be uploaded and tracked automatically</li>
            </ol>
          </div>
        )}
        
        {toast && (
          <div className="fixed bottom-4 right-4 z-50">
            <Toast message={toast.message} type={toast.type} onClose={() => setToast(null)} />
          </div>
        )}
      </div>
    </div>
  );
}

export default function FigmaIntegrationPage() {
  return (
    <Suspense fallback={
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-gray-600" />
      </div>
    }>
      <FigmaIntegrationContent />
    </Suspense>
  );
}

