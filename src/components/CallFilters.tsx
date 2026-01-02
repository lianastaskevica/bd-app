'use client';

import { useRouter, useSearchParams } from 'next/navigation';
import { useState } from 'react';
import styles from './CallFilters.module.scss';

interface CallFiltersProps {
  clients: string[];
  organizers: string[];
  currentFilters: {
    client?: string;
    organizer?: string;
    search?: string;
  };
}

export function CallFilters({ clients, organizers, currentFilters }: CallFiltersProps) {
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
    currentFilters.client || currentFilters.organizer || currentFilters.search;

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
        value={currentFilters.client || ''}
        onChange={(e) => updateFilter('client', e.target.value)}
      >
        <option value="">All Clients</option>
        {clients.map((client) => (
          <option key={client} value={client}>
            {client}
          </option>
        ))}
      </select>

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

      {hasFilters && (
        <button type="button" className="btn btn-secondary" onClick={clearFilters}>
          Clear Filters
        </button>
      )}
    </div>
  );
}

