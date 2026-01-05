'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import styles from './RecalculateButton.module.scss';

interface RecalculateButtonProps {
  promptId: string;
  promptName: string;
}

export function RecalculateButton({ promptId, promptName }: RecalculateButtonProps) {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  const handleRecalculate = async () => {
    if (!confirm(`Recalculate all calls with "${promptName}"?\n\nThis will re-analyze all existing calls with the current prompt criteria. This may take several minutes.`)) {
      return;
    }

    setLoading(true);
    setError('');
    setSuccess('');

    try {
      const response = await fetch(`/api/prompts/${promptId}/recalculate`, {
        method: 'POST',
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Failed to recalculate');
      }

      setSuccess(
        `✅ Successfully recalculated ${data.results.success} calls!${
          data.results.failed > 0 ? ` (${data.results.failed} failed)` : ''
        }`
      );

      setTimeout(() => {
        router.refresh();
        setSuccess('');
      }, 3000);
    } catch (err: any) {
      setError(err.message || 'Failed to recalculate');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className={styles.container}>
      {success && <div className={styles.success}>{success}</div>}
      {error && <div className={styles.error}>{error}</div>}
      
      <button
        className="btn btn-secondary"
        onClick={handleRecalculate}
        disabled={loading}
      >
        {loading ? (
          <>
            <span className={styles.spinner}></span>
            Recalculating...
          </>
        ) : (
          <>🔄 Recalculate All Calls</>
        )}
      </button>
      
      {loading && (
        <div className={styles.progress}>
          Re-analyzing all calls... This may take a few minutes.
        </div>
      )}
    </div>
  );
}

