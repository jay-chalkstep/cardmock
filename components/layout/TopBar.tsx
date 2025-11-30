'use client';

import { useState, useEffect, useRef } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useUser } from '@/lib/hooks/useAuth';
import { Bell, Search } from 'lucide-react';
import { ThemeToggle } from '@/components/ui/ThemeToggle';
import { UserMenu } from '@/components/layout/UserMenu';
import { NotificationsPanel } from '@/components/notifications';

export function TopBar() {
  const router = useRouter();
  const { isLoaded } = useUser();
  const [searchQuery, setSearchQuery] = useState('');
  const [notificationCount, setNotificationCount] = useState(0);
  const [notificationsOpen, setNotificationsOpen] = useState(false);
  const notificationsButtonRef = useRef<HTMLButtonElement>(null);

  // Fetch unread notification count
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

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    if (searchQuery.trim()) {
      router.push(`/search?q=${encodeURIComponent(searchQuery.trim())}`);
    }
  };

  const handleNotificationsClose = () => {
    setNotificationsOpen(false);
    fetch('/api/notifications/unread-count')
      .then((res) => res.json())
      .then((data) => {
        if (data.success) {
          setNotificationCount(data.data.count || 0);
        }
      })
      .catch(console.error);
  };

  return (
    <header className="fixed top-0 left-0 right-0 h-12 bg-[var(--bg-base)]
                       border-b border-[var(--border-default)] z-50
                       flex items-center px-4 gap-4">
      {/* Left Section - Logo */}
      <div className="flex items-center gap-2 flex-shrink-0">
        <Link href="/" className="flex items-center gap-2 hover:opacity-90 transition-opacity">
          <div className="w-6 h-6 bg-gradient-to-br from-[var(--accent-primary)] to-[var(--accent-secondary)]
                          rounded-[var(--radius-sm)] flex items-center justify-center">
            <span className="text-white font-bold text-[11px]">CM</span>
          </div>
          <span className="text-[16px] font-semibold text-[var(--text-primary)] hidden sm:inline">
            CardMock
          </span>
        </Link>
      </div>

      {/* Center Section - Search Bar */}
      <div className="flex-1 flex justify-center max-w-md mx-auto">
        <form onSubmit={handleSearch} className="w-full">
          <div className="relative">
            <Search
              size={14}
              className="absolute left-3 top-1/2 -translate-y-1/2 text-[var(--text-tertiary)]"
            />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search..."
              className="w-full h-8 bg-[var(--bg-surface)] text-[var(--text-primary)]
                         text-[13px] pl-9 pr-12 rounded-[var(--radius-md)]
                         border border-[var(--border-default)]
                         focus:border-[var(--border-focus)] focus:outline-none
                         placeholder:text-[var(--text-tertiary)]"
            />
            <span className="absolute right-3 top-1/2 -translate-y-1/2
                            text-[11px] text-[var(--text-tertiary)]
                            bg-[var(--bg-base)] px-1.5 py-0.5 rounded-[var(--radius-sm)]
                            border border-[var(--border-default)]">
              Cmd+K
            </span>
          </div>
        </form>
      </div>

      {/* Right Section - Theme Toggle + Notifications + User Menu */}
      <div className="flex items-center gap-2 flex-shrink-0">
        {/* Theme Toggle */}
        <ThemeToggle />

        {/* Notifications */}
        <div className="relative">
          <button
            ref={notificationsButtonRef}
            onClick={() => setNotificationsOpen(!notificationsOpen)}
            className="w-8 h-8 flex items-center justify-center rounded-[var(--radius-sm)]
                       hover:bg-[var(--bg-surface)] transition-colors relative"
            aria-label="Notifications"
          >
            <Bell size={16} className="text-[var(--text-secondary)]" />
            {notificationCount > 0 && (
              <span className="absolute top-1 right-1 w-3.5 h-3.5
                              bg-[var(--status-error)] text-white
                              text-[9px] font-bold rounded-full
                              flex items-center justify-center">
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

        {/* User Menu */}
        <UserMenu />
      </div>
    </header>
  );
}
