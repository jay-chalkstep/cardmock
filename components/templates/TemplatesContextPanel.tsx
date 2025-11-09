/**
 * Templates Context Panel Component
 * Contains search, upload button, sort options, and stats
 */

import { Search, Upload } from 'lucide-react';

interface TemplatesContextPanelProps {
  searchTerm: string;
  onSearchChange: (term: string) => void;
  onUpload: () => void;
  sortBy: 'date' | 'name';
  onSortChange: (sort: 'date' | 'name') => void;
  totalCount: number;
  filteredCount: number;
}

export default function TemplatesContextPanel({
  searchTerm,
  onSearchChange,
  onUpload,
  sortBy,
  onSortChange,
  totalCount,
  filteredCount,
}: TemplatesContextPanelProps) {
  return (
    <div className="p-4 space-y-4">
      {/* Search */}
      <div className="relative">
        <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-[var(--text-tertiary)]" />
        <input
          type="text"
          placeholder="Search templates..."
          value={searchTerm}
          onChange={(e) => onSearchChange(e.target.value)}
          className="w-full pl-9 pr-3 py-2 text-sm border border-[var(--border-main)] rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
        />
      </div>

      {/* Upload Button */}
      <button
        onClick={onUpload}
        className="w-full flex items-center justify-center gap-2 px-4 py-2.5 bg-blue-500 text-white rounded-lg hover:bg-blue-600 transition-colors font-medium"
      >
        <Upload size={18} />
        <span>Upload Template</span>
      </button>

      {/* Divider */}
      <div className="border-t border-[var(--border-main)] pt-4">
        <h3 className="text-xs font-semibold text-[var(--text-secondary)] uppercase tracking-wide mb-3">
          Sort By
        </h3>
        <div className="space-y-1">
          <button
            onClick={() => onSortChange('date')}
            className={`w-full text-left px-3 py-2 rounded-lg text-sm transition-colors ${
              sortBy === 'date'
                ? 'bg-blue-50 text-blue-600 font-medium'
                : 'text-[var(--text-secondary)] hover:bg-[var(--bg-hover)]'
            }`}
          >
            Upload Date
          </button>
          <button
            onClick={() => onSortChange('name')}
            className={`w-full text-left px-3 py-2 rounded-lg text-sm transition-colors ${
              sortBy === 'name'
                ? 'bg-blue-50 text-blue-600 font-medium'
                : 'text-[var(--text-secondary)] hover:bg-[var(--bg-hover)]'
            }`}
          >
            Template Name
          </button>
        </div>
      </div>

      {/* Stats */}
      <div className="border-t border-[var(--border-main)] pt-4">
        <div className="text-sm text-[var(--text-secondary)]">
          <div className="flex items-center justify-between mb-2">
            <span>Total Templates</span>
            <span className="font-semibold text-[var(--text-primary)]">{totalCount}</span>
          </div>
          {searchTerm && (
            <div className="flex items-center justify-between">
              <span>Filtered Results</span>
              <span className="font-semibold text-[var(--text-primary)]">{filteredCount}</span>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

