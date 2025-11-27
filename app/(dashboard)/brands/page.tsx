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
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="flex items-center justify-between mb-8">
          <h2 className="text-3xl font-bold text-gray-900">Brands</h2>
        </div>

        {/* Search Bar */}
        <div className="mb-8">
          <div className="relative">
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search your brands or find new ones via Brandfetch..."
              className="w-full px-4 py-3 pl-12 text-gray-900 bg-white border border-gray-300 rounded-lg focus:outline-none focus:border-purple-600 focus:ring-2 focus:ring-purple-200 transition-all"
            />
            <Search className="absolute left-4 top-3.5 h-5 w-5 text-gray-400" />
            {searchingBrandfetch && (
              <Loader2 className="absolute right-4 top-3.5 h-5 w-5 text-purple-600 animate-spin" />
            )}
          </div>
          {searchQuery.trim().length >= 2 && filteredBrands.length === 0 && !searchingBrandfetch && !brandfetchResults && !brandfetchError && (
            <p className="text-sm text-gray-500 mt-2 flex items-center gap-1">
              <Globe size={14} />
              Searching Brandfetch...
            </p>
          )}
        </div>

        {/* Brandfetch Results */}
        {brandfetchResults && filteredBrands.length === 0 && (
          <div className="mb-8">
            <div className="flex items-center gap-2 mb-4">
              <Globe size={18} className="text-purple-600" />
              <h3 className="text-lg font-medium text-gray-900">Found via Brandfetch</h3>
            </div>
            <div className="bg-purple-50 border border-purple-200 rounded-lg p-6">
              <div className="flex items-start gap-6">
                {/* Logo Preview */}
                <div className="w-24 h-24 bg-white rounded-lg flex items-center justify-center p-3 border border-purple-100">
                  {getBrandfetchLogoPreview() ? (
                    <img
                      src={getBrandfetchLogoPreview()!}
                      alt={brandfetchResults.name}
                      className="max-w-full max-h-full object-contain"
                    />
                  ) : (
                    <Package className="h-10 w-10 text-gray-400" />
                  )}
                </div>

                {/* Brand Info */}
                <div className="flex-1">
                  <h4 className="text-xl font-semibold text-gray-900">{brandfetchResults.name}</h4>
                  <p className="text-sm text-gray-600 mb-2">{brandfetchResults.domain}</p>
                  {brandfetchResults.description && (
                    <p className="text-sm text-gray-600 line-clamp-2 mb-3">{brandfetchResults.description}</p>
                  )}

                  {/* Color Preview */}
                  {brandfetchResults.colors && brandfetchResults.colors.length > 0 && (
                    <div className="flex gap-2 mb-4">
                      {brandfetchResults.colors.slice(0, 5).map((color, idx) => (
                        <div
                          key={idx}
                          className="w-6 h-6 rounded-full border border-gray-300"
                          style={{ backgroundColor: color.hex }}
                          title={color.hex}
                        />
                      ))}
                    </div>
                  )}

                  <button
                    onClick={handleSaveBrandfetchBrand}
                    disabled={savingBrand}
                    className="flex items-center gap-2 px-4 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    {savingBrand ? (
                      <>
                        <Loader2 className="h-4 w-4 animate-spin" />
                        Saving...
                      </>
                    ) : (
                      <>
                        <Plus size={18} />
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
          <div className="mb-8 p-4 bg-gray-50 border border-gray-200 rounded-lg">
            <p className="text-gray-600 text-sm">{brandfetchError}</p>
          </div>
        )}

        {/* Content */}
        {loading ? (
          <div className="flex items-center justify-center h-64">
            <Loader2 className="h-8 w-8 animate-spin text-purple-600" />
          </div>
        ) : filteredBrands.length === 0 && !brandfetchResults ? (
          <div className="bg-white rounded-lg shadow p-12 text-center">
            <div className="w-20 h-20 mx-auto mb-4 bg-gray-100 rounded-full flex items-center justify-center">
              <Package className="h-10 w-10 text-gray-400" />
            </div>
            <h3 className="text-lg font-medium text-gray-900 mb-2">
              {searchQuery ? 'No brands found' : 'No brands saved yet'}
            </h3>
            <p className="text-gray-500 mb-6">
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
              <p className="text-sm text-gray-500 mb-4">
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
                    className="relative text-left bg-white rounded-lg shadow-sm border border-gray-200 overflow-hidden hover:shadow-lg hover:border-gray-300 transition-all group"
                  >
                    {/* Delete Button */}
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        deleteBrand(brand.id, brand.company_name);
                      }}
                      disabled={isDeleting}
                      className="absolute top-2 right-2 z-10 p-2 bg-white rounded-full shadow-md opacity-0 group-hover:opacity-100 transition-opacity hover:bg-red-50 disabled:opacity-50 disabled:cursor-not-allowed"
                      title="Delete brand"
                    >
                      {isDeleting ? (
                        <Loader2 className="h-4 w-4 text-red-600 animate-spin" />
                      ) : (
                        <Trash2 className="h-4 w-4 text-red-600" />
                      )}
                    </button>

                    {/* Card Content */}
                    <button
                      onClick={() => handleOpenBrandModal(brand)}
                      disabled={isDeleting}
                      className="w-full text-left disabled:opacity-50"
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
                          <h3 className="font-semibold text-gray-900 text-lg">
                            {brand.company_name}
                          </h3>
                          <p className="text-sm text-gray-600">{brand.domain}</p>
                        </div>

                        {brand.description && (
                          <p className="text-sm text-gray-600 line-clamp-2">
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
          </>
        ) : null}

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
