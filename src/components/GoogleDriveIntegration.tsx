'use client';

import { useState, useEffect } from 'react';
import { Modal } from './Modal';
import styles from './GoogleDriveIntegration.module.scss';

interface DriveStatus {
  connected: boolean;
  connectedAt?: string;
  folders?: number;
  lastSyncTime?: string | null;
  stats?: {
    total: number;
    imported: number;
    errors: number;
  };
}

interface DriveSource {
  id: string;
  folderId: string;
  folderName: string | null;
  lastSync: string | null;
  status: string;
  createdAt: string;
}

interface ImportableFile {
  id: string;
  name: string;
  modifiedTime: string;
  importedAt: string;
}

export default function GoogleDriveIntegration() {
  const [status, setStatus] = useState<DriveStatus | null>(null);
  const [sources, setSources] = useState<DriveSource[]>([]);
  const [importableFiles, setImportableFiles] = useState<ImportableFile[]>([]);
  const [importableCount, setImportableCount] = useState(0);
  const [loading, setLoading] = useState(true);
  const [syncing, setSyncing] = useState(false);
  const [importing, setImporting] = useState(false);
  const [showAddFolder, setShowAddFolder] = useState(false);
  const [folderUrl, setFolderUrl] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  
  // Modal states
  const [showDisconnectModal, setShowDisconnectModal] = useState(false);
  const [showImportModal, setShowImportModal] = useState(false);
  const [showRemoveFolderModal, setShowRemoveFolderModal] = useState(false);
  const [folderToRemove, setFolderToRemove] = useState<string | null>(null);
  const [disconnecting, setDisconnecting] = useState(false);
  const [removingFolder, setRemovingFolder] = useState(false);

  useEffect(() => {
    loadStatus();
  }, []);

  const loadStatus = async () => {
    try {
      setLoading(true);
      const [statusRes, foldersRes, importableRes] = await Promise.all([
        fetch('/api/drive/status'),
        fetch('/api/drive/folders'),
        fetch('/api/drive/import-to-calls'),
      ]);

      if (statusRes.ok) {
        const statusData = await statusRes.json();
        setStatus(statusData);
      }

      if (foldersRes.ok) {
        const foldersData = await foldersRes.json();
        setSources(foldersData);
      }

      if (importableRes.ok) {
        const importableData = await importableRes.json();
        setImportableCount(importableData.count);
        setImportableFiles(importableData.files || []);
      }
    } catch (error) {
      console.error('Failed to load status:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleConnect = async () => {
    try {
      setError(null);
      const response = await fetch('/api/auth/google/start');
      const data = await response.json();

      if (data.authUrl) {
        window.location.href = data.authUrl;
      } else {
        setError('Failed to initiate connection');
      }
    } catch (error) {
      setError('Failed to connect to Google Drive');
    }
  };

  const handleDisconnectClick = () => {
    setShowDisconnectModal(true);
  };

  const handleDisconnectConfirm = async () => {
    setDisconnecting(true);
    try {
      setError(null);
      const response = await fetch('/api/drive/disconnect', {
        method: 'POST',
      });

      if (response.ok) {
        setStatus({ connected: false });
        setSources([]);
        setSuccess('Google Drive disconnected successfully');
        setShowDisconnectModal(false);
      } else {
        setError('Failed to disconnect');
        setDisconnecting(false);
      }
    } catch (error) {
      setError('Failed to disconnect from Google Drive');
      setDisconnecting(false);
    }
  };

  const handleAddFolder = async () => {
    if (!folderUrl.trim()) {
      setError('Please enter a folder URL or ID');
      return;
    }

    try {
      setError(null);
      setSuccess(null);
      const response = await fetch('/api/drive/folders', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ folderUrlOrId: folderUrl }),
      });

      const data = await response.json();

      if (response.ok) {
        setSuccess('Folder added successfully!');
        setFolderUrl('');
        setShowAddFolder(false);
        loadStatus();
      } else {
        setError(data.error || 'Failed to add folder');
      }
    } catch (error) {
      setError('Failed to add folder');
    }
  };

  const handleSync = async (folderId?: string) => {
    try {
      setSyncing(true);
      setError(null);
      setSuccess(null);

      const response = await fetch('/api/drive/sync', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ folderId }),
      });

      const data = await response.json();

      if (response.ok) {
        const results = data.results;
        if ('totalFiles' in results) {
          // All folders sync
          setSuccess(
            `Synced ${results.successfulFolders} folders: ${results.importedFiles} imported, ${results.updatedFiles} updated, ${results.skippedFiles} skipped`
          );
        } else {
          // Single folder sync
          setSuccess(
            `Sync complete: ${results.imported} imported, ${results.updated} updated, ${results.skipped} skipped`
          );
        }
        loadStatus();
      } else {
        setError(data.error || 'Sync failed');
      }
    } catch (error) {
      setError('Failed to sync files');
    } finally {
      setSyncing(false);
    }
  };

  const handleImportClick = () => {
    setShowImportModal(true);
  };

  const handleImportConfirm = async () => {
    setImporting(true);
    try {
      setError(null);
      setSuccess(null);

      const response = await fetch('/api/drive/import-to-calls', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({}),
      });

      const data = await response.json();

      if (response.ok) {
        const { results } = data;
        if (results.failed > 0) {
          setSuccess(
            `Import complete: ${results.success} succeeded, ${results.failed} failed. Check console for errors.`
          );
          if (results.errors.length > 0) {
            console.error('Import errors:', results.errors);
          }
        } else {
          setSuccess(
            `Successfully imported ${results.success} file(s) to Calls with AI analysis!`
          );
        }
        setShowImportModal(false);
        loadStatus();
      } else {
        setError(data.error || 'Import failed');
        setImporting(false);
      }
    } catch (error) {
      setError('Failed to import files to calls');
      setImporting(false);
    }
  };

  const handleRemoveFolderClick = (sourceId: string) => {
    setFolderToRemove(sourceId);
    setShowRemoveFolderModal(true);
  };

  const handleRemoveFolderConfirm = async () => {
    if (!folderToRemove) return;

    setRemovingFolder(true);
    try {
      const response = await fetch(`/api/drive/folders?id=${folderToRemove}`, {
        method: 'DELETE',
      });

      if (response.ok) {
        setSuccess('Folder removed');
        setShowRemoveFolderModal(false);
        setFolderToRemove(null);
        loadStatus();
      } else {
        setError('Failed to remove folder');
        setRemovingFolder(false);
      }
    } catch (error) {
      setError('Failed to remove folder');
      setRemovingFolder(false);
    }
  };

  if (loading) {
    return (
      <div className={styles.container}>
        <div className={styles.loading}>Loading...</div>
      </div>
    );
  }

  return (
    <div className={styles.container}>
      <div className={styles.header}>
        <h2>Google Drive Integration</h2>
        <p>Connect your Google Drive to automatically import meeting transcripts</p>
      </div>

      {error && (
        <div className={styles.alert} data-type="error">
          {error}
        </div>
      )}

      {success && (
        <div className={styles.alert} data-type="success">
          {success}
        </div>
      )}

      {!status?.connected ? (
        <div className={styles.notConnected}>
          <div className={styles.icon}>🔌</div>
          <h3>Not Connected</h3>
          <p>Connect your Google Drive to start importing transcripts from folders you specify.</p>
          <button onClick={handleConnect} className={styles.connectButton}>
            Connect Google Drive
          </button>
        </div>
      ) : (
        <div className={styles.connected}>
          <div className={styles.statusCard}>
            <div className={styles.statusHeader}>
              <div>
                <h3>✅ Connected</h3>
                <p className={styles.connectedDate}>
                  Connected on {new Date(status.connectedAt!).toLocaleDateString()}
                </p>
              </div>
              <button onClick={handleDisconnectClick} className={styles.disconnectButton}>
                Disconnect
              </button>
            </div>

            {status.stats && (
              <div className={styles.stats}>
                <div className={styles.stat}>
                  <div className={styles.statValue}>{status.stats.total}</div>
                  <div className={styles.statLabel}>Total Files</div>
                </div>
                <div className={styles.stat}>
                  <div className={styles.statValue}>{status.stats.imported}</div>
                  <div className={styles.statLabel}>Imported</div>
                </div>
                <div className={styles.stat}>
                  <div className={styles.statValue}>{status.stats.errors}</div>
                  <div className={styles.statLabel}>Errors</div>
                </div>
              </div>
            )}

            {status.lastSyncTime && (
              <div className={styles.lastSync}>
                Last sync: {new Date(status.lastSyncTime).toLocaleString()}
              </div>
            )}
          </div>

          <div className={styles.section}>
            <div className={styles.sectionHeader}>
              <h3>Folders</h3>
              <div className={styles.actions}>
                <button
                  onClick={() => handleSync()}
                  disabled={syncing || sources.length === 0}
                  className={styles.syncButton}
                >
                  {syncing ? 'Syncing...' : 'Sync All'}
                </button>
                <button
                  onClick={() => setShowAddFolder(!showAddFolder)}
                  className={styles.addButton}
                >
                  Add Folder
                </button>
              </div>
            </div>

            {showAddFolder && (
              <div className={styles.addFolderForm}>
                <input
                  type="text"
                  value={folderUrl}
                  onChange={(e) => setFolderUrl(e.target.value)}
                  placeholder="Paste Google Drive folder URL or ID"
                  className={styles.input}
                />
                <div className={styles.formActions}>
                  <button onClick={handleAddFolder} className={styles.submitButton}>
                    Add
                  </button>
                  <button
                    onClick={() => {
                      setShowAddFolder(false);
                      setFolderUrl('');
                    }}
                    className={styles.cancelButton}
                  >
                    Cancel
                  </button>
                </div>
              </div>
            )}

            {sources.length === 0 ? (
              <div className={styles.emptyState}>
                <p>No folders added yet. Add a folder to start importing transcripts.</p>
              </div>
            ) : (
              <div className={styles.folderList}>
                {sources.map((source) => (
                  <div key={source.id} className={styles.folderItem}>
                    <div className={styles.folderInfo}>
                      <div className={styles.folderName}>
                        📁 {source.folderName || 'Untitled Folder'}
                      </div>
                      <div className={styles.folderMeta}>
                        {source.lastSync ? (
                          <span>Last sync: {new Date(source.lastSync).toLocaleString()}</span>
                        ) : (
                          <span>Not synced yet</span>
                        )}
                      </div>
                    </div>
                    <div className={styles.folderActions}>
                      <button
                        onClick={() => handleSync(source.folderId)}
                        disabled={syncing}
                        className={styles.smallButton}
                      >
                        Sync
                      </button>
                      <button
                        onClick={() => handleRemoveFolderClick(source.id)}
                        className={styles.removeButton}
                      >
                        Remove
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          {importableCount > 0 && (
            <div className={styles.section}>
              <div className={styles.sectionHeader}>
                <h3>Ready to Import</h3>
                <button
                  onClick={handleImportClick}
                  disabled={importing}
                  className={styles.importButton}
                >
                  {importing ? 'Importing...' : `Import ${importableCount} to Calls`}
                </button>
              </div>

              <div className={styles.importInfo}>
                <p>
                  📄 {importableCount} file(s) synced from Drive and ready to convert to Call records.
                  Importing will automatically run AI analysis on each file.
                </p>
              </div>

              {importableFiles.length > 0 && (
                <div className={styles.filePreview}>
                  <div className={styles.previewLabel}>Files to import:</div>
                  <div className={styles.fileList}>
                    {importableFiles.slice(0, 10).map((file) => (
                      <div key={file.id} className={styles.filePreviewItem}>
                        📄 {file.name}
                      </div>
                    ))}
                    {importableFiles.length > 10 && (
                      <div className={styles.filePreviewItem}>
                        ... and {importableFiles.length - 10} more
                      </div>
                    )}
                  </div>
                </div>
              )}
            </div>
          )}
        </div>
      )}

      <Modal
        isOpen={showDisconnectModal}
        onClose={() => setShowDisconnectModal(false)}
        onConfirm={handleDisconnectConfirm}
        title="Disconnect Google Drive"
        message="Are you sure you want to disconnect Google Drive? All synced data will remain in the database."
        confirmText="Disconnect"
        confirmType="danger"
        isLoading={disconnecting}
      />

      <Modal
        isOpen={showImportModal}
        onClose={() => setShowImportModal(false)}
        onConfirm={handleImportConfirm}
        title="Import Files to Calls"
        message={`Import ${importableCount} file(s) to Calls? This will run AI analysis on each file and may take some time.`}
        confirmText="Import"
        confirmType="primary"
        isLoading={importing}
      />

      <Modal
        isOpen={showRemoveFolderModal}
        onClose={() => {
          setShowRemoveFolderModal(false);
          setFolderToRemove(null);
        }}
        onConfirm={handleRemoveFolderConfirm}
        title="Remove Folder"
        message="Are you sure you want to remove this folder? Files will remain in the database."
        confirmText="Remove"
        confirmType="danger"
        isLoading={removingFolder}
      />
    </div>
  );
}


