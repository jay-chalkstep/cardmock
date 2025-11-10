'use client';

interface VersionOwnerSelectorProps {
  value: 'cdco' | 'client';
  onChange: (value: 'cdco' | 'client') => void;
  readOnly?: boolean;
}

export default function VersionOwnerSelector({
  value,
  onChange,
  readOnly = false,
}: VersionOwnerSelectorProps) {
  if (readOnly) {
    return (
      <div className="inline-flex items-center gap-2">
        <span className={`px-3 py-1 rounded-full text-sm font-medium ${
          value === 'client'
            ? 'bg-yellow-100 text-yellow-800'
            : 'bg-blue-100 text-blue-800'
        }`}>
          {value === 'client' ? "Client's Version" : "CDCO's Version"}
        </span>
      </div>
    );
  }

  return (
    <div className="space-y-2">
      <label className="block text-sm font-medium">Version Owner</label>
      <div className="flex gap-4">
        <label className="flex items-center gap-2 cursor-pointer">
          <input
            type="radio"
            name="version_owner"
            value="cdco"
            checked={value === 'cdco'}
            onChange={() => onChange('cdco')}
            className="text-blue-600 focus:ring-blue-500"
          />
          <span className="text-sm">CDCO's Version</span>
        </label>
        <label className="flex items-center gap-2 cursor-pointer">
          <input
            type="radio"
            name="version_owner"
            value="client"
            checked={value === 'client'}
            onChange={() => onChange('client')}
            className="text-blue-600 focus:ring-blue-500"
          />
          <span className="text-sm">Client's Version</span>
        </label>
      </div>
      <p className="text-xs text-gray-500">
        Indicates whether this version represents CDCO's or the client's latest offering
      </p>
    </div>
  );
}

