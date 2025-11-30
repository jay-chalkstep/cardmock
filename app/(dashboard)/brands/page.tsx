'use client';

import { useState, useEffect, useCallback } from 'react';
import { useOrganization } from '@/lib/hooks/useAuth';
import { useRouter } from 'next/navigation';
import Toast from '@/components/Toast';
import GmailLayout from '@/components/layout/GmailLayout';
import BrandAssetModal from '@/components/brand/BrandAssetModal';
import { Search, Loader2, Trash2, Package, Plus, Globe } from 'lucide-react';
import { supabase, Brand } from '@/lib/supabase';
import { deleteBrand as deleteBrandAction, saveBrand } from '@/app/actions/brands';

interface ToastMessage {
  message: string;
  type: 'success' | 'error';
  id: number;
}

interface BrandfetchResult {
  name: string;
  domain: string;
  description?: string;
  logos: Array<{
    type: string;
    theme?: string;
    formats: Array<{
      src: string;
      format: string;
      width?: number;
      height?: number;
      size?: number;
      background?: string;
    }>;
  }>;
  colors: Array<{ hex: string; type?: string; brightness?: number }>;
  fonts: Array<{ name: string; type?: string; origin?: string }>;
}

export default function BrandsPage() {
  const { organization, isLoaded } = useOrganization();
  const router = useRouter();
  const [searchQuery, setSearchQuery] = useState('');
  const [loading, setLoading] = useState(true);
  const [toasts, setToasts] = useState<ToastMessage[]>([]);

  // Library state
  const [brands, setBrands] = useState<Brand[]>([]);
  const [filteredBrands, setFilteredBrands] = useState<Brand[]>([]);
  const [deletingBrandId, setDeletingBrandId] = useState<string | null>(null);

  // Brandfetch state
  const [brandfetchResults, setBrandfetchResults] = useState<BrandfetchResult | null>(null);
  const [searchingBrandfetch, setSearchingBrandfetch] = useState(false);
  const [brandfetchError, setBrandfetchError] = useState<string | null>(null);
  const [savingBrand, setSavingBrand] = useState(false);

  // Modal state
  const [selectedBrand, setSelectedBrand] = useState<Brand | null>(null);
  const [isModalOpen, setIsModalOpen] = useState(false);

  // Fetch brands on mount
  useEffect(() => {
    if (organization?.id) {
      fetchBrands();
    }
  }, [organization?.id]);

  // Filter brands and search Brandfetch when query changes
  useEffect(() => {
    filterBrands();
  }, [searchQuery, brands]);

  // Debounced Brandfetch search when no local results
  useEffect(() => {
    const trimmedQuery = searchQuery.trim();

    // Clear Brandfetch results if query is too short
    if (trimmedQuery.length < 2) {
      setBrandfetchResults(null);
      setBrandfetchError(null);
      return;
    }

    // Only search Brandfetch if no local results match
    const hasLocalResults = brands.some(
      (brand) =>
        brand.company_name.toLowerCase().includes(trimmedQuery.toLowerCase()) ||
        brand.domain.toLowerCase().includes(trimmedQuery.toLowerCase())
    );

    if (hasLocalResults) {
      setBrandfetchResults(null);
      setBrandfetchError(null);
      return;
    }

    // Debounce the Brandfetch search
    const timeoutId = setTimeout(() => {
      searchBrandfetch(trimmedQuery);
    }, 500);

    return () => clearTimeout(timeoutId);
  }, [searchQuery, brands]);

  const showToast = (message: string, type: 'success' | 'error') => {
    const id = Date.now();
    setToasts(prev => [...prev, { message, type, id }]);
  };

  const removeToast = (id: number) => {
    setToasts(prev => prev.filter(toast => toast.id !== id));
  };

  const fetchBrands = async () => {
    if (!organization?.id) return;

    setLoading(true);
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

      // Enrich brands with primary_logo_variant data
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
      setLoading(false);
    }
  };

  const filterBrands = () => {
    let filtered = [...brands];

    if (searchQuery) {
      filtered = filtered.filter(
        (brand) =>
          brand.company_name.toLowerCase().includes(searchQuery.toLowerCase()) ||
          brand.domain.toLowerCase().includes(searchQuery.toLowerCase())
      );
    }

    setFilteredBrands(filtered);
  };

  const searchBrandfetch = async (query: string) => {
    setSearchingBrandfetch(true);
    setBrandfetchError(null);
    setBrandfetchResults(null);

    try {
      const response = await fetch(`/api/brandfetch?domain=${encodeURIComponent(query)}`);
      const data = await response.json();

      if (!response.ok) {
        if (response.status === 404) {
          setBrandfetchError(`No brand found for "${query}". Try a company domain like "apple.com"`);
        } else {
          setBrandfetchError(data.message || 'Failed to search Brandfetch');
        }
        return;
      }

      if (data.success && data.data) {
        setBrandfetchResults(data.data);
      }
    } catch (err) {
      console.error('Brandfetch search error:', err);
      setBrandfetchError('Failed to search Brandfetch');
    } finally {
      setSearchingBrandfetch(false);
    }
  };

  const handleSaveBrandfetchBrand = async () => {
    if (!brandfetchResults) return;

    setSavingBrand(true);
    try {
      // Get the first logo for the primary variant
      const primaryLogo = brandfetchResults.logos?.[0]?.formats?.[0];

      if (!primaryLogo) {
        showToast('No logo available to save', 'error');
        return;
      }

      const result = await saveBrand({
        companyName: brandfetchResults.name,
        domain: brandfetchResults.domain,
        description: brandfetchResults.description,
        logoUrl: primaryLogo.src,
        allLogos: brandfetchResults.logos,
        brandColors: brandfetchResults.colors,
        brandFonts: brandfetchResults.fonts,
        logoType: brandfetchResults.logos?.[0]?.type || 'logo',
        logoFormat: primaryLogo.format,
        logoTheme: brandfetchResults.logos?.[0]?.theme,
        logoWidth: primaryLogo.width,
        logoHeight: primaryLogo.height,
        logoSize: primaryLogo.size,
      });

      if (result.error) {
        throw new Error(result.error);
      }

      showToast(`${brandfetchResults.name} added to your library`, 'success');
      setBrandfetchResults(null);
      setSearchQuery('');
      fetchBrands();
    } catch (err) {
      console.error('Error saving brand:', err);
      showToast('Failed to save brand', 'error');
    } finally {
      setSavingBrand(false);
    }
  };

  const deleteBrand = async (brandId: string, brandName: string) => {
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

  // Get primary logo preview from Brandfetch result
  const getBrandfetchLogoPreview = () => {
    if (!brandfetchResults?.logos?.length) return null;
    const logo = brandfetchResults.logos.find(l => l.type === 'logo' || l.type === 'symbol');
    const format = logo?.formats?.find(f => f.format === 'png' || f.format === 'svg');
    return format?.src || brandfetchResults.logos[0]?.formats?.[0]?.src;
  };

  // Handle opening brand modal
  const handleOpenBrandModal = (brand: Brand) => {
    setSelectedBrand(brand);
    setIsModalOpen(true);
  };

  // Handle closing brand modal
  const handleCloseBrandModal = () => {
    setIsModalOpen(false);
    setSelectedBrand(null);
  };

  // Handle editing brand (navigate to edit page)
  const handleEditBrand = () => {
    if (selectedBrand) {
      router.push(`/brands/${selectedBrand.id}/edit`);
    }
  };

  return (
    <GmailLayout>
      <div className="h-full flex flex-col">
        {/* Header */}
        <div className="bg-[var(--bg-elevated)] border-b border-[var(--border-default)] px-6 py-4">
          <h1 className="text-[18px] font-semibold text-[var(--text-primary)]">Brands</h1>
          <p className="text-[13px] text-[var(--text-secondary)] mt-1">Manage your brand assets and logos</p>
        </div>

        {/* Search Bar */}
        <div className="bg-[var(--bg-elevated)] border-b border-[var(--border-default)] px-6 py-4">
          <div className="relative max-w-xl">
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search your brands or find new ones via Brandfetch..."
              className="w-full px-4 py-2.5 pl-10 text-[13px]
                         text-[var(--text-primary)] bg-[var(--bg-surface)]
                         border border-[var(--border-default)] rounded-[var(--radius-md)]
                         focus:outline-none focus:border-[var(--border-focus)]
                         placeholder:text-[var(--text-tertiary)]"
            />
            <Search className="absolute left-3 top-3 h-4 w-4 text-[var(--text-tertiary)]" />
            {searchingBrandfetch && (
              <Loader2 className="absolute right-3 top-3 h-4 w-4 text-[var(--accent-primary)] animate-spin" />
            )}
          </div>
          {searchQuery.trim().length >= 2 && filteredBrands.length === 0 && !searchingBrandfetch && !brandfetchResults && !brandfetchError && (
            <p className="text-[11px] text-[var(--text-tertiary)] mt-2 flex items-center gap-1">
              <Globe size={12} />
              Searching Brandfetch...
            </p>
          )}
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-6">
          {/* Brandfetch Results */}
          {brandfetchResults && filteredBrands.length === 0 && (
            <div className="mb-8">
              <div className="flex items-center gap-2 mb-4">
                <Globe size={16} className="text-[var(--accent-primary)]" />
                <h3 className="text-[14px] font-medium text-[var(--text-primary)]">Found via Brandfetch</h3>
              </div>
              <div className="bg-[var(--status-info-muted)] border border-[var(--accent-primary)]/20 rounded-[var(--radius-lg)] p-6">
                <div className="flex items-start gap-6">
                  {/* Logo Preview */}
                  <div className="w-20 h-20 bg-[var(--bg-elevated)] rounded-[var(--radius-md)]
                                  flex items-center justify-center p-3 border border-[var(--border-default)]">
                    {getBrandfetchLogoPreview() ? (
                      <img
                        src={getBrandfetchLogoPreview()!}
                        alt={brandfetchResults.name}
                        className="max-w-full max-h-full object-contain"
                      />
                    ) : (
                      <Package className="h-8 w-8 text-[var(--text-tertiary)]" />
                    )}
                  </div>

                  {/* Brand Info */}
                  <div className="flex-1">
                    <h4 className="text-[16px] font-semibold text-[var(--text-primary)]">{brandfetchResults.name}</h4>
                    <p className="text-[13px] text-[var(--text-secondary)] mb-2">{brandfetchResults.domain}</p>
                    {brandfetchResults.description && (
                      <p className="text-[13px] text-[var(--text-secondary)] line-clamp-2 mb-3">{brandfetchResults.description}</p>
                    )}

                    {/* Color Preview */}
                    {brandfetchResults.colors && brandfetchResults.colors.length > 0 && (
                      <div className="flex gap-2 mb-4">
                        {brandfetchResults.colors.slice(0, 5).map((color, idx) => (
                          <div
                            key={idx}
                            className="w-5 h-5 rounded-full border border-[var(--border-default)]"
                            style={{ backgroundColor: color.hex }}
                            title={color.hex}
                          />
                        ))}
                      </div>
                    )}

                    <button
                      onClick={handleSaveBrandfetchBrand}
                      disabled={savingBrand}
                      className="flex items-center gap-2 px-4 py-2
                                 bg-[var(--accent-primary)] text-white text-[13px] font-medium
                                 rounded-[var(--radius-sm)] hover:bg-[var(--accent-primary-hover)]
                                 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                      {savingBrand ? (
                        <>
                          <Loader2 className="h-4 w-4 animate-spin" />
                          Saving...
                        </>
                      ) : (
                        <>
                          <Plus size={16} />
                          Add to Library
                        </>
                      )}
                    </button>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* Brandfetch Error */}
          {brandfetchError && filteredBrands.length === 0 && (
            <div className="mb-8 p-4 bg-[var(--bg-surface)] border border-[var(--border-default)] rounded-[var(--radius-lg)]">
              <p className="text-[var(--text-secondary)] text-[13px]">{brandfetchError}</p>
            </div>
          )}

          {/* Loading State */}
          {loading ? (
            <div className="flex items-center justify-center h-64">
              <Loader2 className="h-8 w-8 animate-spin text-[var(--accent-primary)]" />
            </div>
          ) : filteredBrands.length === 0 && !brandfetchResults ? (
            <div className="bg-[var(--bg-elevated)] rounded-[var(--radius-lg)] border border-[var(--border-default)] p-12 text-center">
              <div className="w-16 h-16 mx-auto mb-4 bg-[var(--bg-surface)] rounded-full flex items-center justify-center">
                <Package className="h-8 w-8 text-[var(--text-tertiary)]" />
              </div>
              <h3 className="text-[16px] font-medium text-[var(--text-primary)] mb-2">
                {searchQuery ? 'No brands found' : 'No brands saved yet'}
              </h3>
              <p className="text-[var(--text-secondary)] text-[13px]">
                {searchQuery
                  ? searchingBrandfetch
                    ? 'Searching Brandfetch...'
                    : brandfetchError || 'Try searching for a company domain like "apple.com" or "nike.com"'
                  : 'Search for brands by name or domain. We\'ll check your library first, then search Brandfetch if needed.'}
              </p>
            </div>
          ) : filteredBrands.length > 0 ? (
            <>
              {searchQuery && (
                <p className="text-[11px] text-[var(--text-tertiary)] mb-4">
                  {filteredBrands.length} brand{filteredBrands.length !== 1 ? 's' : ''} in your library
                </p>
              )}
              <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-6">
                {filteredBrands.map((brand) => {
                  const primaryLogo = brand.primary_logo_variant;
                  const colorPreview = brand.brand_colors?.slice(0, 3) || [];
                  const isDeleting = deletingBrandId === brand.id;

                  return (
                    <div
                      key={brand.id}
                      className="relative text-left bg-[var(--bg-elevated)] rounded-[var(--radius-lg)]
                                 border border-[var(--border-default)] overflow-hidden
                                 hover:shadow-[var(--shadow-md)] hover:border-[var(--border-focus)]/30
                                 transition-all group"
                    >
                      {/* Delete Button */}
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          deleteBrand(brand.id, brand.company_name);
                        }}
                        disabled={isDeleting}
                        className="absolute top-2 right-2 z-10 p-2 bg-[var(--bg-elevated)]
                                   rounded-full shadow-[var(--shadow-sm)] opacity-0 group-hover:opacity-100
                                   transition-opacity hover:bg-[var(--status-error-muted)]
                                   disabled:opacity-50 disabled:cursor-not-allowed"
                        title="Delete brand"
                      >
                        {isDeleting ? (
                          <Loader2 className="h-4 w-4 text-[var(--status-error)] animate-spin" />
                        ) : (
                          <Trash2 className="h-4 w-4 text-[var(--status-error)]" />
                        )}
                      </button>

                      {/* Card Content */}
                      <button
                        onClick={() => handleOpenBrandModal(brand)}
                        disabled={isDeleting}
                        className="w-full text-left disabled:opacity-50"
                      >
                        {/* Logo preview */}
                        <div className="h-36 bg-[var(--bg-surface)] flex items-center justify-center p-4
                                        group-hover:bg-[var(--bg-base)] transition-colors">
                          {primaryLogo ? (
                            <img
                              src={primaryLogo.logo_url}
                              alt={brand.company_name}
                              className="max-h-full max-w-full object-contain"
                            />
                          ) : (
                            <div className="text-[var(--text-tertiary)] text-center">
                              <p className="text-[13px]">No brand assets</p>
                            </div>
                          )}
                        </div>

                        {/* Brand info */}
                        <div className="p-4 space-y-3">
                          <div>
                            <h3 className="font-semibold text-[var(--text-primary)] text-[14px]">
                              {brand.company_name}
                            </h3>
                            <p className="text-[13px] text-[var(--text-secondary)]">{brand.domain}</p>
                          </div>

                          {brand.description && (
                            <p className="text-[13px] text-[var(--text-secondary)] line-clamp-2">
                              {brand.description}
                            </p>
                          )}

                          {/* Color preview */}
                          {colorPreview.length > 0 && (
                            <div className="flex gap-2 pt-2">
                              {colorPreview.map((color, idx) => (
                                <div
                                  key={idx}
                                  className="w-5 h-5 rounded-full border border-[var(--border-default)]"
                                  style={{ backgroundColor: color.hex }}
                                  title={color.hex}
                                />
                              ))}
                              {brand.brand_colors && brand.brand_colors.length > 3 && (
                                <div className="flex items-center justify-center w-5 h-5
                                                text-[11px] text-[var(--text-tertiary)]">
                                  +{brand.brand_colors.length - 3}
                                </div>
                              )}
                            </div>
                          )}

                          {/* Brand variant count */}
                          <p className="text-[11px] text-[var(--text-tertiary)] pt-2">
                            {brand.logo_variants?.length || 0} brand variant{brand.logo_variants?.length !== 1 ? 's' : ''}
                          </p>
                        </div>
                      </button>
                    </div>
                  );
                })}
              </div>
            </>
          ) : null}
        </div>
      </div>

      {/* Brand Asset Modal */}
      {selectedBrand && (
        <BrandAssetModal
          brand={selectedBrand}
          isOpen={isModalOpen}
          onClose={handleCloseBrandModal}
          onEdit={handleEditBrand}
        />
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
    </GmailLayout>
  );
}
