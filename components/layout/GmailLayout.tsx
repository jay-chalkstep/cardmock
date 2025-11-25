'use client';

import { ReactNode, Suspense } from 'react';
import { usePanelContext } from '@/lib/contexts/PanelContext';
import NavRail from '@/components/navigation/NavRail';
import Breadcrumb from '@/components/navigation/Breadcrumb';

interface GmailLayoutProps {
  children?: ReactNode;
  contextPanel?: ReactNode;
  listView?: ReactNode;
  previewArea?: ReactNode;
  listViewWidth?: 'fixed' | 'flex'; // 'fixed' = 400px, 'flex' = fill remaining space
  previewWidth?: 'fixed' | 'flex'; // 'fixed' = 400px, 'flex' = fill remaining space
}

// Loading skeleton for NavRail during Suspense
function NavRailSkeleton() {
  return (
    <div className="w-60 h-full flex-shrink-0 bg-[#1e1e1e] flex flex-col animate-pulse">
      <div className="px-4 py-4 border-b border-[#333]">
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 bg-[#333] rounded-lg" />
          <div className="h-5 w-24 bg-[#333] rounded" />
        </div>
      </div>
      <div className="px-3 py-3">
        <div className="h-9 bg-[#2d2d2d] rounded-md" />
      </div>
      <div className="px-3 pb-3">
        <div className="h-10 bg-[#333] rounded-md" />
      </div>
      <nav className="flex-1 px-2 py-2">
        <div className="space-y-2">
          {[...Array(5)].map((_, i) => (
            <div key={i} className="h-9 bg-[#2d2d2d] rounded-md" />
          ))}
        </div>
      </nav>
    </div>
  );
}

export default function GmailLayout({
  children,
  contextPanel,
  listView,
  previewArea,
  listViewWidth = 'fixed',
  previewWidth = 'flex',
}: GmailLayoutProps) {
  const { visibility, navVisible } = usePanelContext();

  // Show breadcrumb when panels are hidden
  const showBreadcrumb = (!visibility.list || !visibility.context) && visibility.breadcrumb.length > 0;

  return (
    <div className="flex h-screen bg-[var(--bg-primary)] overflow-hidden pt-16">
      {/* NavRail - Now part of flex flow, wrapped in Suspense for useSearchParams */}
      <Suspense fallback={<NavRailSkeleton />}>
        <NavRail />
      </Suspense>

      {/* Main content area */}
      <div className="flex-1 flex flex-col h-full">
        {/* Breadcrumb - shown when panels hidden */}
        {showBreadcrumb && <Breadcrumb path={visibility.breadcrumb} />}

        {/* 3-Panel Layout: Context | List | Preview */}
        <div className="flex flex-1 overflow-hidden">
          {/* Context Panel - 200px fixed, hidden on mobile/when disabled */}
          {visibility.context && contextPanel && (
            <div className="hidden lg:block w-[var(--context-width)] flex-shrink-0 panel overflow-y-auto">
              {contextPanel}
            </div>
          )}

          {/* List View - 400px fixed or flex, hidden during canvas */}
          {visibility.list && listView && (
            <div className={`${listViewWidth === 'fixed' ? 'w-[var(--list-width)] flex-shrink-0' : 'flex-1'} bg-[var(--bg-primary)] border-r border-[var(--border-main)] overflow-hidden flex flex-col`}>
              {listView}
            </div>
          )}

          {/* Preview Area - Remaining space, expands when list hidden */}
          <div className={`${previewWidth === 'fixed' ? 'w-96' : 'flex-1'} bg-white overflow-y-auto border-l border-[var(--border-main)]`}>
            {previewArea || children}
          </div>
        </div>
      </div>
    </div>
  );
}
