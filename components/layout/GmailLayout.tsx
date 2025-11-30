'use client';

import { ReactNode } from 'react';
import { usePanelContext } from '@/lib/contexts/PanelContext';
import Breadcrumb from '@/components/navigation/Breadcrumb';

interface GmailLayoutProps {
  children?: ReactNode;
  contextPanel?: ReactNode;
  listView?: ReactNode;
  previewArea?: ReactNode;
  listViewWidth?: 'fixed' | 'flex';
  previewWidth?: 'fixed' | 'flex';
}

export default function GmailLayout({
  children,
  contextPanel,
  listView,
  previewArea,
  listViewWidth = 'fixed',
  previewWidth = 'flex',
}: GmailLayoutProps) {
  const { visibility } = usePanelContext();

  // Show breadcrumb when panels are hidden
  const showBreadcrumb = (!visibility.list || !visibility.context) && visibility.breadcrumb.length > 0;

  return (
    <div className="flex flex-col h-full overflow-hidden">
      {/* Breadcrumb - shown when panels hidden */}
      {showBreadcrumb && <Breadcrumb path={visibility.breadcrumb} />}

      {/* Content Layout */}
      <div className="flex flex-1 overflow-hidden">
        {/* Context Panel - 200px fixed, hidden on mobile/when disabled */}
        {visibility.context && contextPanel && (
          <div className="hidden lg:block w-[200px] flex-shrink-0
                          bg-[var(--bg-base)] border-r border-[var(--border-default)]
                          overflow-y-auto">
            {contextPanel}
          </div>
        )}

        {/* List View - 400px fixed or flex, hidden during canvas */}
        {visibility.list && listView && (
          <div className={`${listViewWidth === 'fixed' ? 'w-[400px] flex-shrink-0' : 'flex-1'}
                          bg-[var(--bg-base)] border-r border-[var(--border-default)]
                          overflow-hidden flex flex-col`}>
            {listView}
          </div>
        )}

        {/* Preview Area / Main Content - Remaining space */}
        <div className={`${previewWidth === 'fixed' ? 'w-96' : 'flex-1'}
                        bg-[var(--bg-base)] overflow-y-auto`}>
          {previewArea || children}
        </div>
      </div>
    </div>
  );
}
