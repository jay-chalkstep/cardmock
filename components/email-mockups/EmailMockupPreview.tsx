'use client';

import { X } from 'lucide-react';

interface EmailMockupPreviewProps {
  isOpen: boolean;
  onClose: () => void;
  mockup: {
    name: string;
    html_content: string;
    branding_data?: any;
  };
}

export default function EmailMockupPreview({ isOpen, onClose, mockup }: EmailMockupPreviewProps) {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg shadow-xl w-full max-w-3xl h-[90vh] flex flex-col">
        <div className="flex items-center justify-between p-4 border-b border-gray-200">
          <h2 className="text-xl font-semibold">{mockup.name}</h2>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600"
          >
            <X size={20} />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto p-6 bg-gray-50">
          <div className="bg-white p-6 rounded-md shadow-sm max-w-2xl mx-auto">
            <div
              dangerouslySetInnerHTML={{ __html: mockup.html_content }}
              style={{
                fontFamily: mockup.branding_data?.fonts?.[0]?.font_name || 'Arial, sans-serif',
                color: mockup.branding_data?.colors?.[0]?.hex || '#000000',
              }}
            />
          </div>
        </div>
      </div>
    </div>
  );
}



