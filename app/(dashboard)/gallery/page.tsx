'use client';

import { useState, useEffect } from 'react';
import { useOrganization, useUser } from '@/lib/hooks/useAuth';
import { supabase, CardMockup, Folder, Project } from '@/lib/supabase';
import { buildFolderTree, getUnsortedAssetCount } from '@/lib/folders';
import { useRouter } from 'next/navigation';
import { usePanelContext } from '@/lib/contexts/PanelContext';
import GmailLayout from '@/components/layout/GmailLayout';
import ContextPanel from '@/components/navigation/ContextPanel';
import ListView from '@/components/lists/ListView';
import ListToolbar from '@/components/lists/ListToolbar';
import MockupListItem from '@/components/lists/MockupListItem';
import PreviewArea from '@/components/preview/PreviewArea';
import FolderTree from '@/components/folders/FolderTree';
import Toast from '@/components/Toast';
import CreateFolderModal from '@/components/folders/CreateFolderModal';
import RenameFolderModal from '@/components/folders/RenameFolderModal';
import DeleteFolderModal from '@/components/folders/DeleteFolderModal';
import FolderSelector from '@/components/folders/FolderSelector';
import { Search, Plus, Loader2, Upload, Library } from 'lucide-react';
import { createFolder, renameFolder, deleteFolder } from '@/app/actions/folders';
import { deleteAsset, moveAsset, updateAssetProject } from '@/app/actions/assets';

interface ToastMessage {
  message: string;
  type: 'success' | 'error';
  id: number;
}

