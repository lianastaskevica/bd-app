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
    const allIds = events.map((e) => e.id);
    setSelectedEvents(new Set(allIds));
  };

  const deselectAll = () => {
    setSelectedEvents(new Set());
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
              <div className={styles.actions}>
                <div className={styles.actionButtons}>
                  <button className="btn btn-secondary" onClick={selectAll}>
                    Select All
                  </button>
                  <button className="btn btn-secondary" onClick={deselectAll}>
                    Deselect All
                  </button>
                  <button className="btn btn-secondary" onClick={() => {
                    setStep('sync');
                    setEvents([]);
                    setSelectedEvents(new Set());
                    setSuccess('');
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

              <div className={styles.eventsList}>
                {events.map((event) => (
                  <div
                    key={event.id}
                    className={`${styles.eventCard} ${
                      selectedEvents.has(event.id) ? styles.selected : ''
                    }`}
                    onClick={() => toggleEvent(event.id)}
                  >
                    <div className={styles.checkbox}>
                      <input
                        type="checkbox"
                        checked={selectedEvents.has(event.id)}
                        onChange={() => {}}
                      />
                    </div>
                    <div className={styles.eventContent}>
                      <div className={styles.eventHeader}>
                        <h4 className={styles.eventTitle}>
                          {event.summary || 'Untitled Meeting'}
                        </h4>
                        {event.isExternal && (
                          <span className={styles.externalBadge}>🌐 External</span>
                        )}
                        {event.hasTranscript && (
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
                      {!event.hasTranscript && (
                        <div className={styles.warning}>
                          ⚠️ No transcript found - will be skipped during import
                        </div>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </>
          )}
        </div>
      )}
    </div>
  );
}

