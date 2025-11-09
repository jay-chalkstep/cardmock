'use client';

import { useState, useEffect, useRef } from 'react';
import { UserButton, useUser } from '@clerk/nextjs';
import {
  Menu,
  Command,
  Bell,
  Sparkles,
  Settings,
  HelpCircle,
} from 'lucide-react';
import { usePanelContext } from '@/lib/contexts/PanelContext';
import { NotificationsPanel } from '@/components/notifications';
import { SettingsModal } from '@/components/settings';

export default function AppHeader() {
  const { visibility, setVisibility } = usePanelContext();
  const { user } = useUser();
  const [notificationCount, setNotificationCount] = useState(0);
  const [notificationsOpen, setNotificationsOpen] = useState(false);
  const notificationsButtonRef = useRef<HTMLButtonElement>(null);
  const [settingsOpen, setSettingsOpen] = useState(false);

  // Fetch unread notification count
  useEffect(() => {
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
    // Poll for new notifications every 30 seconds
    const interval = setInterval(fetchUnreadCount, 30000);
    return () => clearInterval(interval);
  }, []);

  const handleToggleNav = () => {
    // Toggle Context Panel visibility instead of NavRail
    setVisibility({ context: !visibility.context });
  };

  const handleCommandPalette = () => {
    // TODO: Open command palette modal
    console.log('Command palette opened');
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
            Aiproval
          </span>
        </div>
      </div>

      {/* Center Section - Global Search */}
      <div className="flex-1 max-w-2xl mx-auto">
        {/* Search functionality removed */}
      </div>

      {/* Right Section - Tools + User */}
      <div className="flex items-center gap-2 flex-shrink-0">
        {/* Command Palette */}
        <button
          onClick={handleCommandPalette}
          className="hidden md:flex items-center gap-1.5 px-3 py-1.5 rounded-lg hover:bg-[var(--bg-hover)] transition-colors"
          title="Command palette"
        >
          <Command size={16} className="text-[var(--text-icon)]" />
          <kbd className="hidden lg:inline-block px-1.5 py-0.5 text-xs font-semibold text-[var(--text-tertiary)] bg-[var(--bg-primary)] border border-[var(--border-main)] rounded">
            ⌘K
          </kbd>
        </button>

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
    </header>
  );
}
