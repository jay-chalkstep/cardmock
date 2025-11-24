'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { X, Settings, User, Building2, HelpCircle, Bell, Palette, Plug } from 'lucide-react';
import { UserProfile, OrganizationProfile } from '@clerk/nextjs';
import { useOrganization } from '@clerk/nextjs';

interface SettingsModalProps {
  isOpen: boolean;
  onClose: () => void;
  initialTab?: 'preferences' | 'account' | 'organization' | 'integrations' | 'help';
}

type Tab = 'preferences' | 'account' | 'organization' | 'integrations' | 'help';

interface NotificationPreferences {
  email_approval_request: boolean;
  email_approval_received: boolean;
  email_comment: boolean;
  email_stage_progress: boolean;
  email_final_approval: boolean;
  email_changes_requested: boolean;
  in_app_approval_request: boolean;
  in_app_approval_received: boolean;
  in_app_comment: boolean;
  in_app_stage_progress: boolean;
  in_app_final_approval: boolean;
  in_app_changes_requested: boolean;
}

interface UserPreferences {
  notification_preferences: NotificationPreferences;
  theme: 'light' | 'dark' | 'system';
  layout_preferences: Record<string, any>;
}

export default function SettingsModal({
  isOpen,
  onClose,
  initialTab = 'preferences',
}: SettingsModalProps) {
  const router = useRouter();
  const { membership } = useOrganization();
  const [activeTab, setActiveTab] = useState<Tab>(initialTab);
  const [preferences, setPreferences] = useState<UserPreferences | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  const isAdmin = membership?.role === 'org:admin';

  useEffect(() => {
    if (isOpen) {
      setActiveTab(initialTab);
      fetchPreferences();
    }
  }, [isOpen, initialTab]);

  const fetchPreferences = async () => {
    try {
      const response = await fetch('/api/user/preferences');
      const data = await response.json();
      if (data.success) {
        setPreferences(data.data.preferences);
      }
    } catch (error) {
      console.error('Failed to fetch preferences', error);
    } finally {
      setLoading(false);
    }
  };

  const savePreferences = async (updates: Partial<UserPreferences>) => {
    setSaving(true);
    try {
      const response = await fetch('/api/user/preferences', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(updates),
      });
      const data = await response.json();
      if (data.success) {
        setPreferences(data.data.preferences);
      }
    } catch (error) {
      console.error('Failed to save preferences', error);
    } finally {
      setSaving(false);
    }
  };

  const handleNotificationPreferenceChange = (
    key: keyof NotificationPreferences,
    value: boolean
  ) => {
    if (!preferences) return;
    const updated = {
      ...preferences,
      notification_preferences: {
        ...preferences.notification_preferences,
        [key]: value,
      },
    };
    setPreferences(updated);
    savePreferences({ notification_preferences: updated.notification_preferences });
  };

  const handleThemeChange = (theme: 'light' | 'dark' | 'system') => {
    if (!preferences) return;
    const updated = { ...preferences, theme };
    setPreferences(updated);
    savePreferences({ theme });
  };

  if (!isOpen) return null;

  const tabs: Array<{ id: Tab; label: string; icon: React.ComponentType<{ size?: number; className?: string }> }> = [
    { id: 'preferences' as Tab, label: 'Preferences', icon: Bell },
    { id: 'account' as Tab, label: 'Account', icon: User },
    ...(isAdmin ? [{ id: 'organization' as Tab, label: 'Organization', icon: Building2 }] : []),
    { id: 'integrations' as Tab, label: 'Integrations', icon: Plug },
    { id: 'help' as Tab, label: 'Help & Support', icon: HelpCircle },
  ];

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-lg shadow-xl max-w-4xl w-full max-h-[90vh] overflow-hidden flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-[var(--border-main)]">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-[var(--accent-blue)]/10 rounded-lg">
              <Settings className="h-6 w-6 text-[var(--accent-blue)]" />
            </div>
            <h2 className="text-2xl font-semibold text-[var(--text-primary)]">Settings</h2>
          </div>
          <button
            onClick={onClose}
            className="p-2 rounded-lg hover:bg-[var(--bg-hover)] transition-colors"
            title="Close"
          >
            <X className="h-5 w-5 text-[var(--text-icon)]" />
          </button>
        </div>

        {/* Tabs */}
        <div className="flex border-b border-[var(--border-main)]">
          {tabs.map((tab) => {
            const Icon = tab.icon;
            const isActive = activeTab === tab.id;
            return (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={`flex items-center gap-2 px-6 py-4 border-b-2 transition-colors ${
                  isActive
                    ? 'border-[var(--accent-blue)] text-[var(--accent-blue)] bg-[var(--bg-selected)]'
                    : 'border-transparent text-[var(--text-secondary)] hover:text-[var(--text-primary)] hover:bg-[var(--bg-hover)]'
                }`}
              >
                <Icon size={18} />
                <span className="font-medium">{tab.label}</span>
              </button>
            );
          })}
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-6">
          {loading ? (
            <div className="flex items-center justify-center py-12">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-[var(--accent-blue)]"></div>
            </div>
          ) : (
            <>
              {activeTab === 'preferences' && preferences && (
                <div className="space-y-6">
                  <div>
                    <h3 className="text-lg font-semibold text-[var(--text-primary)] mb-4">
                      Notification Preferences
                    </h3>
                    <div className="space-y-4">
                      <div>
                        <h4 className="text-sm font-medium text-[var(--text-secondary)] mb-3">
                          Email Notifications
                        </h4>
                        <div className="space-y-2">
                          {[
                            { key: 'email_approval_request', label: 'Approval requests' },
                            { key: 'email_approval_received', label: 'Approval received' },
                            { key: 'email_comment', label: 'New comments' },
                            { key: 'email_stage_progress', label: 'Stage progress' },
                            { key: 'email_final_approval', label: 'Final approval' },
                            { key: 'email_changes_requested', label: 'Changes requested' },
                          ].map(({ key, label }) => (
                            <label
                              key={key}
                              className="flex items-center justify-between p-3 rounded-lg hover:bg-[var(--bg-hover)] cursor-pointer"
                            >
                              <span className="text-sm text-[var(--text-primary)]">{label}</span>
                              <input
                                type="checkbox"
                                checked={preferences.notification_preferences[key as keyof NotificationPreferences]}
                                onChange={(e) =>
                                  handleNotificationPreferenceChange(
                                    key as keyof NotificationPreferences,
                                    e.target.checked
                                  )
                                }
                                className="w-4 h-4 text-[var(--accent-blue)] rounded focus:ring-[var(--accent-blue)]"
                              />
                            </label>
                          ))}
                        </div>
                      </div>
                      <div>
                        <h4 className="text-sm font-medium text-[var(--text-secondary)] mb-3">
                          In-App Notifications
                        </h4>
                        <div className="space-y-2">
                          {[
                            { key: 'in_app_approval_request', label: 'Approval requests' },
                            { key: 'in_app_approval_received', label: 'Approval received' },
                            { key: 'in_app_comment', label: 'New comments' },
                            { key: 'in_app_stage_progress', label: 'Stage progress' },
                            { key: 'in_app_final_approval', label: 'Final approval' },
                            { key: 'in_app_changes_requested', label: 'Changes requested' },
                          ].map(({ key, label }) => (
                            <label
                              key={key}
                              className="flex items-center justify-between p-3 rounded-lg hover:bg-[var(--bg-hover)] cursor-pointer"
                            >
                              <span className="text-sm text-[var(--text-primary)]">{label}</span>
                              <input
                                type="checkbox"
                                checked={preferences.notification_preferences[key as keyof NotificationPreferences]}
                                onChange={(e) =>
                                  handleNotificationPreferenceChange(
                                    key as keyof NotificationPreferences,
                                    e.target.checked
                                  )
                                }
                                className="w-4 h-4 text-[var(--accent-blue)] rounded focus:ring-[var(--accent-blue)]"
                              />
                            </label>
                          ))}
                        </div>
                      </div>
                    </div>
                  </div>

                  <div>
                    <h3 className="text-lg font-semibold text-[var(--text-primary)] mb-4">
                      Display Preferences
                    </h3>
                    <div className="space-y-4">
                      <div>
                        <label className="block text-sm font-medium text-[var(--text-secondary)] mb-2">
                          Theme
                        </label>
                        <div className="flex gap-2">
                          {(['light', 'dark', 'system'] as const).map((theme) => (
                            <button
                              key={theme}
                              onClick={() => handleThemeChange(theme)}
                              className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                                preferences.theme === theme
                                  ? 'bg-[var(--accent-blue)] text-white'
                                  : 'bg-[var(--bg-hover)] text-[var(--text-primary)] hover:bg-[var(--bg-primary)]'
                              }`}
                            >
                              {theme.charAt(0).toUpperCase() + theme.slice(1)}
                            </button>
                          ))}
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              )}

              {activeTab === 'account' && (
                <div>
                  <UserProfile
                    appearance={{
                      elements: {
                        rootBox: 'w-full',
                        cardBox: 'shadow-none border-0',
                        navbar: 'border-b border-[var(--border-main)]',
                        navbarButton: 'text-[var(--text-secondary)] hover:text-[var(--text-primary)] hover:bg-[var(--bg-hover)]',
                        navbarButtonActive: 'text-[var(--accent-blue)] bg-[var(--bg-selected)]',
                        page: 'p-6',
                      },
                    }}
                    routing="hash"
                  />
                </div>
              )}

              {activeTab === 'organization' && isAdmin && (
                <div>
                  <OrganizationProfile
                    appearance={{
                      elements: {
                        rootBox: 'w-full',
                        cardBox: 'shadow-none border-0',
                        navbar: 'border-b border-[var(--border-main)]',
                        navbarButton: 'text-[var(--text-secondary)] hover:text-[var(--text-primary)] hover:bg-[var(--bg-hover)]',
                        navbarButtonActive: 'text-[var(--accent-blue)] bg-[var(--bg-selected)]',
                        page: 'p-6',
                      },
                    }}
                    routing="hash"
                  />
                </div>
              )}

              {activeTab === 'integrations' && (
                <div className="space-y-6">
                  <div>
                    <h3 className="text-lg font-semibold text-[var(--text-primary)] mb-4">
                      Platform Integrations
                    </h3>
                    <p className="text-sm text-[var(--text-secondary)] mb-4">
                      Connect your favorite tools to streamline your workflow.
                    </p>
                    <div className="space-y-3">
                      <button
                        onClick={() => {
                          onClose();
                          router.push('/settings/integrations/figma');
                        }}
                        className="w-full p-4 rounded-lg border border-[var(--border-main)] hover:bg-[var(--bg-hover)] transition-colors text-left"
                      >
                        <div className="flex items-center justify-between">
                          <div>
                            <div className="font-medium text-[var(--text-primary)]">Figma</div>
                            <div className="text-sm text-[var(--text-secondary)] mt-1">
                              Import frames directly from Figma and sync approval status
                            </div>
                          </div>
                          <div className="text-[var(--accent-blue)]">→</div>
                        </div>
                      </button>
                      <div className="p-4 rounded-lg border border-gray-200 bg-gray-50 text-sm text-gray-600">
                        <div className="font-medium text-gray-700 mb-2">Coming Soon</div>
                        <div className="space-y-2 mt-2">
                          <div>• Gmail Add-on</div>
                          <div>• Slack Integration</div>
                          <div>• Google Drive / Dropbox Import</div>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              )}

              {activeTab === 'help' && (
                <div className="space-y-6">
                  <div>
                    <h3 className="text-lg font-semibold text-[var(--text-primary)] mb-4">
                      Documentation
                    </h3>
                    <div className="space-y-2">
                      <a
                        href="/documentation"
                        target="_blank"
                        rel="noopener noreferrer"
                        className="block p-3 rounded-lg hover:bg-[var(--bg-hover)] text-[var(--accent-blue)] hover:underline"
                      >
                        View Documentation
                      </a>
                      <a
                        href="https://github.com/jay-chalkstep/cardmock"
                        target="_blank"
                        rel="noopener noreferrer"
                        className="block p-3 rounded-lg hover:bg-[var(--bg-hover)] text-[var(--accent-blue)] hover:underline"
                      >
                        GitHub Repository
                      </a>
                    </div>
                  </div>
                  <div>
                    <h3 className="text-lg font-semibold text-[var(--text-primary)] mb-4">
                      Support
                    </h3>
                    <p className="text-sm text-[var(--text-secondary)] mb-4">
                      Need help? Contact our support team or check out our documentation.
                    </p>
                    <div className="space-y-2">
                      <a
                        href="mailto:support@cardmock.com"
                        className="block p-3 rounded-lg hover:bg-[var(--bg-hover)] text-[var(--accent-blue)] hover:underline"
                      >
                        Email Support
                      </a>
                    </div>
                  </div>
                </div>
              )}
            </>
          )}
        </div>
      </div>
    </div>
  );
}

