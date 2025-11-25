'use client';

import { useState, useEffect } from 'react';
import { useOrganization, useUser } from '@/lib/hooks/useAuth';
import { useRouter, useSearchParams } from 'next/navigation';
import { usePanelContext } from '@/lib/contexts/PanelContext';
import GmailLayout from '@/components/layout/GmailLayout';
import MockupGridCard from '@/components/mockups/MockupGridCard';
import Toast from '@/components/Toast';
import {
  Grid3X3,
  List,
  ChevronDown,
  Loader2,
  Image as ImageIcon,
  Plus,
} from 'lucide-react';

interface ToastMessage {
  message: string;
  type: 'success' | 'error';
  id: number;
}

interface Mockup {
  id: string;
  name?: string;
  mockup_name?: string;
  preview_url?: string;
  mockup_image_url?: string;
  updated_at: string;
  created_at: string;
  project_id?: string;
  project?: {
    id: string;
    name: string;
    color: string;
  } | null;
  is_featured?: boolean;
}

interface Project {
  id: string;
  name: string;
  color: string;
}

type TabType = 'recent' | 'my-mockups' | 'shared';
type ViewType = 'grid' | 'list';
type SortType = 'updated' | 'created' | 'name';

export default function HomePage() {
  const { organization, isLoaded } = useOrganization();
  const { user } = useUser();
  const router = useRouter();
  const searchParams = useSearchParams();
  const { setActiveNav } = usePanelContext();

  // State
  const [activeTab, setActiveTab] = useState<TabType>('recent');
  const [viewType, setViewType] = useState<ViewType>('grid');
  const [sortBy, setSortBy] = useState<SortType>('updated');
  const [projectFilter, setProjectFilter] = useState<string>('all');
  const [showProjectDropdown, setShowProjectDropdown] = useState(false);
  const [showSortDropdown, setShowSortDropdown] = useState(false);

  const [loading, setLoading] = useState(true);
  const [mockups, setMockups] = useState<Mockup[]>([]);
  const [projects, setProjects] = useState<Project[]>([]);
  const [toasts, setToasts] = useState<ToastMessage[]>([]);

  const showToast = (message: string, type: 'success' | 'error') => {
    const id = Date.now();
    setToasts(prev => [...prev, { message, type, id }]);
  };

  const removeToast = (id: number) => {
    setToasts(prev => prev.filter(toast => toast.id !== id));
  };

  useEffect(() => {
    setActiveNav('recents');
  }, [setActiveNav]);

  // Fetch data
  useEffect(() => {
    if (organization?.id && user?.id) {
      fetchData();
    }
  }, [organization?.id, user?.id, activeTab]);

  const fetchData = async () => {
    if (!organization?.id || !user?.id) return;

    setLoading(true);
    try {
      // Fetch projects for filter dropdown
      const projectsResponse = await fetch('/api/projects');
      const projectsResult = await projectsResponse.json();
      const projectsList = projectsResult.data?.projects || projectsResult.projects || [];
      setProjects(projectsList);

      // Fetch mockups/assets
      const mockupsResponse = await fetch('/api/mockups?limit=50');
      const mockupsResult = await mockupsResponse.json();
      let mockupsList = mockupsResult.data?.mockups || mockupsResult.mockups || [];

      // Enrich with project data
      mockupsList = mockupsList.map((m: any) => {
        const project = projectsList.find((p: Project) => p.id === m.project_id);
        return {
          ...m,
          project: project ? { id: project.id, name: project.name, color: project.color } : null,
        };
      });

      setMockups(mockupsList);
    } catch (error) {
      console.error('Error fetching data:', error);
      showToast('Failed to load data', 'error');
    } finally {
      setLoading(false);
    }
  };

  // Filter and sort mockups
  const getFilteredMockups = () => {
    let filtered = [...mockups];

    // Filter by project
    if (projectFilter !== 'all') {
      filtered = filtered.filter(m => m.project_id === projectFilter);
    }

    // Sort
    filtered.sort((a, b) => {
      switch (sortBy) {
        case 'updated':
          return new Date(b.updated_at).getTime() - new Date(a.updated_at).getTime();
        case 'created':
          return new Date(b.created_at).getTime() - new Date(a.created_at).getTime();
        case 'name':
          const nameA = (a.name || a.mockup_name || '').toLowerCase();
          const nameB = (b.name || b.mockup_name || '').toLowerCase();
          return nameA.localeCompare(nameB);
        default:
          return 0;
      }
    });

    return filtered;
  };

  const filteredMockups = getFilteredMockups();
  const selectedProject = projects.find(p => p.id === projectFilter);

  const handleDelete = async (id: string) => {
    if (!confirm('Are you sure you want to delete this mockup?')) return;

    try {
      const response = await fetch(`/api/mockups/${id}`, { method: 'DELETE' });
      if (response.ok) {
        setMockups(prev => prev.filter(m => m.id !== id));
        showToast('Mockup deleted', 'success');
      } else {
        throw new Error('Failed to delete');
      }
    } catch (error) {
      showToast('Failed to delete mockup', 'error');
    }
  };

  const tabs = [
    { id: 'recent' as TabType, label: 'Recently viewed' },
    { id: 'my-mockups' as TabType, label: 'My mockups' },
    { id: 'shared' as TabType, label: 'Shared with me' },
  ];

  return (
    <>
      <GmailLayout>
        <div className="h-full flex flex-col bg-[#f8f9fa]">
          {/* Header with Tabs */}
          <div className="bg-white border-b border-gray-200 px-6 pt-4">
            {/* Tabs */}
            <div className="flex items-center gap-1">
              {tabs.map(tab => (
                <button
                  key={tab.id}
                  onClick={() => setActiveTab(tab.id)}
                  className={`px-4 py-2.5 text-sm font-medium rounded-t-lg transition-colors relative ${
                    activeTab === tab.id
                      ? 'text-blue-600 bg-blue-50'
                      : 'text-gray-600 hover:text-gray-900 hover:bg-gray-50'
                  }`}
                >
                  {tab.label}
                  {activeTab === tab.id && (
                    <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-blue-600" />
                  )}
                </button>
              ))}
            </div>
          </div>

          {/* Toolbar */}
          <div className="bg-white border-b border-gray-200 px-6 py-3 flex items-center justify-between">
            <div className="flex items-center gap-3">
              {/* Project Filter */}
              <div className="relative">
                <button
                  onClick={() => {
                    setShowProjectDropdown(!showProjectDropdown);
                    setShowSortDropdown(false);
                  }}
                  className="flex items-center gap-2 px-3 py-1.5 text-sm border border-gray-300 rounded-md hover:bg-gray-50"
                >
                  {projectFilter === 'all' ? (
                    'All projects'
                  ) : (
                    <span className="flex items-center gap-2">
                      <span
                        className="w-2 h-2 rounded-full"
                        style={{ backgroundColor: selectedProject?.color || '#3B82F6' }}
                      />
                      {selectedProject?.name || 'Project'}
                    </span>
                  )}
                  <ChevronDown size={14} />
                </button>
                {showProjectDropdown && (
                  <>
                    <div className="fixed inset-0 z-10" onClick={() => setShowProjectDropdown(false)} />
                    <div className="absolute top-full left-0 mt-1 w-56 bg-white border border-gray-200 rounded-lg shadow-lg z-20 py-1 max-h-64 overflow-y-auto">
                      <button
                        onClick={() => {
                          setProjectFilter('all');
                          setShowProjectDropdown(false);
                        }}
                        className={`w-full px-4 py-2 text-left text-sm hover:bg-gray-100 ${
                          projectFilter === 'all' ? 'bg-blue-50 text-blue-600' : ''
                        }`}
                      >
                        All projects
                      </button>
                      {projects.map(project => (
                        <button
                          key={project.id}
                          onClick={() => {
                            setProjectFilter(project.id);
                            setShowProjectDropdown(false);
                          }}
                          className={`w-full px-4 py-2 text-left text-sm hover:bg-gray-100 flex items-center gap-2 ${
                            projectFilter === project.id ? 'bg-blue-50 text-blue-600' : ''
                          }`}
                        >
                          <span
                            className="w-2 h-2 rounded-full flex-shrink-0"
                            style={{ backgroundColor: project.color }}
                          />
                          <span className="truncate">{project.name}</span>
                        </button>
                      ))}
                    </div>
                  </>
                )}
              </div>

              {/* Sort */}
              <div className="relative">
                <button
                  onClick={() => {
                    setShowSortDropdown(!showSortDropdown);
                    setShowProjectDropdown(false);
                  }}
                  className="flex items-center gap-2 px-3 py-1.5 text-sm border border-gray-300 rounded-md hover:bg-gray-50"
                >
                  {sortBy === 'updated' && 'Last edited'}
                  {sortBy === 'created' && 'Date created'}
                  {sortBy === 'name' && 'Name'}
                  <ChevronDown size={14} />
                </button>
                {showSortDropdown && (
                  <>
                    <div className="fixed inset-0 z-10" onClick={() => setShowSortDropdown(false)} />
                    <div className="absolute top-full left-0 mt-1 w-40 bg-white border border-gray-200 rounded-lg shadow-lg z-20 py-1">
                      <button
                        onClick={() => { setSortBy('updated'); setShowSortDropdown(false); }}
                        className={`w-full px-4 py-2 text-left text-sm hover:bg-gray-100 ${sortBy === 'updated' ? 'bg-blue-50 text-blue-600' : ''}`}
                      >
                        Last edited
                      </button>
                      <button
                        onClick={() => { setSortBy('created'); setShowSortDropdown(false); }}
                        className={`w-full px-4 py-2 text-left text-sm hover:bg-gray-100 ${sortBy === 'created' ? 'bg-blue-50 text-blue-600' : ''}`}
                      >
                        Date created
                      </button>
                      <button
                        onClick={() => { setSortBy('name'); setShowSortDropdown(false); }}
                        className={`w-full px-4 py-2 text-left text-sm hover:bg-gray-100 ${sortBy === 'name' ? 'bg-blue-50 text-blue-600' : ''}`}
                      >
                        Name
                      </button>
                    </div>
                  </>
                )}
              </div>
            </div>

            {/* View Toggle */}
            <div className="flex items-center gap-1 bg-gray-100 rounded-md p-0.5">
              <button
                onClick={() => setViewType('grid')}
                className={`p-1.5 rounded ${viewType === 'grid' ? 'bg-white shadow-sm' : 'hover:bg-gray-200'}`}
                title="Grid view"
              >
                <Grid3X3 size={18} className={viewType === 'grid' ? 'text-gray-900' : 'text-gray-500'} />
              </button>
              <button
                onClick={() => setViewType('list')}
                className={`p-1.5 rounded ${viewType === 'list' ? 'bg-white shadow-sm' : 'hover:bg-gray-200'}`}
                title="List view"
              >
                <List size={18} className={viewType === 'list' ? 'text-gray-900' : 'text-gray-500'} />
              </button>
            </div>
          </div>

          {/* Content */}
          <div className="flex-1 overflow-y-auto p-6">
            {loading ? (
              <div className="flex items-center justify-center h-64">
                <Loader2 className="h-8 w-8 animate-spin text-blue-600" />
              </div>
            ) : filteredMockups.length === 0 ? (
              <div className="flex flex-col items-center justify-center h-64 text-center">
                <div className="w-16 h-16 bg-gray-100 rounded-full flex items-center justify-center mb-4">
                  <ImageIcon size={32} className="text-gray-400" />
                </div>
                <h3 className="text-lg font-medium text-gray-900 mb-2">No mockups yet</h3>
                <p className="text-gray-500 mb-4 max-w-md">
                  Create your first mockup to get started. Your recent work will appear here.
                </p>
                <button
                  onClick={() => router.push('/designer')}
                  className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 transition-colors"
                >
                  <Plus size={18} />
                  New Mockup
                </button>
              </div>
            ) : viewType === 'grid' ? (
              <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-4">
                {filteredMockups.map(mockup => (
                  <MockupGridCard
                    key={mockup.id}
                    mockup={mockup}
                    onDelete={handleDelete}
                  />
                ))}
              </div>
            ) : (
              // List view
              <div className="bg-white rounded-lg border border-gray-200 divide-y divide-gray-200">
                {filteredMockups.map(mockup => {
                  const name = mockup.name || mockup.mockup_name || 'Untitled';
                  const thumbnailUrl = mockup.preview_url || mockup.mockup_image_url;

                  return (
                    <div
                      key={mockup.id}
                      onClick={() => router.push(`/mockups/${mockup.id}`)}
                      className="flex items-center gap-4 p-4 hover:bg-gray-50 cursor-pointer"
                    >
                      <div className="w-16 h-12 bg-gray-100 rounded overflow-hidden flex-shrink-0">
                        {thumbnailUrl ? (
                          <img src={thumbnailUrl} alt={name} className="w-full h-full object-cover" />
                        ) : (
                          <div className="w-full h-full flex items-center justify-center">
                            <ImageIcon size={20} className="text-gray-400" />
                          </div>
                        )}
                      </div>
                      <div className="flex-1 min-w-0">
                        <h3 className="text-sm font-medium text-gray-900 truncate">{name}</h3>
                        <p className="text-xs text-gray-500">
                          Edited {new Date(mockup.updated_at).toLocaleDateString()}
                        </p>
                      </div>
                      {mockup.project && (
                        <span
                          className="px-2 py-0.5 text-xs font-medium rounded text-white"
                          style={{ backgroundColor: mockup.project.color }}
                        >
                          {mockup.project.name}
                        </span>
                      )}
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </div>
      </GmailLayout>

      {/* Toast Notifications */}
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
