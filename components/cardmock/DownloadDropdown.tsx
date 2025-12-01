'use client';

import { useState } from 'react';
import { Download, Loader2, X } from 'lucide-react';
import type { CardMockData } from './CardMockDetailModal';

interface DownloadDropdownProps {
  cardMock: CardMockData;
  hasBack: boolean;
  onClose: () => void;
}

type Format = 'png' | 'jpeg' | 'pdf';
type Resolution = '72' | '300';
type Sides = 'front' | 'back' | 'both';

export default function DownloadDropdown({
  cardMock,
  hasBack,
  onClose,
}: DownloadDropdownProps) {
  const [format, setFormat] = useState<Format>('png');
  const [resolution, setResolution] = useState<Resolution>('72');
  const [sides, setSides] = useState<Sides>(hasBack ? 'both' : 'front');
  const [isDownloading, setIsDownloading] = useState(false);

  // PDF-specific options
  const [includeBleed, setIncludeBleed] = useState(false);
  const [includeTrimMarks, setIncludeTrimMarks] = useState(false);

  const name = cardMock.name || cardMock.mockup_name || 'cardmock';
  const safeFileName = name.replace(/[^a-z0-9]/gi, '-').toLowerCase();

  const handleDownload = async () => {
    setIsDownloading(true);

    try {
      const frontUrl = cardMock.preview_url || cardMock.mockup_image_url;
      const backUrl = cardMock.back_image_url;

      // For simple image formats, download directly
      if (format !== 'pdf') {
        const downloadImage = async (url: string, suffix: string) => {
          // Fetch the image
          const response = await fetch(url);
          const blob = await response.blob();

          // Create canvas for format conversion and resolution scaling
          const img = new Image();
          img.crossOrigin = 'anonymous';

          await new Promise<void>((resolve, reject) => {
            img.onload = () => resolve();
            img.onerror = reject;
            img.src = URL.createObjectURL(blob);
          });

          // Scale factor for high DPI
          const scaleFactor = resolution === '300' ? 4.17 : 1;
          const canvas = document.createElement('canvas');
          canvas.width = img.width * scaleFactor;
          canvas.height = img.height * scaleFactor;

          const ctx = canvas.getContext('2d');
          if (!ctx) throw new Error('Could not get canvas context');

          // For JPEG, fill with white background
          if (format === 'jpeg') {
            ctx.fillStyle = '#FFFFFF';
            ctx.fillRect(0, 0, canvas.width, canvas.height);
          }

          ctx.drawImage(img, 0, 0, canvas.width, canvas.height);

          // Convert to desired format
          const mimeType = format === 'jpeg' ? 'image/jpeg' : 'image/png';
          const quality = format === 'jpeg' ? 0.92 : undefined;

          canvas.toBlob(
            (blob) => {
              if (!blob) return;
              const downloadUrl = URL.createObjectURL(blob);
              const link = document.createElement('a');
              link.href = downloadUrl;
              link.download = `${safeFileName}-${suffix}-${resolution}dpi.${format}`;
              document.body.appendChild(link);
              link.click();
              document.body.removeChild(link);
              URL.revokeObjectURL(downloadUrl);
            },
            mimeType,
            quality
          );

          URL.revokeObjectURL(img.src);
        };

        if (sides === 'front' || sides === 'both') {
          if (frontUrl) await downloadImage(frontUrl, 'front');
        }
        if ((sides === 'back' || sides === 'both') && backUrl) {
          await downloadImage(backUrl, 'back');
        }
      } else {
        // PDF download - call API endpoint
        const response = await fetch('/api/mockups/export-pdf', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            mockupId: cardMock.id,
            sides,
            resolution,
            includeBleed,
            includeTrimMarks,
          }),
        });

        if (!response.ok) {
          throw new Error('Failed to generate PDF');
        }

        const blob = await response.blob();
        const downloadUrl = URL.createObjectURL(blob);
        const link = document.createElement('a');
        link.href = downloadUrl;
        link.download = `${safeFileName}-${resolution}dpi.pdf`;
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        URL.revokeObjectURL(downloadUrl);
      }

      onClose();
    } catch (error) {
      console.error('Download failed:', error);
    } finally {
      setIsDownloading(false);
    }
  };

  return (
    <>
      {/* Backdrop */}
      <div className="fixed inset-0 z-10" onClick={onClose} />

      {/* Dropdown */}
      <div className="absolute top-full left-0 right-0 mt-2 bg-[var(--bg-elevated)] border border-[var(--border-default)] rounded-lg shadow-lg z-20 p-4">
        <div className="flex items-center justify-between mb-4">
          <h3 className="font-medium text-[var(--text-primary)]">Download CardMock</h3>
          <button
            onClick={onClose}
            className="p-1 hover:bg-[var(--bg-surface)] rounded transition-colors"
          >
            <X size={16} className="text-[var(--text-tertiary)]" />
          </button>
        </div>

        <div className="space-y-4">
          {/* Format */}
          <div>
            <label className="block text-sm font-medium text-[var(--text-secondary)] mb-2">
              Format
            </label>
            <div className="space-y-2">
              {[
                { value: 'png', label: 'PNG', desc: 'recommended' },
                { value: 'jpeg', label: 'JPEG', desc: '' },
                { value: 'pdf', label: 'PDF', desc: 'print-ready' },
              ].map((option) => (
                <label key={option.value} className="flex items-center gap-2 cursor-pointer">
                  <input
                    type="radio"
                    name="format"
                    value={option.value}
                    checked={format === option.value}
                    onChange={(e) => setFormat(e.target.value as Format)}
                    className="text-[var(--accent-primary)]"
                  />
                  <span className="text-sm text-[var(--text-primary)]">{option.label}</span>
                  {option.desc && (
                    <span className="text-xs text-[var(--text-tertiary)]">({option.desc})</span>
                  )}
                </label>
              ))}
            </div>
          </div>

          {/* Resolution */}
          <div>
            <label className="block text-sm font-medium text-[var(--text-secondary)] mb-2">
              Resolution
            </label>
            <div className="space-y-2">
              {[
                { value: '72', label: 'Screen (72 DPI)' },
                { value: '300', label: 'Print (300 DPI)' },
              ].map((option) => (
                <label key={option.value} className="flex items-center gap-2 cursor-pointer">
                  <input
                    type="radio"
                    name="resolution"
                    value={option.value}
                    checked={resolution === option.value}
                    onChange={(e) => setResolution(e.target.value as Resolution)}
                    className="text-[var(--accent-primary)]"
                  />
                  <span className="text-sm text-[var(--text-primary)]">{option.label}</span>
                </label>
              ))}
            </div>
          </div>

          {/* Sides */}
          {hasBack && (
            <div>
              <label className="block text-sm font-medium text-[var(--text-secondary)] mb-2">
                Sides
              </label>
              <div className="space-y-2">
                {[
                  { value: 'front', label: 'Front only' },
                  { value: 'back', label: 'Back only' },
                  { value: 'both', label: 'Both' },
                ].map((option) => (
                  <label key={option.value} className="flex items-center gap-2 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={
                        sides === option.value ||
                        (option.value !== 'both' && sides === 'both')
                      }
                      onChange={() => setSides(option.value as Sides)}
                      className="text-[var(--accent-primary)]"
                    />
                    <span className="text-sm text-[var(--text-primary)]">{option.label}</span>
                  </label>
                ))}
              </div>
            </div>
          )}

          {/* PDF-specific options */}
          {format === 'pdf' && (
            <div className="border-t border-[var(--border-default)] pt-4">
              <label className="block text-sm font-medium text-[var(--text-secondary)] mb-2">
                PDF Options
              </label>
              <div className="space-y-2">
                <label className="flex items-center gap-2 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={includeBleed}
                    onChange={(e) => setIncludeBleed(e.target.checked)}
                    className="text-[var(--accent-primary)]"
                  />
                  <span className="text-sm text-[var(--text-primary)]">Include bleed area (3mm)</span>
                </label>
                <label className="flex items-center gap-2 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={includeTrimMarks}
                    onChange={(e) => setIncludeTrimMarks(e.target.checked)}
                    className="text-[var(--accent-primary)]"
                  />
                  <span className="text-sm text-[var(--text-primary)]">Include trim marks</span>
                </label>
              </div>
            </div>
          )}

          {/* Download Button */}
          <button
            onClick={handleDownload}
            disabled={isDownloading}
            className="w-full flex items-center justify-center gap-2 px-4 py-3 bg-[var(--accent-primary)] text-white rounded-lg hover:bg-[var(--accent-primary-hover)] disabled:opacity-50 disabled:cursor-not-allowed transition-colors font-medium"
          >
            {isDownloading ? (
              <>
                <Loader2 size={18} className="animate-spin" />
                Downloading...
              </>
            ) : (
              <>
                <Download size={18} />
                Download
              </>
            )}
          </button>
        </div>
      </div>
    </>
  );
}
