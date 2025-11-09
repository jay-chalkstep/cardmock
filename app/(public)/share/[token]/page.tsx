'use client';

import { useState, useEffect } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { Loader2, Lock, CheckCircle, XCircle, MessageSquare, Eye } from 'lucide-react';
import PublicReviewCanvas from '@/components/public/PublicReviewCanvas';
import IdentityCaptureModal from '@/components/public/IdentityCaptureModal';
import Toast from '@/components/Toast';

interface ShareLinkData {
  id: string;
  assetId: string;
  permissions: 'view' | 'comment' | 'approve';
  identityRequiredLevel: 'none' | 'comment' | 'approve';
  hasPassword: boolean;
  expiresAt: string | null;
  maxUses: number | null;
  useCount: number;
}

interface AssetData {
  id: string;
  mockup_name: string;
  mockup_image_url: string;
  created_at: string;
}

interface ToastMessage {
  message: string;
  type: 'success' | 'error';
  id: number;
}

export default function PublicSharePage() {
  const params = useParams();
  const router = useRouter();
  const token = params.token as string;
  
  const [shareLink, setShareLink] = useState<ShareLinkData | null>(null);
  const [asset, setAsset] = useState<AssetData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [passwordRequired, setPasswordRequired] = useState(false);
  const [passwordVerified, setPasswordVerified] = useState(false);
  const [showPasswordModal, setShowPasswordModal] = useState(false);
  const [showIdentityModal, setShowIdentityModal] = useState(false);
  const [identityRequired, setIdentityRequired] = useState(false);
  const [reviewerSession, setReviewerSession] = useState<{ id: string; email?: string; name?: string } | null>(null);
  const [toasts, setToasts] = useState<ToastMessage[]>([]);
  
  // Load share link data
  useEffect(() => {
    if (!token) return;
    
    const loadShareLink = async () => {
      try {
        const response = await fetch(`/api/public/share/${token}`);
        const data = await response.json();
        
        if (!response.ok) {
          setError(data.error || 'Failed to load share link');
          setLoading(false);
          return;
        }
        
        setShareLink(data.data.shareLink);
        setAsset(data.data.asset);
        
        // Check if password is required
        if (data.data.shareLink.hasPassword) {
          setPasswordRequired(true);
          setShowPasswordModal(true);
        } else {
          setPasswordVerified(true);
        }
        
        setLoading(false);
      } catch (err) {
        setError('Failed to load share link');
        setLoading(false);
      }
    };
    
    loadShareLink();
  }, [token]);
  
  // Check for existing session
  useEffect(() => {
    const checkSession = async () => {
      try {
        const response = await fetch('/api/public/session');
        if (response.ok) {
          const data = await response.json();
          if (data.data?.session) {
            setReviewerSession(data.data.session);
          }
        }
      } catch (err) {
        // Session check failed, continue without session
      }
    };
    
    if (passwordVerified) {
      checkSession();
    }
  }, [passwordVerified]);
  
  const handlePasswordSubmit = async (password: string) => {
    try {
      const response = await fetch(`/api/public/share/${token}/verify`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ password }),
      });
      
      const data = await response.json();
      
      if (!response.ok) {
        addToast(data.error || 'Invalid password', 'error');
        return false;
      }
      
      setPasswordVerified(true);
      setShowPasswordModal(false);
      return true;
    } catch (err) {
      addToast('Failed to verify password', 'error');
      return false;
    }
  };
  
  const handleIdentitySubmit = async (identity: { email: string; name: string; company?: string }) => {
    try {
      const response = await fetch(`/api/public/share/${token}/reviewer`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(identity),
      });
      
      const data = await response.json();
      
      if (!response.ok) {
        addToast(data.error || 'Failed to save identity', 'error');
        return false;
      }
      
      setReviewerSession({
        id: data.data.reviewerId,
        email: identity.email,
        name: identity.name,
      });
      
      setShowIdentityModal(false);
      setIdentityRequired(false);
      addToast('Identity saved', 'success');
      return true;
    } catch (err) {
      addToast('Failed to save identity', 'error');
      return false;
    }
  };
  
  const handleActionRequiringIdentity = (action: 'comment' | 'approve'): boolean => {
    if (!shareLink) return false;
    
    const requiresIdentity = shareLink.identityRequiredLevel === action || shareLink.identityRequiredLevel === 'approve';
    
    if (requiresIdentity && (!reviewerSession || !reviewerSession.email || !reviewerSession.name)) {
      setIdentityRequired(true);
      setShowIdentityModal(true);
      return false;
    }
    
    return true;
  };
  
  const addToast = (message: string, type: 'success' | 'error') => {
    const id = Date.now();
    setToasts((prev) => [...prev, { message, type, id }]);
    setTimeout(() => {
      setToasts((prev) => prev.filter((t) => t.id !== id));
    }, 5000);
  };
  
  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="text-center">
          <Loader2 className="h-8 w-8 animate-spin text-blue-600 mx-auto mb-4" />
          <p className="text-gray-600">Loading share link...</p>
        </div>
      </div>
    );
  }
  
  if (error || !shareLink || !asset) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="text-center max-w-md mx-auto p-6">
          <XCircle className="h-12 w-12 text-red-500 mx-auto mb-4" />
          <h1 className="text-2xl font-bold text-gray-900 mb-2">Share Link Not Found</h1>
          <p className="text-gray-600">{error || 'This share link is invalid or has expired.'}</p>
        </div>
      </div>
    );
  }
  
  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <header className="bg-white border-b border-gray-200">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-xl font-semibold text-gray-900">{asset.mockup_name}</h1>
              <p className="text-sm text-gray-500 mt-1">Review and provide feedback</p>
            </div>
            <div className="flex items-center gap-2">
              {shareLink.permissions === 'view' && (
                <span className="flex items-center gap-1 text-sm text-gray-500">
                  <Eye className="h-4 w-4" />
                  View Only
                </span>
              )}
              {shareLink.permissions === 'comment' && (
                <span className="flex items-center gap-1 text-sm text-gray-500">
                  <MessageSquare className="h-4 w-4" />
                  Can Comment
                </span>
              )}
              {shareLink.permissions === 'approve' && (
                <span className="flex items-center gap-1 text-sm text-gray-500">
                  <CheckCircle className="h-4 w-4" />
                  Can Approve
                </span>
              )}
            </div>
          </div>
        </div>
      </header>
      
      {/* Main Content */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {passwordVerified ? (
          <PublicReviewCanvas
            asset={asset}
            shareLink={shareLink}
            token={token}
            reviewerSession={reviewerSession}
            onIdentityRequired={handleActionRequiringIdentity}
            onToast={addToast}
          />
        ) : (
          <div className="text-center py-12">
            <Lock className="h-12 w-12 text-gray-400 mx-auto mb-4" />
            <p className="text-gray-600">Password required to view this share link</p>
          </div>
        )}
      </main>
      
      {/* Password Modal */}
      {showPasswordModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 max-w-md w-full mx-4">
            <h2 className="text-xl font-semibold mb-4">Password Required</h2>
            <p className="text-gray-600 mb-4">This share link is password protected. Please enter the password to continue.</p>
            <form
              onSubmit={(e) => {
                e.preventDefault();
                const formData = new FormData(e.currentTarget);
                const password = formData.get('password') as string;
                handlePasswordSubmit(password);
              }}
            >
              <input
                type="password"
                name="password"
                placeholder="Enter password"
                className="w-full px-4 py-2 border border-gray-300 rounded-lg mb-4"
                required
                autoFocus
              />
              <div className="flex gap-2">
                <button
                  type="button"
                  onClick={() => router.push('/')}
                  className="flex-1 px-4 py-2 border border-gray-300 rounded-lg text-gray-700 hover:bg-gray-50"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="flex-1 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
                >
                  Verify
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
      
      {/* Identity Modal */}
      {showIdentityModal && (
        <IdentityCaptureModal
          onClose={() => {
            setShowIdentityModal(false);
            setIdentityRequired(false);
          }}
          onSubmit={handleIdentitySubmit}
          required={shareLink.identityRequiredLevel}
        />
      )}
      
      {/* Toast Notifications */}
      <div className="fixed bottom-4 right-4 z-50 space-y-2">
        {toasts.map((toast) => (
          <Toast 
            key={toast.id} 
            message={toast.message} 
            type={toast.type} 
            onClose={() => setToasts((prev) => prev.filter((t) => t.id !== toast.id))}
          />
        ))}
      </div>
    </div>
  );
}

