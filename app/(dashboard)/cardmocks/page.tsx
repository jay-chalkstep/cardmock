'use client';

import { useState, useEffect, useMemo } from 'react';
import { useOrganization } from '@/lib/hooks/useAuth';
import { useRouter } from 'next/navigation';
import { usePanelContext } from '@/lib/contexts/PanelContext';
import GmailLayout from '@/components/layout/GmailLayout';
import MockupGridCard from '@/components/mockups/MockupGridCard';
import Toast from '@/components/Toast';
import { CardMockDetailModal } from '@/components/cardmock';
import type { CardMockData } from '@/components/cardmock';
import {
  Grid3X3,
  List,
  ChevronDown,
  Loader2,
  Image as ImageIcon,
  Plus,
  Search,
} from 'lucide-react';

interface ToastMessage {
  message: string;
  type: 'success' | 'error';
  id: number;
}

interface CardMock {
  id: string;
  name?: string;
  mockup_name?: string;
  preview_url?: string;
  mockup_image_url?: string;
  updated_at: string;
  created_at: string;
  created_by?: string;
  brand_id?: string;
  status?: 'draft' | 'in_review' | 'approved' | 'needs_changes';
  brand?: {
    id: string;
    company_name: string;
  };
  project?: {
    id: string;
    name: string;
    color: string;
  };
}

type ViewType = 'grid' | 'list';
type SortType = 'updated' | 'created' | 'name';

