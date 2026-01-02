'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import styles from './PromptForm.module.scss';

interface Prompt {
  id: string;
  name: string;
  content: string;
  isActive: boolean;
}

export function PromptForm({
  prompt,
}: {
  prompt?: Prompt;
}) {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [formData, setFormData] = useState({
    name: prompt?.name || '',
    content: prompt?.content || '',
    isActive: prompt?.isActive || false,
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
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

      router.push('/prompts');
      router.refresh();
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
        <label>Prompt Content *</label>
        <textarea
          className={`input ${styles.textarea}`}
          rows={12}
          value={formData.content}
          onChange={(e) => setFormData({ ...formData, content: e.target.value })}
          placeholder="Analyze this client call transcript and provide:

1. A brief summary of how the call went (2-3 sentences)
2. An overall rating from 1-10 based on:
   - Communication clarity
   - Client engagement
   - Problem resolution
   - Professionalism
   - Outcome achievement"
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
          {loading ? 'Saving...' : prompt ? 'Update Prompt' : 'Create Prompt'}
        </button>
      </div>
    </form>
  );
}

