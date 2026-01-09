'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import styles from './CalendarImport.module.scss';

interface CalendarEvent {
  id: string;
  googleEventId: string;
  summary: string | null;
  startTime: string;
  endTime: string;
  organizer: string | null;
  attendees: string[];
  isExternal: boolean | null;
  externalDomains: string[];
  imported: boolean;
  hasTranscript: boolean;
  isDuplicate: boolean;
  primaryUserId: string | null;
}

interface CalendarImportProps {
  onImportComplete?: () => void;
}

export function CalendarImport({ onImportComplete }: CalendarImportProps) {
  const router = useRouter();
  const [step, setStep] = useState<'sync' | 'select'>('sync');
  const [loading, setLoading] = useState(false);
  const [syncing, setSyncing] = useState(false);
  const [importing, setImporting] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  
  // Date range for sync
  const [startDate, setStartDate] = useState(() => {
    const date = new Date();
    date.setDate(date.getDate() - 30); // Default: last 30 days
    return date.toISOString().split('T')[0];
  });
  const [endDate, setEndDate] = useState(() => {
    return new Date().toISOString().split('T')[0];
  });

  // Calendar events
  const [events, setEvents] = useState<CalendarEvent[]>([]);
  const [selectedEvents, setSelectedEvents] = useState<Set<string>>(new Set());
  const [summary, setSummary] = useState({
    total: 0,
    external: 0,
    internal: 0,
    pending: 0,
  });

  // Pagination
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 5;

  // Filters
  const [filterTranscript, setFilterTranscript] = useState<'all' | 'with' | 'without'>('all');
  const [filterDuplicate, setFilterDuplicate] = useState<'all' | 'unique' | 'duplicate'>('all');
  
  // Get filtered events
  const filteredEvents = events.filter((event) => {
    if (filterTranscript === 'with' && !event.hasTranscript) return false;
    if (filterTranscript === 'without' && event.hasTranscript) return false;
    if (filterDuplicate === 'unique' && event.isDuplicate) return false;
    if (filterDuplicate === 'duplicate' && !event.isDuplicate) return false;
    return true;
  });

  // Paginate filtered events
  const totalPages = Math.ceil(filteredEvents.length / itemsPerPage);
  const startIndex = (currentPage - 1) * itemsPerPage;
  const paginatedEvents = filteredEvents.slice(startIndex, startIndex + itemsPerPage);

  const handleSync = async () => {
    setSyncing(true);
    setError('');
    setSuccess('');
    setEvents([]); // Clear old events
    setSelectedEvents(new Set()); // Clear selections

    try {
      const response = await fetch('/api/calendar/sync', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ startDate, endDate }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Failed to sync calendar');
      }

      setSuccess(
        `Synced ${data.results.total} events: ${data.results.externalEvents} external, ${data.results.internalEvents} internal`
      );
      setStep('select');
      await loadEvents();
    } catch (err: any) {
      setError(err.message || 'Failed to sync calendar');
    } finally {
      setSyncing(false);
    }
  };

  const loadEvents = async () => {
    setLoading(true);
    setError(''); // Clear any previous errors
    try {
      // Add timestamp to prevent caching and pass date range
      const timestamp = new Date().getTime();
      const params = new URLSearchParams({
        filter: 'pending',
        startDate,
        endDate,
        t: timestamp.toString(),
      });
      const response = await fetch(`/api/calendar/events?${params.toString()}`);
      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Failed to load events');
      }

      setEvents(data.events);
      setSummary(data.summary);
    } catch (err: any) {
      setError(err.message || 'Failed to load events');
    } finally {
      setLoading(false);
    }
  };

  const toggleEvent = (eventId: string) => {
    const newSelected = new Set(selectedEvents);
    if (newSelected.has(eventId)) {
      newSelected.delete(eventId);
    } else {
      newSelected.add(eventId);
    }
    setSelectedEvents(newSelected);
  };

  const selectAll = () => {
    // Select all filtered events (not just current page)
    const allIds = filteredEvents.map((e) => e.id);
    setSelectedEvents(new Set(allIds));
  };

  const deselectAll = () => {
    setSelectedEvents(new Set());
  };

  // Reset to page 1 when filters change
  const handleFilterChange = (filterType: 'transcript' | 'duplicate', value: string) => {
    setCurrentPage(1);
    if (filterType === 'transcript') {
      setFilterTranscript(value as 'all' | 'with' | 'without');
    } else {
      setFilterDuplicate(value as 'all' | 'unique' | 'duplicate');
    }
  };

  const handleImport = async () => {
    if (selectedEvents.size === 0) {
      setError('Please select at least one event');
      return;
    }

    setImporting(true);
    setError('');
    setSuccess('');

    try {
      const response = await fetch('/api/calendar/import', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ eventIds: Array.from(selectedEvents) }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Failed to import events');
      }

      setSuccess(
        `Successfully imported ${data.results.success} calls. ${
          data.results.noTranscript > 0
            ? `${data.results.noTranscript} events had no transcript.`
            : ''
        }`
      );
      
      setSelectedEvents(new Set());
      await loadEvents();
      
      // Refresh the page to show new calls
      router.refresh();
      
      if (onImportComplete) {
        onImportComplete();
      }
    } catch (err: any) {
      setError(err.message || 'Failed to import events');
    } finally {
      setImporting(false);
    }
  };

  useEffect(() => {
    if (step === 'select') {
      loadEvents();
    }
  }, [step]);

  return (
    <div className={styles.container}>
      <div className={styles.header}>
        <div>
          <h3 className={styles.title}>📅 Import from Calendar</h3>
          <p className={styles.subtitle}>
            Sync your Google Calendar meetings and import external calls automatically
          </p>
        </div>
      </div>

      {error && <div className={styles.error}>{error}</div>}
      {success && <div className={styles.success}>{success}</div>}

      {step === 'sync' && (
        <div className={styles.syncStep}>
          <div className={styles.dateRange}>
            <div className={styles.field}>
              <label>From Date</label>
              <input
                type="date"
                className="input"
                value={startDate}
                onChange={(e) => setStartDate(e.target.value)}
              />
            </div>
            <div className={styles.field}>
              <label>To Date</label>
              <input
                type="date"
                className="input"
                value={endDate}
                onChange={(e) => setEndDate(e.target.value)}
              />
            </div>
          </div>

          <button
            className="btn btn-primary"
            onClick={handleSync}
            disabled={syncing}
          >
            {syncing ? 'Syncing Calendar...' : '🔄 Sync Calendar Events'}
          </button>

          <div className={styles.info}>
            <p>
              This will fetch all Google Meet meetings from your calendar in the selected date range,
              identify external calls, and automatically search your Drive for matching transcript files.
            </p>
          </div>
        </div>
      )}

      {step === 'select' && (
        <div className={styles.selectStep}>
          <div className={styles.dateRangeInfo}>
            📅 Showing events from{' '}
            <strong>{new Date(startDate).toLocaleDateString()}</strong> to{' '}
            <strong>{new Date(endDate).toLocaleDateString()}</strong>
          </div>

          <div className={styles.stats}>
            <div className={styles.stat}>
              <div className={styles.statValue}>{summary.pending}</div>
              <div className={styles.statLabel}>External meetings available</div>
            </div>
            <div className={styles.stat}>
              <div className={styles.statValue}>{selectedEvents.size}</div>
              <div className={styles.statLabel}>Selected for import</div>
            </div>
          </div>

          {loading ? (
            <div className={styles.empty}>
              <p>Loading events...</p>
            </div>
          ) : events.length === 0 ? (
            <div className={styles.empty}>
              <p>No external calendar events found in the selected date range.</p>
              <p style={{ fontSize: '13px', marginTop: '8px', color: 'var(--text-secondary)' }}>
                ({new Date(startDate).toLocaleDateString()} - {new Date(endDate).toLocaleDateString()})
              </p>
              <button className="btn btn-secondary" onClick={() => {
                setStep('sync');
                setSuccess('');
              }}>
                ← Change Date Range
              </button>
            </div>
          ) : (
            <>
              {/* Filters */}
              <div className={styles.filters}>
                <div className={styles.filterGroup}>
                  <label>Transcript:</label>
                  <select
                    className="input"
                    value={filterTranscript}
                    onChange={(e) => handleFilterChange('transcript', e.target.value)}
                  >
                    <option value="all">All</option>
                    <option value="with">With Transcript</option>
                    <option value="without">Without Transcript</option>
                  </select>
                </div>
                <div className={styles.filterGroup}>
                  <label>Status:</label>
                  <select
                    className="input"
                    value={filterDuplicate}
                    onChange={(e) => handleFilterChange('duplicate', e.target.value)}
                  >
                    <option value="all">All</option>
                    <option value="unique">Unique Only</option>
                    <option value="duplicate">Duplicates Only</option>
                  </select>
                </div>
                <div className={styles.filterInfo}>
                  Showing {filteredEvents.length} of {events.length} events
                </div>
              </div>

              <div className={styles.actions}>
                <div className={styles.actionButtons}>
                  <button className="btn btn-secondary" onClick={selectAll}>
                    Select All {filteredEvents.length > 0 && `(${filteredEvents.length})`}
                  </button>
                  <button className="btn btn-secondary" onClick={deselectAll}>
                    Deselect All
                  </button>
                  <button className="btn btn-secondary" onClick={() => {
                    setStep('sync');
                    setEvents([]);
                    setSelectedEvents(new Set());
                    setSuccess('');
                    setCurrentPage(1);
                  }}>
                    ← Change Date Range
                  </button>
                </div>
                <button
                  className="btn btn-primary"
                  onClick={handleImport}
                  disabled={importing || selectedEvents.size === 0}
                >
                  {importing
                    ? 'Importing...'
                    : `Import ${selectedEvents.size} Selected`}
                </button>
              </div>

              {filteredEvents.length === 0 ? (
                <div className={styles.empty}>
                  <p>No events match the selected filters.</p>
                </div>
              ) : (
                <>
                  <div className={styles.eventsList}>
                    {paginatedEvents.map((event) => {
                  const isDisabled = event.isDuplicate || !event.hasTranscript;
                  return (
                    <div
                      key={event.id}
                      className={`${styles.eventCard} ${
                        selectedEvents.has(event.id) ? styles.selected : ''
                      } ${isDisabled ? styles.disabled : ''}`}
                      onClick={() => !isDisabled && toggleEvent(event.id)}
                    >
                      <div className={styles.checkbox}>
                        <input
                          type="checkbox"
                          checked={selectedEvents.has(event.id)}
                          disabled={isDisabled}
                          onChange={() => {}}
                        />
                      </div>
                      <div className={styles.eventContent}>
                        <div className={styles.eventHeader}>
                          <h4 className={styles.eventTitle}>
                            {event.summary || 'Untitled Meeting'}
                          </h4>
                          {event.isDuplicate && (
                            <span className={styles.duplicateBadge}>🔄 Duplicate</span>
                          )}
                          {event.isExternal && !event.isDuplicate && (
                            <span className={styles.externalBadge}>🌐 External</span>
                          )}
                          {event.hasTranscript && !event.isDuplicate && (
                            <span className={styles.transcriptBadge}>📄 Transcript Found</span>
                          )}
                        </div>
                      <div className={styles.eventMeta}>
                        <span>
                          📅 {new Date(event.startTime).toLocaleDateString()} at{' '}
                          {new Date(event.startTime).toLocaleTimeString([], {
                            hour: '2-digit',
                            minute: '2-digit',
                          })}
                        </span>
                        <span>👤 {event.organizer || 'Unknown'}</span>
                        <span>👥 {event.attendees.length} participants</span>
                      </div>
                      {event.externalDomains.length > 0 && (
                        <div className={styles.domains}>
                          External domains:{' '}
                          {event.externalDomains.map((domain, i) => (
                            <span key={i} className={styles.domainTag}>
                              {domain}
                            </span>
                          ))}
                        </div>
                      )}
                      {event.isDuplicate && (
                        <div className={styles.duplicateWarning}>
                          🔄 This meeting has already been imported by another team member - skipping to avoid duplicates
                        </div>
                      )}
                      {!event.hasTranscript && !event.isDuplicate && (
                        <div className={styles.warning}>
                          ⚠️ No transcript found - will be skipped during import
                        </div>
                      )}
                    </div>
                  </div>
                  );
                })}
              </div>

              {/* Pagination */}
              {totalPages > 1 && (
                <div className={styles.pagination}>
                  <button
                    className="btn btn-secondary"
                    onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
                    disabled={currentPage === 1}
                  >
                    ← Previous
                  </button>
                  <span className={styles.pageInfo}>
                    Page {currentPage} of {totalPages} ({filteredEvents.length} events)
                  </span>
                  <button
                    className="btn btn-secondary"
                    onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
                    disabled={currentPage === totalPages}
                  >
                    Next →
                  </button>
                </div>
              )}
            </>
            )}
            </>
          )}
        </div>
      )}
    </div>
  );
}

