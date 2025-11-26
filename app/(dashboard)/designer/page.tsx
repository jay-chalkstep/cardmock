'use client';

import { useState, useEffect, useRef, Suspense } from 'react';
import dynamic from 'next/dynamic';
import { useSearchParams } from 'next/navigation';
import { useOrganization, useUser } from '@/lib/hooks/useAuth';
import { supabase, Logo, CardTemplate, Folder } from '@/lib/supabase';
import { buildFolderTree } from '@/lib/folders';
import Toast from '@/components/Toast';
import GmailLayout from '@/components/layout/GmailLayout';
import CreateFolderModal from '@/components/folders/CreateFolderModal';
import DesignerSelectionPanel from '@/components/designer/DesignerSelectionPanel';
import DesignerPositionControls from '@/components/designer/DesignerPositionControls';
import DesignerSizeControls from '@/components/designer/DesignerSizeControls';
import DesignerSavePanel from '@/components/designer/DesignerSavePanel';
import DesignerBrandSelector from '@/components/designer/DesignerBrandSelector';
import {
  Grid,
  Loader2,
  CreditCard
} from 'lucide-react';
import { KonvaEventObject } from 'konva/lib/Node';
import type { KonvaCanvasRef } from '@/components/designer/KonvaCanvas';

// Dynamically import the KonvaCanvas wrapper to avoid SSR issues
const KonvaCanvas = dynamic(
  () => import('@/components/designer/KonvaCanvas'),
  {
    ssr: false,
    loading: () => (
      <div className="flex items-center justify-center h-96">
        <Loader2 className="h-8 w-8 animate-spin text-gray-400" />
      </div>
    )
  }
);

interface ToastMessage {
  message: string;
  type: 'success' | 'error';
  id: number;
}

interface BrandGroup {
  id: string;
  company_name: string;
  domain: string;
  description?: string;
  primary_logo_variant_id?: string;
  variants: Logo[];
  variantCount: number;
  primaryVariant?: Logo;
}

// Standard credit card aspect ratio
const CARD_ASPECT_RATIO = 1.586; // Standard credit card ratio (85.6mm × 53.98mm)

// Helper function to get format badge color
const getFormatColor = (format?: string) => {
  switch (format?.toLowerCase()) {
    case 'svg':
      return 'bg-purple-100 text-purple-700 border-purple-200';
    case 'png':
      return 'bg-blue-100 text-blue-700 border-blue-200';
    case 'jpg':
    case 'jpeg':
      return 'bg-green-100 text-green-700 border-green-200';
    default:
      return 'bg-gray-100 text-gray-700 border-gray-200';
  }
};

// Helper function to get type badge color
const getTypeColor = (type?: string) => {
  switch (type?.toLowerCase()) {
    case 'icon':
      return 'bg-orange-100 text-orange-700 border-orange-200';
    case 'logo':
      return 'bg-indigo-100 text-indigo-700 border-indigo-200';
    case 'symbol':
      return 'bg-pink-100 text-pink-700 border-pink-200';
    default:
      return 'bg-gray-100 text-gray-700 border-gray-200';
  }
};

