import { Loader2 } from 'lucide-react';

export default function AdminTemplatesLoading() {
  return (
    <div className="flex items-center justify-center h-screen">
      <div className="flex flex-col items-center gap-3">
        <Loader2 className="h-8 w-8 animate-spin text-blue-600" />
        <p className="text-sm text-gray-600">Loading templates...</p>
      </div>
    </div>
  );
}

