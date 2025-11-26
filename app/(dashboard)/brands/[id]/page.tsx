'use client';

import { useState, useEffect } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { useOrganization } from '@/lib/hooks/useAuth';
import GmailLayout from '@/components/layout/GmailLayout';
import MockupGridCard from '@/components/mockups/MockupGridCard';
import Toast from '@/components/Toast';
import { supabase, Brand, LogoVariant } from '@/lib/supabase';
import {
  ArrowLeft,
  Plus,
  Loader2,
  Globe,
  Palette,
  Image as ImageIcon,
  Package
} from 'lucide-react';
import LogoVariantSelectorModal from '@/components/brand/LogoVariantSelectorModal';

interface Asset {
  id: string;
  name?: string;
  mockup_name?: string;
  preview_url?: string;
  mockup_image_url?: string;
  updated_at: string;
  created_at: string;
}

interface ToastMessage {
  message: string;
  type: 'success' | 'error';
  id: number;
}

export default function BrandDetailPage() {
  const params = useParams();
  const router = useRouter();
  const brandId = params.id as string;
  const { organization, isLoaded } = useOrganization();

  const [brand, setBrand] = useState<Brand | null>(null);
  const [assets, setAssets] = useState<Asset[]>([]);
  const [loading, setLoading] = useState(true);
  const [toasts, setToasts] = useState<ToastMessage[]>([]);
  const [showLogoSelector, setShowLogoSelector] = useState(false);

  const showToast = (message: string, type: 'success' | 'error') => {
    const id = Date.now();
    setToasts(prev => [...prev, { message, type, id }]);
  };

  const removeToast = (id: number) => {
    setToasts(prev => prev.filter(toast => toast.id !== id));
  };

  // Fetch brand and its assets
  useEffect(() => {
    if (organization?.id && brandId) {
      fetchBrandData();
    }
  }, [organization?.id, brandId]);

  const fetchBrandData = async () => {
    if (!organization?.id) return;

    setLoading(true);
    try {
      // Fetch brand with related data
      const { data: brandData, error: brandError } = await supabase
        .from('brands')
        .select(`
          *,
          logo_variants!brand_id(*),
          brand_colors!brand_id(*),
          brand_fonts!brand_id(*)
        `)
        .eq('id', brandId)
        .eq('organization_id', organization.id)
        .single();

      if (brandError) throw brandError;

      // Enrich with primary logo variant
      const primaryLogoVariant = brandData.logo_variants?.find(
        (logo: LogoVariant) => logo.id === brandData.primary_logo_variant_id
      );
      setBrand({
        ...brandData,
        primary_logo_variant: primaryLogoVariant,
      });

      // Fetch assets (CardMocks) for this brand
      // Assets link to brands through logo_variants: assets.logo_id -> logo_variants.id -> logo_variants.brand_id
      const logoVariantIds = brandData.logo_variants?.map((lv: LogoVariant) => lv.id) || [];

      if (logoVariantIds.length > 0) {
        const { data: assetsData, error: assetsError } = await supabase
          .from('assets')
          .select('*')
          .in('logo_id', logoVariantIds)
          .eq('organization_id', organization.id)
          .order('updated_at', { ascending: false });

        if (assetsError) throw assetsError;
        setAssets(assetsData || []);
      } else {
        setAssets([]);
      }
    } catch (err) {
      console.error('Error fetching brand data:', err);
      showToast('Failed to load brand', 'error');
    } finally {
      setLoading(false);
    }
  };

  const handleDeleteAsset = async (assetId: string) => {
    const confirmed = window.confirm('Delete this CardMock? This action cannot be undone.');
    if (!confirmed) return;

    try {
      const { error } = await supabase
        .from('assets')
        .delete()
        .eq('id', assetId);

      if (error) throw error;

      setAssets(prev => prev.filter(a => a.id !== assetId));
      showToast('CardMock deleted', 'success');
    } catch (err) {
      console.error('Error deleting asset:', err);
      showToast('Failed to delete CardMock', 'error');
    }
  };

  const handleNewCardMock = () => {
    const logoVariants = brand?.logo_variants || [];

    // If only one variant, navigate directly with that variant
    if (logoVariants.length === 1) {
      router.push(`/designer?brandId=${brandId}&logoVariantId=${logoVariants[0].id}`);
    } else {
      // Show logo selector modal for multiple variants
      setShowLogoSelector(true);
    }
  };

  const handleLogoVariantSelect = (variant: LogoVariant) => {
    setShowLogoSelector(false);
    // Navigate to designer with the selected logo variant
    router.push(`/designer?brandId=${brandId}&logoVariantId=${variant.id}`);
  };

  if (loading || !isLoaded) {
    return (
      <GmailLayout>
        <div className="flex items-center justify-center h-64">
          <Loader2 className="h-8 w-8 animate-spin text-purple-600" />
        </div>
      </GmailLayout>
    );
  }

  if (!brand) {
    return (
      <GmailLayout>
        <div className="max-w-7xl mx-auto text-center py-12">
          <h2 className="text-xl font-semibold text-gray-900 mb-2">Brand not found</h2>
          <p className="text-gray-500 mb-4">This brand may have been deleted or you don't have access.</p>
          <button
            onClick={() => router.push('/brands')}
            className="text-purple-600 hover:text-purple-700"
          >
            Back to Brands
          </button>
        </div>
      </GmailLayout>
    );
  }

  const primaryLogo = brand.primary_logo_variant;
  const colors = brand.brand_colors || [];

  return (
    <GmailLayout>
      <div className="max-w-7xl mx-auto">
        {/* Back Button */}
        <button
          onClick={() => router.push('/brands')}
          className="flex items-center gap-2 text-gray-600 hover:text-gray-900 mb-6"
        >
          <ArrowLeft size={20} />
          <span>Back to Brands</span>
        </button>

        {/* Brand Header */}
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6 mb-8">
          <div className="flex items-start gap-6">
            {/* Logo */}
            <div className="w-24 h-24 bg-gray-50 rounded-lg flex items-center justify-center flex-shrink-0 border border-gray-200">
              {primaryLogo ? (
                <img
                  src={primaryLogo.logo_url}
                  alt={brand.company_name}
                  className="max-w-full max-h-full object-contain p-2"
                />
              ) : (
                <ImageIcon className="w-10 h-10 text-gray-300" />
              )}
            </div>

            {/* Brand Info */}
            <div className="flex-1 min-w-0">
              <h1 className="text-2xl font-bold text-gray-900 mb-1">
                {brand.company_name}
              </h1>
              <div className="flex items-center gap-2 text-gray-500 mb-3">
                <Globe size={16} />
                <span>{brand.domain}</span>
              </div>
              {brand.description && (
                <p className="text-gray-600 text-sm mb-4">{brand.description}</p>
              )}

              {/* Brand Colors */}
              {colors.length > 0 && (
                <div className="flex items-center gap-3">
                  <Palette size={16} className="text-gray-400" />
                  <div className="flex gap-1">
                    {colors.slice(0, 6).map((color, idx) => (
                      <div
                        key={idx}
                        className="w-6 h-6 rounded-full border border-gray-300"
                        style={{ backgroundColor: color.hex }}
                        title={color.hex}
                      />
                    ))}
                    {colors.length > 6 && (
                      <div className="flex items-center justify-center w-6 h-6 text-xs text-gray-500">
                        +{colors.length - 6}
                      </div>
                    )}
                  </div>
                </div>
              )}
            </div>

            {/* New CardMock Button */}
            <button
              onClick={handleNewCardMock}
              className="flex items-center gap-2 px-4 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 transition-colors flex-shrink-0"
            >
              <Plus size={20} />
              New CardMock
            </button>
          </div>
        </div>

        {/* CardMocks Section */}
        <div className="mb-6">
          <h2 className="text-lg font-semibold text-gray-900 mb-4">
            CardMocks ({assets.length})
          </h2>

          {assets.length === 0 ? (
            <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-12 text-center">
              <div className="w-16 h-16 mx-auto mb-4 bg-gray-100 rounded-full flex items-center justify-center">
                <Package className="h-8 w-8 text-gray-400" />
              </div>
              <h3 className="text-lg font-medium text-gray-900 mb-2">
                No CardMocks yet
              </h3>
              <p className="text-gray-500 mb-6">
                Create your first CardMock for {brand.company_name}
              </p>
              <button
                onClick={handleNewCardMock}
                className="px-4 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 transition-colors"
              >
                Create CardMock
              </button>
            </div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-6">
              {assets.map((asset) => (
                <MockupGridCard
                  key={asset.id}
                  mockup={asset}
                  onDelete={handleDeleteAsset}
                />
              ))}
            </div>
          )}
        </div>
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

      {/* Logo Variant Selector Modal */}
      <LogoVariantSelectorModal
        isOpen={showLogoSelector}
        onClose={() => setShowLogoSelector(false)}
        onSelect={handleLogoVariantSelect}
        brandName={brand?.company_name || ''}
        variants={brand?.logo_variants || []}
      />
    </GmailLayout>
  );
}
