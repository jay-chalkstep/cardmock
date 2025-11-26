'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { usePathname, useRouter, useSearchParams } from 'next/navigation';
import { useOrganization, useUser } from '@/lib/hooks/useAuth';
import {
  Clock,
  FolderKanban,
  Image,
  LayoutTemplate,
  Search,
  Plus,
  ChevronDown,
  Settings,
  LogOut,
  Workflow,
  BarChart3,
} from 'lucide-react';
import { usePanelContext } from '@/lib/contexts/PanelContext';

interface NavItem {
  id: string;
  name: string;
  href: string;
  icon: React.ComponentType<{ size?: number; className?: string }>;
}

// Figma-inspired main navigation
const mainNavItems: NavItem[] = [
  { id: 'recents', name: 'Recents', href: '/', icon: Clock },
  { id: 'projects', name: 'All Projects', href: '/projects', icon: FolderKanban },
  { id: 'assets', name: 'Assets', href: '/library?tab=assets', icon: Image },
  { id: 'templates', name: 'Templates', href: '/library?tab=templates', icon: LayoutTemplate },
];

// Admin-only items (hidden from regular users)
const adminNavItems: NavItem[] = [
  { id: 'workflows', name: 'Workflows', href: '/admin/workflows', icon: Workflow },
  { id: 'reports', name: 'Reports', href: '/admin/reports', icon: BarChart3 },
];

