'use client';

import { X } from 'lucide-react';
import { ReactNode } from 'react';

export type BadgeVariant = 'default' | 'success' | 'warning' | 'error' | 'info' | 'purple' | 'ai';
export type BadgeSize = 'sm' | 'md' | 'lg';

interface BadgeProps {
  children: ReactNode;
  variant?: BadgeVariant;
  size?: BadgeSize;
  removable?: boolean;
  onRemove?: () => void;
  className?: string;
}

const variantStyles: Record<BadgeVariant, string> = {
  default: 'bg-[var(--bg-surface)] text-[var(--text-secondary)]',
  success: 'bg-[var(--status-success-muted)] text-[var(--status-success)]',
  warning: 'bg-[var(--status-warning-muted)] text-[var(--status-warning)]',
  error: 'bg-[var(--status-error-muted)] text-[var(--status-error)]',
  info: 'bg-[var(--status-info-muted)] text-[var(--status-info)]',
  purple: 'bg-[var(--status-info-muted)] text-[var(--accent-primary)]',
  ai: 'bg-[var(--status-info-muted)] text-[var(--accent-primary)]',
};

const sizeStyles: Record<BadgeSize, string> = {
  sm: 'px-2 py-0.5 text-[11px]',
  md: 'px-2.5 py-1 text-[13px]',
  lg: 'px-3 py-1.5 text-[14px]',
};

export default function Badge({
  children,
  variant = 'default',
  size = 'md',
  removable = false,
  onRemove,
  className = '',
}: BadgeProps) {
  return (
    <span
      className={`
        inline-flex items-center gap-1 rounded-[var(--radius-sm)] font-medium
        ${variantStyles[variant]}
        ${sizeStyles[size]}
        ${className}
      `}
    >
      {children}
      {removable && onRemove && (
        <button
          onClick={onRemove}
          className="hover:opacity-70 transition-opacity"
          aria-label="Remove"
        >
          <X className="h-3 w-3" />
        </button>
      )}
    </span>
  );
}
