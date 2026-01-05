'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import styles from './PromptForm.module.scss';

interface Prompt {
  id: string;
  name: string;
  content: string;
  analysisPrompt: string;
  ratingPrompt: string;
  isActive: boolean;
}

export function PromptForm({
  prompt,
}: {
  prompt?: Prompt;
}) {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [recalculating, setRecalculating] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [formData, setFormData] = useState({
    name: prompt?.name || '',
    analysisPrompt: prompt?.analysisPrompt || '',
    ratingPrompt: prompt?.ratingPrompt || '',
    isActive: prompt?.isActive || false,
  });
  const [recalculateOnSave, setRecalculateOnSave] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setSuccess('');
    setLoading(true);

    try {
      const url = prompt ? `/api/prompts/${prompt.id}` : '/api/prompts';
      const method = prompt ? 'PATCH' : 'POST';

      const response = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(formData),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Failed to save prompt');
      }

      // If updating an existing prompt and recalculation is requested
      if (prompt && recalculateOnSave) {
        setLoading(false);
        setRecalculating(true);
        setSuccess('Prompt saved! Recalculating existing calls...');

        try {
          const recalcResponse = await fetch(`/api/prompts/${prompt.id}/recalculate`, {
            method: 'POST',
          });

          const recalcData = await recalcResponse.json();

          if (!recalcResponse.ok) {
            throw new Error(recalcData.error || 'Failed to recalculate');
          }

          setSuccess(
            `Prompt saved and ${recalcData.results.success} calls recalculated successfully!`
          );
          
          setTimeout(() => {
            router.push('/prompts');
            router.refresh();
          }, 2000);
        } catch (recalcErr: any) {
          setError(`Prompt saved, but recalculation failed: ${recalcErr.message}`);
          setRecalculating(false);
        }
      } else {
        router.push('/prompts');
        router.refresh();
      }
    } catch (err: any) {
      setError(err.message || 'An error occurred');
      setLoading(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className={styles.form}>
      <div className={styles.field}>
        <label>Prompt Name *</label>
        <input
          type="text"
          className="input"
          value={formData.name}
          onChange={(e) => setFormData({ ...formData, name: e.target.value })}
          required
        />
      </div>

      <div className={styles.field}>
        <label>Analysis Prompt *</label>
        <p className={styles.helpText}>
          Instructions for AI to analyze the call content, extract key points, and provide summary
        </p>
        <textarea
          className={`input ${styles.textarea}`}
          rows={8}
          value={formData.analysisPrompt}
          onChange={(e) => setFormData({ ...formData, analysisPrompt: e.target.value })}
          placeholder="Analyze this client call transcript and provide:
- A comprehensive summary of the discussion
- Key decisions made during the call
- Action items and next steps
- Overall tone and engagement level"
          required
        />
      </div>

      <div className={styles.field}>
        <label>Rating Prompt *</label>
        <p className={styles.helpText}>
          Criteria for AI to rate the call quality (1-10 scale) and identify strengths/improvements
        </p>
        <textarea
          className={`input ${styles.textarea}`}
          rows={8}
          value={formData.ratingPrompt}
          onChange={(e) => setFormData({ ...formData, ratingPrompt: e.target.value })}
          placeholder="Rate this call on a scale of 1-10 based on:
- Communication clarity and structure
- Client engagement and interest level
- Problem resolution and value provided
- Professionalism and rapport building
- Outcome achievement and next steps

Provide 2-4 specific strengths and 1-3 areas for improvement."
          required
        />
      </div>

      <div className={styles.checkboxes}>
        <label className={styles.checkbox}>
          <input
            type="checkbox"
            checked={formData.isActive}
            onChange={(e) => setFormData({ ...formData, isActive: e.target.checked })}
          />
          <span>Set as active prompt (only one prompt can be active at a time)</span>
        </label>

        {prompt && (
          <label className={styles.checkbox}>
            <input
              type="checkbox"
              checked={recalculateOnSave}
              onChange={(e) => setRecalculateOnSave(e.target.checked)}
            />
            <span>Recalculate all existing calls with updated prompt</span>
          </label>
        )}
      </div>

      {prompt && recalculateOnSave && (
        <div className={styles.warning}>
          ⚠️ <strong>Note:</strong> Recalculating all calls may take several minutes depending on
          the number of calls. All calls will be re-analyzed with the updated prompt criteria.
        </div>
      )}

      {error && <div className="error">{error}</div>}
      {success && <div className={styles.success}>{success}</div>}
      
      {recalculating && (
        <div className={styles.progress}>
          <div className={styles.spinner}></div>
          <span>Recalculating calls... This may take a few minutes.</span>
        </div>
      )}

      <div className={styles.actions}>
        <button
          type="button"
          className="btn btn-secondary"
          onClick={() => router.back()}
          disabled={loading}
        >
          Cancel
        </button>
        <button type="submit" className="btn btn-primary" disabled={loading || recalculating}>
          {recalculating ? 'Recalculating...' : loading ? 'Saving...' : prompt ? 'Update Prompt' : 'Create Prompt'}
        </button>
      </div>
    </form>
  );
}

