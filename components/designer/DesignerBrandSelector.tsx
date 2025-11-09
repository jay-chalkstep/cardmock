/**
 * Designer Brand Selector Modal Component
 * Contains brand selection modal with brand grid and variant view
 */

import { ArrowLeft } from 'lucide-react';
import type { Logo } from '@/lib/supabase';

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

interface DesignerBrandSelectorProps {
  isOpen: boolean;
  onClose: () => void;
  brandGroups: BrandGroup[];
  expandedBrand: string | null;
  onExpandBrand: (brandId: string | null) => void;
  onSelectBrand: (logo: Logo) => void;
  getFormatColor: (format?: string) => string;
  getTypeColor: (type?: string) => string;
}

export default function DesignerBrandSelector({
  isOpen,
  onClose,
  brandGroups,
  expandedBrand,
  onExpandBrand,
  onSelectBrand,
  getFormatColor,
  getTypeColor,
}: DesignerBrandSelectorProps) {
  if (!isOpen) return null;

  const currentBrand = expandedBrand ? brandGroups.find(b => b.id === expandedBrand) : null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-lg max-w-4xl w-full max-h-[80vh] overflow-hidden">
        <div className="p-6 border-b flex items-center justify-between">
          {expandedBrand ? (
            <>
              <div className="flex items-center gap-3">
                <button
                  onClick={() => onExpandBrand(null)}
                  className="p-1 hover:bg-gray-100 rounded transition-colors"
                >
                  <ArrowLeft className="h-5 w-5 text-gray-600" />
                </button>
                <h3 className="text-xl font-semibold">
                  {currentBrand?.company_name} Logos
                </h3>
              </div>
              <span className="text-sm text-gray-500">
                {currentBrand?.variantCount} variants
              </span>
            </>
          ) : (
            <h3 className="text-xl font-semibold">Select a Logo</h3>
          )}
        </div>

        <div className="p-6 overflow-y-auto max-h-[60vh]">
          {!expandedBrand ? (
            /* Brand Cards View */
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-4">
              {brandGroups.map((brand) => (
                <button
                  key={brand.id}
                  onClick={() => {
                    if (brand.variantCount === 1) {
                      // If only one variant, select it directly
                      onSelectBrand(brand.variants[0]);
                    } else {
                      // Otherwise expand to show variants
                      onExpandBrand(brand.id);
                    }
                  }}
                  className="relative p-4 border border-gray-200 rounded-lg hover:border-[#374151] hover:shadow-md transition-all group"
                >
                  {/* Count Badge */}
                  {brand.variantCount > 1 && (
                    <div className="absolute top-2 right-2 bg-[#374151] text-white text-xs font-semibold rounded-full h-6 w-6 flex items-center justify-center shadow-md">
                      {brand.variantCount}
                    </div>
                  )}

                  {/* Logo Preview */}
                  <img
                    src={brand.primaryVariant?.logo_url}
                    alt={brand.company_name}
                    className="w-full h-20 object-contain mb-2"
                  />

                  {/* Brand Name */}
                  <p className="text-sm text-gray-700 truncate font-medium">
                    {brand.company_name}
                  </p>

                  {/* Hint text for multiple variants */}
                  {brand.variantCount > 1 && (
                    <p className="text-xs text-gray-500 mt-1">
                      Click to view all
                    </p>
                  )}
                </button>
              ))}
            </div>
          ) : (
            /* Variant Grid View */
            currentBrand ? (
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-4">
                {currentBrand.variants.map((variant) => (
                  <button
                    key={variant.id}
                    onClick={() => onSelectBrand(variant)}
                    className="p-4 border border-gray-200 rounded-lg hover:border-[#374151] hover:shadow-md transition-all text-left"
                  >
                    {/* Logo Preview */}
                    <div className="h-24 flex items-center justify-center mb-3 bg-gray-50 rounded">
                      <img
                        src={variant.logo_url}
                        alt={`${variant.logo_type} ${variant.theme || ''}`}
                        className="max-h-full max-w-full object-contain"
                      />
                    </div>

                    {/* Badges */}
                    <div className="space-y-2">
                      {/* Format Badge - Most Important */}
                      <div className="flex items-center gap-2">
                        <span className={`px-2 py-1 text-xs font-bold rounded border uppercase ${getFormatColor(variant.logo_format)}`}>
                          {variant.logo_format || 'N/A'}
                        </span>
                        {variant.width && variant.height && (
                          <span className="text-xs text-gray-500">
                            {variant.width}×{variant.height}
                          </span>
                        )}
                      </div>

                      {/* Type and Theme Badges */}
                      <div className="flex flex-wrap gap-1">
                        {variant.logo_type && (
                          <span className={`px-2 py-0.5 text-xs rounded border capitalize ${getTypeColor(variant.logo_type)}`}>
                            {variant.logo_type}
                          </span>
                        )}
                        {variant.theme && (
                          <span className="px-2 py-0.5 text-xs rounded border capitalize bg-gray-100 text-gray-700 border-gray-200">
                            {variant.theme}
                          </span>
                        )}
                      </div>
                    </div>
                  </button>
                ))}
              </div>
            ) : null
          )}
        </div>

        <div className="p-6 border-t">
          <button
            onClick={onClose}
            className="px-4 py-2 bg-gray-200 text-gray-700 rounded-lg hover:bg-gray-300"
          >
            Cancel
          </button>
        </div>
      </div>
    </div>
  );
}