function DesignerPageContent() {
  const { organization, isLoaded } = useOrganization();
  const { user } = useUser();
  const searchParams = useSearchParams();

  // State management
  const [selectedBrand, setSelectedBrand] = useState<Logo | null>(null);
  const [selectedTemplate, setSelectedTemplate] = useState<CardTemplate | null>(null);
  const [logoImage, setLogoImage] = useState<HTMLImageElement | null>(null);
  const [templateImage, setTemplateImage] = useState<HTMLImageElement | null>(null);

  // Canvas state
  const [stageWidth, setStageWidth] = useState(600);
  const [stageHeight, setStageHeight] = useState(378); // 600 / 1.586
  const [logoPosition, setLogoPosition] = useState({ x: 60, y: 38 }); // 10% from top-left
  const [logoSize, setLogoSize] = useState({ width: 150, height: 150 }); // 25% of card width
  const [logoScale, setLogoScale] = useState(25); // Percentage of card width
  const [isSelected, setIsSelected] = useState(false);
  const [keepAspectRatio, setKeepAspectRatio] = useState(true);
  const [showGrid, setShowGrid] = useState(false);

  // UI state
  const [showLogoSelector, setShowLogoSelector] = useState(false);
  const [showTemplateSelector, setShowTemplateSelector] = useState(false);
  const [mockupName, setMockupName] = useState('');
  const [saving, setSaving] = useState(false);
  const [toasts, setToasts] = useState<ToastMessage[]>([]);

  // Available items
  const [logos, setLogos] = useState<Logo[]>([]);
  const [brandGroups, setBrandGroups] = useState<BrandGroup[]>([]);
  const [expandedBrand, setExpandedBrand] = useState<string | null>(null);
  const [templates, setTemplates] = useState<CardTemplate[]>([]);

  // Folder state
  const [folders, setFolders] = useState<Folder[]>([]);
  const [selectedFolderId, setSelectedFolderId] = useState<string | null>(null);
  const [showCreateFolderModal, setShowCreateFolderModal] = useState(false);

  // Brand state for saving
  const [selectedBrandIdForSave, setSelectedBrandIdForSave] = useState<string | null>(null);

  // Refs
  const canvasRef = useRef<KonvaCanvasRef>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  // Toast functions
  const showToast = (message: string, type: 'success' | 'error') => {
    const id = Date.now();
    setToasts(prev => [...prev, { message, type, id }]);
  };

  const removeToast = (id: number) => {
    setToasts(prev => prev.filter(toast => toast.id !== id));
  };

  // Load logos, templates, and folders when organization loads
  useEffect(() => {
    if (organization?.id && user?.id) {
      fetchLogos();
      fetchTemplates();
      fetchFolders();
    }
  }, [organization?.id, user?.id]);

  // Handle brandId from query params (for pre-selecting brand)
  useEffect(() => {
    const brandIdParam = searchParams?.get('brandId');
    if (brandIdParam && brandGroups.length > 0) {
      const brand = brandGroups.find(b => b.id === brandIdParam);
      if (brand) {
        setSelectedBrandIdForSave(brandIdParam);
        // Auto-expand the brand and select its primary variant
        setExpandedBrand(brandIdParam);
        if (brand.primaryVariant) {
          loadBrandImage(brand.primaryVariant);
        }
      }
    }
  }, [searchParams, brandGroups]);


  // Handle responsive canvas sizing
  useEffect(() => {
    const updateSize = () => {
      if (containerRef.current) {
        const containerWidth = containerRef.current.offsetWidth;
        const maxWidth = Math.min(containerWidth - 40, 800); // Max 800px wide with padding
        setStageWidth(maxWidth);
        setStageHeight(maxWidth / CARD_ASPECT_RATIO);
      }
    };

    updateSize();
    window.addEventListener('resize', updateSize);
    return () => window.removeEventListener('resize', updateSize);
  }, []);

  // Fetch available logos from brands and logo_variants
  const fetchLogos = async () => {
    if (!organization?.id) return;

    try {
      const { data, error } = await supabase
        .from('brands')
        .select(`
          *,
          logo_variants!brand_id(*)
        `)
        .eq('organization_id', organization.id)
        .order('company_name');

      if (error) throw error;

      // Flatten logo variants into Logo format for backward compatibility
      const flattenedLogos: Logo[] = [];
      const groups: BrandGroup[] = [];

      (data || []).forEach((brand: any) => {
        if (brand.logo_variants && brand.logo_variants.length > 0) {
          const variants: Logo[] = [];

          brand.logo_variants.forEach((variant: any) => {
            const logoVariant: Logo = {
              id: variant.id,
              company_name: brand.company_name,
              domain: brand.domain,
              description: brand.description,
              logo_url: variant.logo_url,
              logo_type: variant.logo_type,
              logo_format: variant.logo_format,
              theme: variant.theme,
              width: variant.width,
              height: variant.height,
              file_size: variant.file_size,
              background_color: variant.background_color,
              accent_color: variant.accent_color,
              is_uploaded: variant.is_uploaded,
              created_at: variant.created_at,
              updated_at: variant.updated_at,
            };

            flattenedLogos.push(logoVariant);
            variants.push(logoVariant);
          });

          // Find primary variant
          const primaryVariant = variants.find(v => v.id === brand.primary_logo_variant_id) || variants[0];

          // Create brand group
          groups.push({
            id: brand.id,
            company_name: brand.company_name,
            domain: brand.domain,
            description: brand.description,
            primary_logo_variant_id: brand.primary_logo_variant_id,
            variants: variants,
            variantCount: variants.length,
            primaryVariant: primaryVariant,
          });
        }
      });

      setLogos(flattenedLogos);
      setBrandGroups(groups);
    } catch (error) {
      console.error('Error fetching logos:', error);
      showToast('Failed to load logos', 'error');
    }
  };

  // Fetch available templates
  const fetchTemplates = async () => {
    if (!organization?.id) return;

    try {
      const response = await fetch('/api/templates');
      const result = await response.json();

      if (!response.ok || !result.success) {
        const errorMessage = result.error || 'Failed to fetch templates';
        throw new Error(errorMessage);
      }

      // Extract data from the response structure { success: true, data: { templates: [...] } }
      const fetchedTemplates = result.data?.templates || [];
      setTemplates(fetchedTemplates);
    } catch (error) {
      console.error('Error fetching templates:', error);
      showToast('Failed to load card templates', 'error');
    }
  };

  // Fetch available folders
  const fetchFolders = async () => {
    if (!organization?.id || !user?.id) return;

    try {
      const response = await fetch('/api/folders');
      if (!response.ok) throw new Error('Failed to fetch folders');

      const { folders: fetchedFolders } = await response.json();
      const folderTree = buildFolderTree(fetchedFolders);
      setFolders(folderTree);
    } catch (error) {
      console.error('Error fetching folders:', error);
      // Don't show error toast for folders - it's optional functionality
    }
  };

  // Handle create folder
  const handleCreateFolder = async (name: string) => {
    if (!organization?.id || !user?.id) return;

    try {
      const response = await fetch('/api/folders', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name })
      });

      if (!response.ok) {
        const { error } = await response.json();
        throw new Error(error || 'Failed to create folder');
      }

      showToast('Folder created successfully', 'success');
      fetchFolders(); // Refresh folder list
    } catch (error) {
      throw error; // Let modal handle the error
    }
  };

  // Load logo image
  const loadBrandImage = (logo: Logo) => {
    const img = new window.Image();
    img.crossOrigin = 'anonymous';
    img.onload = () => {
      setLogoImage(img);
      // Calculate initial size maintaining aspect ratio
      const initialWidth = stageWidth * (logoScale / 100);
      const aspectRatio = img.height / img.width;
      setLogoSize({
        width: initialWidth,
        height: initialWidth * aspectRatio
      });
    };
    img.src = logo.logo_url;
    setSelectedBrand(logo);
    setShowLogoSelector(false);
    setIsSelected(true);
  };

  // Load template image
  const loadTemplateImage = (template: CardTemplate) => {
    const img = new window.Image();
    img.crossOrigin = 'anonymous';
    img.onload = () => {
      setTemplateImage(img);
    };
    img.src = template.template_url;
    setSelectedTemplate(template);
    setShowTemplateSelector(false);
  };

  // Handle drag end
  const handleDragEnd = (e: KonvaEventObject<DragEvent>) => {
    setLogoPosition({
      x: e.target.x(),
      y: e.target.y()
    });
  };

  // Handle transform end
  const handleTransformEnd = () => {
    if (!canvasRef.current) return;

    const logoNode = canvasRef.current.getLogoNode();
    if (!logoNode) return;

    setLogoPosition({
      x: logoNode.x(),
      y: logoNode.y()
    });

    setLogoSize({
      width: logoNode.width(),
      height: logoNode.height()
    });

    // Update scale percentage
    setLogoScale(Math.round((logoNode.width() / stageWidth) * 100));
  };


  // Position control functions
  const moveLogo = (direction: 'up' | 'down' | 'left' | 'right', amount: number = 5) => {
    setLogoPosition(prev => {
      const newPos = { ...prev };
      switch (direction) {
        case 'up':
          newPos.y = Math.max(0, prev.y - amount);
          break;
        case 'down':
          newPos.y = Math.min(stageHeight - logoSize.height, prev.y + amount);
          break;
        case 'left':
          newPos.x = Math.max(0, prev.x - amount);
          break;
        case 'right':
          newPos.x = Math.min(stageWidth - logoSize.width, prev.x + amount);
          break;
      }
      return newPos;
    });
  };

  // Size control functions
  const updateLogoScale = (newScale: number) => {
    if (!logoImage) return;

    setLogoScale(newScale);
    const newWidth = stageWidth * (newScale / 100);
    const aspectRatio = logoImage.height / logoImage.width;

    setLogoSize({
      width: newWidth,
      height: keepAspectRatio ? newWidth * aspectRatio : logoSize.height
    });
  };

  // Preset position functions
  const setPresetPosition = (preset: string) => {
    const padding = stageWidth * 0.05; // 5% padding

    switch (preset) {
      case 'top-left':
        setLogoPosition({ x: padding, y: padding });
        break;
      case 'top-right':
        setLogoPosition({ x: stageWidth - logoSize.width - padding, y: padding });
        break;
      case 'bottom-left':
        setLogoPosition({ x: padding, y: stageHeight - logoSize.height - padding });
        break;
      case 'bottom-right':
        setLogoPosition({
          x: stageWidth - logoSize.width - padding,
          y: stageHeight - logoSize.height - padding
        });
        break;
      case 'center':
        setLogoPosition({
          x: (stageWidth - logoSize.width) / 2,
          y: (stageHeight - logoSize.height) / 2
        });
        break;
    }
  };

  // Save mockup
  const saveMockup = async () => {
    if (!mockupName.trim()) {
      showToast('Please enter a name for the mockup', 'error');
      return;
    }

    if (!selectedBrand || !selectedTemplate) {
      showToast('Please select both a logo and a card template', 'error');
      return;
    }

    if (!canvasRef.current) return;

    setSaving(true);
    try {
      // Temporarily hide grid and selection for clean export
      const wasShowingGrid = showGrid;
      const wasSelected = isSelected;

      // Hide UI elements
      if (wasShowingGrid) setShowGrid(false);
      if (wasSelected) setIsSelected(false);

      // Wait for state updates to render
      await new Promise(resolve => setTimeout(resolve, 50));

      // Generate image from canvas using clean export
      const dataURL = canvasRef.current.toDataURLClean({
        pixelRatio: 2, // 2x resolution for high quality
        mimeType: 'image/png'
      });

      // Restore UI elements
      if (wasShowingGrid) setShowGrid(true);
      if (wasSelected) setIsSelected(true);

      if (!dataURL) {
        throw new Error('Failed to generate image from canvas');
      }

      // Convert to blob
      const response = await fetch(dataURL);
      const blob = await response.blob();

      // Prepare form data for API
      // Note: Brand is inferred through logo_id -> logo_variants -> brand_id
      const formData = new FormData();
      formData.append('image', blob);
      formData.append('mockupName', mockupName);
      formData.append('logoId', selectedBrand.id);
      formData.append('templateId', selectedTemplate.id);
      if (selectedFolderId) formData.append('folderId', selectedFolderId);
      formData.append('logoX', ((logoPosition.x / stageWidth) * 100).toString());
      formData.append('logoY', ((logoPosition.y / stageHeight) * 100).toString());
      formData.append('logoScale', logoScale.toString());

      // Save via API
      const apiResponse = await fetch('/api/mockups', {
        method: 'POST',
        body: formData
      });

      if (!apiResponse.ok) {
        const errorData = await apiResponse.json();
        console.error('API error saving mockup:', {
          status: apiResponse.status,
          statusText: apiResponse.statusText,
          error: errorData.error,
          details: errorData.details,
          code: errorData.code,
          message: errorData.message
        });
        throw new Error(errorData.error || 'Failed to save mockup');
      }

      const result = await apiResponse.json();
      console.log('Mockup saved successfully:', result);

      showToast('Mockup saved successfully!', 'success');
      // Reset form
      setMockupName('');
    } catch (error) {
      console.error('Error saving mockup:', {
        error: error,
        message: error instanceof Error ? error.message : 'Unknown error',
        stack: error instanceof Error ? error.stack : undefined
      });
      showToast('Failed to save mockup', 'error');
    } finally {
      setSaving(false);
    }
  };

  return (
    <GmailLayout>
      <div className="max-w-full">
        <h2 className="text-3xl font-bold text-gray-900 mb-2">Asset Designer</h2>
        <p className="text-gray-600 mb-6">Create custom assets with your brands</p>

        <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
          {/* Control Panel */}
          <div className="lg:col-span-1 space-y-4">
            {/* Selection Section */}
            <DesignerSelectionPanel
              selectedBrand={selectedBrand}
              selectedTemplate={selectedTemplate}
              onShowBrandSelector={() => setShowLogoSelector(true)}
              onShowTemplateSelector={() => setShowTemplateSelector(true)}
            />

            {/* Position Controls */}
            {selectedBrand && (
              <DesignerPositionControls
                onMove={moveLogo}
                onSetPresetPosition={setPresetPosition}
              />
            )}

            {/* Size Controls */}
            {selectedBrand && (
              <DesignerSizeControls
                logoScale={logoScale}
                keepAspectRatio={keepAspectRatio}
                onScaleChange={updateLogoScale}
                onAspectRatioToggle={() => setKeepAspectRatio(!keepAspectRatio)}
              />
            )}

            {/* Visual Aids */}
            <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-4">
              <h3 className="font-semibold text-gray-900 mb-3">Visual Aids</h3>
              <button
                onClick={() => setShowGrid(!showGrid)}
                className={`flex items-center gap-2 px-3 py-2 rounded-lg transition-colors ${
                  showGrid ? 'bg-[#e5e7eb] text-[#1f2937]' : 'bg-gray-100 text-gray-700'
                }`}
              >
                <Grid className="h-4 w-4" />
                {showGrid ? 'Hide Grid' : 'Show Grid'}
              </button>
            </div>

            {/* Save Section */}
            {selectedBrand && selectedTemplate && (
              <DesignerSavePanel
                mockupName={mockupName}
                onMockupNameChange={setMockupName}
                folders={folders}
                selectedFolderId={selectedFolderId}
                onFolderSelect={setSelectedFolderId}
                onCreateFolder={() => setShowCreateFolderModal(true)}
                brands={brandGroups.map(b => ({ id: b.id, company_name: b.company_name, domain: b.domain }))}
                selectedBrandId={selectedBrandIdForSave}
                onBrandSelect={setSelectedBrandIdForSave}
                onSave={saveMockup}
                saving={saving}
                canSave={!!mockupName.trim()}
              />
            )}
          </div>

          {/* Canvas Area */}
          <div className="lg:col-span-3">
            <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
              <div ref={containerRef} className="flex justify-center">
                {selectedTemplate ? (
                  <div className="border-2 border-gray-300 rounded-lg overflow-hidden">
                    <KonvaCanvas
                      ref={canvasRef}
                      width={stageWidth}
                      height={stageHeight}
                      templateImage={templateImage}
                      logoImage={logoImage}
                      logoPosition={logoPosition}
                      logoSize={logoSize}
                      isSelected={isSelected}
                      showGrid={showGrid}
                      keepAspectRatio={keepAspectRatio}
                      onDragEnd={handleDragEnd}
                      onTransformEnd={handleTransformEnd}
                      onClick={() => setIsSelected(true)}
                      onDeselect={() => setIsSelected(false)}
                    />
                  </div>
                ) : (
                  <div className="flex flex-col items-center justify-center h-96 text-gray-400">
                    <CreditCard className="h-16 w-16 mb-4" />
                    <p>Select an asset template to begin</p>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>

        {/* Logo Selector Modal */}
        <DesignerBrandSelector
          isOpen={showLogoSelector}
          onClose={() => {
            setShowLogoSelector(false);
            setExpandedBrand(null);
          }}
          brandGroups={brandGroups}
          expandedBrand={expandedBrand}
          onExpandBrand={setExpandedBrand}
          onSelectBrand={loadBrandImage}
          getFormatColor={getFormatColor}
          getTypeColor={getTypeColor}
        />

        {/* Template Selector Modal */}
        {showTemplateSelector && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
            <div className="bg-white rounded-lg max-w-4xl w-full max-h-[80vh] overflow-hidden">
              <div className="p-6 border-b">
                <h3 className="text-xl font-semibold">Select an Asset Template</h3>
              </div>
              <div className="p-6 overflow-y-auto max-h-[60vh]">
                <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4">
                  {templates.map((template) => (
                    <button
                      key={template.id}
                      onClick={() => loadTemplateImage(template)}
                      className="border border-gray-200 rounded-lg hover:border-[#374151] hover:shadow-md transition-all overflow-hidden"
                    >
                      <img
                        src={template.template_url}
                        alt={template.template_name}
                        className="w-full h-32 object-cover"
                      />
                      <p className="p-2 text-sm text-gray-700 truncate">{template.template_name}</p>
                    </button>
                  ))}
                </div>
              </div>
              <div className="p-6 border-t">
                <button
                  onClick={() => setShowTemplateSelector(false)}
                  className="px-4 py-2 bg-gray-200 text-gray-700 rounded-lg hover:bg-gray-300"
                >
                  Cancel
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Toast Notifications */}
        {toasts.map(toast => (
          <Toast
            key={toast.id}
            message={toast.message}
            type={toast.type}
            onClose={() => removeToast(toast.id)}
          />
        ))}

        {/* Create Folder Modal */}
        <CreateFolderModal
          isOpen={showCreateFolderModal}
          onClose={() => setShowCreateFolderModal(false)}
          onSubmit={handleCreateFolder}
        />
      </div>
    </GmailLayout>
  );
}

export default function DesignerPage() {
  return (
    <Suspense
      fallback={
        <GmailLayout>
          <div className="flex h-screen items-center justify-center">
            <Loader2 className="h-8 w-8 animate-spin text-gray-400" />
          </div>
        </GmailLayout>
      }
    >
      <DesignerPageContent />
    </Suspense>
  );
}