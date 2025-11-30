'use client';

import { PanelProvider } from '@/lib/contexts/PanelContext';
import { AppShell } from '@/components/layout/AppShell';

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <PanelProvider>
      <AppShell>
        {children}
      </AppShell>
    </PanelProvider>
  );
}