export default function CardMocksPage() {
  const { organization, isLoaded } = useOrganization();
  const router = useRouter();
  const { setActiveNav } = usePanelContext();

  // State
  const [viewType, setViewType] = useState<ViewType>('grid');
  const [sortBy, setSortBy] = useState<SortType>('updated');
  const [showSortDropdown, setShowSortDropdown] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');

  const [loading, setLoading] = useState(true);
  const [cardMocks, setCardMocks] = useState<CardMock[]>([]);
  const [toasts, setToasts] = useState<ToastMessage[]>([]);

  // Detail modal state
  const [selectedCardMock, setSelectedCardMock] = useState<CardMock | null>(null);
  const [isDetailModalOpen, setIsDetailModalOpen] = useState(false);

  const showToast = (message: string, type: 'success' | 'error') => {
    const id = Date.now();
    setToasts(prev => [...prev, { message, type, id }]);
  };

  const removeToast = (id: number) => {
    setToasts(prev => prev.filter(toast => toast.id !== id));
  };

  useEffect(() => {
    setActiveNav('cardmocks');
  }, [setActiveNav]);

  // Fetch all org CardMocks
  useEffect(() => {
    if (organization?.id) {
      fetchCardMocks();
    }
  }, [organization?.id]);

  const fetchCardMocks = async () => {
    if (!organization?.id) return;

    setLoading(true);
    try {
      const response = await fetch('/api/mockups?limit=200');
      const result = await response.json();
      const mockupsList = result.data?.mockups || result.mockups || [];
      setCardMocks(mockupsList);
    } catch (error) {
      console.error('Error fetching CardMocks:', error);
      showToast('Failed to load CardMocks', 'error');
    } finally {
      setLoading(false);
    }
  };

  // Filter and sort CardMocks
  const filteredAndSortedCardMocks = useMemo(() => {
    let filtered = [...cardMocks];

    // Apply search filter
    if (searchQuery.trim()) {
      const query = searchQuery.toLowerCase();
      filtered = filtered.filter(mock => {
        const name = (mock.name || mock.mockup_name || '').toLowerCase();
        return name.includes(query);
      });
    }

    // Apply sort
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
  }, [cardMocks, searchQuery, sortBy]);

  const handleDelete = async (id: string) => {
    setCardMocks(prev => prev.filter(m => m.id !== id));
    showToast('CardMock deleted', 'success');
  };

  const openDetailModal = (cardMock: CardMock) => {
    setSelectedCardMock(cardMock);
    setIsDetailModalOpen(true);
  };

  const closeDetailModal = () => {
    setIsDetailModalOpen(false);
    setSelectedCardMock(null);
  };

  const handleUpdate = () => {
    // Refetch after updates (e.g., move, status change)
    fetchCardMocks();
  };

  return (
    <>
      <GmailLayout>
        <div className="h-full flex flex-col">
          {/* Header */}
          <div className="bg-[var(--bg-elevated)] border-b border-[var(--border-default)] px-6 py-4">
            <h1 className="text-[18px] font-semibold text-[var(--text-primary)]">CardMocks</h1>
            <p className="text-[13px] text-[var(--text-secondary)] mt-1">
              All CardMocks in your organization
            </p>
          </div>

          {/* Toolbar */}
          <div className="bg-[var(--bg-elevated)] border-b border-[var(--border-default)] px-6 py-3 flex items-center justify-between gap-4">
            {/* Search */}
            <div className="flex-1 max-w-md">
              <div className="relative">
                <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-[var(--text-tertiary)]" />
                <input
                  type="text"
                  placeholder="Search CardMocks..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="w-full pl-9 pr-4 py-1.5 text-[13px]
                             bg-[var(--bg-surface)] border border-[var(--border-default)]
                             rounded-[var(--radius-sm)] text-[var(--text-primary)]
                             placeholder:text-[var(--text-tertiary)]
                             focus:outline-none focus:border-[var(--accent-primary)]
                             transition-colors"
                />
              </div>
            </div>

            <div className="flex items-center gap-3">
              {/* Sort */}
              <div className="relative">
                <button
                  onClick={() => setShowSortDropdown(!showSortDropdown)}
                  className="flex items-center gap-2 px-3 py-1.5 text-[13px]
                             text-[var(--text-secondary)] border border-[var(--border-default)]
                             rounded-[var(--radius-sm)] hover:bg-[var(--bg-surface)]
                             hover:text-[var(--text-primary)] transition-colors"
                >
                  {sortBy === 'updated' && 'Last edited'}
                  {sortBy === 'created' && 'Date created'}
                  {sortBy === 'name' && 'Name'}
                  <ChevronDown size={14} />
                </button>
                {showSortDropdown && (
                  <>
                    <div className="fixed inset-0 z-10" onClick={() => setShowSortDropdown(false)} />
                    <div className="absolute top-full right-0 mt-1 w-40
                                    bg-[var(--bg-elevated)] border border-[var(--border-default)]
                                    rounded-[var(--radius-md)] shadow-[var(--shadow-lg)] z-20 py-1">
                      <button
                        onClick={() => { setSortBy('updated'); setShowSortDropdown(false); }}
                        className={`w-full px-4 py-2 text-left text-[13px] transition-colors
                                   ${sortBy === 'updated'
                                     ? 'bg-[var(--status-info-muted)] text-[var(--accent-primary)]'
                                     : 'text-[var(--text-secondary)] hover:bg-[var(--bg-surface)]'}`}
                      >
                        Last edited
                      </button>
                      <button
                        onClick={() => { setSortBy('created'); setShowSortDropdown(false); }}
                        className={`w-full px-4 py-2 text-left text-[13px] transition-colors
                                   ${sortBy === 'created'
                                     ? 'bg-[var(--status-info-muted)] text-[var(--accent-primary)]'
                                     : 'text-[var(--text-secondary)] hover:bg-[var(--bg-surface)]'}`}
                      >
                        Date created
                      </button>
                      <button
                        onClick={() => { setSortBy('name'); setShowSortDropdown(false); }}
                        className={`w-full px-4 py-2 text-left text-[13px] transition-colors
                                   ${sortBy === 'name'
                                     ? 'bg-[var(--status-info-muted)] text-[var(--accent-primary)]'
                                     : 'text-[var(--text-secondary)] hover:bg-[var(--bg-surface)]'}`}
                      >
                        Name
                      </button>
                    </div>
                  </>
                )}
              </div>

              {/* View Toggle */}
              <div className="flex items-center gap-1 bg-[var(--bg-surface)] rounded-[var(--radius-sm)] p-0.5">
                <button
                  onClick={() => setViewType('grid')}
                  className={`p-1.5 rounded-[var(--radius-sm)] transition-colors
                             ${viewType === 'grid'
                               ? 'bg-[var(--bg-elevated)] shadow-sm'
                               : 'hover:bg-[var(--bg-elevated)]'}`}
                  title="Grid view"
                >
                  <Grid3X3 size={16} className={viewType === 'grid' ? 'text-[var(--text-primary)]' : 'text-[var(--text-tertiary)]'} />
                </button>
                <button
                  onClick={() => setViewType('list')}
                  className={`p-1.5 rounded-[var(--radius-sm)] transition-colors
                             ${viewType === 'list'
                               ? 'bg-[var(--bg-elevated)] shadow-sm'
                               : 'hover:bg-[var(--bg-elevated)]'}`}
                  title="List view"
                >
                  <List size={16} className={viewType === 'list' ? 'text-[var(--text-primary)]' : 'text-[var(--text-tertiary)]'} />
                </button>
              </div>
            </div>
          </div>

          {/* Content */}
          <div className="flex-1 overflow-y-auto p-6">
            {loading ? (
              <div className="flex items-center justify-center h-64">
                <Loader2 className="h-8 w-8 animate-spin text-[var(--accent-primary)]" />
              </div>
            ) : filteredAndSortedCardMocks.length === 0 ? (
              <div className="flex flex-col items-center justify-center h-64 text-center">
                <div className="w-16 h-16 bg-[var(--bg-surface)] rounded-full flex items-center justify-center mb-4">
                  <ImageIcon size={32} className="text-[var(--text-tertiary)]" />
                </div>
                {searchQuery ? (
                  <>
                    <h3 className="text-[16px] font-medium text-[var(--text-primary)] mb-2">No matches found</h3>
                    <p className="text-[var(--text-secondary)] mb-4 max-w-md text-[13px]">
                      No CardMocks match "{searchQuery}". Try a different search term.
                    </p>
                  </>
                ) : (
                  <>
                    <h3 className="text-[16px] font-medium text-[var(--text-primary)] mb-2">No CardMocks yet</h3>
                    <p className="text-[var(--text-secondary)] mb-4 max-w-md text-[13px]">
                      Create your first CardMock to get started.
                    </p>
                    <button
                      onClick={() => router.push('/designer')}
                      className="flex items-center gap-2 px-4 py-2
                                 bg-[var(--accent-primary)] text-white text-[13px] font-medium
                                 rounded-[var(--radius-sm)] hover:bg-[var(--accent-primary-hover)] transition-colors"
                    >
                      <Plus size={16} />
                      New CardMock
                    </button>
                  </>
                )}
              </div>
            ) : viewType === 'grid' ? (
              <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-4">
                {filteredAndSortedCardMocks.map(cardMock => (
                  <MockupGridCard
                    key={cardMock.id}
                    mockup={cardMock}
                    onDelete={handleDelete}
                    onClick={() => openDetailModal(cardMock)}
                  />
                ))}
              </div>
            ) : (
              // List view
              <div className="bg-[var(--bg-elevated)] rounded-[var(--radius-lg)] border border-[var(--border-default)] divide-y divide-[var(--border-default)]">
                {filteredAndSortedCardMocks.map(cardMock => {
                  const name = cardMock.name || cardMock.mockup_name || 'Untitled';
                  const thumbnailUrl = cardMock.preview_url || cardMock.mockup_image_url;

                  return (
                    <div
                      key={cardMock.id}
                      onClick={() => openDetailModal(cardMock)}
                      className="flex items-center gap-4 p-4 hover:bg-[var(--bg-surface)] cursor-pointer transition-colors"
                    >
                      <div className="w-16 h-12 bg-[var(--bg-surface)] rounded-[var(--radius-sm)] overflow-hidden flex-shrink-0">
                        {thumbnailUrl ? (
                          <img src={thumbnailUrl} alt={name} className="w-full h-full object-cover" />
                        ) : (
                          <div className="w-full h-full flex items-center justify-center">
                            <ImageIcon size={20} className="text-[var(--text-tertiary)]" />
                          </div>
                        )}
                      </div>
                      <div className="flex-1 min-w-0">
                        <h3 className="text-[13px] font-medium text-[var(--text-primary)] truncate">{name}</h3>
                        <p className="text-[11px] text-[var(--text-tertiary)]">
                          Edited {new Date(cardMock.updated_at).toLocaleDateString()}
                        </p>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>

          {/* Results count */}
          {!loading && cardMocks.length > 0 && (
            <div className="bg-[var(--bg-elevated)] border-t border-[var(--border-default)] px-6 py-2">
              <p className="text-[11px] text-[var(--text-tertiary)]">
                {searchQuery
                  ? `${filteredAndSortedCardMocks.length} of ${cardMocks.length} CardMocks`
                  : `${cardMocks.length} CardMocks`}
              </p>
            </div>
          )}
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

      {/* Detail Modal */}
      {selectedCardMock && (
        <CardMockDetailModal
          cardMock={selectedCardMock as CardMockData}
          isOpen={isDetailModalOpen}
          onClose={closeDetailModal}
          onDelete={handleDelete}
          onUpdate={handleUpdate}
        />
      )}
    </>
  );
}
