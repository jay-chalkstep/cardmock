'use client';

import { useState, useEffect } from 'react';
import { formatDistanceToNow } from 'date-fns';
import {
  FileEdit,
  Share2,
  MessageSquare,
  CheckCircle,
  AlertCircle,
  Download,
  Plus,
  User,
  Loader2,
} from 'lucide-react';

interface ActivityItem {
  id: string;
  action: string;
  actor_name?: string;
  actor_avatar?: string;
  metadata?: Record<string, any>;
  created_at: string;
}

interface CardMockHistoryProps {
  cardMockId: string;
  limit?: number;
}

const actionConfig: Record<string, {
  icon: React.ElementType;
  label: string;
  color: string;
}> = {
  created: {
    icon: Plus,
    label: 'Created',
    color: 'text-green-600',
  },
  edited: {
    icon: FileEdit,
    label: 'Edited',
    color: 'text-blue-600',
  },
  shared: {
    icon: Share2,
    label: 'Shared',
    color: 'text-purple-600',
  },
  review_requested: {
    icon: MessageSquare,
    label: 'Review requested',
    color: 'text-amber-600',
  },
  approved: {
    icon: CheckCircle,
    label: 'Approved',
    color: 'text-green-600',
  },
  changes_requested: {
    icon: AlertCircle,
    label: 'Changes requested',
    color: 'text-red-600',
  },
  downloaded: {
    icon: Download,
    label: 'Downloaded',
    color: 'text-gray-600',
  },
  comment_added: {
    icon: MessageSquare,
    label: 'Comment added',
    color: 'text-blue-600',
  },
};

export default function CardMockHistory({ cardMockId, limit = 5 }: CardMockHistoryProps) {
  const [activities, setActivities] = useState<ActivityItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [showAll, setShowAll] = useState(false);

  useEffect(() => {
    fetchHistory();
  }, [cardMockId]);

  const fetchHistory = async () => {
    try {
      const response = await fetch(`/api/mockups/${cardMockId}/activity`);
      if (response.ok) {
        const data = await response.json();
        setActivities(data.activities || []);
      }
    } catch (error) {
      console.error('Error fetching history:', error);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-4">
        <Loader2 size={20} className="animate-spin text-[var(--text-tertiary)]" />
      </div>
    );
  }

  if (activities.length === 0) {
    return (
      <div className="py-4 text-sm text-[var(--text-tertiary)] text-center">
        No activity yet
      </div>
    );
  }

  const displayedActivities = showAll ? activities : activities.slice(0, limit);

  return (
    <div className="mt-3 space-y-3">
      {displayedActivities.map((activity) => {
        const config = actionConfig[activity.action] || {
          icon: FileEdit,
          label: activity.action,
          color: 'text-gray-600',
        };
        const Icon = config.icon;

        return (
          <div key={activity.id} className="flex items-start gap-3 text-sm">
            <div className={`mt-0.5 ${config.color}`}>
              <Icon size={14} />
            </div>
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2">
                {activity.actor_avatar ? (
                  <img
                    src={activity.actor_avatar}
                    alt=""
                    className="w-4 h-4 rounded-full"
                  />
                ) : activity.actor_name ? (
                  <div className="w-4 h-4 rounded-full bg-[var(--bg-surface)] flex items-center justify-center">
                    <User size={10} className="text-[var(--text-tertiary)]" />
                  </div>
                ) : null}
                <span className="text-[var(--text-primary)]">
                  {config.label}
                </span>
                {activity.actor_name && (
                  <span className="text-[var(--text-secondary)]">
                    by {activity.actor_name}
                  </span>
                )}
              </div>
              <div className="text-xs text-[var(--text-tertiary)]">
                {formatDistanceToNow(new Date(activity.created_at), { addSuffix: true })}
              </div>
            </div>
          </div>
        );
      })}

      {activities.length > limit && !showAll && (
        <button
          onClick={() => setShowAll(true)}
          className="text-sm text-[var(--accent-primary)] hover:underline"
        >
          View full history ({activities.length} items)
        </button>
      )}
    </div>
  );
}
