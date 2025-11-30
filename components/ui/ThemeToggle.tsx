'use client';

import { useState, useEffect } from 'react';
import { useTheme } from 'next-themes';
import { Sun, Moon, Monitor, Check } from 'lucide-react';

export function ThemeToggle() {
  const [mounted, setMounted] = useState(false);
  const [open, setOpen] = useState(false);
  const { theme, setTheme, resolvedTheme } = useTheme();

  // Prevent hydration mismatch
  useEffect(() => setMounted(true), []);

  if (!mounted) {
    return <div className="w-8 h-8" />; // Placeholder
  }

  const themes = [
    { value: 'light', label: 'Light', icon: Sun },
    { value: 'dark', label: 'Dark', icon: Moon },
    { value: 'system', label: 'System', icon: Monitor },
  ];

  const currentIcon =
    theme === 'system' ? Monitor : resolvedTheme === 'dark' ? Moon : Sun;

  const CurrentIcon = currentIcon;

  return (
    <div className="relative">
      <button
        onClick={() => setOpen(!open)}
        className="w-8 h-8 flex items-center justify-center rounded-[var(--radius-sm)]
                   hover:bg-[var(--bg-surface)] transition-colors"
        aria-label="Toggle theme"
      >
        <CurrentIcon size={16} className="text-[var(--text-secondary)]" />
      </button>

      {open && (
        <>
          <div
            className="fixed inset-0 z-40"
            onClick={() => setOpen(false)}
          />
          <div className="absolute right-0 top-full mt-2 z-50 min-w-[140px]
                          bg-[var(--bg-elevated)] border border-[var(--border-default)]
                          rounded-[var(--radius-md)] shadow-[var(--shadow-lg)] py-1">
            {themes.map(({ value, label, icon: Icon }) => (
              <button
                key={value}
                onClick={() => {
                  setTheme(value);
                  setOpen(false);
                }}
                className="w-full flex items-center gap-2 px-3 py-2 text-[13px]
                           text-[var(--text-secondary)] hover:bg-[var(--bg-surface)]
                           hover:text-[var(--text-primary)] transition-colors"
              >
                <Icon size={14} />
                <span className="flex-1 text-left">{label}</span>
                {theme === value && (
                  <Check size={14} className="text-[var(--accent-primary)]" />
                )}
              </button>
            ))}
          </div>
        </>
      )}
    </div>
  );
}
