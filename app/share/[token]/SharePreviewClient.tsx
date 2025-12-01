'use client';

import { useState } from 'react';
import { Download, Lock, Eye, Loader2 } from 'lucide-react';

interface MockupData {
  id: string;
  mockup_name: string;
  mockup_image_url?: string;
  created_at: string;
  updated_at: string;
}

interface SharePreviewClientProps {
  mockup?: MockupData;
  canDownload?: boolean;
  requiresPassword?: boolean;
  shareLinkId?: string;
  token: string;
}

export default function SharePreviewClient({
  mockup,
  canDownload = true,
  requiresPassword = false,
  shareLinkId,
  token,
}: SharePreviewClientProps) {
  const [password, setPassword] = useState('');
  const [isVerifying, setIsVerifying] = useState(false);
  const [error, setError] = useState('');
  const [verifiedMockup, setVerifiedMockup] = useState<MockupData | null>(null);
  const [isDownloading, setIsDownloading] = useState(false);
  const [currentSide, setCurrentSide] = useState<'front' | 'back'>('front');

  const displayMockup = verifiedMockup || mockup;

  const handlePasswordSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsVerifying(true);
    setError('');

    try {
      const response = await fetch('/api/share/verify', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ token, password }),
      });

      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.error || 'Invalid password');
      }

      const data = await response.json();
      setVerifiedMockup(data.mockup);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to verify password');
    } finally {
      setIsVerifying(false);
    }
  };

  const handleDownload = async () => {
    if (!displayMockup?.mockup_image_url) return;

    setIsDownloading(true);
    try {
      const response = await fetch(displayMockup.mockup_image_url);
      const blob = await response.blob();
      const url = URL.createObjectURL(blob);

      const link = document.createElement('a');
      link.href = url;
      link.download = `${displayMockup.mockup_name || 'cardmock'}.png`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(url);

      // Log download activity
      await fetch('/api/share/activity', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          shareLinkId,
          action: 'download',
        }),
      }).catch(() => {});
    } catch (err) {
      console.error('Download failed:', err);
    } finally {
      setIsDownloading(false);
    }
  };

  // Password form
  if (requiresPassword && !verifiedMockup) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4">
        <div className="bg-white rounded-xl shadow-lg p-8 max-w-md w-full">
          <div className="w-16 h-16 mx-auto mb-6 bg-blue-100 rounded-full flex items-center justify-center">
            <Lock className="w-8 h-8 text-blue-600" />
          </div>
          <h1 className="text-xl font-semibold text-gray-900 text-center mb-2">
            Password Protected
          </h1>
          <p className="text-gray-600 text-center mb-6">
            Enter the password to view this CardMock.
          </p>

          <form onSubmit={handlePasswordSubmit} className="space-y-4">
            <div>
              <input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="Enter password"
                className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:border-blue-500"
                autoFocus
              />
            </div>

            {error && (
              <p className="text-sm text-red-600 text-center">{error}</p>
            )}

            <button
              type="submit"
              disabled={isVerifying || !password}
              className="w-full py-3 bg-blue-600 text-white rounded-lg font-medium hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors flex items-center justify-center gap-2"
            >
              {isVerifying ? (
                <>
                  <Loader2 className="w-5 h-5 animate-spin" />
                  Verifying...
                </>
              ) : (
                <>
                  <Eye className="w-5 h-5" />
                  View CardMock
                </>
              )}
            </button>
          </form>
        </div>
      </div>
    );
  }

  // Preview view
  return (
    <div className="min-h-screen bg-gray-100">
      {/* Header */}
      <header className="bg-white border-b border-gray-200 px-6 py-4">
        <div className="max-w-5xl mx-auto flex items-center justify-between">
          <div>
            <h1 className="text-xl font-semibold text-gray-900">
              {displayMockup?.mockup_name || 'CardMock'}
            </h1>
            <p className="text-sm text-gray-500 mt-1">
              Shared with you
            </p>
          </div>
          {canDownload && displayMockup?.mockup_image_url && (
            <button
              onClick={handleDownload}
              disabled={isDownloading}
              className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg font-medium hover:bg-blue-700 disabled:opacity-50 transition-colors"
            >
              {isDownloading ? (
                <>
                  <Loader2 className="w-5 h-5 animate-spin" />
                  Downloading...
                </>
              ) : (
                <>
                  <Download className="w-5 h-5" />
                  Download
                </>
              )}
            </button>
          )}
        </div>
      </header>

      {/* Preview Area */}
      <main className="max-w-5xl mx-auto py-8 px-6">
        <div className="bg-white rounded-xl shadow-lg overflow-hidden">
          {/* Card Preview */}
          <div className="aspect-[16/10] bg-gray-50 flex items-center justify-center p-8">
            {displayMockup?.mockup_image_url ? (
              <img
                src={displayMockup.mockup_image_url}
                alt={displayMockup.mockup_name}
                className="max-w-full max-h-full object-contain rounded-lg shadow-md"
              />
            ) : (
              <div className="text-center text-gray-400">
                <div className="w-24 h-24 mx-auto mb-4 bg-gray-200 rounded-lg flex items-center justify-center">
                  <span className="text-4xl font-bold">
                    {displayMockup?.mockup_name?.[0]?.toUpperCase() || '?'}
                  </span>
                </div>
                <p>No preview available</p>
              </div>
            )}
          </div>

          {/* Info */}
          <div className="p-6 border-t border-gray-100">
            <div className="flex items-center justify-between">
              <div>
                <h2 className="font-semibold text-gray-900">
                  {displayMockup?.mockup_name}
                </h2>
                {displayMockup?.updated_at && (
                  <p className="text-sm text-gray-500 mt-1">
                    Last updated: {new Date(displayMockup.updated_at).toLocaleDateString()}
                  </p>
                )}
              </div>
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="mt-8 text-center text-sm text-gray-400">
          <p>Powered by CardMock</p>
        </div>
      </main>
    </div>
  );
}
