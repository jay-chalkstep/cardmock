/**
 * Templates Grid View Component
 * Displays template cards in a grid layout
 */

import { Loader2, LayoutTemplate } from 'lucide-react';
import TemplateCard from './TemplateCard';
import type { CardTemplate } from '@/lib/supabase';

interface TemplatesGridViewProps {
  templates: CardTemplate[];
  selectedTemplate: CardTemplate | null;
  onSelectTemplate: (template: CardTemplate) => void;
  loading: boolean;
  searchTerm: string;
  onUpload: () => void;
}

export default function TemplatesGridView({
  templates,
  selectedTemplate,
  onSelectTemplate,
  loading,
  searchTerm,
  onUpload,
}: TemplatesGridViewProps) {
  return (
    <div className="h-full flex flex-col">
      {/* Header */}
      <div className="px-6 py-4 border-b border-[var(--border-main)]">
        <h2 className="text-xl font-semibold text-[var(--text-primary)]">
          Template Library
        </h2>
        <p className="text-sm text-[var(--text-tertiary)] mt-1">
          {templates.length} {templates.length === 1 ? 'template' : 'templates'}
        </p>
      </div>

      {/* Grid Content */}
      <div className="flex-1 overflow-y-auto p-6">
        {loading ? (
          <div className="flex items-center justify-center h-64">
            <Loader2 className="h-8 w-8 animate-spin text-[var(--text-tertiary)]" />
          </div>
        ) : templates.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-64 text-center">
            <LayoutTemplate size={48} className="text-[var(--text-tertiary)] opacity-20 mb-4" />
            <h3 className="text-lg font-medium text-[var(--text-primary)] mb-2">
              {searchTerm ? 'No templates found' : 'No templates yet'}
            </h3>
            <p className="text-sm text-[var(--text-tertiary)] max-w-md">
              {searchTerm
                ? 'Try adjusting your search terms'
                : 'Upload your first template to get started'}
            </p>
            {!searchTerm && (
              <button
                onClick={onUpload}
                className="mt-4 px-4 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600 transition-colors"
              >
                Upload Template
              </button>
            )}
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {templates.map((template) => (
              <TemplateCard
                key={template.id}
                template={template}
                isSelected={selectedTemplate?.id === template.id}
                onClick={() => onSelectTemplate(template)}
              />
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

