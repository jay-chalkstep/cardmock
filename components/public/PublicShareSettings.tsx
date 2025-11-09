'use client';

import { useState } from 'react';
import { Copy, Check, X, Lock, Calendar, Users, Eye, MessageSquare, CheckCircle } from 'lucide-react';
import Toast from '@/components/Toast';

interface PublicShareSettingsProps {
  assetId: string;
  onClose: () => void;
  onShareLinkCreated?: (shareLink: { id: string; token: string; shareUrl: string }) => void;
}

export default function PublicShareSettings({
  assetId,
  onClose,
  onShareLinkCreated,
}: PublicShareSettingsProps) {
  const [permissions, setPermissions] = useState<'view' | 'comment' | 'approve'>('view');
  const [expiresInDays, setExpiresInDays] = useState(7);
  const [password, setPassword] = useState('');
  const [maxUses, setMaxUses] = useState<number | null>(null);
  const [identityRequiredLevel, setIdentityRequiredLevel] = useState<'none' | 'comment' | 'approve'>('none');
  const [creating, setCreating] = useState(false);
  const [shareLink, setShareLink] = useState<{ id: string; token: string; shareUrl: string } | null>(null);
  const [copied, setCopied] = useState(false);
  const [toast, setToast] = useState<{ message: string; type: 'success' | 'error' } | null>(null);
  
  const handleCreate = async () => {
    setCreating(true);
    
    try {
      const response = await fetch(`/api/assets/${assetId}/share`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          permissions,
          expiresInDays,
          password: password || undefined,
          maxUses: maxUses || undefined,
          identityRequiredLevel,
        }),
      });
      
      const data = await response.json();
      
      if (!response.ok) {
        setToast({ message: data.error || 'Failed to create share link', type: 'error' });
        setCreating(false);
        return;
      }
      
      setShareLink(data.data.shareLink);
      setToast({ message: 'Share link created successfully', type: 'success' });
      onShareLinkCreated?.(data.data.shareLink);
      setCreating(false);
    } catch (err) {
      setToast({ message: 'Failed to create share link', type: 'error' });
      setCreating(false);
    }
  };
  
  const handleCopy = () => {
    if (!shareLink) return;
    
    navigator.clipboard.writeText(shareLink.shareUrl);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };
  
  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg p-6 max-w-2xl w-full mx-4 max-h-[90vh] overflow-y-auto">
        <div className="flex items-center justify-between mb-6">
          <h2 className="text-2xl font-semibold">Create Public Share Link</h2>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600"
          >
            <X className="h-5 w-5" />
          </button>
        </div>
        
        {shareLink ? (
          <div className="space-y-4">
            <div className="p-4 bg-green-50 border border-green-200 rounded-lg">
              <p className="text-green-800 font-medium mb-2">Share link created successfully!</p>
              <div className="flex items-center gap-2">
                <input
                  type="text"
                  value={shareLink.shareUrl}
                  readOnly
                  className="flex-1 px-4 py-2 border border-gray-300 rounded-lg bg-white"
                />
                <button
                  onClick={handleCopy}
                  className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 flex items-center gap-2"
                >
                  {copied ? <Check className="h-4 w-4" /> : <Copy className="h-4 w-4" />}
                  {copied ? 'Copied!' : 'Copy'}
                </button>
              </div>
            </div>
            
            <div className="flex gap-2">
              <button
                onClick={onClose}
                className="flex-1 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
              >
                Done
              </button>
            </div>
          </div>
        ) : (
          <div className="space-y-6">
            {/* Permissions */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Permissions
              </label>
              <div className="space-y-2">
                <label className="flex items-center gap-3 p-3 border border-gray-300 rounded-lg cursor-pointer hover:bg-gray-50">
                  <input
                    type="radio"
                    name="permissions"
                    value="view"
                    checked={permissions === 'view'}
                    onChange={(e) => setPermissions(e.target.value as 'view')}
                    className="text-blue-600"
                  />
                  <Eye className="h-5 w-5 text-gray-400" />
                  <div>
                    <div className="font-medium">View Only</div>
                    <div className="text-sm text-gray-500">Reviewers can only view the asset</div>
                  </div>
                </label>
                
                <label className="flex items-center gap-3 p-3 border border-gray-300 rounded-lg cursor-pointer hover:bg-gray-50">
                  <input
                    type="radio"
                    name="permissions"
                    value="comment"
                    checked={permissions === 'comment'}
                    onChange={(e) => setPermissions(e.target.value as 'comment')}
                    className="text-blue-600"
                  />
                  <MessageSquare className="h-5 w-5 text-gray-400" />
                  <div>
                    <div className="font-medium">Can Comment</div>
                    <div className="text-sm text-gray-500">Reviewers can view and leave comments</div>
                  </div>
                </label>
                
                <label className="flex items-center gap-3 p-3 border border-gray-300 rounded-lg cursor-pointer hover:bg-gray-50">
                  <input
                    type="radio"
                    name="permissions"
                    value="approve"
                    checked={permissions === 'approve'}
                    onChange={(e) => setPermissions(e.target.value as 'approve')}
                    className="text-blue-600"
                  />
                  <CheckCircle className="h-5 w-5 text-gray-400" />
                  <div>
                    <div className="font-medium">Can Approve</div>
                    <div className="text-sm text-gray-500">Reviewers can view, comment, and approve</div>
                  </div>
                </label>
              </div>
            </div>
            
            {/* Identity Required Level */}
            {(permissions === 'comment' || permissions === 'approve') && (
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Identity Required
                </label>
                <select
                  value={identityRequiredLevel}
                  onChange={(e) => setIdentityRequiredLevel(e.target.value as 'none' | 'comment' | 'approve')}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg"
                >
                  <option value="none">No identity required</option>
                  <option value="comment">Required for commenting</option>
                  <option value="approve">Required for approval</option>
                </select>
              </div>
            )}
            
            {/* Expiration */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                <Calendar className="h-4 w-4 inline mr-1" />
                Expires In (days)
              </label>
              <input
                type="number"
                min="1"
                max="365"
                value={expiresInDays}
                onChange={(e) => setExpiresInDays(parseInt(e.target.value) || 7)}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg"
              />
            </div>
            
            {/* Password Protection */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                <Lock className="h-4 w-4 inline mr-1" />
                Password Protection (Optional)
              </label>
              <input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="Leave empty for no password"
                className="w-full px-4 py-2 border border-gray-300 rounded-lg"
              />
            </div>
            
            {/* Max Uses */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                <Users className="h-4 w-4 inline mr-1" />
                Maximum Uses (Optional)
              </label>
              <input
                type="number"
                min="1"
                value={maxUses || ''}
                onChange={(e) => setMaxUses(e.target.value ? parseInt(e.target.value) : null)}
                placeholder="Leave empty for unlimited"
                className="w-full px-4 py-2 border border-gray-300 rounded-lg"
              />
            </div>
            
            <div className="flex gap-2 pt-4">
              <button
                onClick={onClose}
                className="flex-1 px-4 py-2 border border-gray-300 rounded-lg text-gray-700 hover:bg-gray-50"
                disabled={creating}
              >
                Cancel
              </button>
              <button
                onClick={handleCreate}
                disabled={creating}
                className="flex-1 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50"
              >
                {creating ? 'Creating...' : 'Create Share Link'}
              </button>
            </div>
          </div>
        )}
        
        {toast && (
          <div className="mt-4">
            <Toast message={toast.message} type={toast.type} onClose={() => setToast(null)} />
          </div>
        )}
      </div>
    </div>
  );
}

