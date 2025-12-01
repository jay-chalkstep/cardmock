'use client';

import { useState, useEffect } from 'react';
import { X, Loader2 } from 'lucide-react';
import type { CardMockData } from './CardMockDetailModal';

interface Brand {
  id: string;
  company_name: string;
}

interface DuplicateModalProps {
  cardMock: CardMockData;
  isOpen: boolean;
  onClose: () => void;
  onSuccess: (newId: string) => void;
}

export default function DuplicateModal({
  cardMock,
  isOpen,
  onClose,
  onSuccess,
}: DuplicateModalProps) {
  const originalName = cardMock.name || cardMock.mockup_name || 'Untitled';
  const [newName, setNewName] = useState(`${originalName} (Copy)`);
  const [selectedBrandId, setSelectedBrandId] = useState(cardMock.brand_id || '');
  const [brands, setBrands] = useState<Brand[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [isDuplicating, setIsDuplicating] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    if (isOpen) {
      setNewName(`${originalName} (Copy)`);
      fetchBrands();
    }
  }, [isOpen, originalName]);

  const fetchBrands = async () => {
    setIsLoading(true);
    try {
      const response = await fetch('/api/brands');
      if (response.ok) {
        const data = await response.json();
        setBrands(data.brands || []);
        if (!selectedBrandId && data.brands.length > 0) {
          setSelectedBrandId(cardMock.brand_id || data.brands[0].id);
        }
      }
    } catch (error) {
      console.error('Error fetching brands:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleDuplicate = async () => {
    if (!newName.trim()) {
      setError('Please enter a name');
      return;
    }

    setIsDuplicating(true);
    setError('');

    try {
      const response = await fetch('/api/mockups/duplicate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          mockupId: cardMock.id,
          newName: newName.trim(),
          brandId: selectedBrandId,
        }),
      });

      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.error || 'Failed to duplicate');
      }

      const data = await response.json();
      onSuccess(data.mockup.id);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to duplicate');
    } finally {
      setIsDuplicating(false);
    }
  };

  if (!isOpen) return null;

  return (
    <>
      {/* Backdrop */}
      <div className="fixed inset-0 bg-black/50 z-[60]" onClick={onClose} />

      {/* Modal */}
      <div className="fixed inset-0 z-[70] flex items-center justify-center p-4">
        <div
          className="bg-[var(--bg-elevated)] w-full max-w-md rounded-xl shadow-2xl overflow-hidden"
          onClick={(e) => e.stopPropagation()}
        >
          {/* Header */}
          <div className="flex items-center justify-between px-6 py-4 border-b border-[var(--border-default)]">
            <h3 className="text-lg font-semibold text-[var(--text-primary)]">Duplicate CardMock</h3>
            <button
              onClick={onClose}
              className="p-2 hover:bg-[var(--bg-surface)] rounded-lg transition-colors"
            >
              <X size={20} className="text-[var(--text-secondary)]" />
            </button>
          </div>

          {/* Content */}
          <div className="p-6 space-y-4">
            {/* New Name */}
            <div>
              <label className="block text-sm font-medium text-[var(--text-secondary)] mb-2">
                New name
              </label>
              <input
                type="text"
                value={newName}
                onChange={(e) => setNewName(e.target.value)}
                placeholder="Enter name for the copy"
                className="w-full px-4 py-3 bg-[var(--bg-surface)] border border-[var(--border-default)] rounded-lg text-[var(--text-primary)] placeholder:text-[var(--text-tertiary)] focus:outline-none focus:border-[var(--accent-primary)]"
                autoFocus
              />
            </div>

            {/* Destination Brand */}
            <div>
              <label className="block text-sm font-medium text-[var(--text-secondary)] mb-2">
                Destination Brand
              </label>
              {isLoading ? (
                <div className="flex items-center justify-center py-3">
                  <Loader2 size={20} className="animate-spin text-[var(--text-tertiary)]" />
                </div>
              ) : (
                <select
                  value={selectedBrandId}
                  onChange={(e) => setSelectedBrandId(e.target.value)}
                  className="w-full px-4 py-3 bg-[var(--bg-surface)] border border-[var(--border-default)] rounded-lg text-[var(--text-primary)] focus:outline-none focus:border-[var(--accent-primary)]"
                >
                  {brands.map((brand) => (
                    <option key={brand.id} value={brand.id}>
                      {brand.company_name}
                    </option>
                  ))}
                </select>
              )}
            </div>

            {error && (
              <p className="text-sm text-red-600">{error}</p>
            )}
          </div>

          {/* Footer */}
          <div className="px-6 py-4 bg-[var(--bg-surface)] border-t border-[var(--border-default)] flex items-center justify-end gap-3">
            <button
              onClick={onClose}
              className="px-4 py-2 text-[var(--text-secondary)] hover:text-[var(--text-primary)] transition-colors"
            >
              Cancel
            </button>
            <button
              onClick={handleDuplicate}
              disabled={isDuplicating || !newName.trim()}
              className="flex items-center gap-2 px-4 py-2 bg-[var(--accent-primary)] text-white rounded-lg hover:bg-[var(--accent-primary-hover)] disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
            >
              {isDuplicating ? (
                <>
                  <Loader2 size={16} className="animate-spin" />
                  Creating...
                </>
              ) : (
                'Create Copy'
              )}
            </button>
          </div>
        </div>
      </div>
    </>
  );
}