export default function NavRail() {
  const pathname = usePathname();
  const router = useRouter();
  const searchParams = useSearchParams();
  const { membership, organization } = useOrganization();
  const { user } = useUser();
  const { setActiveNav } = usePanelContext();
  const [searchQuery, setSearchQuery] = useState('');
  const [showUserMenu, setShowUserMenu] = useState(false);

  const isAdmin = membership?.role === 'org:admin';
  const currentTab = searchParams?.get('tab') || '';

  // Update active nav based on current path
  useEffect(() => {
    if (pathname === '/') {
      setActiveNav('recents');
      return;
    }

    if (pathname?.startsWith('/library')) {
      // Check query params for tab
      if (currentTab === 'templates') {
        setActiveNav('templates');
      } else {
        setActiveNav('assets');
      }
      return;
    }

    if (pathname?.startsWith('/projects')) {
      setActiveNav('projects');
      return;
    }

    const activeAdminItem = adminNavItems.find(item => pathname?.startsWith(item.href));
    if (activeAdminItem) {
      setActiveNav(activeAdminItem.id);
    }
  }, [pathname, currentTab, setActiveNav]);

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    if (searchQuery.trim()) {
      router.push(`/search?q=${encodeURIComponent(searchQuery.trim())}`);
    }
  };

  const handleNewMockup = () => {
    router.push('/designer');
  };

  return (
    <div className="w-60 h-full flex-shrink-0 bg-[#1e1e1e] flex flex-col z-40">
      {/* Logo / Brand */}
      <div className="px-4 py-4 border-b border-[#333]">
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 bg-gradient-to-br from-blue-500 to-purple-600 rounded-lg flex items-center justify-center">
            <span className="text-white font-bold text-sm">CM</span>
          </div>
          <span className="text-white font-semibold text-lg">CardMock</span>
        </div>
      </div>

      {/* Search */}
      <div className="px-3 py-3">
        <form onSubmit={handleSearch}>
          <div className="relative">
            <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search..."
              className="w-full bg-[#2d2d2d] text-white text-sm pl-9 pr-3 py-2 rounded-md border border-[#404040] focus:outline-none focus:border-blue-500 placeholder-gray-500"
            />
          </div>
        </form>
      </div>

      {/* New Mockup Button */}
      <div className="px-3 pb-3">
        <button
          onClick={handleNewMockup}
          className="w-full flex items-center justify-center gap-2 bg-blue-600 hover:bg-blue-700 text-white text-sm font-medium py-2.5 px-4 rounded-md transition-colors"
        >
          <Plus size={18} />
          New Mockup
        </button>
      </div>

      {/* Main Navigation */}
      <nav className="flex-1 px-2 py-2 overflow-y-auto">
        <ul className="space-y-0.5">
          {mainNavItems.map((item) => {
            let isActive = false;

            if (item.id === 'recents') {
              isActive = pathname === '/';
            } else if (item.id === 'assets') {
              isActive = pathname?.startsWith('/library') && currentTab !== 'templates';
            } else if (item.id === 'templates') {
              isActive = pathname?.startsWith('/library') && currentTab === 'templates';
            } else if (item.id === 'projects') {
              isActive = pathname?.startsWith('/projects');
            }

            return (
              <li key={item.id}>
                <Link
                  href={item.href}
                  className={`
                    flex items-center gap-3 px-3 py-2 rounded-md transition-all text-sm
                    ${isActive
                      ? 'bg-[#37373d] text-white'
                      : 'text-gray-400 hover:bg-[#2d2d2d] hover:text-white'
                    }
                  `}
                >
                  <item.icon size={18} className="flex-shrink-0" />
                  <span className="font-medium">{item.name}</span>
                </Link>
              </li>
            );
          })}
        </ul>

        {/* Admin Section */}
        {isAdmin && (
          <div className="mt-6 pt-4 border-t border-[#333]">
            <div className="px-3 mb-2">
              <span className="text-xs font-semibold text-gray-500 uppercase tracking-wider">
                Admin
              </span>
            </div>
            <ul className="space-y-0.5">
              {adminNavItems.map((item) => {
                const isActive = pathname === item.href || pathname?.startsWith(item.href);
                return (
                  <li key={item.id}>
                    <Link
                      href={item.href}
                      className={`
                        flex items-center gap-3 px-3 py-2 rounded-md transition-all text-sm
                        ${isActive
                          ? 'bg-[#37373d] text-white'
                          : 'text-gray-400 hover:bg-[#2d2d2d] hover:text-white'
                        }
                      `}
                    >
                      <item.icon size={18} className="flex-shrink-0" />
                      <span className="font-medium">{item.name}</span>
                    </Link>
                  </li>
                );
              })}
            </ul>
          </div>
        )}
      </nav>

      {/* User Menu */}
      <div className="border-t border-[#333] p-3 relative">
        <button
          onClick={() => setShowUserMenu(!showUserMenu)}
          className="w-full flex items-center gap-3 p-2 rounded-md hover:bg-[#2d2d2d] transition-colors"
        >
          <div className="w-8 h-8 rounded-full bg-gradient-to-br from-purple-500 to-pink-500 flex items-center justify-center flex-shrink-0">
            <span className="text-white text-sm font-medium">
              {user?.firstName?.[0] || user?.username?.[0]?.toUpperCase() || 'U'}
            </span>
          </div>
          <div className="flex-1 min-w-0 text-left">
            <p className="text-sm font-medium text-white truncate">
              {user?.firstName || user?.username || 'User'}
            </p>
            <p className="text-xs text-gray-500 truncate">
              {organization?.name || 'Organization'}
            </p>
          </div>
          <ChevronDown size={16} className={`text-gray-400 transition-transform ${showUserMenu ? 'rotate-180' : ''}`} />
        </button>

        {/* Dropdown Menu */}
        {showUserMenu && (
          <>
            <div
              className="fixed inset-0 z-10"
              onClick={() => setShowUserMenu(false)}
            />
            <div className="absolute bottom-full left-3 right-3 mb-2 bg-[#2d2d2d] border border-[#404040] rounded-lg shadow-xl z-20 py-1">
              <Link
                href="/settings"
                className="flex items-center gap-3 px-4 py-2 text-sm text-gray-300 hover:bg-[#37373d] hover:text-white"
                onClick={() => setShowUserMenu(false)}
              >
                <Settings size={16} />
                Settings
              </Link>
              <button
                onClick={() => {
                  setShowUserMenu(false);
                  // Handle logout - will depend on auth implementation
                  router.push('/sign-out');
                }}
                className="w-full flex items-center gap-3 px-4 py-2 text-sm text-gray-300 hover:bg-[#37373d] hover:text-white"
              >
                <LogOut size={16} />
                Sign out
              </button>
            </div>
          </>
        )}
      </div>
    </div>
  );
}
