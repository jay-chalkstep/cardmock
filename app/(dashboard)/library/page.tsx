'use client';

import { useState, useEffect, Suspense } from 'react';
import { useSearchParams } from 'next/navigation';
import { useOrganization, useUser } from '@clerk/nextjs';
import { supabase, CardMockup, Folder, Project, Brand, CardTemplate } from '@/lib/supabase';
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
import BrandCard from '@/components/brand/BrandCard';
import BrandDetailModal from '@/components/brand/BrandDetailModal';
import BrandPreview from '@/components/brand/BrandPreview';
import TemplateUploadModal from '@/components/templates/TemplateUploadModal';
import FigmaImportModal from '@/components/integrations/FigmaImportModal';
import { Search, Plus, Loader2, Upload, Library, Package, LayoutTemplate, Images } from 'lucide-react';
import { createFolder, renameFolder, deleteFolder } from '@/app/actions/folders';
import { deleteAsset, moveAsset, updateAssetProject } from '@/app/actions/assets';
import { deleteBrand as deleteBrandAction } from '@/app/actions/brands';
import type { LogoVariant } from '@/lib/supabase';

interface ToastMessage {
  message: string;
  type: 'success' | 'error';
  id: number;
}

type LibraryTab = 'assets' | 'brands' | 'templates';

