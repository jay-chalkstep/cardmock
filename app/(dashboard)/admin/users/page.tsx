'use client';

import { OrganizationProfile } from '@clerk/nextjs';
import { Users } from 'lucide-react';
import GmailLayout from '@/components/layout/GmailLayout';

export default function UserManagementPage() {
  return (
    <GmailLayout>
      <div className="min-h-screen bg-gray-50">
        {/* Header */}
        <div className="bg-white border-b border-gray-200 sticky top-0 z-10">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
            <div className="flex items-center gap-3">
              <Users className="h-8 w-8 text-purple-600" />
              <div>
                <h1 className="text-3xl font-bold text-gray-900">User Management</h1>
                <p className="text-gray-600 mt-1">
                  Manage your organization members, roles, and invitations.
                </p>
              </div>
            </div>
          </div>
        </div>

        {/* Content */}
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          <div className="bg-white rounded-lg border border-gray-200 overflow-hidden">
            <OrganizationProfile
              appearance={{
                elements: {
                  rootBox: 'w-full',
                  cardBox: 'shadow-none border-0',
                  navbar: 'border-b border-gray-200',
                  navbarButton: 'text-gray-700 hover:text-gray-900 hover:bg-gray-50',
                  navbarButtonActive: 'text-purple-600 bg-purple-50',
                  page: 'p-6',
                  headerTitle: 'text-2xl font-bold text-gray-900',
                  headerSubtitle: 'text-gray-600',
                  formButtonPrimary: 'bg-purple-600 hover:bg-purple-700 text-white',
                  formFieldInput: 'border-gray-300 focus:border-purple-500 focus:ring-purple-500',
                  badge: 'bg-purple-100 text-purple-800',
                  tableHead: 'bg-gray-50 text-gray-700 font-semibold',
                  tableRow: 'border-b border-gray-200',
                  tableCell: 'text-gray-900',
                  button: 'text-gray-700 hover:bg-gray-50',
                  buttonPrimary: 'bg-purple-600 hover:bg-purple-700 text-white',
                  buttonDanger: 'bg-red-600 hover:bg-red-700 text-white',
                  input: 'border-gray-300 focus:border-purple-500 focus:ring-purple-500',
                  selectButton: 'border-gray-300 focus:border-purple-500 focus:ring-purple-500',
                },
                variables: {
                  colorPrimary: '#9333ea',
                  colorText: '#111827',
                  colorTextSecondary: '#6b7280',
                  colorBackground: '#ffffff',
                  colorInputBackground: '#ffffff',
                  colorInputText: '#111827',
                  borderRadius: '0.5rem',
                },
              }}
              routing="hash"
            />
          </div>
        </div>
      </div>
    </GmailLayout>
  );
}
