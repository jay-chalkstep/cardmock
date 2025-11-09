'use client';

import { useState, useEffect } from 'react';
import { useOrganization } from '@clerk/nextjs';
import { usePanelContext } from '@/lib/contexts/PanelContext';
import GmailLayout from '@/components/layout/GmailLayout';
import ListView from '@/components/lists/ListView';
import ListToolbar from '@/components/lists/ListToolbar';
import ReviewListItem from '@/components/lists/ReviewListItem';
import PreviewArea from '@/components/preview/PreviewArea';
import ReviewPreview from '@/components/reviews/ReviewPreview';
import { CheckCircle, Search, Loader2 } from 'lucide-react';
import type { Project, CardMockup, WorkflowStageColor } from '@/lib/supabase';

interface PendingMockup {
  mockup: CardMockup;
  stage_order: number;
  stage_name: string;
  stage_color: WorkflowStageColor;
}

interface ProjectWithPendingMockups {
  project: Project;
  pending_mockups: PendingMockup[];
}

interface FlattenedReview {
  id: string; // mockup.id for ListView compatibility
  mockup: CardMockup;
  projectId: string;
  projectName: string;
  projectColor: string;
  stageOrder: number;
  stageName: string;
  stageColor: WorkflowStageColor;
}

export default function MyStageReviewsPage() {
  const { organization } = useOrganization();
  const { selectedIds, setSelectedIds, setActiveNav } = usePanelContext();

  const [projects, setProjects] = useState<ProjectWithPendingMockups[]>([]);
  const [flattenedReviews, setFlattenedReviews] = useState<FlattenedReview[]>([]);
  const [filteredReviews, setFilteredReviews] = useState<FlattenedReview[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [filter, setFilter] = useState<'all' | 'by_project' | 'by_stage'>('all');
  const [approvedMockupIds, setApprovedMockupIds] = useState<Set<string>>(new Set());

  // Set active nav on mount
  useEffect(() => {
    setActiveNav('reviews');
  }, [setActiveNav]);

  useEffect(() => {
    if (organization?.id) {
      fetchMyStageReviews();
    }
  }, [organization?.id]);

  useEffect(() => {
    // Flatten projects into individual reviews
    const flattened: FlattenedReview[] = [];
    projects.forEach((projectData) => {
      projectData.pending_mockups.forEach((pendingMockup) => {
        flattened.push({
          id: pendingMockup.mockup.id,
          mockup: pendingMockup.mockup,
          projectId: projectData.project.id,
          projectName: projectData.project.name,
          projectColor: projectData.project.color,
          stageOrder: pendingMockup.stage_order,
          stageName: pendingMockup.stage_name,
          stageColor: pendingMockup.stage_color,
        });
      });
    });
    setFlattenedReviews(flattened);
  }, [projects]);

  useEffect(() => {
    // Filter reviews based on search term
    let filtered = flattenedReviews;

    if (searchTerm) {
      filtered = filtered.filter(
        (review) =>
          review.mockup.mockup_name.toLowerCase().includes(searchTerm.toLowerCase()) ||
          review.projectName.toLowerCase().includes(searchTerm.toLowerCase()) ||
          review.stageName.toLowerCase().includes(searchTerm.toLowerCase())
      );
    }

    setFilteredReviews(filtered);
  }, [searchTerm, flattenedReviews]);

  const fetchMyStageReviews = async () => {
    setLoading(true);
    try {
      const response = await fetch('/api/reviews/my-stage-reviews');
      const result = await response.json();

      if (!response.ok || !result.success) {
        const errorMessage = result.error || 'Failed to fetch stage reviews';
        throw new Error(errorMessage);
      }

      // Extract data from the response structure { success: true, data: { projects: [...] } }
      const fetchedProjects = result.data?.projects || [];
      setProjects(fetchedProjects);
    } catch (error) {
      console.error('Error fetching stage reviews:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleQuickApprove = async (mockupId: string) => {
    try {
      const response = await fetch(`/api/mockups/${mockupId}/approve`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ notes: '' })
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || 'Failed to approve');
      }

      // Add to approved set
      setApprovedMockupIds(prev => new Set([...prev, mockupId]));

      // Optionally refetch to update the list (remove approved items if they advance)
      // await fetchMyStageReviews();
    } catch (error) {
      console.error('Quick approve failed:', error);
      throw error;
    }
  };

  const totalPendingReviews = flattenedReviews.length;

  // Context Panel
  const contextPanelContent = (
    <div className="p-4 space-y-4">
      <div className="relative">
        <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-[var(--text-tertiary)]" />
        <input
          type="text"
          placeholder="Search reviews..."
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          className="w-full pl-9 pr-3 py-2 text-sm border border-[var(--border-main)] rounded-lg focus:outline-none focus:ring-2 focus:ring-[var(--accent-blue)]"
        />
      </div>

      {totalPendingReviews > 0 && (
        <div className="bg-[var(--accent-blue)] bg-opacity-10 border border-[var(--accent-blue)] rounded-lg p-3 text-center">
          <div className="text-2xl font-bold text-[var(--accent-blue)]">
            {totalPendingReviews}
          </div>
          <div className="text-xs text-[var(--text-secondary)] mt-1">
            pending {totalPendingReviews === 1 ? 'review' : 'reviews'}
          </div>
        </div>
      )}

      <div className="border-t border-[var(--border-main)] pt-4 space-y-1">
        <button
          onClick={() => setFilter('all')}
          className={`w-full flex items-center justify-between px-3 py-2 text-sm rounded-lg transition-colors ${
            filter === 'all' ? 'bg-[var(--bg-selected)] text-[var(--accent-blue)]' : 'hover:bg-[var(--bg-hover)]'
          }`}
        >
          <span>All Reviews</span>
          <span className="text-xs">{flattenedReviews.length}</span>
        </button>
        <button
          onClick={() => setFilter('by_project')}
          className={`w-full flex items-center justify-between px-3 py-2 text-sm rounded-lg transition-colors ${
            filter === 'by_project' ? 'bg-[var(--bg-selected)] text-[var(--accent-blue)]' : 'hover:bg-[var(--bg-hover)]'
          }`}
        >
          <span>By Project</span>
          <span className="text-xs">{projects.length}</span>
        </button>
        <button
          onClick={() => setFilter('by_stage')}
          className={`w-full flex items-center justify-between px-3 py-2 text-sm rounded-lg transition-colors ${
            filter === 'by_stage' ? 'bg-[var(--bg-selected)] text-[var(--accent-blue)]' : 'hover:bg-[var(--bg-hover)]'
          }`}
        >
          <span>By Stage</span>
        </button>
      </div>
    </div>
  );

  // List View
  const listViewContent = (
    <ListView
      items={filteredReviews}
      renderItem={(review, index, isSelected) => (
        <div
          onClick={() => {
            // Select the review to show preview
            setSelectedIds([review.mockup.id]);
          }}
        >
          <ReviewListItem
            key={review.mockup.id}
            mockup={review.mockup}
            projectName={review.projectName}
            projectColor={review.projectColor}
            stageOrder={review.stageOrder}
            stageName={review.stageName}
            stageColor={review.stageColor}
            isSelected={isSelected}
            onToggleSelect={() => {
              setSelectedIds((prev: string[]) =>
                prev.includes(review.mockup.id)
                  ? prev.filter((id: string) => id !== review.mockup.id)
                  : [...prev, review.mockup.id]
              );
            }}
            onQuickApprove={() => handleQuickApprove(review.mockup.id)}
            hasUserApproved={approvedMockupIds.has(review.mockup.id)}
          />
        </div>
      )}
      itemHeight={70}
      loading={loading}
      emptyMessage="No pending reviews! You're all caught up. 🎉"
      toolbar={
        <ListToolbar
          totalCount={filteredReviews.length}
          onSelectAll={() => setSelectedIds(filteredReviews.map(r => r.mockup.id))}
          onClearSelection={() => setSelectedIds([])}
        />
      }
    />
  );

  // Preview
  const previewContent = selectedIds.length === 1 ? (
    (() => {
      const review = filteredReviews.find(r => r.mockup.id === selectedIds[0]);
      if (!review) return <div className="p-8 text-center text-[var(--text-secondary)]">Review not found</div>;
      return (
        <ReviewPreview
          mockupId={review.mockup.id}
          projectId={review.projectId}
          stageOrder={review.stageOrder}
        />
      );
    })()
  ) : null;

  return (
    <GmailLayout
      contextPanel={contextPanelContent}
      listView={listViewContent}
      previewArea={<PreviewArea>{previewContent}</PreviewArea>}
    />
  );
}
