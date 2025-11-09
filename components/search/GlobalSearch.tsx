'use client';

import { useState, useEffect, useRef } from 'react';
import { useRouter } from 'next/navigation';
import { Search, Loader2, Briefcase, Package, LayoutTemplate, Images, X } from 'lucide-react';

interface SearchResult {
  id: string;
  type: 'project' | 'brand' | 'template' | 'asset';
  title: string;
  subtitle?: string;
  url: string;
}

interface GlobalSearchProps {
  isOpen: boolean;
  onClose: () => void;
}

export default function GlobalSearch({ isOpen, onClose }: GlobalSearchProps) {
  const router = useRouter();
  const [query, setQuery] = useState('');
  const [results, setResults] = useState<SearchResult[]>([]);
  const [loading, setLoading] = useState(false);
  const [selectedIndex, setSelectedIndex] = useState(0);
  const inputRef = useRef<HTMLInputElement>(null);
  const resultsRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (isOpen && inputRef.current) {
      inputRef.current.focus();
    }
  }, [isOpen]);

  useEffect(() => {
    if (!isOpen) {
      setQuery('');
      setResults([]);
      setSelectedIndex(0);
    }
  }, [isOpen]);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (!isOpen) return;

      if (e.key === 'Escape') {
        onClose();
      } else if (e.key === 'ArrowDown') {
        e.preventDefault();
        setSelectedIndex((prev) => Math.min(prev + 1, results.length - 1));
      } else if (e.key === 'ArrowUp') {
        e.preventDefault();
        setSelectedIndex((prev) => Math.max(prev - 1, 0));
      } else if (e.key === 'Enter' && results.length > 0) {
        e.preventDefault();
        const selected = results[selectedIndex];
        if (selected) {
          router.push(selected.url);
          onClose();
        }
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, results, selectedIndex, router, onClose]);

  useEffect(() => {
    if (query.length < 2) {
      setResults([]);
      return;
    }

    const search = async () => {
      setLoading(true);
      try {
        const response = await fetch(`/api/search?q=${encodeURIComponent(query)}`);
        const data = await response.json();

        if (data.success) {
          setResults(data.data.results || []);
        } else {
          setResults([]);
        }
      } catch (error) {
        console.error('Search error:', error);
        setResults([]);
      } finally {
        setLoading(false);
      }
    };

    const debounce = setTimeout(search, 300);
    return () => clearTimeout(debounce);
  }, [query]);

  useEffect(() => {
    if (resultsRef.current && selectedIndex >= 0) {
      const selectedElement = resultsRef.current.children[selectedIndex] as HTMLElement;
      if (selectedElement) {
        selectedElement.scrollIntoView({ block: 'nearest', behavior: 'smooth' });
      }
    }
  }, [selectedIndex, results]);

  const getIcon = (type: string) => {
    switch (type) {
      case 'project':
        return <Briefcase size={16} />;
      case 'brand':
        return <Package size={16} />;
      case 'template':
        return <LayoutTemplate size={16} />;
      case 'asset':
        return <Images size={16} />;
      default:
        return <Search size={16} />;
    }
  };

  const handleResultClick = (result: SearchResult) => {
    router.push(result.url);
    onClose();
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black/50 z-50 flex items-start justify-center pt-20" onClick={onClose}>
      <div
        className="bg-white rounded-lg shadow-xl w-full max-w-2xl mx-4"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Search Input */}
        <div className="flex items-center gap-3 p-4 border-b border-[var(--border-main)]">
          <Search size={20} className="text-[var(--text-tertiary)] flex-shrink-0" />
          <input
            ref={inputRef}
            type="text"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search projects, brands, templates, assets..."
            className="flex-1 outline-none text-[var(--text-primary)] placeholder:text-[var(--text-tertiary)]"
          />
          {loading && <Loader2 size={16} className="animate-spin text-[var(--text-tertiary)]" />}
          <button
            onClick={onClose}
            className="p-1 rounded hover:bg-[var(--bg-hover)] transition-colors"
            aria-label="Close search"
          >
            <X size={16} className="text-[var(--text-tertiary)]" />
          </button>
        </div>

        {/* Results */}
        {query.length >= 2 && (
          <div ref={resultsRef} className="max-h-96 overflow-y-auto">
            {results.length === 0 && !loading && query.length >= 2 && (
              <div className="p-8 text-center text-[var(--text-secondary)]">
                <p>No results found for "{query}"</p>
              </div>
            )}

            {results.length === 0 && loading && (
              <div className="p-8 text-center">
                <Loader2 size={24} className="animate-spin text-[var(--accent-blue)] mx-auto" />
              </div>
            )}

            {results.map((result, index) => (
              <button
                key={`${result.type}-${result.id}`}
                onClick={() => handleResultClick(result)}
                className={`
                  w-full px-4 py-3 flex items-center gap-3 text-left hover:bg-[var(--bg-hover)] transition-colors
                  ${index === selectedIndex ? 'bg-[var(--bg-hover)]' : ''}
                `}
              >
                <div className="text-[var(--text-tertiary)] flex-shrink-0">
                  {getIcon(result.type)}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="font-medium text-[var(--text-primary)] truncate">
                    {result.title}
                  </div>
                  {result.subtitle && (
                    <div className="text-sm text-[var(--text-secondary)] truncate">
                      {result.subtitle}
                    </div>
                  )}
                </div>
                <div className="text-xs text-[var(--text-tertiary)] uppercase flex-shrink-0">
                  {result.type}
                </div>
              </button>
            ))}
          </div>
        )}

        {/* Empty State */}
        {query.length < 2 && (
          <div className="p-8 text-center text-[var(--text-secondary)]">
            <p>Start typing to search...</p>
            <p className="text-xs mt-2 text-[var(--text-tertiary)]">
              Search across projects, brands, templates, and assets
            </p>
          </div>
        )}
      </div>
    </div>
  );
}

