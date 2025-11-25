'use client';

import { useState, useEffect } from 'react';
import { useOrganization, useUser } from '@/lib/hooks/useAuth';
import { useRouter } from 'next/navigation';
import type { Project, ProjectStatus } from '@/lib/supabase';
import { usePanelContext } from '@/lib/contexts/PanelContext';
import GmailLayout from '@/components/layout/GmailLayout';
import ListView from '@/components/lists/ListView';
import ListToolbar from '@/components/lists/ListToolbar';
import ProjectListItem from '@/components/lists/ProjectListItem';
import PreviewArea from '@/components/preview/PreviewArea';
import Toast from '@/components/Toast';
import { NewProjectModal, ProjectMetrics, ActiveProjectsOverview, ProjectsContextPanel } from '@/components/projects';
import { createProject, deleteProject } from '@/app/actions/projects';

interface ToastMessage {
  message: string;
  type: 'success' | 'error';
  id: number;
}

export default function ProjectsPage() {
  const { organization, isLoaded } = useOrganization();
  const { user } = useUser();
  const router = useRouter();
  const { selectedIds, setSelectedIds, setActiveNav } = usePanelContext();

  const [projects, setProjects] = useState<Project[]>([]);
  const [filteredProjects, setFilteredProjects] = useState<Project[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState<ProjectStatus | 'all'>('all');
  const [showNewProjectModal, setShowNewProjectModal] = useState(false);
  const [toasts, setToasts] = useState<ToastMessage[]>([]);

  const showToast = (message: string, type: 'success' | 'error') => {
    const id = Date.now();
    setToasts((prev) => [...prev, { message, type, id }]);
  };

  const removeToast = (id: number) => {
    setToasts((prev) => prev.filter((toast) => toast.id !== id));
  };

  useEffect(() => {
    setActiveNav('projects');
    // Clear selectedIds when entering projects page to avoid stale IDs from other pages
    setSelectedIds([]);
  }, [setActiveNav, setSelectedIds]);

  useEffect(() => {
    if (organization?.id && user?.id) {
      fetchProjects();
    }
  }, [organization?.id, user?.id]);

  useEffect(() => {
    let filtered = projects;
    if (statusFilter !== 'all') {
      filtered = filtered.filter((p) => p.status === statusFilter);
    }
    if (searchTerm) {
      filtered = filtered.filter(
        (project) =>
          project.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
          project.description?.toLowerCase().includes(searchTerm.toLowerCase())
      );
    }
    setFilteredProjects(filtered);
  }, [searchTerm, statusFilter, projects]);

  const fetchProjects = async () => {
    if (!organization?.id) return;
    setLoading(true);
    try {
      const response = await fetch('/api/projects');
      if (!response.ok) throw new Error('Failed to fetch projects');
      const result = await response.json();
      const fetchedProjects = result.data?.projects || result.projects || [];
      
      // Trust the API response - it should only return valid, accessible projects
      setProjects(fetchedProjects);
    } catch (error) {
      console.error('Error fetching projects:', error);
      showToast('Failed to load projects', 'error');
    } finally {
      setLoading(false);
    }
  };

  const handleCreateProject = async (projectData: {
    name: string;
    description?: string;
    status?: ProjectStatus;
    color?: string;
    workflow_id?: string | null;
  }) => {
    try {
      const formData = new FormData();
      formData.append('name', projectData.name);
      if (projectData.description) formData.append('description', projectData.description);
      if (projectData.color) formData.append('color', projectData.color);
      if (projectData.workflow_id) formData.append('workflowId', projectData.workflow_id);

      const result = await createProject(formData);

      if (result.error) {
        throw new Error(result.error);
      }

      await fetchProjects();
      showToast('Project created successfully', 'success');
    } catch (error) {
      console.error('Error creating project:', error);
      throw error;
    }
  };

  const handleDeleteSelected = async () => {
    if (selectedIds.length === 0) return;
    const confirmDelete = window.confirm(
      `Delete ${selectedIds.length} project(s)? Mockups will not be deleted.`
    );
    if (!confirmDelete) return;

    for (const id of selectedIds) {
      try {
        const result = await deleteProject(id);
        if (result.error) throw new Error(result.error);
      } catch (error) {
        console.error('Error deleting project:', error);
        showToast('Failed to delete project', 'error');
      }
    }
    await fetchProjects();
    setSelectedIds([]);
    showToast('Projects deleted successfully', 'success');
  };

  const activeCount = projects.filter((p) => p.status === 'active').length;
  const completedCount = projects.filter((p) => p.status === 'completed').length;
  const archivedCount = projects.filter((p) => p.status === 'archived').length;

  // Context Panel
  const contextPanelContent = (
    <ProjectsContextPanel
      searchTerm={searchTerm}
      onSearchChange={setSearchTerm}
      onNewProject={() => setShowNewProjectModal(true)}
      statusFilter={statusFilter}
      onStatusFilterChange={setStatusFilter}
      totalCount={projects.length}
      activeCount={activeCount}
      completedCount={completedCount}
      archivedCount={archivedCount}
    />
  );

  // List View
  const listViewContent = (
    <ListView
      items={filteredProjects}
      renderItem={(project, index, isSelected) => (
        <div
          onClick={() => {
            // Select the project to show metrics in preview panel
            setSelectedIds([project.id]);
          }}
        >
          <ProjectListItem
            key={project.id}
            project={project}
            isSelected={isSelected}
            onToggleSelect={() => {
              setSelectedIds((prev: string[]) =>
                prev.includes(project.id)
                  ? prev.filter((id: string) => id !== project.id)
                  : [...prev, project.id]
              );
            }}
          />
        </div>
      )}
      itemHeight={64}
      loading={loading}
      emptyMessage="No projects found"
      toolbar={
        <ListToolbar
          totalCount={filteredProjects.length}
          onSelectAll={() => setSelectedIds(filteredProjects.map(p => p.id))}
          onClearSelection={() => setSelectedIds([])}
          onDelete={handleDeleteSelected}
        />
      }
    />
  );

  // Preview - Show individual project metrics OR aggregated overview
  // Only show ProjectMetrics if the selected ID is actually a project ID
  const selectedProjectId = selectedIds.length === 1 && projects.some(p => p.id === selectedIds[0]) 
    ? selectedIds[0] 
    : null;
  
  const previewContent = selectedProjectId ? (
    <ProjectMetrics projectId={selectedProjectId} />
  ) : selectedIds.length === 0 ? (
    <ActiveProjectsOverview statusFilter={statusFilter} />
  ) : null; // Multiple selected or invalid ID = show count

  return (
    <>
      <GmailLayout
        contextPanel={contextPanelContent}
        listView={listViewContent}
        previewArea={<PreviewArea>{previewContent}</PreviewArea>}
      />

      {showNewProjectModal && (
        <NewProjectModal
          isOpen={showNewProjectModal}
          onClose={() => setShowNewProjectModal(false)}
          onSubmit={handleCreateProject}
        />
      )}

      <div className="fixed bottom-4 right-4 z-50 space-y-2">
        {toasts.map((toast) => (
          <Toast
            key={toast.id}
            message={toast.message}
            type={toast.type}
            onClose={() => removeToast(toast.id)}
          />
        ))}
      </div>
    </>
  );
}
