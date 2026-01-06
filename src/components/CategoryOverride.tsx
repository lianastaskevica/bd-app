'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import styles from './CategoryOverride.module.scss';

interface Category {
  id: string;
  name: string;
  description: string | null;
  color: string | null;
}

interface Call {
  id: string;
  predictedCategory: Category | null;
  categoryFinal: Category | null;
  confidenceScore: number | null;
  categoryReasoning: string | null;
  topCandidates: any;
  needsReview: boolean;
  wasOverridden: boolean;
  overriddenAt: Date | null;
}

interface CategoryOverrideProps {
  call: Call;
  categories: Category[];
}

export function CategoryOverride({ call, categories }: CategoryOverrideProps) {
  const router = useRouter();
  const [isOverriding, setIsOverriding] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const handleOverride = async (categoryId: string) => {
    if (!confirm('Are you sure you want to override the AI category prediction?')) {
      return;
    }

    setLoading(true);
    setError('');

    try {
      const response = await fetch(`/api/calls/${call.id}/override-category`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ categoryId }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Failed to override category');
      }

      router.refresh();
      setIsOverriding(false);
    } catch (err: any) {
      setError(err.message || 'Failed to override category');
    } finally {
      setLoading(false);
    }
  };

  if (!call.predictedCategory) {
    return null;
  }

  const confidence = call.confidenceScore || 0;
  const confidencePercent = (confidence * 100).toFixed(0);
  const reasoning = call.categoryReasoning?.split('\n').filter(Boolean) || [];

  // Determine confidence level
  let confidenceClass = styles.high;
  let confidenceLabel = 'High Confidence';
  if (confidence < 0.50) {
    confidenceClass = styles.low;
    confidenceLabel = 'Low Confidence';
  } else if (confidence < 0.75) {
    confidenceClass = styles.medium;
    confidenceLabel = 'Medium Confidence';
  }

  return (
    <div className={styles.card}>
      <div className={styles.cardHeader}>
        <h3 className={styles.cardTitle}>
          🤖 AI Category Prediction
        </h3>
        {call.needsReview && (
          <span className={styles.needsReviewBadge}>Needs Review</span>
        )}
      </div>

      <div className={styles.predictionBox}>
        <div className={styles.categoryName}>
          {call.categoryFinal?.name || call.predictedCategory.name}
        </div>
        <div className={`${styles.confidence} ${confidenceClass}`}>
          <div className={styles.confidenceBar}>
            <div
              className={styles.confidenceFill}
              style={{ width: `${confidencePercent}%` }}
            />
          </div>
          <div className={styles.confidenceLabel}>
            {confidenceLabel} ({confidencePercent}%)
          </div>
        </div>
      </div>

      {call.wasOverridden && (
        <div className={styles.overrideBanner}>
          ✏️ Category manually overridden
          {call.overriddenAt && (
            <span className={styles.overrideTime}>
              {' '}on {new Date(call.overriddenAt).toLocaleDateString()}
            </span>
          )}
        </div>
      )}

      {reasoning.length > 0 && (
        <div className={styles.reasoning}>
          <div className={styles.reasoningLabel}>AI Reasoning:</div>
          <ul className={styles.reasoningList}>
            {reasoning.map((reason, i) => (
              <li key={i}>{reason}</li>
            ))}
          </ul>
        </div>
      )}

      {call.topCandidates && Array.isArray(call.topCandidates) && call.topCandidates.length > 1 && (
        <div className={styles.candidates}>
          <div className={styles.candidatesLabel}>Other Candidates:</div>
          <div className={styles.candidatesList}>
            {call.topCandidates
              .filter((c: any) => c.category !== call.predictedCategory?.name)
              .slice(0, 2)
              .map((candidate: any, i: number) => (
                <span key={i} className={styles.candidateTag}>
                  {candidate.category}
                </span>
              ))}
          </div>
        </div>
      )}

      {error && <div className={styles.error}>{error}</div>}

      <div className={styles.actions}>
        {!isOverriding ? (
          <button
            className="btn btn-secondary"
            onClick={() => setIsOverriding(true)}
            disabled={loading}
          >
            ✏️ Override Category
          </button>
        ) : (
          <div className={styles.overrideForm}>
            <div className={styles.overrideLabel}>Select new category:</div>
            <div className={styles.categoryGrid}>
              {categories.map((cat) => (
                <button
                  key={cat.id}
                  className={`${styles.categoryOption} ${
                    cat.id === call.categoryFinal?.id ? styles.selected : ''
                  }`}
                  onClick={() => handleOverride(cat.id)}
                  disabled={loading}
                  style={{ borderColor: cat.color || undefined }}
                >
                  {cat.name}
                </button>
              ))}
            </div>
            <button
              className="btn btn-secondary"
              onClick={() => {
                setIsOverriding(false);
                setError('');
              }}
              disabled={loading}
            >
              Cancel
            </button>
          </div>
        )}
      </div>
    </div>
  );
}

