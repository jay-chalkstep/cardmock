'use client';

import { useEffect } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { OrganizationSwitcher, useOrganization } from '@clerk/nextjs';
import { dark } from '@clerk/themes';
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
    // Handle home route specially
    if (pathname === '/') {
      setActiveNav('home');
      return;
    }
    
    // Handle library route (also check for gallery for backward compatibility)
    if (pathname?.startsWith('/library') || pathname?.startsWith('/gallery')) {
      setActiveNav('library');
      return;
    }
    
    const activeItem = navItems.find(item => {
      if (item.id === 'home') return false; // Skip home for other routes
      return pathname?.startsWith(item.href);
    });
    
    if (activeItem) {
      setActiveNav(activeItem.id);
    }
  }, [pathname, setActiveNav]);

  return (
    <div className="w-[120px] h-full flex-shrink-0 bg-white border-r border-[var(--border-main)] flex flex-col z-40">
      {/* Nav Items */}
      <nav className="flex-1 py-4 overflow-y-auto">
        <ul className="space-y-1 px-2">
          {navItems.map((item) => {
            // Special handling for home route
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

      {/* Bottom Section */}
      <div className="border-t border-[var(--border-main)] p-3">
        {/* Organization Switcher */}
        <div className="flex justify-center">
          <OrganizationSwitcher
            appearance={{
              baseTheme: dark,
              elements: {
                rootBox: 'w-10',
                organizationSwitcherTrigger: 'w-10 h-10 p-0 rounded-lg border border-[var(--border-main)] hover:bg-[var(--bg-hover)] transition-colors flex items-center justify-center',
                organizationSwitcherTriggerIcon: 'text-[var(--text-secondary)]',
                organizationPreview: 'hidden',
                organizationPreviewAvatarBox: 'w-8 h-8',
                organizationPreviewMainIdentifier: 'hidden',
                organizationPreviewSecondaryIdentifier: 'hidden',
              },
            }}
          />
        </div>
      </div>
    </div>
  );
}
