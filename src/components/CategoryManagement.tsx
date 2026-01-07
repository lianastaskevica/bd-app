'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import styles from './CategoryManagement.module.scss';

interface Category {
  id: string;
  name: string;
  description: string | null;
  color: string | null;
  isFixed: boolean;
  stats: {
    assignedCalls: number;
    predictedCalls: number;
    avgRating: number | null;
    avgConfidence: number | null;
  };
}

interface CategoryManagementProps {
  categories: Category[];
}

export function CategoryManagement({ categories }: CategoryManagementProps) {
  const router = useRouter();
  const [expandedCategory, setExpandedCategory] = useState<string | null>(null);
  const [editingCategory, setEditingCategory] = useState<string | null>(null);
  const [editDescription, setEditDescription] = useState('');
  const [loading, setLoading] = useState(false);
  const [recategorizing, setRecategorizing] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  const handleEditClick = (category: Category) => {
    setEditingCategory(category.id);
    setEditDescription(category.description || '');
    setError('');
    setSuccess('');
  };

  const handleSaveDescription = async (categoryId: string) => {
    setLoading(true);
    setError('');

    try {
      const response = await fetch(`/api/categories/${categoryId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ description: editDescription }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Failed to update category');
      }

      setSuccess('Category playbook updated successfully!');
      setEditingCategory(null);
      router.refresh();
    } catch (err: any) {
      setError(err.message || 'Failed to update category');
    } finally {
      setLoading(false);
    }
  };

  const handleRecategorizeAll = async () => {
    if (
      !confirm(
        'Re-categorize ALL calls using the updated playbooks?\n\nThis will:\n• Re-analyze all calls\n• Update categories based on current playbooks\n• May take several minutes\n\nContinue?'
      )
    ) {
      return;
    }

    setRecategorizing(true);
    setError('');
    setSuccess('');

    try {
      const response = await fetch('/api/categories/recategorize', {
        method: 'POST',
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Failed to recategorize calls');
      }

      setSuccess(
        `✅ Successfully recategorized ${data.results.success} calls! ${
          data.results.failed > 0 ? `(${data.results.failed} failed)` : ''
        }`
      );
      router.refresh();
    } catch (err: any) {
      setError(err.message || 'Failed to recategorize calls');
    } finally {
      setRecategorizing(false);
    }
  };

  return (
    <div className={styles.management}>
      <div className={styles.actions}>
        <button
          className="btn btn-primary"
          onClick={handleRecategorizeAll}
          disabled={recategorizing || loading}
        >
          {recategorizing ? '🔄 Recategorizing...' : '🔄 Recategorize All Calls'}
        </button>
      </div>

      {success && <div className={styles.success}>{success}</div>}
      {error && <div className={styles.error}>{error}</div>}

      {recategorizing && (
        <div className={styles.recategorizingBanner}>
          <div className={styles.spinner}></div>
          Re-analyzing all calls with updated playbooks... This may take a few minutes.
        </div>
      )}

      <div className={styles.categoriesList}>
        {categories.map((category) => {
          const isExpanded = expandedCategory === category.id;
          const isEditing = editingCategory === category.id;

          return (
            <div key={category.id} className={styles.categoryCard}>
              <div
                className={styles.categoryHeader}
                onClick={() => setExpandedCategory(isExpanded ? null : category.id)}
              >
                <div className={styles.categoryHeaderLeft}>
                  <div
                    className={styles.categoryColor}
                    style={{ background: category.color || '#6366f1' }}
                  />
                  <div className={styles.categoryInfo}>
                    <div className={styles.categoryName}>{category.name}</div>
                    <div className={styles.categoryMeta}>
                      {category.stats.assignedCalls} calls assigned •{' '}
                      {category.stats.predictedCalls} AI predictions
                    </div>
                  </div>
                </div>
                <div className={styles.categoryHeaderRight}>
                  {category.stats.avgRating !== null && (
                    <div className={styles.avgRating}>
                      ⭐ {category.stats.avgRating.toFixed(1)}
                    </div>
                  )}
                  {category.stats.avgConfidence !== null && (
                    <div className={styles.avgConfidence}>
                      🤖 {(category.stats.avgConfidence * 100).toFixed(0)}%
                    </div>
                  )}
                  <div className={styles.expandIcon}>{isExpanded ? '▼' : '▶'}</div>
                </div>
              </div>

              {isExpanded && (
                <div className={styles.categoryBody}>
                  <div className={styles.playbookSection}>
                    <div className={styles.playbookHeader}>
                      <h4>Category Playbook</h4>
                      {!isEditing && (
                        <button
                          className="btn btn-secondary btn-sm"
                          onClick={() => handleEditClick(category)}
                          disabled={loading}
                        >
                          ✏️ Edit Playbook
                        </button>
                      )}
                    </div>

                    {isEditing ? (
                      <div className={styles.editForm}>
                        <textarea
                          className={styles.playbookTextarea}
                          value={editDescription}
                          onChange={(e) => setEditDescription(e.target.value)}
                          rows={15}
                          placeholder="Enter category playbook definition..."
                        />
                        <div className={styles.editActions}>
                          <button
                            className="btn btn-secondary"
                            onClick={() => {
                              setEditingCategory(null);
                              setError('');
                            }}
                            disabled={loading}
                          >
                            Cancel
                          </button>
                          <button
                            className="btn btn-primary"
                            onClick={() => handleSaveDescription(category.id)}
                            disabled={loading}
                          >
                            {loading ? 'Saving...' : 'Save Playbook'}
                          </button>
                        </div>
                      </div>
                    ) : (
                      <pre className={styles.playbookContent}>
                        {category.description || 'No playbook defined'}
                      </pre>
                    )}
                  </div>

                  <div className={styles.statsGrid}>
                    <div className={styles.statCard}>
                      <div className={styles.statLabel}>Assigned Calls</div>
                      <div className={styles.statValue}>{category.stats.assignedCalls}</div>
                    </div>
                    <div className={styles.statCard}>
                      <div className={styles.statLabel}>AI Predictions</div>
                      <div className={styles.statValue}>{category.stats.predictedCalls}</div>
                    </div>
                    <div className={styles.statCard}>
                      <div className={styles.statLabel}>Avg Rating</div>
                      <div className={styles.statValue}>
                        {category.stats.avgRating !== null
                          ? category.stats.avgRating.toFixed(1)
                          : 'N/A'}
                      </div>
                    </div>
                    <div className={styles.statCard}>
                      <div className={styles.statLabel}>Avg Confidence</div>
                      <div className={styles.statValue}>
                        {category.stats.avgConfidence !== null
                          ? `${(category.stats.avgConfidence * 100).toFixed(0)}%`
                          : 'N/A'}
                      </div>
                    </div>
                  </div>
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}