export default function GalleryPage() {
  const { organization, isLoaded, membership } = useOrganization();
  const { user } = useUser();
  const router = useRouter();
  const { selectedIds, setSelectedIds, setActiveNav } = usePanelContext();

  // Asset state
  const [assets, setAssets] = useState<CardMockup[]>([]);
  const [filteredAssets, setFilteredAssets] = useState<CardMockup[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');

  // Folder state
  const [folders, setFolders] = useState<Folder[]>([]);
  const [selectedFolderId, setSelectedFolderId] = useState<string | null>(null);
  const [unsortedCount, setUnsortedCount] = useState(0);

  // Project state
  const [projects, setProjects] = useState<Project[]>([]);

  // Modal state
  const [showCreateFolderModal, setShowCreateFolderModal] = useState(false);
  const [showRenameFolderModal, setShowRenameFolderModal] = useState(false);
  const [showDeleteFolderModal, setShowDeleteFolderModal] = useState(false);
  const [selectedFolder, setSelectedFolder] = useState<Folder | null>(null);
  const [createFolderParentId, setCreateFolderParentId] = useState<string | undefined>();

  // Move asset state
  const [movingAssetId, setMovingMockupId] = useState<string | null>(null);
  const [toasts, setToasts] = useState<ToastMessage[]>([]);

  const isAdmin = membership?.role === 'org:admin';

  const showToast = (message: string, type: 'success' | 'error') => {
    const id = Date.now();
    setToasts(prev => [...prev, { message, type, id }]);
  };

  const removeToast = (id: number) => {
    setToasts(prev => prev.filter(toast => toast.id !== id));
  };

  // Set active nav on mount
  useEffect(() => {
    setActiveNav('library');
  }, [setActiveNav]);

  useEffect(() => {
    if (organization?.id && user?.id) {
      fetchFolders();
      fetchAssets();
      fetchProjects();
    }
  }, [organization?.id, user?.id]);

  useEffect(() => {
    // Filter assets based on search term and selected folder
    let filtered = assets;

    // Filter by folder
    if (selectedFolderId === null) {
      // Show unsorted assets
      filtered = filtered.filter(m => !m.folder_id);
    } else {
      // Show assets in selected folder
      filtered = filtered.filter(m => m.folder_id === selectedFolderId);
    }

    // Filter by search term
    if (searchTerm) {
      filtered = filtered.filter(mockup =>
        mockup.mockup_name.toLowerCase().includes(searchTerm.toLowerCase())
      );
    }

    setFilteredAssets(filtered);
  }, [searchTerm, assets, selectedFolderId]);

  const fetchFolders = async () => {
    if (!organization?.id || !user?.id) return;

    try {
      const response = await fetch('/api/folders');
      if (!response.ok) throw new Error('Failed to fetch folders');

      const result = await response.json();
      const fetchedFolders = result.data?.folders || result.folders || [];
      
      if (!Array.isArray(fetchedFolders)) {
        console.error('Invalid folders response:', result);
        setFolders([]);
        return;
      }

      const folderTree = buildFolderTree(fetchedFolders);
      setFolders(folderTree);

      // Get unsorted count
      const count = await getUnsortedAssetCount(user.id, organization.id);
      setUnsortedCount(count);
    } catch (error) {
      console.error('Error fetching folders:', error);
    }
  };

  const fetchAssets = async () => {
    if (!organization?.id) return;

    setLoading(true);
    try {
      const { data, error } = await supabase
        .from('assets')
        .select(`
          *,
          logo:logo_variants!logo_id (
            id,
            logo_url
          ),
          template:templates!template_id (
            id,
            template_name,
            template_url
          ),
          project:projects (
            id,
            name,
            color
          )
        `)
        .eq('organization_id', organization.id)
        .order('created_at', { ascending: false });

      if (error) throw error;
      setAssets(data || []);
    } catch (error) {
      console.error('Error fetching assets:', error);
      showToast('Failed to load assets', 'error');
    } finally {
      setLoading(false);
    }
  };

  const fetchProjects = async () => {
    if (!organization?.id) return;

    try {
      const response = await fetch('/api/projects');
      const result = await response.json();

      if (!response.ok || !result.success) {
        // Don't show toast - projects are optional
        return;
      }

      // Extract data from the response structure { success: true, data: { projects: [...] } }
      const fetchedProjects = result.data?.projects || [];
      setProjects(fetchedProjects);
    } catch (error) {
      console.error('Error fetching projects:', error);
      // Don't show toast - projects are optional
    }
  };

  const handleCreateFolder = async (name: string) => {
    if (!organization?.id || !user?.id) return;

    try {
      const formData = new FormData();
      formData.append('name', name);
      if (createFolderParentId) {
        formData.append('parentId', createFolderParentId);
      }
      formData.append('isOrgShared', 'true');

      const result = await createFolder(formData);

      if (result.error) {
        throw new Error(result.error);
      }

      showToast('Folder created successfully', 'success');
      fetchFolders();
      setCreateFolderParentId(undefined);
    } catch (error) {
      throw error;
    }
  };

  const handleRenameFolder = async (folderId: string, newName: string) => {
    try {
      const result = await renameFolder(folderId, newName);

      if (result.error) {
        throw new Error(result.error);
      }

      showToast('Folder renamed successfully', 'success');
      fetchFolders();
    } catch (error) {
      throw error;
    }
  };

  const handleDeleteFolder = async (folderId: string) => {
    try {
      const result = await deleteFolder(folderId);

      if (result.error) {
        throw new Error(result.error);
      }

      showToast('Folder deleted successfully', 'success');
      fetchFolders();
      fetchAssets(); // Refresh to show relocated assets
    } catch (error) {
      throw error;
    }
  };

  const handleDeleteAsset = async (assetId: string) => {
    try {
      const result = await deleteAsset(assetId);

      if (result.error) {
        throw new Error(result.error);
      }

      showToast('Asset deleted successfully', 'success');
      fetchAssets();
      setSelectedIds(selectedIds.filter(id => id !== assetId));
    } catch (error) {
      console.error('Error deleting asset:', error);
      showToast('Failed to delete asset', 'error');
    }
  };

  const handleMoveAsset = async (assetId: string, folderId: string | null) => {
    try {
      const result = await moveAsset(assetId, folderId);

      if (result.error) {
        throw new Error(result.error);
      }

      showToast('Asset moved successfully', 'success');
      fetchAssets();
      setMovingMockupId(null);
    } catch (error) {
      console.error('Error moving asset:', error);
      showToast('Failed to move asset', 'error');
    }
  };

  const handleUpdateProject = async (assetId: string, projectId: string | null) => {
    try {
      const result = await updateAssetProject(assetId, projectId);

      if (result.error) {
        throw new Error(result.error);
      }

      showToast('Project updated successfully', 'success');
      fetchAssets();
    } catch (error) {
      console.error('Error updating project:', error);
      showToast('Failed to update project', 'error');
    }
  };

  const handleSelectAll = () => {
    setSelectedIds(filteredAssets.map(m => m.id));
  };

  const handleClearSelection = () => {
    setSelectedIds([]);
  };

  const handleDeleteSelected = async () => {
    if (selectedIds.length === 0) return;

    const confirmDelete = window.confirm(
      `Delete ${selectedIds.length} mockup(s)? This action cannot be undone.`
    );

    if (!confirmDelete) return;

    for (const id of selectedIds) {
      await handleDeleteAsset(id);
    }
  };

  // Context Panel Content (Folders)
  const contextPanelContent = (
    <div className="p-4 space-y-4">
      {/* Search */}
      <div className="relative">
        <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-[var(--text-tertiary)]" />
        <input
          type="text"
          placeholder="Search assets..."
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          className="w-full pl-9 pr-3 py-2 text-sm border border-[var(--border-main)] rounded-lg focus:outline-none focus:ring-2 focus:ring-[var(--accent-blue)]"
        />
      </div>

      {/* Brand Library Button */}
      <button
        onClick={() => router.push('/brands')}
        className="w-full flex items-center gap-2 px-3 py-2 text-sm border border-[var(--border-main)] hover:bg-[var(--bg-hover)] rounded-lg transition-colors"
      >
        <Library size={16} />
        <span>Brand Library</span>
      </button>

      {/* Upload Brand Button */}
      <button
        onClick={() => router.push('/upload')}
        className="w-full flex items-center gap-2 px-3 py-2 text-sm bg-[var(--accent-blue)] text-white hover:opacity-90 rounded-lg transition-opacity"
      >
        <Upload size={16} />
        <span>Upload Brand</span>
      </button>

      {/* Create Folder Button */}
      <button
        onClick={() => setShowCreateFolderModal(true)}
        className="w-full flex items-center gap-2 px-3 py-2 text-sm text-[var(--accent-blue)] hover:bg-[var(--bg-hover)] rounded-lg transition-colors"
      >
        <Plus size={16} />
        <span>New Folder</span>
      </button>

      {/* Folder Tree */}
      <div className="border-t border-[var(--border-main)] pt-4">
        <FolderTree
          folders={folders}
          selectedFolderId={selectedFolderId}
          unsortedCount={unsortedCount}
          onFolderSelect={setSelectedFolderId}
          onCreateFolder={(parentId) => {
            setCreateFolderParentId(parentId);
            setShowCreateFolderModal(true);
          }}
          onRenameFolder={(folder) => {
            setSelectedFolder(folder);
            setShowRenameFolderModal(true);
          }}
          onDeleteFolder={(folder) => {
            setSelectedFolder(folder);
            setShowDeleteFolderModal(true);
          }}
          isAdmin={isAdmin}
        />
      </div>
    </div>
  );

  // List View with Toolbar
  const listViewContent = (
    <ListView
      items={filteredAssets}
      renderItem={(mockup, index, isSelected) => (
        <MockupListItem
          key={mockup.id}
          mockup={mockup}
          isSelected={isSelected}
          onToggleSelect={() => {
            setSelectedIds((prev: string[]) =>
              prev.includes(mockup.id)
                ? prev.filter((id: string) => id !== mockup.id)
                : [...prev, mockup.id]
            );
          }}
        />
      )}
      itemHeight={72}
      loading={loading}
      emptyMessage={
        selectedFolderId === null
          ? 'No unsorted assets'
          : 'No assets in this folder'
      }
      toolbar={
        <ListToolbar
          totalCount={filteredAssets.length}
          onSelectAll={handleSelectAll}
          onClearSelection={handleClearSelection}
          onDelete={handleDeleteSelected}
          onMove={() => {
            if (selectedIds.length > 0) {
              setMovingMockupId(selectedIds[0]);
            }
          }}
        />
      }
    />
  );

  // Preview Area Content
  const previewContent = selectedIds.length === 1 ? (
    <div className="p-8">
      <div className="max-w-4xl mx-auto">
        {(() => {
          const mockup = assets.find(m => m.id === selectedIds[0]);
          if (!mockup) return <div>Mockup not found</div>;

          return (
            <div>
              <h1 className="text-2xl font-bold text-[var(--text-primary)] mb-4">
                {mockup.mockup_name}
              </h1>

              {mockup.mockup_image_url && (
                <div className="bg-[var(--bg-primary)] rounded-lg p-4 mb-4">
                  <img
                    src={mockup.mockup_image_url}
                    alt={mockup.mockup_name}
                    className="w-full max-w-2xl mx-auto rounded shadow-lg"
                  />
                </div>
              )}

              <div className="space-y-4 text-sm">
                <div>
                  <label className="block text-[var(--text-secondary)] mb-2">Project:</label>
                  <select
                    value={mockup.project_id || ''}
                    onChange={(e) => handleUpdateProject(mockup.id, e.target.value || null)}
                    className="w-full px-3 py-2 border border-[var(--border-main)] rounded-lg focus:outline-none focus:ring-2 focus:ring-[var(--accent-blue)] text-sm bg-white"
                  >
                    <option value="">No project</option>
                    {projects.map((project) => (
                      <option key={project.id} value={project.id}>
                        {project.name}
                      </option>
                    ))}
                  </select>
                </div>

                <div className="mt-4">
                  <button
                    onClick={() => router.push(`/mockups/${mockup.id}`)}
                    className="px-4 py-2 bg-[var(--accent-blue)] text-white rounded-lg hover:opacity-90 transition-opacity"
                  >
                    View Details
                  </button>
                </div>
              </div>
            </div>
          );
        })()}
      </div>
    </div>
  ) : null;

  return (
    <>
      <GmailLayout
        contextPanel={contextPanelContent}
        listView={listViewContent}
        previewArea={<PreviewArea>{previewContent}</PreviewArea>}
      />

      {/* Modals */}
      {showCreateFolderModal && (
        <CreateFolderModal
          isOpen={showCreateFolderModal}
          onClose={() => {
            setShowCreateFolderModal(false);
            setCreateFolderParentId(undefined);
          }}
          onSubmit={handleCreateFolder}
        />
      )}

      {showRenameFolderModal && selectedFolder && (
        <RenameFolderModal
          isOpen={showRenameFolderModal}
          folder={selectedFolder}
          onClose={() => {
            setShowRenameFolderModal(false);
            setSelectedFolder(null);
          }}
          onSubmit={handleRenameFolder}
        />
      )}

      {showDeleteFolderModal && selectedFolder && (
        <DeleteFolderModal
          isOpen={showDeleteFolderModal}
          folder={selectedFolder}
          onClose={() => {
            setShowDeleteFolderModal(false);
            setSelectedFolder(null);
          }}
          onConfirm={handleDeleteFolder}
        />
      )}

      {movingAssetId && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 max-w-md w-full mx-4">
            <h3 className="text-lg font-semibold mb-4">Move Mockup</h3>
            <FolderSelector
              folders={folders}
              selectedFolderId={null}
              onSelect={(folderId) => {
                handleMoveAsset(movingAssetId, folderId);
              }}
            />
            <button
              onClick={() => setMovingMockupId(null)}
              className="mt-4 w-full px-4 py-2 border border-[var(--border-main)] rounded-lg hover:bg-[var(--bg-hover)] transition-colors"
            >
              Cancel
            </button>
          </div>
        </div>
      )}

      {/* Toast Notifications */}
      <div className="fixed bottom-4 right-4 z-50 space-y-2">
        {toasts.map((toast) => (
          <Toast
            key={toast.id}
            message={toast.message}
            type={toast.type}
            onClose={() => removeToast(toast.id)}
          />
        ))}
      </div>
    </>
  );
}
