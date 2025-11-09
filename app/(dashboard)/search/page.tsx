'use client';

import { useState, useEffect, Suspense } from 'react';
import { useSearchParams } from 'next/navigation';
import { useOrganization } from '@clerk/nextjs';
import BrandCard from '@/components/brand/BrandCard';
import BrandDetailModal from '@/components/brand/BrandDetailModal';
import Toast from '@/components/Toast';
import GmailLayout from '@/components/layout/GmailLayout';
import { Search, Loader2, Trash2 } from 'lucide-react';
import { supabase, Logo, Brand, LogoVariant } from '@/lib/supabase';

interface BrandLogo {
  type: string;
  theme?: string;
  formats: Array<{
    src: string;
    background?: string;
    format: string;
    height?: number;
    width?: number;
    size?: number;
  }>;
}

interface BrandData {
  name: string;
  domain: string;
  description?: string;
  logos: BrandLogo[];
  colors?: Array<{
    hex: string;
    type: string;
    brightness?: number;
  }>;
  fonts?: Array<{
    name: string;
    type: string;
    origin?: string;
  }>;
}

interface ToastMessage {
  message: string;
  type: 'success' | 'error';
  id: number;
}

// Helper component to handle search params
function SearchParamsHandler({ setMode }: { setMode: (mode: 'web' | 'library') => void }) {
  const searchParams = useSearchParams();

  useEffect(() => {
    const modeParam = searchParams.get('mode');
    if (modeParam === 'library') {
      setMode('library');
    }
  }, [searchParams, setMode]);

  return null;
}

