'use client';

import { User } from 'lucide-react';
import { useUser } from '@/lib/hooks/useAuth';

export default function AuthHeader() {
  const { user } = useUser();

  return (
    <header className="flex justify-end items-center p-4 gap-4 h-16">
      <div className="flex items-center gap-2">
        <span className="text-sm font-medium">
          {user.firstName} {user.lastName}
        </span>
        <div className="w-8 h-8 bg-[#6c47ff] rounded-full flex items-center justify-center">
          <User size={16} className="text-white" />
        </div>
      </div>
    </header>
  );
}
