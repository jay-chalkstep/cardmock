'use client';

import { X, Image as ImageIcon } from 'lucide-react';
import type { LogoVariant } from '@/lib/supabase';

interface LogoVariantSelectorModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSelect: (variant: LogoVariant) => void;
  brandName: string;
  variants: LogoVariant[];
}

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

export default function LogoVariantSelectorModal({
  isOpen,
  onClose,
  onSelect,
  brandName,
  variants,
}: LogoVariantSelectorModalProps) {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-lg max-w-3xl w-full max-h-[80vh] overflow-hidden shadow-xl">
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-gray-200">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-purple-100 rounded-lg">
              <ImageIcon className="h-5 w-5 text-purple-600" />
            </div>
            <div>
              <h2 className="text-xl font-semibold text-gray-900">
                Select Logo for CardMock
              </h2>
              <p className="text-sm text-gray-500">
                {brandName} - {variants.length} variant{variants.length !== 1 ? 's' : ''} available
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
          >
            <X className="h-5 w-5 text-gray-500" />
          </button>
        </div>

        {/* Variant Grid */}
        <div className="p-6 overflow-y-auto max-h-[60vh]">
          {variants.length === 0 ? (
            <div className="text-center py-8 text-gray-500">
              <ImageIcon className="h-12 w-12 mx-auto mb-3 text-gray-300" />
              <p>No logo variants available for this brand.</p>
            </div>
          ) : (
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-4">
              {variants.map((variant) => (
                <button
                  key={variant.id}
                  onClick={() => onSelect(variant)}
                  className="p-4 border border-gray-200 rounded-lg hover:border-purple-400 hover:shadow-md transition-all text-left group"
                >
                  {/* Logo Preview */}
                  <div className="h-24 flex items-center justify-center mb-3 bg-gray-50 rounded group-hover:bg-purple-50 transition-colors">
                    <img
                      src={variant.logo_url}
                      alt={`${variant.logo_type || 'Logo'} ${variant.theme || ''}`}
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
          )}
        </div>

        {/* Footer */}
        <div className="p-6 border-t border-gray-200">
          <button
            onClick={onClose}
            className="px-4 py-2 border border-gray-300 rounded-lg text-gray-700 hover:bg-gray-50 transition-colors"
          >
            Cancel
          </button>
        </div>
      </div>
    </div>
  );
}
