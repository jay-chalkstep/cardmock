'use client';

import { useState, useEffect, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { Brand, LogoVariant, BrandColor, BrandFont } from '@/lib/supabase';
import {
  X,
  Download,
  Edit,
  Package,
  Palette,
  Type,
  Image as ImageIcon,
  Copy,
  Check,
  Plus,
  ChevronRight,
  Loader2,
  CreditCard,
} from 'lucide-react';

interface BrandAssetModalProps {
  brand: Brand;
  isOpen: boolean;
  onClose: () => void;
  onEdit?: () => void;
}

type TabId = 'all' | 'logos' | 'colors' | 'fonts' | 'images';

interface TabConfig {
  id: TabId;
  label: string;
  count: number;
}

interface RecentMockup {
  id: string;
  mockup_name: string;
  mockup_image_url?: string;
  status?: string;
  updated_at: string;
}

export default function BrandAssetModal({ brand, isOpen, onClose, onEdit }: BrandAssetModalProps) {
  const router = useRouter();
  const [activeTab, setActiveTab] = useState<TabId>('all');
  const [copiedColor, setCopiedColor] = useState<string | null>(null);
  const [recentMockups, setRecentMockups] = useState<RecentMockup[]>([]);
  const [loadingMockups, setLoadingMockups] = useState(false);

  // Extract assets from brand
  const logos = brand.logo_variants || [];
  const colors = brand.brand_colors || [];
  const fonts = brand.brand_fonts || [];
  const images: any[] = []; // Placeholder for future images feature

  // Tab configuration with counts
  const tabs: TabConfig[] = [
    { id: 'all', label: 'All', count: logos.length + colors.length + fonts.length + images.length },
    { id: 'logos', label: 'Logos', count: logos.length },
    { id: 'colors', label: 'Colors', count: colors.length },
    { id: 'fonts', label: 'Fonts', count: fonts.length },
    { id: 'images', label: 'Images', count: images.length },
  ];

  // Fetch recent mockups using this brand
  const fetchRecentMockups = useCallback(async () => {
    if (!brand.logo_variants?.length) return;

    setLoadingMockups(true);
    try {
      const logoIds = brand.logo_variants.map(lv => lv.id);
      const response = await fetch(`/api/brands/${brand.id}/mockups?limit=5`);
      const result = await response.json();

      if (result.success) {
        setRecentMockups(result.data?.mockups || []);
      }
    } catch (error) {
      console.error('Failed to fetch mockups:', error);
    } finally {
      setLoadingMockups(false);
    }
  }, [brand.id, brand.logo_variants]);

  useEffect(() => {
    if (isOpen) {
      fetchRecentMockups();
    }
  }, [isOpen, fetchRecentMockups]);

  // Handle escape key
  useEffect(() => {
    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };

    if (isOpen) {
      document.addEventListener('keydown', handleEscape);
      document.body.style.overflow = 'hidden';
    }

    return () => {
      document.removeEventListener('keydown', handleEscape);
      document.body.style.overflow = 'unset';
    };
  }, [isOpen, onClose]);

  // Copy color to clipboard
  const copyColor = (hex: string) => {
    navigator.clipboard.writeText(hex);
    setCopiedColor(hex);
    setTimeout(() => setCopiedColor(null), 2000);
  };

  // Download asset
  const downloadAsset = async (url: string, filename: string) => {
    try {
      const response = await fetch(url);
      const blob = await response.blob();
      const link = document.createElement('a');
      link.href = URL.createObjectURL(blob);
      link.download = filename;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(link.href);
    } catch (error) {
      console.error('Failed to download:', error);
    }
  };

  // Format date
  const formatDate = (dateString: string) => {
    return new Intl.DateTimeFormat('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
    }).format(new Date(dateString));
  };

  // Get primary logo
  const primaryLogo = logos.find(l => l.id === brand.primary_logo_variant_id) || logos[0];

  if (!isOpen) return null;

  return (
    <>
      {/* Backdrop */}
      <div
        className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50"
        onClick={onClose}
      />

      {/* Modal */}
      <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
        <div
          className="bg-white rounded-2xl shadow-2xl w-full max-w-4xl max-h-[85vh] flex flex-col"
          onClick={(e) => e.stopPropagation()}
        >
          {/* Header */}
          <div className="p-6 border-b border-gray-200">
            <div className="flex items-start gap-4">
              {/* Brand Icon */}
              <div className="w-14 h-14 bg-gray-100 rounded-xl flex items-center justify-center flex-shrink-0">
                {primaryLogo ? (
                  <img
                    src={primaryLogo.logo_url}
                    alt={brand.company_name}
                    className="max-w-10 max-h-10 object-contain"
                  />
                ) : (
                  <Package className="w-6 h-6 text-gray-400" />
                )}
              </div>

              {/* Brand Info */}
              <div className="flex-1 min-w-0">
                <h2 className="text-xl font-semibold text-gray-900">{brand.company_name}</h2>
                {brand.description && (
                  <p className="text-sm text-gray-500 mt-1 line-clamp-2">{brand.description}</p>
                )}
              </div>

              {/* Actions */}
              <div className="flex items-center gap-2 flex-shrink-0">
                {onEdit && (
                  <button
                    onClick={onEdit}
                    className="flex items-center gap-2 px-3 py-2 text-gray-600 hover:bg-gray-100 rounded-lg transition-colors"
                  >
                    <Edit className="w-4 h-4" />
                    <span className="text-sm">Edit</span>
                  </button>
                )}
                <button
                  onClick={onClose}
                  className="p-2 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-lg transition-colors"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>
            </div>

            {/* Tabs */}
            <div className="flex gap-1 mt-6 bg-gray-100 p-1 rounded-lg w-fit">
              {tabs.map((tab) => (
                <button
                  key={tab.id}
                  onClick={() => setActiveTab(tab.id)}
                  className={`
                    px-4 py-2 text-sm font-medium rounded-md transition-all
                    ${activeTab === tab.id
                      ? 'bg-white text-gray-900 shadow-sm'
                      : 'text-gray-500 hover:text-gray-700'
                    }
                  `}
                >
                  {tab.label}
                  {tab.count > 0 && (
                    <span className={`ml-1.5 px-1.5 py-0.5 text-xs rounded-full ${
                      activeTab === tab.id ? 'bg-gray-100 text-gray-600' : 'bg-gray-200 text-gray-500'
                    }`}>
                      {tab.count}
                    </span>
                  )}
                </button>
              ))}
            </div>
          </div>

          {/* Content */}
          <div className="flex-1 overflow-y-auto p-6 space-y-8">
            {/* Colors Section */}
            {(activeTab === 'all' || activeTab === 'colors') && (
              <section>
                <div className="flex items-center justify-between mb-4">
                  <h3 className="text-sm font-medium text-gray-900 flex items-center gap-2">
                    <Palette className="w-4 h-4 text-gray-400" />
                    Colors
                  </h3>
                </div>

                {colors.length > 0 ? (
                  <div className="grid grid-cols-4 gap-4">
                    {colors.map((color) => (
                      <button
                        key={color.id}
                        onClick={() => copyColor(color.hex)}
                        className="group relative bg-white border border-gray-200 rounded-lg overflow-hidden hover:border-gray-300 transition-colors"
                      >
                        <div
                          className="h-16 w-full"
                          style={{ backgroundColor: color.hex }}
                        />
                        <div className="absolute inset-0 flex items-center justify-center bg-black/0 group-hover:bg-black/10 transition-colors">
                          {copiedColor === color.hex ? (
                            <Check className="w-5 h-5 text-white drop-shadow-md" />
                          ) : (
                            <Copy className="w-5 h-5 text-white opacity-0 group-hover:opacity-100 drop-shadow-md transition-opacity" />
                          )}
                        </div>
                        <div className="p-2">
                          <p className="text-xs font-semibold text-gray-700 truncate">
                            {color.type || 'Brand Color'}
                          </p>
                          <p className="text-xs font-mono text-gray-400">{color.hex}</p>
                        </div>
                      </button>
                    ))}
                  </div>
                ) : (
                  <div className="text-center py-8 bg-gray-50 rounded-lg">
                    <Palette className="w-8 h-8 text-gray-300 mx-auto mb-2" />
                    <p className="text-sm text-gray-500">No colors defined</p>
                  </div>
                )}
              </section>
            )}

            {/* Logos Section */}
            {(activeTab === 'all' || activeTab === 'logos') && (
              <section>
                <div className="flex items-center justify-between mb-4">
                  <h3 className="text-sm font-medium text-gray-900 flex items-center gap-2">
                    <ImageIcon className="w-4 h-4 text-gray-400" />
                    Logos
                  </h3>
                </div>

                {logos.length > 0 ? (
                  <div className="grid grid-cols-3 gap-4">
                    {logos.map((logo) => (
                      <button
                        key={logo.id}
                        onClick={() => {
                          router.push(`/designer?brandId=${brand.id}&logoVariantId=${logo.id}`);
                          onClose();
                        }}
                        className="group relative bg-white border border-gray-200 rounded-lg overflow-hidden hover:border-purple-300 hover:shadow-md transition-all text-left"
                      >
                        <div className="h-20 bg-gray-50 flex items-center justify-center p-3 relative">
                          <img
                            src={logo.logo_url}
                            alt={`${brand.company_name} logo`}
                            className="max-w-full max-h-full object-contain"
                          />
                          {/* Hover overlay with actions */}
                          <div className="absolute inset-0 bg-black/0 group-hover:bg-black/5 transition-colors flex items-center justify-center gap-2">
                            <span className="opacity-0 group-hover:opacity-100 transition-opacity bg-purple-600 text-white text-xs font-medium px-3 py-1.5 rounded-full shadow-lg flex items-center gap-1.5">
                              <Plus className="w-3.5 h-3.5" />
                              Use
                            </span>
                          </div>
                        </div>
                        {/* Download button - stops propagation to prevent navigation */}
                        <div
                          onClick={(e) => {
                            e.stopPropagation();
                            downloadAsset(logo.logo_url, `${brand.company_name}-${logo.logo_type || 'logo'}.${logo.logo_format || 'png'}`);
                          }}
                          className="absolute top-2 right-2 p-1.5 bg-white rounded-full shadow-sm opacity-0 group-hover:opacity-100 hover:bg-gray-100 transition-all cursor-pointer"
                        >
                          <Download className="w-3.5 h-3.5 text-gray-600" />
                        </div>
                        <div className="p-3 border-t border-gray-100">
                          <p className="text-xs font-medium text-gray-700 truncate">
                            {logo.logo_type || 'Logo'}
                          </p>
                          <p className="text-xs text-gray-400">
                            {logo.logo_format?.toUpperCase() || 'PNG'}
                            {logo.theme && ` • ${logo.theme}`}
                          </p>
                        </div>
                      </button>
                    ))}
                  </div>
                ) : (
                  <div className="text-center py-8 bg-gray-50 rounded-lg">
                    <ImageIcon className="w-8 h-8 text-gray-300 mx-auto mb-2" />
                    <p className="text-sm text-gray-500">No logos uploaded</p>
                  </div>
                )}
              </section>
            )}

            {/* Fonts Section */}
            {(activeTab === 'all' || activeTab === 'fonts') && (
              <section>
                <div className="flex items-center justify-between mb-4">
                  <h3 className="text-sm font-medium text-gray-900 flex items-center gap-2">
                    <Type className="w-4 h-4 text-gray-400" />
                    Fonts
                  </h3>
                </div>

                {fonts.length > 0 ? (
                  <div className="grid grid-cols-2 gap-4">
                    {fonts.map((font) => (
                      <div
                        key={font.id}
                        className="bg-white border border-gray-200 rounded-lg p-4 hover:border-gray-300 transition-colors"
                      >
                        <p className="text-lg font-medium text-gray-900 mb-1">{font.font_name}</p>
                        <p className="text-xs text-gray-400 mb-3">
                          {font.font_type || 'Font'}
                          {font.origin && ` • ${font.origin}`}
                        </p>
                        <p className="text-sm text-gray-500 font-light">Aa Bb Cc 123</p>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="text-center py-8 bg-gray-50 rounded-lg">
                    <Type className="w-8 h-8 text-gray-300 mx-auto mb-2" />
                    <p className="text-sm text-gray-500">No fonts added</p>
                  </div>
                )}
              </section>
            )}

            {/* Images Section */}
            {(activeTab === 'all' || activeTab === 'images') && (
              <section>
                <div className="flex items-center justify-between mb-4">
                  <h3 className="text-sm font-medium text-gray-900 flex items-center gap-2">
                    <ImageIcon className="w-4 h-4 text-gray-400" />
                    Images
                  </h3>
                </div>

                <div className="text-center py-8 bg-gray-50 rounded-lg">
                  <ImageIcon className="w-8 h-8 text-gray-300 mx-auto mb-2" />
                  <p className="text-sm text-gray-500">No images uploaded</p>
                </div>
              </section>
            )}

            {/* Recent Mockups (All tab only) */}
            {activeTab === 'all' && (
              <section>
                <div className="flex items-center justify-between mb-4">
                  <h3 className="text-sm font-medium text-gray-900 flex items-center gap-2">
                    <CreditCard className="w-4 h-4 text-gray-400" />
                    Recent Mockups
                  </h3>
                  {recentMockups.length > 0 && (
                    <button
                      onClick={() => {
                        router.push(`/brands/${brand.id}`);
                        onClose();
                      }}
                      className="text-xs text-purple-600 hover:text-purple-700"
                    >
                      View all
                    </button>
                  )}
                </div>

                {loadingMockups ? (
                  <div className="flex items-center justify-center py-8">
                    <Loader2 className="w-6 h-6 text-gray-400 animate-spin" />
                  </div>
                ) : recentMockups.length > 0 ? (
                  <div className="space-y-2">
                    {recentMockups.map((mockup) => (
                      <button
                        key={mockup.id}
                        onClick={() => {
                          router.push(`/mockups/${mockup.id}`);
                          onClose();
                        }}
                        className="w-full flex items-center gap-3 p-3 bg-gray-50 hover:bg-gray-100 rounded-lg transition-colors"
                      >
                        <div className="w-12 h-8 bg-white rounded flex items-center justify-center overflow-hidden">
                          {mockup.mockup_image_url ? (
                            <img
                              src={mockup.mockup_image_url}
                              alt={mockup.mockup_name}
                              className="w-full h-full object-cover"
                            />
                          ) : (
                            <CreditCard className="w-4 h-4 text-gray-300" />
                          )}
                        </div>
                        <div className="flex-1 text-left min-w-0">
                          <p className="text-sm font-medium text-gray-900 truncate">
                            {mockup.mockup_name}
                          </p>
                        </div>
                        <ChevronRight className="w-4 h-4 text-gray-400" />
                      </button>
                    ))}
                  </div>
                ) : (
                  <div className="text-center py-8 bg-gray-50 rounded-lg">
                    <CreditCard className="w-8 h-8 text-gray-300 mx-auto mb-2" />
                    <p className="text-sm text-gray-500">No mockups yet</p>
                  </div>
                )}
              </section>
            )}
          </div>

          {/* Footer */}
          <div className="p-4 bg-gray-50 border-t border-gray-200 rounded-b-2xl flex items-center justify-between">
            <p className="text-sm text-gray-500">
              Last updated {formatDate(brand.updated_at)}
            </p>
            <p className="text-sm text-gray-400">
              Click any logo to create a mockup
            </p>
          </div>
        </div>
      </div>
    </>
  );
}
