/**
 * Designer Save Panel Component
 * Contains save form with name and folder selection
 */

import { Save, Loader2 } from 'lucide-react';
import FolderSelector from '@/components/folders/FolderSelector';
import type { Folder } from '@/lib/supabase';

interface Brand {
  id: string;
  company_name: string;
  domain: string;
}

interface DesignerSavePanelProps {
  mockupName: string;
  onMockupNameChange: (name: string) => void;
  folders: Folder[];
  selectedFolderId: string | null;
  onFolderSelect: (folderId: string | null) => void;
  onCreateFolder: () => void;
  brands?: Brand[];
  selectedBrandId?: string | null;
  onBrandSelect?: (brandId: string | null) => void;
  onSave: () => void;
  saving: boolean;
  canSave: boolean;
  isEditMode?: boolean;
}

export default function DesignerSavePanel({
  mockupName,
  onMockupNameChange,
  folders,
  selectedFolderId,
  onFolderSelect,
  onCreateFolder,
  brands = [],
  selectedBrandId,
  onBrandSelect,
  onSave,
  saving,
  canSave,
  isEditMode = false,
}: DesignerSavePanelProps) {
  return (
    <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-4">
      <h3 className="font-semibold text-gray-900 mb-3">
        {isEditMode ? 'Update Mockup' : 'Save Mockup'}
      </h3>
      <div className="space-y-3">
        <div>
          <label className="text-sm text-gray-600 mb-1 block">Mockup Name</label>
          <input
            type="text"
            value={mockupName}
            onChange={(e) => onMockupNameChange(e.target.value)}
            placeholder="Enter mockup name..."
            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#374151]"
          />
        </div>
        <div>
          <label className="text-sm text-gray-600 mb-1 block">Folder (Optional)</label>
          <FolderSelector
            folders={folders}
            selectedFolderId={selectedFolderId}
            onSelect={onFolderSelect}
            onCreateFolder={onCreateFolder}
          />
        </div>
        {brands.length > 0 && onBrandSelect && (
          <div>
            <label className="text-sm text-gray-600 mb-1 block">Brand (Optional)</label>
            <select
              value={selectedBrandId || ''}
              onChange={(e) => onBrandSelect(e.target.value || null)}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#374151] text-sm"
            >
              <option value="">No brand</option>
              {brands.map((brand) => (
                <option key={brand.id} value={brand.id}>
                  {brand.company_name}
                </option>
              ))}
            </select>
          </div>
        )}
        <button
          onClick={onSave}
          disabled={saving || !canSave}
          className="w-full px-4 py-2 bg-[#374151] text-white rounded-lg hover:bg-[#1f2937] disabled:opacity-50 disabled:cursor-not-allowed transition-colors flex items-center justify-center gap-2"
        >
          {saving ? (
            <>
              <Loader2 className="h-4 w-4 animate-spin" />
              {isEditMode ? 'Updating...' : 'Saving...'}
            </>
          ) : (
            <>
              <Save className="h-4 w-4" />
              {isEditMode ? 'Update Mockup' : 'Save Mockup'}
            </>
          )}
        </button>
      </div>
    </div>
  );
}
