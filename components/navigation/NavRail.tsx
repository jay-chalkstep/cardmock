'use client';

import { useEffect, useState, useRef } from 'react';
import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { useOrganization, useUser } from '@/lib/hooks/useAuth';
import { useClerk } from '@clerk/nextjs';
import {
  Clock,
  Building2,
  LayoutTemplate,
  Search,
  Plus,
  ChevronDown,
  Settings,
  LogOut,
  Upload,
  Shield,
  X,
  Loader2,
  ImageIcon,
} from 'lucide-react';
import { usePanelContext } from '@/lib/contexts/PanelContext';

interface NavItem {
  id: string;
  name: string;
  href: string;
  icon: React.ComponentType<{ size?: number; className?: string }>;
}

// Figma-inspired main navigation per v1 scope
const mainNavItems: NavItem[] = [
  { id: 'recents', name: 'Recents', href: '/', icon: Clock },
  { id: 'brands', name: 'Brands', href: '/brands', icon: Building2 },
  { id: 'templates', name: 'Templates', href: '/templates', icon: LayoutTemplate },
];

export default function NavRail() {
  const pathname = usePathname();
  const router = useRouter();
  const { organization, membership } = useOrganization();
  const { user } = useUser();
  const { signOut } = useClerk();

  // Check if user is org admin
  const isAdmin = membership?.role === 'org:admin';
  const { setActiveNav } = usePanelContext();
  const [searchQuery, setSearchQuery] = useState('');
  const [showUserMenu, setShowUserMenu] = useState(false);

  // Template upload modal state
  const [showUploadModal, setShowUploadModal] = useState(false);
  const [templateName, setTemplateName] = useState('');
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [uploading, setUploading] = useState(false);
  const [uploadError, setUploadError] = useState<string | null>(null);
  const [uploadSuccess, setUploadSuccess] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Update active nav based on current path
  useEffect(() => {
    if (pathname === '/') {
      setActiveNav('recents');
      return;
    }

    if (pathname?.startsWith('/brands')) {
      setActiveNav('brands');
      return;
    }

    if (pathname?.startsWith('/templates')) {
      setActiveNav('templates');
      return;
    }
  }, [pathname, setActiveNav]);

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    if (searchQuery.trim()) {
      router.push(`/search?q=${encodeURIComponent(searchQuery.trim())}`);
    }
  };

  const handleNewCardMock = () => {
    router.push('/designer');
  };

  // Template upload handlers
  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      if (!file.type.startsWith('image/')) {
        setUploadError('Please select an image file');
        return;
      }
      if (file.size > 10 * 1024 * 1024) {
        setUploadError('File size must be less than 10MB');
        return;
      }
      setSelectedFile(file);
      setPreviewUrl(URL.createObjectURL(file));
      setUploadError(null);
      // Auto-fill name from filename
      if (!templateName) {
        const nameWithoutExt = file.name.replace(/\.[^/.]+$/, '');
        setTemplateName(nameWithoutExt.replace(/[-_]/g, ' '));
      }
    }
  };

  const handleUpload = async () => {
    if (!selectedFile || !templateName.trim()) {
      setUploadError('Please provide a template name and image');
      return;
    }

    setUploading(true);
    setUploadError(null);

    try {
      const formData = new FormData();
      formData.append('image', selectedFile);
      formData.append('templateName', templateName.trim());

      const response = await fetch('/api/admin/templates', {
        method: 'POST',
        body: formData,
      });

      const result = await response.json();

      if (!response.ok) {
        throw new Error(result.error || 'Failed to upload template');
      }

      setUploadSuccess(true);

      // Reset and close after success
      setTimeout(() => {
        resetUploadModal();
        router.refresh(); // Refresh to show new template
      }, 1500);
    } catch (err) {
      console.error('Error uploading template:', err);
      setUploadError(err instanceof Error ? err.message : 'Failed to upload template');
    } finally {
      setUploading(false);
    }
  };

  const resetUploadModal = () => {
    setShowUploadModal(false);
    setTemplateName('');
    setSelectedFile(null);
    setPreviewUrl(null);
    setUploadError(null);
    setUploadSuccess(false);
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  return (
    <>
      <div className="w-60 h-full flex-shrink-0 bg-[#1e1e1e] flex flex-col z-40">
        {/* Logo / Brand */}
        <div className="px-4 py-4 border-b border-[#333]">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 bg-gradient-to-br from-blue-500 to-purple-600 rounded-lg flex items-center justify-center">
              <span className="text-white font-bold text-sm">CM</span>
            </div>
            <span className="text-white font-semibold text-lg">CardMock</span>
          </div>
        </div>

        {/* Search */}
        <div className="px-3 py-3">
          <form onSubmit={handleSearch}>
            <div className="relative">
              <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search..."
                className="w-full bg-[#2d2d2d] text-white text-sm pl-9 pr-3 py-2 rounded-md border border-[#404040] focus:outline-none focus:border-blue-500 placeholder-gray-500"
              />
            </div>
          </form>
        </div>

        {/* New CardMock Button */}
        <div className="px-3 pb-3">
          <button
            onClick={handleNewCardMock}
            className="w-full flex items-center justify-center gap-2 bg-purple-600 hover:bg-purple-700 text-white text-sm font-medium py-2.5 px-4 rounded-md transition-colors"
          >
            <Plus size={18} />
            New CardMock
          </button>
        </div>

        {/* Main Navigation */}
        <nav className="flex-1 px-2 py-2 overflow-y-auto">
          <ul className="space-y-0.5">
            {mainNavItems.map((item) => {
              let isActive = false;

              if (item.id === 'recents') {
                isActive = pathname === '/';
              } else if (item.id === 'brands') {
                isActive = pathname?.startsWith('/brands') || false;
              } else if (item.id === 'templates') {
                isActive = pathname?.startsWith('/templates') || false;
              }

              return (
                <li key={item.id}>
                  <Link
                    href={item.href}
                    className={`
                      flex items-center gap-3 px-3 py-2 rounded-md transition-all text-sm
                      ${isActive
                        ? 'bg-[#37373d] text-white'
                        : 'text-gray-400 hover:bg-[#2d2d2d] hover:text-white'
                      }
                    `}
                  >
                    <item.icon size={18} className="flex-shrink-0" />
                    <span className="font-medium">{item.name}</span>
                  </Link>
                </li>
              );
            })}
          </ul>
        </nav>

        {/* Admin Section - Only visible to org admins */}
        {isAdmin && (
          <div className="px-2 py-2 border-t border-[#333]">
            <div className="px-3 mb-2">
              <span className="text-xs font-semibold text-gray-500 uppercase tracking-wider flex items-center gap-1">
                <Shield size={12} />
                Admin
              </span>
            </div>
            <ul className="space-y-0.5">
              <li>
                <button
                  onClick={() => setShowUploadModal(true)}
                  className="w-full flex items-center gap-3 px-3 py-2 rounded-md transition-all text-sm text-gray-400 hover:bg-[#2d2d2d] hover:text-white"
                >
                  <Upload size={18} className="flex-shrink-0" />
                  <span className="font-medium">Upload Templates</span>
                </button>
              </li>
            </ul>
          </div>
        )}

        {/* User Menu */}
        <div className="border-t border-[#333] p-3 relative">
          <button
            onClick={() => setShowUserMenu(!showUserMenu)}
            className="w-full flex items-center gap-3 p-2 rounded-md hover:bg-[#2d2d2d] transition-colors"
          >
            <div className="w-8 h-8 rounded-full bg-gradient-to-br from-purple-500 to-pink-500 flex items-center justify-center flex-shrink-0">
              <span className="text-white text-sm font-medium">
                {user?.firstName?.[0] || user?.username?.[0]?.toUpperCase() || 'U'}
              </span>
            </div>
            <div className="flex-1 min-w-0 text-left">
              <p className="text-sm font-medium text-white truncate">
                {user?.firstName || user?.username || 'User'}
              </p>
              <p className="text-xs text-gray-500 truncate">
                {organization?.name || 'Organization'}
              </p>
            </div>
            <ChevronDown size={16} className={`text-gray-400 transition-transform ${showUserMenu ? 'rotate-180' : ''}`} />
          </button>

          {/* Dropdown Menu */}
          {showUserMenu && (
            <>
              <div
                className="fixed inset-0 z-10"
                onClick={() => setShowUserMenu(false)}
              />
              <div className="absolute bottom-full left-3 right-3 mb-2 bg-[#2d2d2d] border border-[#404040] rounded-lg shadow-xl z-20 py-1">
                <Link
                  href="/settings"
                  className="flex items-center gap-3 px-4 py-2 text-sm text-gray-300 hover:bg-[#37373d] hover:text-white"
                  onClick={() => setShowUserMenu(false)}
                >
                  <Settings size={16} />
                  Settings
                </Link>
                <button
                  onClick={async () => {
                    setShowUserMenu(false);
                    await signOut({ redirectUrl: '/sign-in' });
                  }}
                  className="w-full flex items-center gap-3 px-4 py-2 text-sm text-gray-300 hover:bg-[#37373d] hover:text-white"
                >
                  <LogOut size={16} />
                  Sign out
                </button>
              </div>
            </>
          )}
        </div>
      </div>

      {/* Template Upload Modal */}
      {showUploadModal && (
        <>
          {/* Backdrop */}
          <div
            className="fixed inset-0 bg-black/50 z-50"
            onClick={resetUploadModal}
          />

          {/* Modal */}
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 pointer-events-none">
            <div
              className="bg-white rounded-xl shadow-2xl w-full max-w-md pointer-events-auto"
              onClick={(e) => e.stopPropagation()}
            >
              {/* Header */}
              <div className="flex items-center justify-between px-6 py-4 border-b">
                <h2 className="text-lg font-semibold text-gray-900">Upload Template</h2>
                <button
                  onClick={resetUploadModal}
                  className="p-1 hover:bg-gray-100 rounded-full transition-colors"
                >
                  <X size={20} className="text-gray-500" />
                </button>
              </div>

              {/* Content */}
              <div className="p-6 space-y-4">
                {uploadSuccess ? (
                  <div className="text-center py-8">
                    <div className="w-16 h-16 mx-auto mb-4 bg-green-100 rounded-full flex items-center justify-center">
                      <svg className="w-8 h-8 text-green-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                      </svg>
                    </div>
                    <p className="text-lg font-medium text-gray-900">Template uploaded!</p>
                  </div>
                ) : (
                  <>
                    {/* Template Name */}
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        Template Name
                      </label>
                      <input
                        type="text"
                        value={templateName}
                        onChange={(e) => setTemplateName(e.target.value)}
                        placeholder="e.g., Standard Prepaid Card"
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-transparent"
                      />
                    </div>

                    {/* File Upload */}
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        Template Image
                      </label>

                      {previewUrl ? (
                        <div className="relative">
                          <img
                            src={previewUrl}
                            alt="Preview"
                            className="w-full h-48 object-contain bg-gray-50 rounded-lg border"
                          />
                          <button
                            onClick={() => {
                              setSelectedFile(null);
                              setPreviewUrl(null);
                              if (fileInputRef.current) fileInputRef.current.value = '';
                            }}
                            className="absolute top-2 right-2 p-1 bg-white rounded-full shadow hover:bg-gray-100"
                          >
                            <X size={16} className="text-gray-600" />
                          </button>
                        </div>
                      ) : (
                        <div
                          onClick={() => fileInputRef.current?.click()}
                          className="border-2 border-dashed border-gray-300 rounded-lg p-8 text-center hover:border-purple-400 hover:bg-purple-50 transition-colors cursor-pointer"
                        >
                          <ImageIcon className="w-10 h-10 mx-auto mb-2 text-gray-400" />
                          <p className="text-sm text-gray-600">Click to select an image</p>
                          <p className="text-xs text-gray-400 mt-1">PNG, JPG up to 10MB</p>
                        </div>
                      )}

                      <input
                        ref={fileInputRef}
                        type="file"
                        accept="image/*"
                        onChange={handleFileSelect}
                        className="hidden"
                      />
                    </div>

                    {/* Error Message */}
                    {uploadError && (
                      <div className="p-3 bg-red-50 border border-red-200 rounded-lg">
                        <p className="text-sm text-red-600">{uploadError}</p>
                      </div>
                    )}
                  </>
                )}
              </div>

              {/* Footer */}
              {!uploadSuccess && (
                <div className="flex gap-3 px-6 py-4 border-t bg-gray-50 rounded-b-xl">
                  <button
                    onClick={resetUploadModal}
                    className="flex-1 px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-100 transition-colors"
                  >
                    Cancel
                  </button>
                  <button
                    onClick={handleUpload}
                    disabled={uploading || !selectedFile || !templateName.trim()}
                    className="flex-1 flex items-center justify-center gap-2 px-4 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                  >
                    {uploading ? (
                      <>
                        <Loader2 size={18} className="animate-spin" />
                        Uploading...
                      </>
                    ) : (
                      <>
                        <Upload size={18} />
                        Upload
                      </>
                    )}
                  </button>
                </div>
              )}
            </div>
          </div>
        </>
      )}
    </>
  );
}
