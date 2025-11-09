'use client';

import { useState, useEffect, useRef } from 'react';
import { useRouter } from 'next/navigation';
import {
  Bell,
  Check,
  CheckCheck,
  X,
  MessageSquare,
  CheckCircle2,
  AlertCircle,
  ArrowRight,
  Clock,
} from 'lucide-react';

interface Notification {
  id: string;
  type: string;
  title: string;
  message: string;
  link_url?: string;
  related_asset_id?: string;
  related_project_id?: string;
  is_read: boolean;
  created_at: string;
  metadata?: Record<string, any>;
}

interface NotificationsPanelProps {
  isOpen: boolean;
  onClose: () => void;
  triggerRef?: React.RefObject<HTMLButtonElement>;
}

export default function NotificationsPanel({
  isOpen,
  onClose,
  triggerRef,
}: NotificationsPanelProps) {
  const router = useRouter();
  const panelRef = useRef<HTMLDivElement>(null);
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [loading, setLoading] = useState(true);
  const [markingAllRead, setMarkingAllRead] = useState(false);

  // Fetch notifications
  useEffect(() => {
    if (isOpen) {
      fetchNotifications();
      // Poll for new notifications every 30 seconds
      const interval = setInterval(fetchNotifications, 30000);
      return () => clearInterval(interval);
    }
  }, [isOpen]);

  // Close panel when clicking outside
  useEffect(() => {
    if (!isOpen) return;

    const handleClickOutside = (event: MouseEvent) => {
      if (
        panelRef.current &&
        !panelRef.current.contains(event.target as Node) &&
        triggerRef?.current &&
        !triggerRef.current.contains(event.target as Node)
      ) {
        onClose();
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [isOpen, onClose, triggerRef]);

  const fetchNotifications = async () => {
    try {
      const response = await fetch('/api/notifications?limit=50');
      const data = await response.json();
      if (data.success) {
        setNotifications(data.data.notifications || []);
      }
    } catch (error) {
      console.error('Failed to fetch notifications', error);
    } finally {
      setLoading(false);
    }
  };

  const markAsRead = async (notificationId: string) => {
    try {
      const response = await fetch(`/api/notifications/${notificationId}/read`, {
        method: 'POST',
      });
      if (response.ok) {
        setNotifications((prev) =>
          prev.map((n) =>
            n.id === notificationId ? { ...n, is_read: true } : n
          )
        );
      }
    } catch (error) {
      console.error('Failed to mark notification as read', error);
    }
  };

  const markAllAsRead = async () => {
    setMarkingAllRead(true);
    try {
      const response = await fetch('/api/notifications/read-all', {
        method: 'POST',
      });
      if (response.ok) {
        setNotifications((prev) =>
          prev.map((n) => ({ ...n, is_read: true }))
        );
      }
    } catch (error) {
      console.error('Failed to mark all as read', error);
    } finally {
      setMarkingAllRead(false);
    }
  };

  const handleNotificationClick = async (notification: Notification) => {
    // Mark as read
    if (!notification.is_read) {
      await markAsRead(notification.id);
    }

    // Navigate to link if available
    if (notification.link_url) {
      router.push(notification.link_url);
      onClose();
    }
  };

  const getNotificationIcon = (type: string) => {
    switch (type) {
      case 'approval_request':
        return <CheckCircle2 className="h-4 w-4 text-blue-500" />;
      case 'approval_received':
        return <CheckCircle2 className="h-4 w-4 text-green-500" />;
      case 'comment':
        return <MessageSquare className="h-4 w-4 text-purple-500" />;
      case 'stage_progress':
        return <ArrowRight className="h-4 w-4 text-orange-500" />;
      case 'final_approval':
        return <CheckCircle2 className="h-4 w-4 text-green-600" />;
      case 'changes_requested':
        return <AlertCircle className="h-4 w-4 text-red-500" />;
      default:
        return <Bell className="h-4 w-4 text-gray-500" />;
    }
  };

  const formatTime = (dateString: string) => {
    const date = new Date(dateString);
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffMins = Math.floor(diffMs / 60000);
    const diffHours = Math.floor(diffMs / 3600000);
    const diffDays = Math.floor(diffMs / 86400000);

    if (diffMins < 1) return 'Just now';
    if (diffMins < 60) return `${diffMins}m ago`;
    if (diffHours < 24) return `${diffHours}h ago`;
    if (diffDays < 7) return `${diffDays}d ago`;
    return date.toLocaleDateString();
  };

  const unreadCount = notifications.filter((n) => !n.is_read).length;

  if (!isOpen) return null;

  return (
    <div
      ref={panelRef}
      className="absolute right-0 top-full mt-2 w-96 bg-white rounded-lg shadow-lg border border-[var(--border-main)] z-50 flex flex-col max-h-[600px]"
    >
      {/* Header */}
      <div className="flex items-center justify-between p-4 border-b border-[var(--border-main)]">
        <div className="flex items-center gap-2">
          <Bell className="h-5 w-5 text-[var(--text-icon)]" />
          <h3 className="text-sm font-semibold text-[var(--text-primary)]">
            Notifications
          </h3>
          {unreadCount > 0 && (
            <span className="px-2 py-0.5 text-xs font-semibold text-white bg-[var(--accent-red)] rounded-full">
              {unreadCount}
            </span>
          )}
        </div>
        <div className="flex items-center gap-2">
          {unreadCount > 0 && (
            <button
              onClick={markAllAsRead}
              disabled={markingAllRead}
              className="p-1.5 rounded hover:bg-[var(--bg-hover)] transition-colors disabled:opacity-50"
              title="Mark all as read"
            >
              <CheckCheck
                className={`h-4 w-4 text-[var(--text-icon)] ${markingAllRead ? 'animate-spin' : ''}`}
              />
            </button>
          )}
          <button
            onClick={onClose}
            className="p-1.5 rounded hover:bg-[var(--bg-hover)] transition-colors"
            title="Close"
          >
            <X className="h-4 w-4 text-[var(--text-icon)]" />
          </button>
        </div>
      </div>

      {/* Notifications List */}
      <div className="flex-1 overflow-y-auto">
        {loading ? (
          <div className="flex items-center justify-center p-8">
            <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-[var(--accent-blue)]"></div>
          </div>
        ) : notifications.length === 0 ? (
          <div className="flex flex-col items-center justify-center p-8 text-center">
            <Bell className="h-12 w-12 text-[var(--text-tertiary)] mb-3" />
            <p className="text-sm font-medium text-[var(--text-primary)] mb-1">
              No notifications
            </p>
            <p className="text-xs text-[var(--text-tertiary)]">
              You're all caught up!
            </p>
          </div>
        ) : (
          <div className="divide-y divide-[var(--border-main)]">
            {notifications.map((notification) => (
              <button
                key={notification.id}
                onClick={() => handleNotificationClick(notification)}
                className={`w-full text-left p-4 hover:bg-[var(--bg-hover)] transition-colors ${
                  !notification.is_read ? 'bg-[var(--bg-selected)]' : ''
                }`}
              >
                <div className="flex items-start gap-3">
                  <div className="flex-shrink-0 mt-0.5">
                    {getNotificationIcon(notification.type)}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-start justify-between gap-2">
                      <p
                        className={`text-sm font-medium ${
                          !notification.is_read
                            ? 'text-[var(--text-primary)]'
                            : 'text-[var(--text-secondary)]'
                        }`}
                      >
                        {notification.title}
                      </p>
                      {!notification.is_read && (
                        <div className="flex-shrink-0 w-2 h-2 bg-[var(--accent-blue)] rounded-full mt-1.5"></div>
                      )}
                    </div>
                    <p className="text-xs text-[var(--text-secondary)] mt-1 line-clamp-2">
                      {notification.message}
                    </p>
                    <div className="flex items-center gap-2 mt-2">
                      <Clock className="h-3 w-3 text-[var(--text-tertiary)]" />
                      <span className="text-xs text-[var(--text-tertiary)]">
                        {formatTime(notification.created_at)}
                      </span>
                    </div>
                  </div>
                </div>
              </button>
            ))}
          </div>
        )}
      </div>

      {/* Footer */}
      {notifications.length > 0 && (
        <div className="border-t border-[var(--border-main)] p-3">
          <button
            onClick={() => {
              router.push('/notifications');
              onClose();
            }}
            className="w-full text-center text-xs font-medium text-[var(--accent-blue)] hover:text-[var(--accent-purple)] transition-colors"
          >
            View all notifications
          </button>
        </div>
      )}
    </div>
  );
}

