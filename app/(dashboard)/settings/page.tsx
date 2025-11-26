'use client';

import { useState, useEffect } from 'react';
import GmailLayout from '@/components/layout/GmailLayout';
import Toast from '@/components/Toast';
import { Settings, Palette, HelpCircle, ExternalLink, Mail } from 'lucide-react';

interface ToastMessage {
  message: string;
  type: 'success' | 'error';
  id: number;
}

export default function SettingsPage() {
  const [theme, setTheme] = useState<'light' | 'dark' | 'system'>('light');
  const [saving, setSaving] = useState(false);
  const [toasts, setToasts] = useState<ToastMessage[]>([]);

  const showToast = (message: string, type: 'success' | 'error') => {
    const id = Date.now();
    setToasts(prev => [...prev, { message, type, id }]);
  };

  const removeToast = (id: number) => {
    setToasts(prev => prev.filter(toast => toast.id !== id));
  };

  // Load preferences on mount
  useEffect(() => {
    fetchPreferences();
  }, []);

  const fetchPreferences = async () => {
    try {
      const response = await fetch('/api/user/preferences');
      const data = await response.json();
      if (data.success && data.data?.preferences?.theme) {
        setTheme(data.data.preferences.theme);
      }
    } catch (error) {
      console.error('Failed to fetch preferences', error);
    }
  };

  const handleThemeChange = async (newTheme: 'light' | 'dark' | 'system') => {
    setTheme(newTheme);
    setSaving(true);
    try {
      const response = await fetch('/api/user/preferences', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ theme: newTheme }),
      });
      const data = await response.json();
      if (data.success) {
        showToast('Theme updated', 'success');
      }
    } catch (error) {
      console.error('Failed to save theme', error);
      showToast('Failed to save theme', 'error');
    } finally {
      setSaving(false);
    }
  };

  return (
    <GmailLayout>
      <div className="max-w-2xl mx-auto">
        {/* Header */}
        <div className="flex items-center gap-3 mb-8">
          <div className="p-2 bg-purple-100 rounded-lg">
            <Settings className="h-6 w-6 text-purple-600" />
          </div>
          <h1 className="text-3xl font-bold text-gray-900">Settings</h1>
        </div>

        {/* Display Settings */}
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6 mb-6">
          <div className="flex items-center gap-3 mb-4">
            <Palette className="h-5 w-5 text-gray-500" />
            <h2 className="text-lg font-semibold text-gray-900">Display</h2>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-3">
              Theme
            </label>
            <div className="flex gap-3">
              {(['light', 'dark', 'system'] as const).map((t) => (
                <button
                  key={t}
                  onClick={() => handleThemeChange(t)}
                  disabled={saving}
                  className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                    theme === t
                      ? 'bg-purple-600 text-white'
                      : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                  } ${saving ? 'opacity-50 cursor-not-allowed' : ''}`}
                >
                  {t.charAt(0).toUpperCase() + t.slice(1)}
                </button>
              ))}
            </div>
            <p className="text-sm text-gray-500 mt-2">
              Choose how CardMock appears on your device
            </p>
          </div>
        </div>

        {/* Help & Support */}
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
          <div className="flex items-center gap-3 mb-4">
            <HelpCircle className="h-5 w-5 text-gray-500" />
            <h2 className="text-lg font-semibold text-gray-900">Help & Support</h2>
          </div>

          <div className="space-y-3">
            <a
              href="https://github.com/jay-chalkstep/cardmock"
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center justify-between p-3 rounded-lg hover:bg-gray-50 border border-gray-200 transition-colors"
            >
              <div className="flex items-center gap-3">
                <ExternalLink size={18} className="text-gray-400" />
                <span className="text-gray-900">Documentation</span>
              </div>
              <span className="text-sm text-gray-500">GitHub</span>
            </a>

            <a
              href="mailto:support@cardmock.com"
              className="flex items-center justify-between p-3 rounded-lg hover:bg-gray-50 border border-gray-200 transition-colors"
            >
              <div className="flex items-center gap-3">
                <Mail size={18} className="text-gray-400" />
                <span className="text-gray-900">Contact Support</span>
              </div>
              <span className="text-sm text-gray-500">Email</span>
            </a>
          </div>
        </div>

        {/* Version Info */}
        <div className="mt-6 text-center text-sm text-gray-400">
          CardMock v1.0.0
        </div>
      </div>

      {/* Toast Notifications */}
      {toasts.map(toast => (
        <Toast
          key={toast.id}
          message={toast.message}
          type={toast.type}
          onClose={() => removeToast(toast.id)}
        />
      ))}
    </GmailLayout>
  );
}
