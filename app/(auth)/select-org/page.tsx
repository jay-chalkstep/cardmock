'use client';

import { OrganizationList } from '@clerk/nextjs';

export default function SelectOrgPage() {
  return (
    <div className="flex flex-col items-center gap-4">
      <h1 className="text-2xl font-bold text-gray-900">Select an Organization</h1>
      <p className="text-gray-600 text-center max-w-md">
        Choose an existing organization or create a new one to get started with CardMock.
      </p>
      <OrganizationList
        afterSelectOrganizationUrl="/"
        afterCreateOrganizationUrl="/"
      />
    </div>
  );
}
