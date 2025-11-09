'use client';

import { PanelProvider } from '@/lib/contexts/PanelContext';
import AppHeader from '@/components/layout/AppHeader';

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <PanelProvider>
      <AppHeader />
      {children}
    </PanelProvider>
  );
}
