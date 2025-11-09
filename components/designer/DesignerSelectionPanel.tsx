/**
 * Designer Selection Panel Component
 * Contains brand and template selection UI
 */

import { Layers, Image as ImageIcon, CreditCard, ChevronRight } from 'lucide-react';
import type { Logo, CardTemplate } from '@/lib/supabase';

interface DesignerSelectionPanelProps {
  selectedBrand: Logo | null;
  selectedTemplate: CardTemplate | null;
  onShowBrandSelector: () => void;
  onShowTemplateSelector: () => void;
}

export default function DesignerSelectionPanel({
  selectedBrand,
  selectedTemplate,
  onShowBrandSelector,
  onShowTemplateSelector,
}: DesignerSelectionPanelProps) {
  return (
    <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-4">
      <h3 className="font-semibold text-gray-900 mb-3 flex items-center gap-2">
        <Layers className="h-4 w-4" />
        Elements
      </h3>

      {/* Logo Selection */}
      <div className="mb-4">
        <label className="text-sm text-gray-600 mb-2 block">Brand</label>
        <button
          onClick={onShowBrandSelector}
          className="w-full px-3 py-2 bg-gray-50 border border-gray-300 rounded-lg hover:bg-gray-100 transition-colors flex items-center justify-between"
        >
          <span className="flex items-center gap-2">
            <ImageIcon className="h-4 w-4" />
            {selectedBrand ? selectedBrand.company_name : 'Select Brand'}
          </span>
          <ChevronRight className="h-4 w-4" />
        </button>
      </div>

      {/* Template Selection */}
      <div>
        <label className="text-sm text-gray-600 mb-2 block">Asset Template</label>
        <button
          onClick={onShowTemplateSelector}
          className="w-full px-3 py-2 bg-gray-50 border border-gray-300 rounded-lg hover:bg-gray-100 transition-colors flex items-center justify-between"
        >
          <span className="flex items-center gap-2">
            <CreditCard className="h-4 w-4" />
            {selectedTemplate ? selectedTemplate.template_name : 'Select Template'}
          </span>
          <ChevronRight className="h-4 w-4" />
        </button>
      </div>
    </div>
  );
}

