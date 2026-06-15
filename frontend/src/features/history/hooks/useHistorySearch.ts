import { useEffect, useRef, useState } from 'react';

export function useHistorySearch() {
  const [isSearchOpen, setIsSearchOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const searchInputRef = useRef<HTMLInputElement>(null);
  const searchContainerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (isSearchOpen) {
      searchInputRef.current?.focus();
    }
  }, [isSearchOpen]);

  useEffect(() => {
    if (!isSearchOpen) return;

    const handlePointerDown = (event: PointerEvent) => {
      const hasSearchText = searchQuery.trim().length > 0;
      if (hasSearchText) return;

      if (!searchContainerRef.current?.contains(event.target as Node)) {
        setIsSearchOpen(false);
      }
    };

    document.addEventListener('pointerdown', handlePointerDown);
    return () => document.removeEventListener('pointerdown', handlePointerDown);
  }, [isSearchOpen, searchQuery]);

  const closeSearch = () => {
    setSearchQuery('');
    setIsSearchOpen(false);
  };

  return {
    isSearchOpen,
    searchQuery,
    searchInputRef,
    searchContainerRef,
    openSearch: () => setIsSearchOpen(true),
    closeSearch,
    setSearchQuery,
  };
}

