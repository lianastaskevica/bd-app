'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import styles from './upload.module.scss';

export default function UploadCallPage() {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [formData, setFormData] = useState({
    clientName: '',
    callDate: new Date().toISOString().split('T')[0],
    organizer: '',
    participants: '',
    transcript: '',
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      const participantsArray = formData.participants
        .split(',')
        .map((p) => p.trim())
        .filter((p) => p);

      const response = await fetch('/api/calls', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ...formData,
          participants: participantsArray,
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Failed to upload call');
      }

      router.push(`/calls/${data.id}`);
      router.refresh();
    } catch (err: any) {
      setError(err.message || 'An error occurred');
      setLoading(false);
    }
  };

  return (
    <div className={styles.uploadPage}>
      <div className={styles.header}>
        <h1 className={styles.title}>Upload Call</h1>
        <p className={styles.subtitle}>Add a new call transcript for AI analysis</p>
      </div>

      <form onSubmit={handleSubmit} className={styles.form}>
        <div className={styles.formGrid}>
          <div className={styles.field}>
            <label>Client Name *</label>
            <input
              type="text"
              className="input"
              value={formData.clientName}
              onChange={(e) => setFormData({ ...formData, clientName: e.target.value })}
              required
            />
          </div>

          <div className={styles.field}>
            <label>Call Date *</label>
            <input
              type="date"
              className="input"
              value={formData.callDate}
              onChange={(e) => setFormData({ ...formData, callDate: e.target.value })}
              required
            />
          </div>

          <div className={styles.field}>
            <label>Organizer *</label>
            <input
              type="text"
              className="input"
              value={formData.organizer}
              onChange={(e) => setFormData({ ...formData, organizer: e.target.value })}
              required
            />
          </div>

          <div className={styles.field}>
            <label>Participants (comma-separated)</label>
            <input
              type="text"
              className="input"
              placeholder="John Doe, Jane Smith"
              value={formData.participants}
              onChange={(e) => setFormData({ ...formData, participants: e.target.value })}
            />
          </div>
        </div>

        <div className={styles.field}>
          <label>Transcript *</label>
          <textarea
            className={`input ${styles.textarea}`}
            rows={12}
            value={formData.transcript}
            onChange={(e) => setFormData({ ...formData, transcript: e.target.value })}
            placeholder="Paste the call transcript here..."
            required
          />
        </div>

        {error && <div className="error">{error}</div>}

        <div className={styles.actions}>
          <button
            type="button"
            className="btn btn-secondary"
            onClick={() => router.back()}
            disabled={loading}
          >
            Cancel
          </button>
          <button type="submit" className="btn btn-primary" disabled={loading}>
            {loading ? 'Uploading & Analyzing...' : 'Upload & Analyze'}
          </button>
        </div>
      </form>
    </div>
  );
}

