'use client';

import { ReactNode, Suspense } from 'react';
import { TopBar } from '@/components/layout/TopBar';
import { LeftNav } from '@/components/layout/LeftNav';

interface AppShellProps {
  children: ReactNode;
}

// Loading skeleton for LeftNav during Suspense
function LeftNavSkeleton() {
  return (
    <aside className="w-52 h-full flex-shrink-0 bg-[var(--bg-base)]
                      border-r border-[var(--border-default)]
                      flex flex-col py-2 animate-pulse">
      {/* Button skeleton */}
      <div className="px-3 mb-2">
        <div className="h-9 bg-[var(--bg-surface)] rounded-[var(--radius-sm)]" />
      </div>

      {/* Nav items skeleton */}
      <nav className="flex-1 px-2">
        <div className="space-y-1">
          {[...Array(4)].map((_, i) => (
            <div key={i} className="h-8 bg-[var(--bg-surface)] rounded-[var(--radius-sm)]" />
          ))}
        </div>
      </nav>
    </aside>
  );
}

export function AppShell({ children }: AppShellProps) {
  return (
    <div className="min-h-screen bg-[var(--bg-base)]">
      {/* Top Bar */}
      <TopBar />

      {/* Main Content Area */}
      <div className="flex h-screen pt-12">
        {/* Left Navigation Rail */}
        <Suspense fallback={<LeftNavSkeleton />}>
          <LeftNav />
        </Suspense>

        {/* Content Area */}
        <main className="flex-1 overflow-auto bg-[var(--bg-base)]">
          {children}
        </main>
      </div>
    </div>
  );
}