function LibraryPageContent() {
  const { organization, isLoaded, membership } = useOrganization();
  const { user } = useUser();
  const router = useRouter();
  const searchParams = useSearchParams();
  const { selectedIds, setSelectedIds, setActiveNav } = usePanelContext();

  // Active tab - check query params first
  const tabParam = searchParams?.get('tab') as LibraryTab | null;
  const [activeTab, setActiveTab] = useState<LibraryTab>(tabParam && ['assets', 'brands', 'templates'].includes(tabParam) ? tabParam : 'assets');
  const [searchTerm, setSearchTerm] = useState('');

  // Asset state
  const [assets, setAssets] = useState<CardMockup[]>([]);
  const [filteredAssets, setFilteredAssets] = useState<CardMockup[]>([]);
  const [assetsLoading, setAssetsLoading] = useState(true);

  // Brand state
  const [brands, setBrands] = useState<Brand[]>([]);
  const [filteredBrands, setFilteredBrands] = useState<Brand[]>([]);
  const [brandsLoading, setBrandsLoading] = useState(true);
  const [selectedBrand, setSelectedBrand] = useState<Brand | null>(null);
  const [isBrandModalOpen, setIsBrandModalOpen] = useState(false);
  const [deletingBrandId, setDeletingBrandId] = useState<string | null>(null);

  // Template state
  const [templates, setTemplates] = useState<CardTemplate[]>([]);
  const [filteredTemplates, setFilteredTemplates] = useState<CardTemplate[]>([]);
  const [templatesLoading, setTemplatesLoading] = useState(true);
  const [isUploadModalOpen, setIsUploadModalOpen] = useState(false);

  // Figma import state
  const [showFigmaImportModal, setShowFigmaImportModal] = useState(false);
  const [isFigmaConnected, setIsFigmaConnected] = useState(false);

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

  // Update tab from query params
  useEffect(() => {
    const tabParam = searchParams?.get('tab') as LibraryTab | null;
    if (tabParam && ['assets', 'brands', 'templates'].includes(tabParam)) {
      setActiveTab(tabParam);
    }
  }, [searchParams]);

  // Update URL when tab changes
  const handleTabChange = (tab: LibraryTab) => {
    setActiveTab(tab);
    setSelectedBrand(null); // Clear selected brand when switching tabs
    setSelectedIds([]); // Clear selected assets when switching tabs
    router.push(`/library?tab=${tab}`, { scroll: false });
  };

  // Fetch data based on active tab
  useEffect(() => {
    if (organization?.id && user?.id) {
      if (activeTab === 'assets') {
        fetchFolders();
        fetchAssets();
        fetchProjects();
        checkFigmaConnection();
      } else if (activeTab === 'brands') {
        fetchBrands();
      } else if (activeTab === 'templates') {
        fetchTemplates();
      }
    }
  }, [organization?.id, user?.id, activeTab]);

  // Check Figma connection status
  const checkFigmaConnection = async () => {
    try {
      const response = await fetch('/api/integrations/figma/status');
      if (response.ok) {
        const data = await response.json();
        setIsFigmaConnected(data.data?.connected || false);
      } else {
        setIsFigmaConnected(false);
      }
    } catch (err) {
      setIsFigmaConnected(false);
    }
  };

  // Filter assets
  useEffect(() => {
    if (activeTab !== 'assets') return;

    let filtered = assets;

    // Filter by folder
    if (selectedFolderId === null) {
      filtered = filtered.filter(m => !m.folder_id);
    } else {
      filtered = filtered.filter(m => m.folder_id === selectedFolderId);
    }

    // Filter by search term
    if (searchTerm) {
      filtered = filtered.filter(mockup =>
        mockup.mockup_name.toLowerCase().includes(searchTerm.toLowerCase())
      );
    }

    setFilteredAssets(filtered);
  }, [searchTerm, assets, selectedFolderId, activeTab]);

  // Filter brands
  useEffect(() => {
    if (activeTab !== 'brands') return;

    let filtered = [...brands];

    if (searchTerm) {
      filtered = filtered.filter(
        (brand) =>
          brand.company_name.toLowerCase().includes(searchTerm.toLowerCase()) ||
          brand.domain.toLowerCase().includes(searchTerm.toLowerCase())
      );
    }

    setFilteredBrands(filtered);
  }, [searchTerm, brands, activeTab]);

  // Filter templates
  useEffect(() => {
    if (activeTab !== 'templates') return;

    let filtered = [...templates];

    if (searchTerm) {
      filtered = filtered.filter(template =>
        template.template_name.toLowerCase().includes(searchTerm.toLowerCase())
      );
    }

    setFilteredTemplates(filtered);
  }, [searchTerm, templates, activeTab]);

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

      const count = await getUnsortedAssetCount(user.id, organization.id);
      setUnsortedCount(count);
    } catch (error) {
      console.error('Error fetching folders:', error);
    }
  };

  const fetchAssets = async () => {
    if (!organization?.id) return;

    setAssetsLoading(true);
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
      setAssetsLoading(false);
    }
  };

  const fetchBrands = async () => {
    if (!organization?.id) return;

    setBrandsLoading(true);
    try {
      const { data, error } = await supabase
        .from('brands')
        .select(`
          *,
          logo_variants!brand_id(*),
          brand_colors!brand_id(*),
          brand_fonts!brand_id(*)
        `)
        .eq('organization_id', organization.id)
        .order('created_at', { ascending: false });

      if (error) throw error;

      const enrichedBrands = (data || []).map((brand: any) => {
        const primaryLogoVariant = brand.logo_variants?.find(
          (logo: any) => logo.id === brand.primary_logo_variant_id
        );
        return {
          ...brand,
          primary_logo_variant: primaryLogoVariant,
        };
      });

      setBrands(enrichedBrands);
    } catch (err) {
      console.error('Error fetching brands:', err);
      showToast('Failed to fetch brands', 'error');
    } finally {
      setBrandsLoading(false);
    }
  };

  const fetchTemplates = async () => {
    if (!organization?.id) return;

    setTemplatesLoading(true);
    try {
      const response = await fetch('/api/templates');
      const result = await response.json();

      if (!response.ok || !result.success) {
        throw new Error(result.error || 'Failed to fetch templates');
      }

      const fetchedTemplates = result.data?.templates || [];
      setTemplates(fetchedTemplates);
    } catch (error) {
      console.error('Error fetching templates:', error);
      showToast('Failed to load templates', 'error');
    } finally {
      setTemplatesLoading(false);
    }
  };

  const fetchProjects = async () => {
    if (!organization?.id) return;

    try {
      const response = await fetch('/api/projects');
      const result = await response.json();

      if (!response.ok || !result.success) {
        return;
      }

      const fetchedProjects = result.data?.projects || [];
      setProjects(fetchedProjects);
    } catch (error) {
      console.error('Error fetching projects:', error);
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
      fetchAssets();
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

  const handleDeleteBrand = async (brandId: string, brandName: string) => {
    const confirmed = window.confirm(
      `Delete ${brandName}?\n\nThis will permanently remove:\n• All logo variants\n• Brand colors and fonts\n• Any assets using these logos\n\nThis action cannot be undone.`
    );

    if (!confirmed) return;

    setDeletingBrandId(brandId);
    try {
      const result = await deleteBrandAction(brandId);

      if (result.error) {
        throw new Error(result.error);
      }

      showToast(`${brandName} deleted successfully`, 'success');
      fetchBrands();
    } catch (err) {
      console.error('Error deleting brand:', err);
      showToast(`Failed to delete ${brandName}`, 'error');
    } finally {
      setDeletingBrandId(null);
    }
  };

  const handleDeleteSelected = async () => {
    if (selectedIds.length === 0) return;

    const confirmDelete = window.confirm(
      `Delete ${selectedIds.length} asset(s)? This action cannot be undone.`
    );

    if (!confirmDelete) return;

    for (const id of selectedIds) {
      await handleDeleteAsset(id);
    }
  };

  // Context Panel Content
  const contextPanelContent = (
    <div className="p-4 space-y-4">
      {/* Search */}
      <div className="relative">
        <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-[var(--text-tertiary)]" />
        <input
          type="text"
          placeholder={`Search ${activeTab}...`}
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          className="w-full pl-9 pr-3 py-2 text-sm border border-[var(--border-main)] rounded-lg focus:outline-none focus:ring-2 focus:ring-[var(--accent-blue)]"
        />
      </div>

      {/* Tab-specific actions */}
      {activeTab === 'assets' && (
        <>
          <button
            onClick={() => {
              if (!isFigmaConnected) {
                showToast('Please connect Figma first in Settings → Integrations', 'error');
                return;
              }
              setShowFigmaImportModal(true);
            }}
            className="w-full flex items-center gap-2 px-3 py-2 text-sm border border-[var(--border-main)] hover:bg-[var(--bg-hover)] rounded-lg transition-colors"
            title={!isFigmaConnected ? 'Connect Figma in Settings → Integrations' : 'Import frames from Figma'}
          >
            <Images size={16} />
            <span>Import from Figma</span>
          </button>
          <button
            onClick={() => router.push('/designer')}
            className="w-full flex items-center gap-2 px-3 py-2 text-sm bg-[var(--accent-blue)] text-white hover:opacity-90 rounded-lg transition-opacity"
          >
            <Plus size={16} />
            <span>New Asset</span>
          </button>
          <button
            onClick={() => setShowCreateFolderModal(true)}
            className="w-full flex items-center gap-2 px-3 py-2 text-sm text-[var(--accent-blue)] hover:bg-[var(--bg-hover)] rounded-lg transition-colors"
          >
            <Plus size={16} />
            <span>New Folder</span>
          </button>
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
        </>
      )}

      {activeTab === 'brands' && (
        <>
          <button
            onClick={() => router.push('/upload')}
            className="w-full flex items-center gap-2 px-3 py-2 text-sm bg-[var(--accent-blue)] text-white hover:opacity-90 rounded-lg transition-opacity"
          >
            <Upload size={16} />
            <span>Upload Brand</span>
          </button>
          <button
            onClick={() => router.push('/search')}
            className="w-full flex items-center gap-2 px-3 py-2 text-sm border border-[var(--border-main)] hover:bg-[var(--bg-hover)] rounded-lg transition-colors"
          >
            <Search size={16} />
            <span>Search Brands</span>
          </button>
        </>
      )}

      {activeTab === 'templates' && isAdmin && (
        <button
          onClick={() => setIsUploadModalOpen(true)}
          className="w-full flex items-center gap-2 px-3 py-2 text-sm bg-[var(--accent-blue)] text-white hover:opacity-90 rounded-lg transition-opacity"
        >
          <Upload size={16} />
          <span>Upload Template</span>
        </button>
      )}
    </div>
  );

  // Render content based on active tab
  const renderTabContent = () => {
    if (activeTab === 'assets') {
      return (
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
          loading={assetsLoading}
          emptyMessage={
            selectedFolderId === null
              ? 'No unsorted assets'
              : 'No assets in this folder'
          }
          toolbar={
            <ListToolbar
              totalCount={filteredAssets.length}
              onSelectAll={() => setSelectedIds(filteredAssets.map(m => m.id))}
              onClearSelection={() => setSelectedIds([])}
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
    }

    if (activeTab === 'brands') {
      if (brandsLoading) {
        return (
          <div className="flex items-center justify-center h-64">
            <Loader2 className="h-8 w-8 animate-spin text-[var(--accent-blue)]" />
          </div>
        );
      }

      if (filteredBrands.length === 0) {
        return (
          <div className="bg-white rounded-lg shadow p-12 text-center">
            <div className="w-20 h-20 mx-auto mb-4 bg-gray-100 rounded-full flex items-center justify-center">
              <Package className="h-10 w-10 text-gray-400" />
            </div>
            <h3 className="text-lg font-medium text-gray-900 mb-2">
              {searchTerm ? 'No brands found' : 'No brands saved yet'}
            </h3>
            <p className="text-gray-500 mb-6">
              {searchTerm
                ? 'No brands matching your search.'
                : 'Start by searching for company brands!'}
            </p>
            {!searchTerm && (
              <button
                onClick={() => router.push('/search')}
                className="px-4 py-2 bg-[var(--accent-blue)] text-white rounded-md hover:opacity-90 transition-opacity"
              >
                Search Brands
              </button>
            )}
          </div>
        );
      }

      return (
        <div className="p-6 overflow-y-auto h-full w-full">
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-6 max-w-full">
            {filteredBrands.map((brand) => {
              const primaryLogo = brand.primary_logo_variant;
              const colorPreview = brand.brand_colors?.slice(0, 3) || [];
              const isDeleting = deletingBrandId === brand.id;

              return (
                <div
                  key={brand.id}
                  className="relative text-left bg-white rounded-lg shadow-sm border border-gray-200 overflow-hidden hover:shadow-lg hover:border-gray-300 transition-all group"
                >
                  {/* Delete Button */}
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      handleDeleteBrand(brand.id, brand.company_name);
                    }}
                    disabled={isDeleting}
                    className="absolute top-2 right-2 z-10 p-2 bg-white rounded-full shadow-md opacity-0 group-hover:opacity-100 transition-opacity hover:bg-red-50 disabled:opacity-50 disabled:cursor-not-allowed"
                    title="Delete brand"
                  >
                    {isDeleting ? (
                      <Loader2 className="h-4 w-4 text-red-600 animate-spin" />
                    ) : (
                      <Package className="h-4 w-4 text-red-600" />
                    )}
                  </button>

                  {/* Card Content */}
                  <button
                    onClick={() => {
                      setSelectedBrand(brand);
                    }}
                    disabled={isDeleting}
                    className={`w-full text-left disabled:opacity-50 ${
                      selectedBrand?.id === brand.id ? 'ring-2 ring-blue-500' : ''
                    }`}
                  >
                    {/* Logo preview */}
                    <div className="h-40 bg-gray-50 flex items-center justify-center p-4 group-hover:bg-gray-100 transition-colors">
                      {primaryLogo ? (
                        <img
                          src={primaryLogo.logo_url}
                          alt={brand.company_name}
                          className="max-h-full max-w-full object-contain"
                        />
                      ) : (
                        <div className="text-gray-400 text-center">
                          <p className="text-sm">No brand assets</p>
                        </div>
                      )}
                    </div>

                    {/* Brand info */}
                    <div className="p-4 space-y-3">
                      <div>
                        <h3 className="font-semibold text-gray-900 text-lg truncate" title={brand.company_name}>
                          {brand.company_name}
                        </h3>
                        <p className="text-sm text-gray-600 truncate" title={brand.domain}>{brand.domain}</p>
                      </div>

                      {brand.description && (
                        <p className="text-sm text-gray-600 line-clamp-2" title={brand.description}>
                          {brand.description}
                        </p>
                      )}

                      {/* Color preview */}
                      {colorPreview.length > 0 && (
                        <div className="flex gap-2 pt-2">
                          {colorPreview.map((color, idx) => (
                            <div
                              key={idx}
                              className="w-6 h-6 rounded-full border border-gray-300"
                              style={{ backgroundColor: color.hex }}
                              title={color.hex}
                            />
                          ))}
                          {brand.brand_colors && brand.brand_colors.length > 3 && (
                            <div className="flex items-center justify-center w-6 h-6 text-xs text-gray-600">
                              +{brand.brand_colors.length - 3}
                            </div>
                          )}
                        </div>
                      )}

                      {/* Brand variant count */}
                      <p className="text-xs text-gray-500 pt-2">
                        {brand.logo_variants?.length || 0} brand variant{brand.logo_variants?.length !== 1 ? 's' : ''}
                      </p>
                    </div>
                  </button>
                </div>
              );
            })}
          </div>
        </div>
      );
    }

    if (activeTab === 'templates') {
      if (templatesLoading) {
        return (
          <div className="flex items-center justify-center h-64">
            <Loader2 className="h-8 w-8 animate-spin text-[var(--accent-blue)]" />
          </div>
        );
      }

      if (filteredTemplates.length === 0) {
        return (
          <div className="bg-white rounded-lg shadow p-12 text-center">
            <div className="w-20 h-20 mx-auto mb-4 bg-gray-100 rounded-full flex items-center justify-center">
              <LayoutTemplate className="h-10 w-10 text-gray-400" />
            </div>
            <h3 className="text-lg font-medium text-gray-900 mb-2">
              {searchTerm ? 'No templates found' : 'No templates available'}
            </h3>
            <p className="text-gray-500 mb-6">
              {searchTerm
                ? 'No templates matching your search.'
                : isAdmin
                ? 'Upload templates to get started.'
                : 'Contact an admin to upload templates.'}
            </p>
            {!searchTerm && isAdmin && (
              <button
                onClick={() => setIsUploadModalOpen(true)}
                className="px-4 py-2 bg-[var(--accent-blue)] text-white rounded-md hover:opacity-90 transition-opacity"
              >
                Upload Template
              </button>
            )}
          </div>
        );
      }

      return (
        <div className="p-6">
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-6">
            {filteredTemplates.map((template) => (
              <div
                key={template.id}
                className="relative text-left bg-white rounded-lg shadow-sm border border-gray-200 overflow-hidden hover:shadow-lg hover:border-gray-300 transition-all"
              >
                <div className="h-40 bg-gray-50 flex items-center justify-center p-4">
                  <img
                    src={template.template_url}
                    alt={template.template_name}
                    className="max-h-full max-w-full object-contain"
                  />
                </div>
                <div className="p-4">
                  <h3 className="font-semibold text-gray-900 text-lg mb-2">
                    {template.template_name}
                  </h3>
                  <p className="text-xs text-gray-500">
                    Uploaded {new Date(template.uploaded_date).toLocaleDateString()}
                  </p>
                </div>
              </div>
            ))}
          </div>
        </div>
      );
    }

    return null;
  };

  // Preview Area Content
  const previewContent = activeTab === 'assets' && selectedIds.length === 1 ? (
    <div className="p-8">
      <div className="max-w-4xl mx-auto">
        {(() => {
          const mockup = assets.find(m => m.id === selectedIds[0]);
          if (!mockup) return <div>Asset not found</div>;

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
  ) : activeTab === 'brands' && selectedBrand ? (
    <BrandPreview
      brand={selectedBrand}
      onDelete={async (brandId) => {
        await handleDeleteBrand(brandId, selectedBrand.company_name);
        setSelectedBrand(null);
      }}
      showActions={true}
    />
  ) : null;

  return (
    <>
      <GmailLayout
        contextPanel={contextPanelContent}
        listView={
          <div className="flex flex-col h-full">
            {/* Tabs */}
            <div className="border-b border-[var(--border-main)] bg-white flex-shrink-0">
              <div className="flex gap-1 px-4">
                <button
                  onClick={() => handleTabChange('assets')}
                  className={`px-4 py-3 text-sm font-medium border-b-2 transition-colors ${
                    activeTab === 'assets'
                      ? 'border-[var(--accent-blue)] text-[var(--accent-blue)]'
                      : 'border-transparent text-[var(--text-secondary)] hover:text-[var(--text-primary)]'
                  }`}
                >
                  <div className="flex items-center gap-2">
                    <Images size={16} />
                    <span>Assets</span>
                  </div>
                </button>
                <button
                  onClick={() => handleTabChange('brands')}
                  className={`px-4 py-3 text-sm font-medium border-b-2 transition-colors ${
                    activeTab === 'brands'
                      ? 'border-[var(--accent-blue)] text-[var(--accent-blue)]'
                      : 'border-transparent text-[var(--text-secondary)] hover:text-[var(--text-primary)]'
                  }`}
                >
                  <div className="flex items-center gap-2">
                    <Package size={16} />
                    <span>Brands</span>
                  </div>
                </button>
                <button
                  onClick={() => handleTabChange('templates')}
                  className={`px-4 py-3 text-sm font-medium border-b-2 transition-colors ${
                    activeTab === 'templates'
                      ? 'border-[var(--accent-blue)] text-[var(--accent-blue)]'
                      : 'border-transparent text-[var(--text-secondary)] hover:text-[var(--text-primary)]'
                  }`}
                >
                  <div className="flex items-center gap-2">
                    <LayoutTemplate size={16} />
                    <span>Templates</span>
                  </div>
                </button>
              </div>
            </div>

            {/* Tab Content */}
            <div className="flex-1 overflow-auto">
              {renderTabContent()}
            </div>
          </div>
        }
        listViewWidth={activeTab === 'brands' || activeTab === 'templates' ? 'flex' : 'fixed'}
        previewArea={(activeTab === 'assets' || activeTab === 'brands') && previewContent ? (
          <PreviewArea>{previewContent}</PreviewArea>
        ) : null}
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
            <h3 className="text-lg font-semibold mb-4">Move Asset</h3>
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

      {selectedBrand && (
        <BrandDetailModal
          brand={selectedBrand}
          isOpen={isBrandModalOpen}
          onClose={() => setIsBrandModalOpen(false)}
          onSelectLogo={(logo: LogoVariant) => {
            console.log('Selected logo:', logo);
          }}
        />
      )}

      {isUploadModalOpen && (
        <TemplateUploadModal
          isOpen={isUploadModalOpen}
          onClose={() => setIsUploadModalOpen(false)}
          onSuccess={() => {
            fetchTemplates();
            setIsUploadModalOpen(false);
            showToast('Template uploaded successfully', 'success');
          }}
        />
      )}

      {showFigmaImportModal && (
        <FigmaImportModal
          isOpen={showFigmaImportModal}
          onClose={() => setShowFigmaImportModal(false)}
          onImport={() => {
            fetchAssets();
            showToast('Figma frames imported successfully', 'success');
          }}
          projects={projects}
          folders={folders}
        />
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

export default function LibraryPage() {
  return (
    <Suspense
      fallback={
        <GmailLayout>
          <div className="flex h-screen items-center justify-center">
            <Loader2 className="h-8 w-8 animate-spin text-[var(--accent-blue)]" />
          </div>
        </GmailLayout>
      }
    >
      <LibraryPageContent />
    </Suspense>
  );
}

