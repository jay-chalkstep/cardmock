'use client';

import { useState, useEffect, useRef } from 'react';
import { useRouter } from 'next/navigation';
import { Search, Loader2, Briefcase, Package, LayoutTemplate, Images } from 'lucide-react';

interface SearchResult {
  id: string;
  type: 'project' | 'brand' | 'template' | 'asset';
  title: string;
  subtitle?: string;
  url: string;
}

export default function InlineSearch() {
  const router = useRouter();
  const [query, setQuery] = useState('');
  const [results, setResults] = useState<SearchResult[]>([]);
  const [loading, setLoading] = useState(false);
  const [isOpen, setIsOpen] = useState(false);
  const [selectedIndex, setSelectedIndex] = useState(-1);
  const inputRef = useRef<HTMLInputElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  // Close dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setIsOpen(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // Handle keyboard navigation
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (!isOpen) return;

      if (e.key === 'Escape') {
        setIsOpen(false);
        inputRef.current?.blur();
      } else if (e.key === 'ArrowDown') {
        e.preventDefault();
        setSelectedIndex((prev) => Math.min(prev + 1, results.length - 1));
      } else if (e.key === 'ArrowUp') {
        e.preventDefault();
        setSelectedIndex((prev) => Math.max(prev - 1, 0));
      } else if (e.key === 'Enter' && selectedIndex >= 0 && results[selectedIndex]) {
        e.preventDefault();
        handleResultClick(results[selectedIndex]);
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, results, selectedIndex]);

  // Search as user types
  useEffect(() => {
    if (query.length < 2) {
      setResults([]);
      setSelectedIndex(-1);
      return;
    }

    const search = async () => {
      setLoading(true);
      try {
        const response = await fetch(`/api/search?q=${encodeURIComponent(query)}`);
        const data = await response.json();

        if (data.success) {
          setResults(data.data.results || []);
          setSelectedIndex(-1);
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

    const debounce = setTimeout(search, 200);
    return () => clearTimeout(debounce);
  }, [query]);

  const getIcon = (type: string) => {
    switch (type) {
      case 'project':
        return <Briefcase size={14} className="text-blue-500" />;
      case 'brand':
        return <Package size={14} className="text-purple-500" />;
      case 'template':
        return <LayoutTemplate size={14} className="text-green-500" />;
      case 'asset':
        return <Images size={14} className="text-orange-500" />;
      default:
        return <Search size={14} className="text-gray-400" />;
    }
  };

  const handleResultClick = (result: SearchResult) => {
    router.push(result.url);
    setQuery('');
    setIsOpen(false);
    setResults([]);
  };

  const handleFocus = () => {
    setIsOpen(true);
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setQuery(e.target.value);
    setIsOpen(true);
  };

  return (
    <div ref={containerRef} className="relative w-full max-w-xl mx-auto">
      {/* Search Input */}
      <div className="relative">
        <Search size={18} className="absolute left-3 top-1/2 -translate-y-1/2 text-[var(--text-tertiary)]" />
        <input
          ref={inputRef}
          type="text"
          value={query}
          onChange={handleInputChange}
          onFocus={handleFocus}
          placeholder="Search projects, brands, templates, assets..."
          className="w-full pl-10 pr-10 py-2 bg-[var(--bg-primary)] border border-[var(--border-main)] rounded-lg text-sm text-[var(--text-primary)] placeholder:text-[var(--text-tertiary)] focus:outline-none focus:border-[var(--accent-blue)] focus:ring-1 focus:ring-[var(--accent-blue)] transition-colors"
        />
        {loading && (
          <Loader2 size={16} className="absolute right-3 top-1/2 -translate-y-1/2 animate-spin text-[var(--text-tertiary)]" />
        )}
        {!loading && query.length === 0 && (
          <kbd className="absolute right-3 top-1/2 -translate-y-1/2 hidden sm:inline-flex items-center gap-0.5 px-1.5 py-0.5 text-[10px] font-medium text-[var(--text-tertiary)] bg-white border border-[var(--border-main)] rounded">
            <span>⌘</span>K
          </kbd>
        )}
      </div>

      {/* Dropdown Results */}
      {isOpen && (query.length >= 2 || results.length > 0) && (
        <div className="absolute top-full left-0 right-0 mt-1 bg-white border border-[var(--border-main)] rounded-lg shadow-lg z-50 overflow-hidden">
          {results.length === 0 && !loading && query.length >= 2 && (
            <div className="px-4 py-3 text-sm text-[var(--text-secondary)]">
              No results for "{query}"
            </div>
          )}

          {results.length > 0 && (
            <div className="max-h-80 overflow-y-auto">
              {results.map((result, index) => (
                <button
                  key={`${result.type}-${result.id}`}
                  onClick={() => handleResultClick(result)}
                  onMouseEnter={() => setSelectedIndex(index)}
                  className={`
                    w-full px-3 py-2 flex items-center gap-3 text-left transition-colors
                    ${index === selectedIndex ? 'bg-[var(--bg-hover)]' : 'hover:bg-[var(--bg-hover)]'}
                  `}
                >
                  <div className="flex-shrink-0">
                    {getIcon(result.type)}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="text-sm font-medium text-[var(--text-primary)] truncate">
                      {result.title}
                    </div>
                    {result.subtitle && (
                      <div className="text-xs text-[var(--text-secondary)] truncate">
                        {result.subtitle}
                      </div>
                    )}
                  </div>
                  <span className="flex-shrink-0 text-[10px] uppercase text-[var(--text-tertiary)] bg-[var(--bg-primary)] px-1.5 py-0.5 rounded">
                    {result.type}
                  </span>
                </button>
              ))}
            </div>
          )}

          {query.length >= 2 && results.length > 0 && (
            <div className="px-3 py-2 border-t border-[var(--border-main)] text-xs text-[var(--text-tertiary)]">
              <span className="mr-2">↑↓ Navigate</span>
              <span className="mr-2">↵ Select</span>
              <span>Esc Close</span>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
