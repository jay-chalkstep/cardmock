'use client';

import { CheckCircle, Clock, XCircle } from 'lucide-react';

interface FigmaStatusBadgeProps {
  status: 'approved' | 'pending' | 'changes_requested' | null;
  stageName?: string;
}

export default function FigmaStatusBadge({ status, stageName }: FigmaStatusBadgeProps) {
  if (!status) {
    return (
      <span className="inline-flex items-center gap-1 px-2 py-1 text-xs font-medium text-gray-600 bg-gray-100 rounded">
        <Clock className="h-3 w-3" />
        No Status
      </span>
    );
  }
  
  const statusConfig = {
    approved: {
      icon: CheckCircle,
      color: 'text-green-700 bg-green-100',
      label: 'Approved',
    },
    pending: {
      icon: Clock,
      color: 'text-yellow-700 bg-yellow-100',
      label: 'Pending',
    },
    changes_requested: {
      icon: XCircle,
      color: 'text-red-700 bg-red-100',
      label: 'Changes Requested',
    },
  };
  
  const config = statusConfig[status];
  const Icon = config.icon;
  
  return (
    <span className={`inline-flex items-center gap-1 px-2 py-1 text-xs font-medium rounded ${config.color}`}>
      <Icon className="h-3 w-3" />
      {stageName ? `${stageName}: ${config.label}` : config.label}
    </span>
  );
}

