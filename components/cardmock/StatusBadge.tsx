'use client';

import { CheckCircle, Clock, AlertCircle, FileEdit } from 'lucide-react';

type Status = 'draft' | 'in_review' | 'approved' | 'needs_changes';

interface StatusBadgeProps {
  status: Status;
  size?: 'sm' | 'md';
}

const statusConfig: Record<Status, {
  icon: React.ElementType;
  label: string;
  className: string;
}> = {
  draft: {
    icon: FileEdit,
    label: 'Draft',
    className: 'bg-[var(--bg-surface)] text-[var(--text-tertiary)] border-[var(--border-default)]',
  },
  in_review: {
    icon: Clock,
    label: 'In Review',
    className: 'bg-amber-50 text-amber-700 border-amber-200',
  },
  approved: {
    icon: CheckCircle,
    label: 'Approved',
    className: 'bg-green-50 text-green-700 border-green-200',
  },
  needs_changes: {
    icon: AlertCircle,
    label: 'Needs Changes',
    className: 'bg-red-50 text-red-700 border-red-200',
  },
};

export default function StatusBadge({ status, size = 'md' }: StatusBadgeProps) {
  const config = statusConfig[status] || statusConfig.draft;
  const Icon = config.icon;

  const sizeClasses = size === 'sm'
    ? 'px-2 py-1 text-xs gap-1'
    : 'px-3 py-1.5 text-sm gap-2';

  return (
    <div className={`inline-flex items-center ${sizeClasses} rounded-full border font-medium ${config.className}`}>
      <Icon size={size === 'sm' ? 12 : 14} />
      {config.label}
    </div>
  );
}
