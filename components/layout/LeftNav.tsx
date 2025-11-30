'use client';

import { useEffect } from 'react';
import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import {
  Clock,
  Palette,
  LayoutTemplate,
  CreditCard,
  Settings,
  Users,
  Plus,
} from 'lucide-react';
import { usePanelContext } from '@/lib/contexts/PanelContext';
import { useAdminStatus } from '@/lib/hooks/useAdminStatus';

interface NavItem {
  id: string;
  name: string;
  href: string;
  icon: React.ComponentType<{ size?: number; className?: string }>;
}

// Main navigation items
const mainNavItems: NavItem[] = [
  { id: 'recents', name: 'Recents', href: '/', icon: Clock },
  { id: 'brands', name: 'Brands', href: '/brands', icon: Palette },
  { id: 'templates', name: 'Templates', href: '/templates', icon: LayoutTemplate },
  { id: 'cardmocks', name: 'CardMocks', href: '/cardmocks', icon: CreditCard },
];

// Admin navigation items
const adminNavItems: NavItem[] = [
  { id: 'manage-templates', name: 'Manage Templates', href: '/templates/manage', icon: Settings },
  { id: 'manage-users', name: 'Manage Users', href: '/admin/users', icon: Users },
];

export function LeftNav() {
  const pathname = usePathname();
  const router = useRouter();
  const { setActiveNav } = usePanelContext();
  const { isAdmin, isLoaded: adminLoaded } = useAdminStatus();

  // Update active nav based on current path
  useEffect(() => {
    if (pathname === '/') {
      setActiveNav('recents');
      return;
    }
    if (pathname?.startsWith('/brands')) {
      setActiveNav('brands');
      return;
    }
    if (pathname?.startsWith('/templates')) {
      setActiveNav('templates');
      return;
    }
    if (pathname?.startsWith('/cardmocks')) {
      setActiveNav('cardmocks');
      return;
    }
  }, [pathname, setActiveNav]);

  const handleNewCardMock = () => {
    router.push('/designer');
  };

  const isActiveNav = (item: NavItem) => {
    if (item.id === 'recents') {
      return pathname === '/';
    }
    if (item.id === 'brands') {
      return pathname?.startsWith('/brands') || false;
    }
    if (item.id === 'templates') {
      // Don't mark templates as active if on manage page
      return (pathname?.startsWith('/templates') && !pathname?.startsWith('/templates/manage')) || false;
    }
    if (item.id === 'cardmocks') {
      return pathname?.startsWith('/cardmocks') || false;
    }
    if (item.id === 'manage-templates') {
      return pathname?.startsWith('/templates/manage') || false;
    }
    if (item.id === 'manage-users') {
      return pathname?.startsWith('/admin/users') || false;
    }
    return false;
  };

  return (
    <aside className="w-52 h-full flex-shrink-0 bg-[var(--bg-base)]
                      border-r border-[var(--border-default)]
                      flex flex-col py-2">
      {/* New CardMock Button */}
      <div className="px-3 mb-2">
        <button
          onClick={handleNewCardMock}
          className="w-full flex items-center justify-center gap-2
                     bg-[var(--accent-primary)] hover:bg-[var(--accent-primary-hover)]
                     text-white text-[13px] font-medium py-2 px-4
                     rounded-[var(--radius-sm)] transition-colors"
        >
          <Plus size={16} />
          New CardMock
        </button>
      </div>

      {/* Main Navigation */}
      <nav className="flex-1 px-2 overflow-y-auto">
        <ul className="space-y-0.5">
          {mainNavItems.map((item) => {
            const isActive = isActiveNav(item);
            return (
              <li key={item.id}>
                <Link
                  href={item.href}
                  className={`
                    nav-item
                    ${isActive ? 'active' : ''}
                  `}
                >
                  <item.icon size={16} />
                  <span>{item.name}</span>
                </Link>
              </li>
            );
          })}
        </ul>
      </nav>

      {/* Admin Section - Conditional */}
      {adminLoaded && isAdmin && (
        <div className="px-2 py-2 border-t border-[var(--border-default)] mt-2">
          <div className="px-2 mb-2">
            <span className="section-label">ADMIN</span>
          </div>
          <ul className="space-y-0.5">
            {adminNavItems.map((item) => {
              const isActive = isActiveNav(item);
              return (
                <li key={item.id}>
                  <Link
                    href={item.href}
                    className={`
                      nav-item
                      ${isActive ? 'active' : ''}
                    `}
                  >
                    <item.icon size={16} />
                    <span>{item.name}</span>
                  </Link>
                </li>
              );
            })}
          </ul>
        </div>
      )}
    </aside>
  );
}
