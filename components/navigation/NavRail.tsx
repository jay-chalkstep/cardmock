'use client';

import { useEffect } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useOrganization } from '@/lib/hooks/useAuth';
import {
  Library,
  Search,
  Palette,
  MessageSquare,
  Briefcase,
  Workflow,
  Users,
  BarChart3,
  LayoutTemplate,
  Images,
  Package,
  Home,
  Building2,
} from 'lucide-react';
import { usePanelContext } from '@/lib/contexts/PanelContext';

interface NavItem {
  id: string;
  name: string;
  href: string;
  icon: React.ComponentType<{ size?: number; className?: string }>;
}

const navItems: NavItem[] = [
  { id: 'home', name: 'Home', href: '/', icon: Home },
  { id: 'projects', name: 'Projects', href: '/projects', icon: Briefcase },
  { id: 'reviews', name: 'My Reviews', href: '/my-stage-reviews', icon: MessageSquare },
  { id: 'library', name: 'Library', href: '/library', icon: Library },
  { id: 'designer', name: 'Designer', href: '/designer', icon: Palette },
];

const adminNavItems: NavItem[] = [
  { id: 'clients', name: 'Clients', href: '/clients', icon: Users },
  { id: 'workflows', name: 'Workflows', href: '/admin/workflows', icon: Workflow },
  { id: 'reports', name: 'Reports', href: '/admin/reports', icon: BarChart3 },
  { id: 'templates', name: 'Templates', href: '/admin/templates', icon: LayoutTemplate },
];

export default function NavRail() {
  const pathname = usePathname();
  const { membership } = useOrganization();
  const { setActiveNav } = usePanelContext();

  const isAdmin = membership?.role === 'org:admin';

  // Update active nav based on current path
  useEffect(() => {
    if (pathname === '/') {
      setActiveNav('home');
      return;
    }

    if (pathname?.startsWith('/library') || pathname?.startsWith('/gallery')) {
      setActiveNav('library');
      return;
    }

    if (pathname?.startsWith('/clients')) {
      setActiveNav('clients');
      return;
    }

    const activeItem = navItems.find(item => {
      if (item.id === 'home') return false;
      return pathname?.startsWith(item.href);
    });

    if (activeItem) {
      setActiveNav(activeItem.id);
    }

    const activeAdminItem = adminNavItems.find(item => pathname?.startsWith(item.href));
    if (activeAdminItem) {
      setActiveNav(activeAdminItem.id);
    }
  }, [pathname, setActiveNav]);

  return (
    <div className="w-[120px] h-full flex-shrink-0 bg-white border-r border-[var(--border-main)] flex flex-col z-40">
      {/* Nav Items */}
      <nav className="flex-1 py-4 overflow-y-auto">
        <ul className="space-y-1 px-2">
          {navItems.map((item) => {
            const isActive = item.id === 'home'
              ? pathname === item.href
              : item.id === 'library'
              ? pathname?.startsWith('/library') || pathname?.startsWith('/gallery')
              : pathname === item.href || pathname?.startsWith(item.href);
            return (
              <li key={item.id}>
                <Link
                  href={item.href}
                  className={`
                    flex flex-col items-center gap-1 px-3 py-3 rounded-lg transition-all
                    ${isActive
                      ? 'active-nav'
                      : 'text-[var(--text-secondary)] hover:bg-[var(--bg-hover)] hover:text-[var(--text-primary)]'
                    }
                  `}
                >
                  <item.icon size={24} className="flex-shrink-0" />
                  <span className="text-xs font-medium text-center">
                    {item.name}
                  </span>
                </Link>
              </li>
            );
          })}
        </ul>

        {/* Admin Section */}
        {isAdmin && (
          <div className="mt-6">
            <div className="px-4 mb-2">
              <span className="text-xs font-semibold text-[var(--text-tertiary)] uppercase tracking-wider">
                Admin
              </span>
            </div>
            <ul className="space-y-1 px-2">
              {adminNavItems.map((item) => {
                const isActive = pathname === item.href || pathname?.startsWith(item.href);
                return (
                  <li key={item.id}>
                    <Link
                      href={item.href}
                      className={`
                        flex flex-col items-center gap-1 px-3 py-3 rounded-lg transition-all
                        ${isActive
                          ? 'active-nav'
                          : 'text-[var(--text-secondary)] hover:bg-[var(--bg-hover)] hover:text-[var(--text-primary)]'
                        }
                      `}
                    >
                      <item.icon size={24} className="flex-shrink-0" />
                      <span className="text-xs font-medium text-center">
                        {item.name}
                      </span>
                    </Link>
                  </li>
                );
              })}
            </ul>
          </div>
        )}
      </nav>

      {/* Bottom Section - Org indicator */}
      <div className="border-t border-[var(--border-main)] p-3">
        <div className="flex justify-center">
          <div className="w-10 h-10 rounded-lg border border-[var(--border-main)] flex items-center justify-center">
            <Building2 size={20} className="text-[var(--text-secondary)]" />
          </div>
        </div>
      </div>
    </div>
  );
}
