'use client';

import { useState } from 'react';
import { Search, Loader2 } from 'lucide-react';
import Toast from '@/components/Toast';

interface ToastMessage {
  message: string;
  type: 'success' | 'error';
  id: number;
}

interface LogoFormat {
  src: string;
  background?: string;
  format?: string;
  height?: number;
  width?: number;
  size?: number;
}

interface LogoGroup {
  type: string;
  theme?: string;
  formats: LogoFormat[];
}

interface BrandColor {
  hex: string;
  type?: string;
  brightness?: number;
}

interface BrandFont {
  name: string;
  type?: string;
  origin?: string;
}

interface BrandData {
  name: string;
  domain: string;
  description?: string;
  logos: LogoGroup[];
  colors?: BrandColor[];
  fonts?: BrandFont[];
}

export default function TestBrandfetchPage() {
  const [searchQuery, setSearchQuery] = useState('');
  const [loading, setLoading] = useState(false);
  const [brandData, setBrandData] = useState<BrandData | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [toasts, setToasts] = useState<ToastMessage[]>([]);

  const showToast = (message: string, type: 'success' | 'error') => {
    const id = Date.now();
    setToasts(prev => [...prev, { message, type, id }]);
  };

  const removeToast = (id: number) => {
    setToasts(prev => prev.filter(toast => toast.id !== id));
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
      showToast('Brand data loaded successfully!', 'success');
    } catch (err) {
      const errorMsg = err instanceof Error ? err.message : 'An error occurred';
      setError(errorMsg);
      showToast(errorMsg, 'error');
    } finally {
      setLoading(false);
    }
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      searchBrand();
    }
  };

  return (
    <>
      <div className="max-w-7xl mx-auto">
        <h1 className="text-3xl font-bold text-gray-900 mb-2">Brandfetch API Test</h1>
        <p className="text-gray-600 mb-8">
          Search for a brand to see the full API response and test data storage
        </p>

        {/* Search Bar */}
        <div className="mb-8">
          <div className="relative">
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              onKeyPress={handleKeyPress}
              placeholder="Enter company domain (e.g., apple.com) or name..."
              className="w-full px-4 py-3 pl-12 pr-32 text-gray-900 bg-white border border-gray-300 rounded-lg focus:outline-none focus:border-[#374151] focus:ring-2 focus:ring-[#a5b4fc] transition-all"
            />
            <Search className="absolute left-4 top-3.5 h-5 w-5 text-gray-400" />
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
          </div>
        </div>

        {/* Error Message */}
        {error && (
          <div className="mb-6 p-4 bg-red-50 border border-red-200 rounded-lg text-red-700">
            {error}
          </div>
        )}

        {/* Brand Data Display */}
        {brandData && (
          <div className="space-y-8">
            {/* Company Info */}
            <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
              <h2 className="text-2xl font-bold text-gray-900 mb-4">{brandData.name}</h2>
              <div className="grid md:grid-cols-2 gap-4">
                <div>
                  <p className="text-sm text-gray-500">Domain</p>
                  <p className="text-lg font-medium text-gray-900">{brandData.domain}</p>
                </div>
                {brandData.description && (
                  <div>
                    <p className="text-sm text-gray-500">Description</p>
                    <p className="text-gray-700">{brandData.description}</p>
                  </div>
                )}
              </div>
            </div>

            {/* Colors Section */}
            {brandData.colors && brandData.colors.length > 0 && (
              <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
                <h3 className="text-xl font-bold text-gray-900 mb-4">Brand Colors ({brandData.colors.length})</h3>
                <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
                  {brandData.colors.map((color, idx) => (
                    <div key={idx} className="space-y-2">
                      <div
                        className="w-full h-24 rounded-lg shadow-md border border-gray-200"
                        style={{ backgroundColor: color.hex }}
                      ></div>
                      <div className="text-sm">
                        <p className="font-mono font-semibold text-gray-900">{color.hex}</p>
                        {color.type && <p className="text-gray-600 text-xs capitalize">{color.type}</p>}
                        {color.brightness && <p className="text-gray-500 text-xs">Brightness: {color.brightness}</p>}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Fonts Section */}
            {brandData.fonts && brandData.fonts.length > 0 && (
              <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
                <h3 className="text-xl font-bold text-gray-900 mb-4">Brand Fonts ({brandData.fonts.length})</h3>
                <div className="space-y-3">
                  {brandData.fonts.map((font, idx) => (
                    <div key={idx} className="p-3 bg-gray-50 rounded-lg border border-gray-200">
                      <p className="font-semibold text-gray-900">{font.name}</p>
                      <div className="text-sm text-gray-600 mt-1 space-y-1">
                        {font.type && <p>Type: {font.type}</p>}
                        {font.origin && <p>Origin: {font.origin}</p>}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Logos Section */}
            {brandData.logos && brandData.logos.length > 0 && (
              <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
                <h3 className="text-xl font-bold text-gray-900 mb-4">Logos ({brandData.logos.length} types)</h3>
                <div className="space-y-8">
                  {brandData.logos.map((logoGroup, groupIdx) => (
                    <div key={groupIdx} className="border-t pt-6 first:border-t-0 first:pt-0">
                      <h4 className="text-lg font-semibold text-gray-900 mb-4 capitalize">
                        {logoGroup.type} {logoGroup.theme && `(${logoGroup.theme})`}
                      </h4>
                      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                        {logoGroup.formats && logoGroup.formats.map((format, formatIdx) => (
                          <div key={formatIdx} className="border border-gray-200 rounded-lg overflow-hidden">
                            <div className="h-32 bg-gray-50 flex items-center justify-center p-4" style={{ backgroundColor: format.background || '#f3f4f6' }}>
                              <img
                                src={format.src}
                                alt={`${brandData.name} logo`}
                                className="max-h-full max-w-full object-contain"
                              />
                            </div>
                            <div className="p-3 space-y-2 text-sm">
                              <div className="flex justify-between items-start">
                                <span className="font-mono text-gray-700">{format.format?.toUpperCase()}</span>
                                {format.size && <span className="text-gray-500">{(format.size / 1024).toFixed(1)} KB</span>}
                              </div>
                              {format.width && format.height && (
                                <p className="text-gray-600">{format.width} × {format.height}px</p>
                              )}
                              <a
                                href={format.src}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="text-blue-600 hover:text-blue-700 text-xs underline block mt-2"
                              >
                                View original
                              </a>
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Raw JSON for debugging */}
            <div className="bg-gray-900 rounded-lg shadow-sm border border-gray-700 p-6">
              <h3 className="text-xl font-bold text-white mb-4">Raw API Response (for debugging)</h3>
              <pre className="text-gray-300 text-xs overflow-x-auto max-h-96">
                {JSON.stringify(brandData, null, 2)}
              </pre>
            </div>
          </div>
        )}

        {/* Empty State */}
        {!loading && !brandData && !error && (
          <div className="text-center py-12">
            <div className="w-20 h-20 mx-auto mb-4 bg-gray-100 rounded-full flex items-center justify-center">
              <Search className="h-10 w-10 text-gray-400" />
            </div>
            <h3 className="text-lg font-medium text-gray-900 mb-2">Search for a brand</h3>
            <p className="text-gray-500 mb-6">
              Enter a company domain or name to see all available Brandfetch data
            </p>
            <div className="flex flex-wrap justify-center gap-2">
              {['apple.com', 'nike.com', 'google.com', 'coca-cola.com'].map(brand => (
                <button
                  key={brand}
                  onClick={() => {
                    setSearchQuery(brand);
                  }}
                  className="px-3 py-1 bg-gray-100 text-gray-700 rounded-md hover:bg-gray-200 text-sm"
                >
                  Try {brand.split('.')[0]}
                </button>
              ))}
            </div>
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
    </>
  );
}
