'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { Modal } from './Modal';
import styles from './PromptCard.module.scss';

interface Prompt {
  id: string;
  name: string;
  content: string;
  isActive: boolean;
}

export function PromptCard({
  prompt,
}: {
  prompt: Prompt;
}) {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const handleSetActive = async () => {
    setLoading(true);
    setErrorMessage(null);
    try {
      const response = await fetch(`/api/prompts/${prompt.id}/activate`, {
        method: 'POST',
      });

      if (!response.ok) {
        throw new Error('Failed to activate prompt');
      }

      router.refresh();
    } catch (error: any) {
      setErrorMessage(error.message || 'An error occurred');
    } finally {
      setLoading(false);
    }
  };

  const handleDeleteClick = () => {
    setShowDeleteModal(true);
  };

  const handleDeleteConfirm = async () => {
    setDeleting(true);
    setErrorMessage(null);
    try {
      const response = await fetch(`/api/prompts/${prompt.id}`, {
        method: 'DELETE',
      });

      if (!response.ok) {
        throw new Error('Failed to delete prompt');
      }

      router.refresh();
    } catch (error: any) {
      setErrorMessage(error.message || 'An error occurred');
      setDeleting(false);
    }
  };

  return (
    <>
      <div className={styles.promptCard}>
        {errorMessage && (
          <div className="error" style={{ marginBottom: '16px' }}>
            {errorMessage}
          </div>
        )}
        
        <div className={styles.header}>
          <div className={styles.titleRow}>
            <h3 className={styles.title}>{prompt.name}</h3>
            {prompt.isActive && (
              <span className={styles.badge} style={{ background: 'var(--accent-primary)' }}>
                ✓ Active
              </span>
            )}
          </div>
        </div>

        <p className={styles.content}>{prompt.content}</p>

        <div className={styles.actions}>
          <Link href={`/prompts/${prompt.id}/edit`} className="btn btn-secondary">
            ✏️ Edit
          </Link>
          {!prompt.isActive && (
            <button className="btn btn-primary" onClick={handleSetActive} disabled={loading}>
              {loading ? 'Setting...' : 'Set Active'}
            </button>
          )}
          <button
            className="btn btn-secondary"
            onClick={handleDeleteClick}
            disabled={deleting}
            style={{ marginLeft: 'auto', color: 'var(--error)' }}
          >
            🗑️ Delete
          </button>
        </div>
      </div>

      <Modal
        isOpen={showDeleteModal}
        onClose={() => setShowDeleteModal(false)}
        onConfirm={handleDeleteConfirm}
        title="Delete Prompt"
        message="Are you sure you want to delete this prompt? This action cannot be undone."
        confirmText="Delete"
        confirmType="danger"
        isLoading={deleting}
      />
    </>
  );
}