function SearchPageContent() {
  const { organization, isLoaded } = useOrganization();
  const [mode, setMode] = useState<'web' | 'library'>('web');
  const [searchQuery, setSearchQuery] = useState('');
  const [loading, setLoading] = useState(false);
  const [brandData, setBrandData] = useState<BrandData | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [toasts, setToasts] = useState<ToastMessage[]>([]);

  // Library mode state
  const [brands, setBrands] = useState<Brand[]>([]);
  const [filteredBrands, setFilteredBrands] = useState<Brand[]>([]);
  const [filterType, setFilterType] = useState<string>('all');
  const [selectedBrand, setSelectedBrand] = useState<Brand | null>(null);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [deletingBrandId, setDeletingBrandId] = useState<string | null>(null);

  // Fetch brands when entering library mode and clear search
  useEffect(() => {
    console.log('Mode changed to:', mode);
    if (mode === 'library' && organization?.id) {
      console.log('Entering library mode - fetching brands...');
      setSearchQuery('');
      setBrandData(null);
      fetchBrands();
    }
  }, [mode, organization?.id]);

  // Filter brands when query or type changes
  useEffect(() => {
    filterBrands();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [searchQuery, filterType, brands]);

  const showToast = (message: string, type: 'success' | 'error') => {
    const id = Date.now();
    setToasts(prev => [...prev, { message, type, id }]);
  };

  const removeToast = (id: number) => {
    setToasts(prev => prev.filter(toast => toast.id !== id));
  };

  const fetchBrands = async () => {
    if (!organization?.id) {
      console.log('No organization - skipping fetch');
      return;
    }

    console.log('fetchBrands called - starting...');
    console.log('Organization ID:', organization.id);

    setLoading(true);
    try {
      // Fetch brands with related data (filtered by organization)
      console.log('Querying brands table...');
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

      console.log('Query result - data:', data, 'error:', error);

      if (error) {
        console.error('Supabase error:', error);
        throw error;
      }

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

      console.log('Enriched brands:', enrichedBrands);
      setBrands(enrichedBrands);

      if (!enrichedBrands || enrichedBrands.length === 0) {
        console.log('No brands found');
        showToast('No brands in library yet', 'error');
      }
    } catch (err) {
      console.error('Error fetching brands:', err);
      showToast('Failed to fetch brands', 'error');
    } finally {
      setLoading(false);
      console.log('fetchBrands finished');
    }
  };

  const filterBrands = () => {
    let filtered = [...brands];

    // Search filter
    if (searchQuery) {
      filtered = filtered.filter(
        (brand) =>
          brand.company_name.toLowerCase().includes(searchQuery.toLowerCase()) ||
          brand.domain.toLowerCase().includes(searchQuery.toLowerCase())
      );
    }

    setFilteredBrands(filtered);
  };

  const deleteLogo = async (id: string) => {
    try {
      const { error } = await supabase.from('logo_variants').delete().eq('id', id);
      if (error) throw error;
      fetchBrands(); // Refresh brands after deletion
    } catch (err) {
      console.error('Error deleting logo variant:', err);
      throw err;
    }
  };

  const deleteBrand = async (brandId: string, brandName: string) => {
    // Confirm deletion
    const confirmed = window.confirm(
      `Delete ${brandName}?\n\nThis will permanently remove:\n• All logo variants\n• Brand colors and fonts\n• Any mockups using these logos\n\nThis action cannot be undone.`
    );

    if (!confirmed) return;

    setDeletingBrandId(brandId);
    try {
      // Step 1: Fetch all logo variants for this brand to get their URLs
      const { data: logoVariants, error: fetchError } = await supabase
        .from('logo_variants')
        .select('logo_url')
        .eq('brand_id', brandId);

      if (fetchError) {
        console.error('Error fetching logo variants:', fetchError);
      }

      // Step 2: Delete logo files from storage
      if (logoVariants && logoVariants.length > 0) {
        const filesToDelete: string[] = [];

        logoVariants.forEach((variant) => {
          // Extract filename from public URL
          // URL format: https://[project].supabase.co/storage/v1/object/public/logos/filename.png
          const url = variant.logo_url;
          const match = url.match(/\/logos\/([^?]+)/);
          if (match && match[1]) {
            filesToDelete.push(match[1]);
          }
        });

        if (filesToDelete.length > 0) {
          const { error: storageError } = await supabase.storage
            .from('logos')
            .remove(filesToDelete);

          if (storageError) {
            console.error('Error deleting storage files:', storageError);
            // Don't fail the whole operation if storage cleanup fails
          }
        }
      }

      // Step 3: Delete the brand (will cascade delete logo_variants, colors, fonts, and mockups)
      const { error: deleteError } = await supabase
        .from('brands')
        .delete()
        .eq('id', brandId);

      if (deleteError) throw deleteError;

      showToast(`${brandName} deleted successfully`, 'success');
      fetchBrands(); // Refresh the list
    } catch (err) {
      console.error('Error deleting brand:', err);
      showToast(`Failed to delete ${brandName}`, 'error');
    } finally {
      setDeletingBrandId(null);
    }
  };

  const searchBrand = async () => {
    if (!searchQuery.trim()) return;

    setLoading(true);
    setError(null);
    setBrandData(null);

    try {
      const cleanQuery = searchQuery.trim().toLowerCase().replace(/https?:\/\//, '').replace(/www\./, '');
      const response = await fetch(`/api/brandfetch?domain=${encodeURIComponent(cleanQuery)}`);

      const result = await response.json();

      if (!response.ok || !result.success) {
        const errorMessage = result.error || 'Failed to fetch brand data';
        throw new Error(errorMessage);
      }

      // Extract data from the response structure { success: true, data: {...} }
      setBrandData(result.data);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'An error occurred');
    } finally {
      setLoading(false);
    }
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      if (mode === 'web') {
        searchBrand();
      }
    }
  };

  return (
    <GmailLayout>
      <Suspense fallback={null}>
        <SearchParamsHandler setMode={setMode} />
      </Suspense>
      <div className="max-w-7xl mx-auto">
        {/* Header with Toggle */}
        <div className="flex items-center justify-between mb-8">
          <h2 className="text-3xl font-bold text-gray-900">
            {mode === 'web' ? 'Search Brands' : 'Brand Library'}
          </h2>

          {/* Mode Toggle Switch */}
          <div className="bg-gray-200 rounded-full p-1 flex items-center gap-1">
            <button
              onClick={() => setMode('web')}
              className={`px-4 py-2 rounded-full font-medium transition-all ${
                mode === 'web'
                  ? 'bg-white text-gray-900 shadow-sm'
                  : 'text-gray-600 hover:text-gray-900'
              }`}
            >
              Search Web
            </button>
            <button
              onClick={() => setMode('library')}
              className={`px-4 py-2 rounded-full font-medium transition-all ${
                mode === 'library'
                  ? 'bg-white text-gray-900 shadow-sm'
                  : 'text-gray-600 hover:text-gray-900'
              }`}
            >
              My Library
            </button>
          </div>
        </div>

        {/* Unified Search Bar */}
        <div className="mb-8">
          <div className="relative">
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              onKeyPress={handleKeyPress}
              placeholder={
                mode === 'web'
                  ? 'Enter company domain (e.g., apple.com) or name...'
                  : 'Search by company name or domain...'
              }
              className="w-full px-4 py-3 pl-12 pr-32 text-gray-900 bg-white border border-gray-300 rounded-lg focus:outline-none focus:border-[#374151] focus:ring-2 focus:ring-[#a5b4fc] transition-all"
            />
            <Search className="absolute left-4 top-3.5 h-5 w-5 text-gray-400" />
            {mode === 'web' && (
              <button
                onClick={searchBrand}
                disabled={loading || !searchQuery.trim()}
                className="absolute right-2 top-2 px-4 py-1.5 bg-[#374151] text-white rounded-md hover:bg-[#1f2937] disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
              >
                {loading ? (
                  <Loader2 className="h-5 w-5 animate-spin" />
                ) : (
                  'Search'
                )}
              </button>
            )}
          </div>
        </div>


        {/* Error Message (Web Mode) */}
        {error && (
          <div className="mb-6 p-4 bg-red-50 border border-red-200 rounded-lg text-red-700">
            {error}
          </div>
        )}

        {/* Web Mode - Search Results */}
        {mode === 'web' && (
          <>
            {/* Brand Results */}
            {brandData && (
              <div className="space-y-6">
                {/* Brand Info */}
                <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
                  <h3 className="text-xl font-semibold text-gray-900 mb-2">
                    {brandData.name}
                  </h3>
                  <p className="text-gray-600 mb-2">{brandData.domain}</p>
                  {brandData.description && (
                    <p className="text-gray-500 text-sm">{brandData.description}</p>
                  )}
                </div>

                {/* Logos Grid */}
                <div className="space-y-8">
                  {(brandData.logos || []).map((logoGroup, groupIdx) => (
                    <div key={groupIdx} className="space-y-4">
                      <h3 className="text-lg font-semibold text-gray-800 capitalize">
                        {logoGroup.type} Brands {logoGroup.theme && `- ${logoGroup.theme} theme`}
                      </h3>
                      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
                        {(logoGroup.formats || []).map((format, formatIdx) => (
                          <BrandCard
                            key={`${groupIdx}-${formatIdx}`}
                            logoUrl={format.src}
                            format={format.format}
                            type={logoGroup.type}
                            theme={logoGroup.theme}
                            width={format.width}
                            height={format.height}
                            size={format.size}
                            background={format.background}
                            companyName={brandData.name}
                            domain={brandData.domain}
                            description={brandData.description}
                            brandColors={brandData.colors}
                            brandFonts={brandData.fonts?.map(f => ({ name: f.name, type: f.type, origin: f.origin }))}
                            allLogos={brandData.logos}
                            organizationId={organization?.id}
                            showToast={showToast}
                          />
                        ))}
                      </div>
                    </div>
                  ))}
                </div>

                {/* Brand Colors */}
                {brandData.colors && brandData.colors.length > 0 && (
                  <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
                    <h3 className="text-lg font-semibold text-gray-900 mb-4">
                      Brand Colors
                    </h3>
                    <div className="flex flex-wrap gap-4">
                      {(brandData.colors || []).map((color, idx) => (
                        <div key={idx} className="group">
                          <div
                            className="w-20 h-20 rounded-lg shadow-md mb-2 cursor-pointer transition-transform hover:scale-105"
                            style={{ backgroundColor: color.hex }}
                            onClick={() => {
                              navigator.clipboard.writeText(color.hex);
                              showToast(`Copied ${color.hex}`, 'success');
                            }}
                            title="Click to copy"
                          ></div>
                          <p className="text-xs font-medium text-gray-700 text-center">
                            {color.hex}
                          </p>
                          <p className="text-xs text-gray-500 capitalize text-center">
                            {color.type}
                          </p>
                        </div>
                      ))}
                    </div>
                    <p className="text-xs text-gray-400 mt-4">Click any color to copy its hex code</p>
                  </div>
                )}
              </div>
            )}

            {/* Empty State */}
            {!loading && !brandData && !error && (
              <div className="text-center py-12">
                <div className="w-20 h-20 mx-auto mb-4 bg-gray-100 rounded-full flex items-center justify-center">
                  <Search className="h-10 w-10 text-gray-400" />
                </div>
                <h3 className="text-lg font-medium text-gray-900 mb-2">Search for company brands</h3>
                <p className="text-gray-500">
                  Enter a company domain or name to find their brand assets
                </p>
                <div className="mt-6 flex flex-wrap justify-center gap-2">
                  <button
                    onClick={() => { setSearchQuery('apple.com'); }}
                    className="px-3 py-1 bg-gray-100 text-gray-700 rounded-md hover:bg-gray-200 text-sm"
                  >
                    Try Apple
                  </button>
                  <button
                    onClick={() => { setSearchQuery('nike.com'); }}
                    className="px-3 py-1 bg-gray-100 text-gray-700 rounded-md hover:bg-gray-200 text-sm"
                  >
                    Try Nike
                  </button>
                  <button
                    onClick={() => { setSearchQuery('spotify.com'); }}
                    className="px-3 py-1 bg-gray-100 text-gray-700 rounded-md hover:bg-gray-200 text-sm"
                  >
                    Try Spotify
                  </button>
                </div>
              </div>
            )}
          </>
        )}

        {/* Library Mode - Saved Brands */}
        {mode === 'library' && (
          <>
            {loading ? (
              <div className="flex items-center justify-center h-64">
                <div className="text-gray-500">Loading brands...</div>
              </div>
            ) : filteredBrands.length === 0 ? (
              <div className="bg-white rounded-lg shadow p-12 text-center">
                <p className="text-gray-500 mb-4">
                  {searchQuery
                    ? 'No brands found matching your search.'
                    : 'No brands saved yet. Start by searching for company brands!'}
                </p>
                {!searchQuery && (
                  <button
                    onClick={() => setMode('web')}
                    className="inline-block px-4 py-2 bg-[#374151] text-white rounded-md hover:bg-[#1f2937] transition-colors"
                  >
                    Search Brands
                  </button>
                )}
              </div>
            ) : (
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

                      {/* Card Content - Now clickable */}
                      <button
                        onClick={() => {
                          setSelectedBrand(brand);
                          setIsModalOpen(true);
                        }}
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
            )}

            {/* Brand Detail Modal */}
            {selectedBrand && (
              <BrandDetailModal
                brand={selectedBrand}
                isOpen={isModalOpen}
                onClose={() => setIsModalOpen(false)}
                onSelectLogo={(logo: LogoVariant) => {
                  // TODO: Handle logo selection for mockup designer
                  console.log('Selected logo:', logo);
                }}
              />
            )}
          </>
        )}
      </div>

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

// Export with Suspense wrapper for useSearchParams
export default function SearchPage() {
  return <SearchPageContent />;
}
