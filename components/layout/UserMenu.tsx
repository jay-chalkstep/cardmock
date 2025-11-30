'use client';

import { useState } from 'react';
import Link from 'next/link';
import { useUser, useOrganization } from '@/lib/hooks/useAuth';
import { useClerk } from '@clerk/nextjs';
import { ChevronDown, Settings, LogOut } from 'lucide-react';

export function UserMenu() {
  const [open, setOpen] = useState(false);
  const { user, isLoaded } = useUser();
  const { organization } = useOrganization();
  const { signOut } = useClerk();

  if (!isLoaded) {
    return <div className="w-8 h-8 rounded-full bg-[var(--bg-surface)] animate-pulse" />;
  }

  const initials = user?.firstName?.[0] || user?.username?.[0]?.toUpperCase() || 'U';
  const displayName = user?.firstName || user?.username || 'User';
  const email = user?.primaryEmailAddress?.emailAddress || organization?.name || '';

  return (
    <div className="relative">
      <button
        onClick={() => setOpen(!open)}
        className="flex items-center gap-2 p-1 rounded-[var(--radius-sm)]
                   hover:bg-[var(--bg-surface)] transition-colors"
        aria-label="User menu"
      >
        <div className="w-8 h-8 rounded-full bg-gradient-to-br from-[var(--accent-primary)] to-[var(--accent-secondary)]
                        flex items-center justify-center flex-shrink-0">
          <span className="text-white text-[13px] font-medium">{initials}</span>
        </div>
        <ChevronDown
          size={14}
          className={`text-[var(--text-tertiary)] transition-transform ${open ? 'rotate-180' : ''}`}
        />
      </button>

      {open && (
        <>
          <div
            className="fixed inset-0 z-40"
            onClick={() => setOpen(false)}
          />
          <div className="absolute right-0 top-full mt-2 z-50 min-w-[200px]
                          bg-[var(--bg-elevated)] border border-[var(--border-default)]
                          rounded-[var(--radius-md)] shadow-[var(--shadow-lg)] py-1 overflow-hidden">
            {/* User info header */}
            <div className="px-3 py-2 border-b border-[var(--border-default)]">
              <p className="text-[13px] font-medium text-[var(--text-primary)] truncate">
                {displayName}
              </p>
              <p className="text-[11px] text-[var(--text-tertiary)] truncate">
                {email}
              </p>
            </div>

            {/* Menu items */}
            <Link
              href="/settings"
              onClick={() => setOpen(false)}
              className="flex items-center gap-2 px-3 py-2 text-[13px]
                         text-[var(--text-secondary)] hover:bg-[var(--bg-surface)]
                         hover:text-[var(--text-primary)] transition-colors"
            >
              <Settings size={14} />
              Settings
            </Link>
            <button
              onClick={async () => {
                setOpen(false);
                await signOut({ redirectUrl: '/sign-in' });
              }}
              className="w-full flex items-center gap-2 px-3 py-2 text-[13px]
                         text-[var(--text-secondary)] hover:bg-[var(--bg-surface)]
                         hover:text-[var(--text-primary)] transition-colors"
            >
              <LogOut size={14} />
              Sign out
            </button>
          </div>
        </>
      )}
    </div>
  );
}
