/**
 * Designer Save Panel Component
 * Contains save form with name, folder, and project selection
 */

import { Save, Loader2 } from 'lucide-react';
import FolderSelector from '@/components/folders/FolderSelector';
import type { Folder, Project } from '@/lib/supabase';

interface DesignerSavePanelProps {
  mockupName: string;
  onMockupNameChange: (name: string) => void;
  folders: Folder[];
  selectedFolderId: string | null;
  onFolderSelect: (folderId: string | null) => void;
  onCreateFolder: () => void;
  projects: Project[];
  selectedProjectId: string | null;
  onProjectSelect: (projectId: string | null) => void;
  onSave: () => void;
  saving: boolean;
  canSave: boolean;
}

export default function DesignerSavePanel({
  mockupName,
  onMockupNameChange,
  folders,
  selectedFolderId,
  onFolderSelect,
  onCreateFolder,
  projects,
  selectedProjectId,
  onProjectSelect,
  onSave,
  saving,
  canSave,
}: DesignerSavePanelProps) {
  return (
    <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-4">
      <h3 className="font-semibold text-gray-900 mb-3">Save Mockup</h3>
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
        <div>
          <label className="text-sm text-gray-600 mb-1 block">Project (Optional)</label>
          <select
            value={selectedProjectId || ''}
            onChange={(e) => onProjectSelect(e.target.value || null)}
            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#374151] text-sm"
          >
            <option value="">No project</option>
            {projects.map((project) => (
              <option key={project.id} value={project.id}>
                {project.name}
              </option>
            ))}
          </select>
        </div>
        <button
          onClick={onSave}
          disabled={saving || !canSave}
          className="w-full px-4 py-2 bg-[#374151] text-white rounded-lg hover:bg-[#1f2937] disabled:opacity-50 disabled:cursor-not-allowed transition-colors flex items-center justify-center gap-2"
        >
          {saving ? (
            <>
              <Loader2 className="h-4 w-4 animate-spin" />
              Saving...
            </>
          ) : (
            <>
              <Save className="h-4 w-4" />
              Save Mockup
            </>
          )}
        </button>
      </div>
    </div>
  );
}

