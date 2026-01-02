'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Modal } from './Modal';
import styles from './CallActions.module.scss';

interface Call {
  id: string;
}

export function CallActions({ call }: { call: Call }) {
  const router = useRouter();
  const [reanalyzing, setReanalyzing] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [showReanalyzeModal, setShowReanalyzeModal] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const handleReanalyzeClick = () => {
    setShowReanalyzeModal(true);
  };

  const handleReanalyzeConfirm = async () => {
    setReanalyzing(true);
    setErrorMessage(null);
    try {
      const response = await fetch(`/api/calls/${call.id}/analyze`, {
        method: 'POST',
      });

      if (!response.ok) {
        throw new Error('Failed to re-analyze call');
      }

      setShowReanalyzeModal(false);
      router.refresh();
    } catch (error: any) {
      setErrorMessage(error.message || 'An error occurred');
      setReanalyzing(false);
    }
  };

  const handleDeleteClick = () => {
    setShowDeleteModal(true);
  };

  const handleDeleteConfirm = async () => {
    setDeleting(true);
    setErrorMessage(null);
    try {
      const response = await fetch(`/api/calls/${call.id}`, {
        method: 'DELETE',
      });

      if (!response.ok) {
        throw new Error('Failed to delete call');
      }

      // Redirect to calls list after successful deletion
      router.push('/calls');
      router.refresh();
    } catch (error: any) {
      setErrorMessage(error.message || 'An error occurred');
      setDeleting(false);
    }
  };

  return (
    <>
      {errorMessage && (
        <div className="error" style={{ marginBottom: '16px' }}>
          {errorMessage}
        </div>
      )}
      
      <div className={styles.actions}>
        <button
          className="btn btn-secondary"
          onClick={handleReanalyzeClick}
          disabled={reanalyzing}
        >
          {reanalyzing ? 'Re-analyzing...' : '🔄 Re-analyze'}
        </button>
        <button
          className="btn btn-danger"
          onClick={handleDeleteClick}
          disabled={deleting}
        >
          🗑️ Delete Call
        </button>
      </div>

      <Modal
        isOpen={showReanalyzeModal}
        onClose={() => setShowReanalyzeModal(false)}
        onConfirm={handleReanalyzeConfirm}
        title="Re-analyze Call"
        message="Re-analyze this call? This will overwrite the existing AI analysis with a new one based on the active prompt."
        confirmText="Re-analyze"
        confirmType="primary"
        isLoading={reanalyzing}
      />

      <Modal
        isOpen={showDeleteModal}
        onClose={() => setShowDeleteModal(false)}
        onConfirm={handleDeleteConfirm}
        title="Delete Call"
        message="Are you sure you want to delete this call? This action cannot be undone."
        confirmText="Delete"
        confirmType="danger"
        isLoading={deleting}
      />
    </>
  );
}

