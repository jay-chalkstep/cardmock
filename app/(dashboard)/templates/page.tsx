'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useOrganization } from '@/lib/hooks/useAuth';
import GmailLayout from '@/components/layout/GmailLayout';
import TemplateCard from '@/components/templates/TemplateCard';
import Toast from '@/components/Toast';
import { CardTemplate } from '@/lib/supabase';
import { Search, Loader2, LayoutTemplate, ArrowUpDown } from 'lucide-react';

interface ToastMessage {
  message: string;
  type: 'success' | 'error';
  id: number;
}

export default function TemplatesPage() {
  const router = useRouter();
  const { organization, isLoaded } = useOrganization();

  const [templates, setTemplates] = useState<CardTemplate[]>([]);
  const [filteredTemplates, setFilteredTemplates] = useState<CardTemplate[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [sortBy, setSortBy] = useState<'date' | 'name'>('date');
  const [toasts, setToasts] = useState<ToastMessage[]>([]);

  const showToast = (message: string, type: 'success' | 'error') => {
    const id = Date.now();
    setToasts(prev => [...prev, { message, type, id }]);
  };

  const removeToast = (id: number) => {
    setToasts(prev => prev.filter(toast => toast.id !== id));
  };

  // Fetch templates on mount
  useEffect(() => {
    if (organization?.id) {
      fetchTemplates();
    }
  }, [organization?.id]);

  // Filter and sort templates
  useEffect(() => {
    let filtered = templates;

    if (searchTerm) {
      filtered = templates.filter(template =>
        template.template_name.toLowerCase().includes(searchTerm.toLowerCase())
      );
    }

    filtered = [...filtered].sort((a, b) => {
      if (sortBy === 'date') {
        return new Date(b.uploaded_date).getTime() - new Date(a.uploaded_date).getTime();
      } else {
        return a.template_name.localeCompare(b.template_name);
      }
    });

    setFilteredTemplates(filtered);
  }, [searchTerm, templates, sortBy]);

  const fetchTemplates = async () => {
    setLoading(true);
    try {
      const response = await fetch('/api/templates');
      const result = await response.json();

      if (!response.ok || !result.success) {
        throw new Error(result.error || 'Failed to fetch templates');
      }

      setTemplates(result.data?.templates || []);
    } catch (err) {
      console.error('Error fetching templates:', err);
      showToast('Failed to load templates', 'error');
    } finally {
      setLoading(false);
    }
  };

  const handleSelectTemplate = (template: CardTemplate) => {
    // Navigate to designer with template pre-selected
    router.push(`/designer?templateId=${template.id}`);
  };

  return (
    <GmailLayout>
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="flex items-center justify-between mb-8">
          <div>
            <h1 className="text-3xl font-bold text-gray-900">Templates</h1>
            <p className="text-gray-500 mt-1">
              Choose a card template to start designing
            </p>
          </div>
        </div>

        {/* Search and Sort */}
        <div className="flex items-center gap-4 mb-6">
          <div className="relative flex-1 max-w-md">
            <input
              type="text"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              placeholder="Search templates..."
              className="w-full px-4 py-2 pl-10 text-gray-900 bg-white border border-gray-300 rounded-lg focus:outline-none focus:border-purple-600 focus:ring-2 focus:ring-purple-200 transition-all"
            />
            <Search className="absolute left-3 top-2.5 h-5 w-5 text-gray-400" />
          </div>

          <button
            onClick={() => setSortBy(sortBy === 'date' ? 'name' : 'date')}
            className="flex items-center gap-2 px-3 py-2 text-gray-600 hover:text-gray-900 border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors"
          >
            <ArrowUpDown size={16} />
            <span className="text-sm">
              {sortBy === 'date' ? 'Sort by date' : 'Sort by name'}
            </span>
          </button>
        </div>

        {/* Templates Grid */}
        {loading ? (
          <div className="flex items-center justify-center h-64">
            <Loader2 className="h-8 w-8 animate-spin text-purple-600" />
          </div>
        ) : filteredTemplates.length === 0 ? (
          <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-12 text-center">
            <div className="w-16 h-16 mx-auto mb-4 bg-gray-100 rounded-full flex items-center justify-center">
              <LayoutTemplate className="h-8 w-8 text-gray-400" />
            </div>
            <h3 className="text-lg font-medium text-gray-900 mb-2">
              {searchTerm ? 'No templates found' : 'No templates available'}
            </h3>
            <p className="text-gray-500">
              {searchTerm
                ? 'Try adjusting your search terms'
                : 'Templates will appear here when added by an administrator'}
            </p>
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-6">
            {filteredTemplates.map((template) => (
              <div
                key={template.id}
                onClick={() => handleSelectTemplate(template)}
                className="cursor-pointer"
              >
                <TemplateCard
                  template={template}
                  isSelected={false}
                  onClick={() => handleSelectTemplate(template)}
                />
              </div>
            ))}
          </div>
        )}

        {/* Template count */}
        {!loading && filteredTemplates.length > 0 && (
          <div className="mt-6 text-center text-sm text-gray-500">
            Showing {filteredTemplates.length} of {templates.length} templates
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
    </GmailLayout>
  );
}
