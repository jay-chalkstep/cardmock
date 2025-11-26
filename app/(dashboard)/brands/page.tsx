'use client';

import { useState, useEffect } from 'react';
import { useOrganization } from '@/lib/hooks/useAuth';
import { useRouter } from 'next/navigation';
import Toast from '@/components/Toast';
import GmailLayout from '@/components/layout/GmailLayout';
import { Search, Loader2, Trash2, Package } from 'lucide-react';
import { supabase, Brand } from '@/lib/supabase';
import { deleteBrand as deleteBrandAction } from '@/app/actions/brands';

interface ToastMessage {
  message: string;
  type: 'success' | 'error';
  id: number;
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

  // Fetch brands on mount
  useEffect(() => {
    if (organization?.id) {
      fetchBrands();
    }
  }, [organization?.id]);

  // Filter brands when query changes
  useEffect(() => {
    filterBrands();
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

  return (
    <GmailLayout>
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="flex items-center justify-between mb-8">
          <h2 className="text-3xl font-bold text-gray-900">Brand Library</h2>
          <button
            onClick={() => router.push('/library?tab=brands')}
            className="px-4 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 transition-colors"
          >
            View Library
          </button>
        </div>

        {/* Search Bar */}
        <div className="mb-8">
          <div className="relative">
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search by company name or domain..."
              className="w-full px-4 py-3 pl-12 text-gray-900 bg-white border border-gray-300 rounded-lg focus:outline-none focus:border-purple-600 focus:ring-2 focus:ring-purple-200 transition-all"
            />
            <Search className="absolute left-4 top-3.5 h-5 w-5 text-gray-400" />
          </div>
        </div>

        {/* Content */}
        {loading ? (
          <div className="flex items-center justify-center h-64">
            <Loader2 className="h-8 w-8 animate-spin text-purple-600" />
          </div>
        ) : filteredBrands.length === 0 ? (
          <div className="bg-white rounded-lg shadow p-12 text-center">
            <div className="w-20 h-20 mx-auto mb-4 bg-gray-100 rounded-full flex items-center justify-center">
              <Package className="h-10 w-10 text-gray-400" />
            </div>
            <h3 className="text-lg font-medium text-gray-900 mb-2">
              {searchQuery ? 'No brands found' : 'No brands saved yet'}
            </h3>
            <p className="text-gray-500 mb-6">
              {searchQuery
                ? 'No brands matching your search.'
                : 'Start by searching for company brands!'}
            </p>
            {!searchQuery && (
              <button
                onClick={() => router.push('/library?tab=brands')}
                className="px-4 py-2 bg-purple-600 text-white rounded-md hover:bg-purple-700 transition-colors"
              >
                View Library
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

                  {/* Card Content */}
                  <button
                    onClick={() => router.push(`/brands/${brand.id}`)}
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
