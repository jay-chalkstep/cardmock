'use client';

import { useState, useEffect, useRef } from 'react';
import { UserButton, useUser } from '@clerk/nextjs';
import {
  Menu,
  Bell,
  Settings,
  Search,
} from 'lucide-react';
import { usePanelContext } from '@/lib/contexts/PanelContext';
import { NotificationsPanel } from '@/components/notifications';
import { SettingsModal } from '@/components/settings';
import GlobalSearch from '@/components/search/GlobalSearch';

export default function AppHeader() {
  const { visibility, setVisibility } = usePanelContext();
  const { user, isLoaded } = useUser();
  const [notificationCount, setNotificationCount] = useState(0);
  const [notificationsOpen, setNotificationsOpen] = useState(false);
  const notificationsButtonRef = useRef<HTMLButtonElement>(null);
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [searchOpen, setSearchOpen] = useState(false);

  // Fetch unread notification count - wait for Clerk to load first
  useEffect(() => {
    if (!isLoaded) return;

    const fetchUnreadCount = async () => {
      try {
        const response = await fetch('/api/notifications/unread-count');
        const data = await response.json();
        if (data.success) {
          setNotificationCount(data.data.count || 0);
        }
      } catch (error) {
        console.error('Failed to fetch unread count', error);
      }
    };

    fetchUnreadCount();
    const interval = setInterval(fetchUnreadCount, 30000);
    return () => clearInterval(interval);
  }, [isLoaded]);

  const handleToggleNav = () => {
    // Toggle Context Panel visibility instead of NavRail
    setVisibility({ context: !visibility.context });
  };

  const handleNotifications = () => {
    setNotificationsOpen(!notificationsOpen);
  };

  const handleNotificationsClose = () => {
    setNotificationsOpen(false);
    // Refresh count when closing
    fetch('/api/notifications/unread-count')
      .then((res) => res.json())
      .then((data) => {
        if (data.success) {
          setNotificationCount(data.data.count || 0);
        }
      })
      .catch(console.error);
  };

  const handleSettings = () => {
    setSettingsOpen(true);
  };

  const handleSettingsClose = () => {
    setSettingsOpen(false);
  };

  // Handle Cmd+K / Ctrl+K for search
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key === 'k') {
        e.preventDefault();
        setSearchOpen(true);
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, []);

  return (
    <header className="fixed top-0 left-0 right-0 h-16 bg-white border-b border-[var(--border-main)] z-50 flex items-center px-4 gap-4">
      {/* Left Section - Menu + Logo */}
      <div className="flex items-center gap-3 flex-shrink-0">
        <button
          onClick={handleToggleNav}
          className="p-2 rounded-lg hover:bg-[var(--bg-hover)] transition-colors"
          aria-label="Toggle navigation"
          title="Toggle navigation"
        >
          <Menu size={20} className="text-[var(--text-icon)]" />
        </button>
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 bg-gradient-to-br from-[var(--accent-blue)] to-[var(--accent-purple)] rounded-lg flex items-center justify-center">
            <span className="text-white font-bold text-sm">A</span>
          </div>
          <span className="text-lg font-semibold text-[var(--text-primary)] hidden sm:inline">
            CardMock
          </span>
        </div>
      </div>

      {/* Center Section - Global Search */}
      <div className="flex-1 max-w-2xl mx-auto">
        <button
          onClick={() => setSearchOpen(true)}
          className="w-full max-w-xl mx-auto flex items-center gap-3 px-4 py-2 bg-[var(--bg-primary)] border border-[var(--border-main)] rounded-lg hover:border-[var(--accent-blue)] transition-colors text-left"
        >
          <Search size={18} className="text-[var(--text-tertiary)] flex-shrink-0" />
          <span className="text-sm text-[var(--text-secondary)] flex-1">
            Search projects, brands, templates, assets...
          </span>
          <kbd className="hidden sm:inline-flex items-center gap-1 px-2 py-1 text-xs font-semibold text-[var(--text-tertiary)] bg-white border border-[var(--border-main)] rounded">
            <span>⌘</span>K
          </kbd>
        </button>
      </div>

      {/* Right Section - Tools + User */}
      <div className="flex items-center gap-2 flex-shrink-0">
        {/* Notifications */}
        <div className="relative">
          <button
            ref={notificationsButtonRef}
            onClick={handleNotifications}
            className="relative p-2 rounded-lg hover:bg-[var(--bg-hover)] transition-colors"
            title="Notifications"
          >
            <Bell size={20} className="text-[var(--text-icon)]" />
            {notificationCount > 0 && (
              <span className="absolute top-1 right-1 w-4 h-4 bg-[var(--accent-red)] text-white text-[10px] font-bold rounded-full flex items-center justify-center">
                {notificationCount > 9 ? '9+' : notificationCount}
              </span>
            )}
          </button>
          {notificationsOpen && (
            <NotificationsPanel
              isOpen={notificationsOpen}
              onClose={handleNotificationsClose}
              triggerRef={notificationsButtonRef}
            />
          )}
        </div>


        {/* Settings */}
        <button
          onClick={handleSettings}
          className="p-2 rounded-lg hover:bg-[var(--bg-hover)] transition-colors"
          title="Settings"
        >
          <Settings size={20} className="text-[var(--text-icon)]" />
        </button>

        {/* User Button with Name */}
        <div className="ml-2 flex items-center gap-2">
          {user && (
            <span className="text-sm font-medium text-[var(--text-primary)] hidden sm:inline">
              {user.firstName && user.lastName
                ? `${user.firstName} ${user.lastName}`
                : user.firstName || user.username || user.emailAddresses[0]?.emailAddress?.split('@')[0]}
            </span>
          )}
          <UserButton
            showName={false}
            appearance={{
              elements: {
                avatarBox: 'w-8 h-8',
                userButtonTrigger: 'focus:shadow-none hover:opacity-80 transition-opacity',
              },
            }}
          />
        </div>
      </div>

      {/* Settings Modal */}
      {settingsOpen && (
        <SettingsModal isOpen={settingsOpen} onClose={handleSettingsClose} />
      )}

      {/* Global Search */}
      <GlobalSearch isOpen={searchOpen} onClose={() => setSearchOpen(false)} />
    </header>
  );
}
