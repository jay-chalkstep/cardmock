'use client';

import { useState, useEffect } from 'react';
import { useOrganization } from '@clerk/nextjs';
import { useRouter } from 'next/navigation';
import { supabase } from '@/lib/supabase';
import { CardTemplate } from '@/lib/supabase';
import GmailLayout from '@/components/layout/GmailLayout';
import PreviewArea from '@/components/preview/PreviewArea';
import TemplatesContextPanel from '@/components/templates/TemplatesContextPanel';
import TemplatesGridView from '@/components/templates/TemplatesGridView';
import TemplateDetailsPanel from '@/components/templates/TemplateDetailsPanel';
import TemplateUploadModal from '@/components/templates/TemplateUploadModal';
import Toast from '@/components/Toast';

interface ToastMessage {
  message: string;
  type: 'success' | 'error';
  id: number;
}

export default function AdminTemplatesPage() {
  const { organization, membership } = useOrganization();
  const router = useRouter();

  // State
  const [templates, setTemplates] = useState<CardTemplate[]>([]);
  const [filteredTemplates, setFilteredTemplates] = useState<CardTemplate[]>([]);
  const [selectedTemplate, setSelectedTemplate] = useState<CardTemplate | null>(null);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [isUploadModalOpen, setIsUploadModalOpen] = useState(false);
  const [toasts, setToasts] = useState<ToastMessage[]>([]);
  const [sortBy, setSortBy] = useState<'date' | 'name'>('date');

  // Check if user is admin
  const isAdmin = membership?.role === 'org:admin';

  // Redirect non-admins
  useEffect(() => {
    if (membership && !isAdmin) {
      router.push('/library?tab=templates');
    }
  }, [membership, isAdmin, router]);

  // Toast functions
  const showToast = (message: string, type: 'success' | 'error') => {
    const id = Date.now();
    setToasts(prev => [...prev, { message, type, id }]);
  };

  const removeToast = (id: number) => {
    setToasts(prev => prev.filter(toast => toast.id !== id));
  };

  // Fetch templates on mount
  useEffect(() => {
    if (organization?.id && isAdmin) {
      fetchTemplates();
    }
  }, [organization?.id, isAdmin]);

  // Filter and sort templates
  useEffect(() => {
    let filtered = templates;

    // Apply search filter
    if (searchTerm) {
      filtered = templates.filter(template =>
        template.template_name.toLowerCase().includes(searchTerm.toLowerCase())
      );
    }

    // Apply sorting
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
    if (!organization?.id) return;

    setLoading(true);
    try {
      const response = await fetch('/api/templates');
      const result = await response.json();

      if (!response.ok || !result.success) {
        const errorMessage = result.error || 'Failed to fetch templates';
        throw new Error(errorMessage);
      }

      // Extract data from the response structure { success: true, data: { templates: [...] } }
      const fetchedTemplates = result.data?.templates || [];
      setTemplates(fetchedTemplates);
      setFilteredTemplates(fetchedTemplates);

      // Select first template if available
      if (fetchedTemplates.length > 0 && !selectedTemplate) {
        setSelectedTemplate(fetchedTemplates[0]);
      }
    } catch (error) {
      console.error('Error fetching templates:', error);
      showToast('Failed to load templates', 'error');
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async (id: string) => {
    try {
      // Find template
      const template = templates.find(t => t.id === id);
      if (!template) return;

      // Extract file name from URL
      const urlParts = template.template_url.split('/');
      const fileName = urlParts[urlParts.length - 1];

      // Delete from storage
      const { error: storageError } = await supabase.storage
        .from('card-templates')
        .remove([fileName]);

      if (storageError) {
        console.error('Storage deletion error:', storageError);
      }

      // Delete from database
      const { error: dbError } = await supabase
        .from('templates')
        .delete()
        .eq('id', id);

      if (dbError) throw dbError;

      showToast('Template deleted successfully', 'success');

      // Clear selection if deleted template was selected
      if (selectedTemplate?.id === id) {
        setSelectedTemplate(null);
      }

      // Refresh templates
      fetchTemplates();
    } catch (error) {
      console.error('Error deleting template:', error);
      showToast('Failed to delete template', 'error');
    }
  };

  const handleEdit = async (id: string, newName: string) => {
    try {
      const { error } = await supabase
        .from('templates')
        .update({ name: newName })
        .eq('id', id);

      if (error) throw error;

      showToast('Template name updated successfully', 'success');

      // Update local state
      setTemplates(prev =>
        prev.map(t => (t.id === id ? { ...t, template_name: newName } : t))
      );

      if (selectedTemplate?.id === id) {
        setSelectedTemplate(prev => prev ? { ...prev, template_name: newName } : null);
      }
    } catch (error) {
      console.error('Error updating template:', error);
      showToast('Failed to update template name', 'error');
    }
  };

  const handleUploadSuccess = () => {
    showToast('Template uploaded successfully!', 'success');
    fetchTemplates();
  };

  // Don't render if not admin
  if (!isAdmin) {
    return null;
  }

  // Context Panel
  const contextPanel = (
    <TemplatesContextPanel
      searchTerm={searchTerm}
      onSearchChange={setSearchTerm}
      onUpload={() => setIsUploadModalOpen(true)}
      sortBy={sortBy}
      onSortChange={setSortBy}
      totalCount={templates.length}
      filteredCount={filteredTemplates.length}
    />
  );

  // List View (Grid)
  const listView = (
    <TemplatesGridView
      templates={filteredTemplates}
      selectedTemplate={selectedTemplate}
      onSelectTemplate={setSelectedTemplate}
      loading={loading}
      searchTerm={searchTerm}
      onUpload={() => setIsUploadModalOpen(true)}
    />
  );

  // Preview Area (Details Panel)
  const previewArea = (
    <TemplateDetailsPanel
      template={selectedTemplate}
      onDelete={handleDelete}
      onEdit={handleEdit}
    />
  );

  return (
    <>
      <GmailLayout
        contextPanel={contextPanel}
        listView={listView}
        previewArea={<PreviewArea>{previewArea}</PreviewArea>}
        listViewWidth="flex"
        previewWidth="fixed"
      />

      {/* Upload Modal */}
      <TemplateUploadModal
        isOpen={isUploadModalOpen}
        onClose={() => setIsUploadModalOpen(false)}
        onSuccess={handleUploadSuccess}
      />

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
