'use client';

import { useRouter, useSearchParams } from 'next/navigation';
import { useState } from 'react';
import styles from './CallFilters.module.scss';

interface Category {
  id: string;
  name: string;
}

interface CallFiltersProps {
  organizers: string[];
  categories: Category[];
  currentFilters: {
    client?: string;
    organizer?: string;
    search?: string;
    callType?: string;
    category?: string;
  };
}

export function CallFilters({ organizers, categories, currentFilters }: CallFiltersProps) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [search, setSearch] = useState(currentFilters.search || '');

  const updateFilter = (key: string, value: string) => {
    const params = new URLSearchParams(searchParams.toString());
    if (value) {
      params.set(key, value);
    } else {
      params.delete(key);
    }
    router.push(`/calls?${params.toString()}`);
  };

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    updateFilter('search', search);
  };

  const clearFilters = () => {
    setSearch('');
    router.push('/calls');
  };

  const hasFilters =
    currentFilters.client || currentFilters.organizer || currentFilters.search || currentFilters.callType || currentFilters.category;

  return (
    <div className={styles.filters}>
      <form onSubmit={handleSearch} className={styles.searchForm}>
        <input
          type="text"
          className="input"
          placeholder="Search calls..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
        />
      </form>

      <select
        className="input"
        value={currentFilters.organizer || ''}
        onChange={(e) => updateFilter('organizer', e.target.value)}
      >
        <option value="">All Organizers</option>
        {organizers.map((organizer) => (
          <option key={organizer} value={organizer}>
            {organizer}
          </option>
        ))}
      </select>

      <select
        className="input"
        value={currentFilters.callType || ''}
        onChange={(e) => updateFilter('callType', e.target.value)}
      >
        <option value="">All Call Types</option>
        <option value="external">🌐 External Only</option>
        <option value="internal">🏢 Internal Only</option>
        <option value="unknown">❓ Unknown</option>
      </select>

      <select
        className="input"
        value={currentFilters.category || ''}
        onChange={(e) => updateFilter('category', e.target.value)}
      >
        <option value="">All Categories</option>
        {categories.map((category) => (
          <option key={category.id} value={category.id}>
            {category.name}
          </option>
        ))}
      </select>

      {hasFilters && (
        <button type="button" className="btn btn-secondary" onClick={clearFilters}>
          Clear Filters
        </button>
      )}
    </div>
  );
}

