import {
  useCallback,
  useEffect,
  useRef,
  useState
} from 'react';

import {
  api
} from '../services/api.js';

import './ResumeManager.css';

const MAX_FILE_SIZE =
  10 *
  1024 *
  1024;

const ALLOWED_EXTENSIONS = [
  '.pdf',
  '.doc',
  '.docx'
];

function getErrorMessage(
  error,
  fallbackMessage
) {
  return (
    error?.response?.data?.message ||
    error?.message ||
    fallbackMessage
  );
}

function getFileExtension(
  fileName
) {
  const normalizedName =
    String(
      fileName || ''
    )
      .trim()
      .toLowerCase();

  const lastDotIndex =
    normalizedName.lastIndexOf(
      '.'
    );

  if (
    lastDotIndex < 0
  ) {
    return '';
  }

  return normalizedName.slice(
    lastDotIndex
  );
}

function validateResumeFile(
  file
) {
  if (!file) {
    throw new Error(
      'Select a resume file first.'
    );
  }

  const extension =
    getFileExtension(
      file.name
    );

  if (
    !ALLOWED_EXTENSIONS.includes(
      extension
    )
  ) {
    throw new Error(
      'Only PDF, DOC, and DOCX resume files are allowed.'
    );
  }

  if (
    !Number.isFinite(
      file.size
    ) ||
    file.size <= 0
  ) {
    throw new Error(
      'The selected resume file is empty or invalid.'
    );
  }

  if (
    file.size >
    MAX_FILE_SIZE
  ) {
    throw new Error(
      'Resume file size must not exceed 10 MB.'
    );
  }

  return true;
}

function formatFileSize(
  value
) {
  const bytes =
    Number(
      value
    );

  if (
    !Number.isFinite(
      bytes
    ) ||
    bytes < 0
  ) {
    return 'Not available';
  }

  if (
    bytes < 1024
  ) {
    return `${bytes} B`;
  }

  const kilobytes =
    bytes / 1024;

  if (
    kilobytes < 1024
  ) {
    return `${kilobytes.toFixed(1)} KB`;
  }

  const megabytes =
    kilobytes / 1024;

  return `${megabytes.toFixed(2)} MB`;
}

function formatDateTime(
  value
) {
  if (!value) {
    return 'Not available';
  }

  const date =
    new Date(
      value
    );

  if (
    Number.isNaN(
      date.getTime()
    )
  ) {
    return 'Not available';
  }

  return date.toLocaleString();
}

function ResumeManager({
  onResumeChanged
}) {
  const fileInputRef =
    useRef(null);

  const [
    activeResume,
    setActiveResume
  ] = useState(null);

  const [
    history,
    setHistory
  ] = useState([]);

  const [
    selectedFile,
    setSelectedFile
  ] = useState(null);

  const [
    loading,
    setLoading
  ] = useState(true);

  const [
    refreshing,
    setRefreshing
  ] = useState(false);

  const [
    uploading,
    setUploading
  ] = useState(false);

  const [
    removing,
    setRemoving
  ] = useState(false);

  const [
    deletingId,
    setDeletingId
  ] = useState('');

  const [
    deletingHistory,
    setDeletingHistory
  ] = useState(false);

  const [
    message,
    setMessage
  ] = useState('');

  const [
    messageType,
    setMessageType
  ] = useState('');

  function showMessage(
    text,
    type = 'success'
  ) {
    setMessage(
      text
    );

    setMessageType(
      type
    );
  }

  function clearMessage() {
    setMessage('');
    setMessageType('');
  }

  const loadResumeData =
    useCallback(
      async (
        isRefresh = false
      ) => {
        if (isRefresh) {
          setRefreshing(true);
        } else {
          setLoading(true);
        }

        try {
          const [
            activeResponse,
            historyResponse
          ] = await Promise.all([
            api.get(
              '/resume'
            ),

            api.get(
              '/resume/history?limit=100'
            )
          ]);

          const configured =
            activeResponse
              .data
              .configured ===
            true;

          setActiveResume(
            configured
              ? (
                activeResponse
                  .data
                  .resume ||
                null
              )
              : null
          );

          const resumeHistory =
            historyResponse
              .data
              .resumes ||
            [];

          setHistory(
            Array.isArray(
              resumeHistory
            )
              ? resumeHistory
              : []
          );
        } catch (error) {
          console.error(
            'Unable to load Resume information:',
            error
          );

          showMessage(
            getErrorMessage(
              error,
              'Unable to load Resume information.'
            ),
            'error'
          );
        } finally {
          setLoading(false);
          setRefreshing(false);
        }
      },
      []
    );

  useEffect(
    () => {
      loadResumeData();
    },
    [loadResumeData]
  );

  function resetFileInput() {
    setSelectedFile(
      null
    );

    if (
      fileInputRef.current
    ) {
      fileInputRef
        .current
        .value =
        '';
    }
  }

  function handleFileChange(
    event
  ) {
    clearMessage();

    const file =
      event.target
        .files?.[0] ||
      null;

    if (!file) {
      setSelectedFile(
        null
      );

      return;
    }

    try {
      validateResumeFile(
        file
      );

      setSelectedFile(
        file
      );
    } catch (error) {
      resetFileInput();

      showMessage(
        error.message,
        'error'
      );
    }
  }

  async function notifyResumeChanged() {
    if (
      typeof onResumeChanged ===
      'function'
    ) {
      await onResumeChanged();
    }
  }

  async function uploadResume(
    event
  ) {
    event.preventDefault();

    clearMessage();

    try {
      validateResumeFile(
        selectedFile
      );
    } catch (error) {
      showMessage(
        error.message,
        'error'
      );

      return;
    }

    const confirmed =
      window.confirm(
        activeResume
          ? (
            'Upload this resume and replace the currently active resume?'
          )
          : (
            'Upload this resume as your active resume?'
          )
      );

    if (!confirmed) {
      return;
    }

    setUploading(true);

    try {
      const formData =
        new FormData();

      formData.append(
        'resume',
        selectedFile
      );

      /*
       * Do not manually set Content-Type.
       * The browser adds the multipart
       * boundary automatically.
       */
      const response =
        await api.post(
          '/resume',
          formData
        );

      resetFileInput();

      await loadResumeData(
        true
      );

      await notifyResumeChanged();

      showMessage(
        response.data.message ||
        'Resume uploaded successfully.'
      );
    } catch (error) {
      console.error(
        'Resume upload failed:',
        error
      );

      showMessage(
        getErrorMessage(
          error,
          'Unable to upload Resume.'
        ),
        'error'
      );
    } finally {
      setUploading(false);
    }
  }

  async function removeActiveResume() {
    if (!activeResume) {
      showMessage(
        'No active resume is configured.',
        'error'
      );

      return;
    }

    const confirmed =
      window.confirm(
        `Remove the active resume "${activeResume.originalName}"?`
      );

    if (!confirmed) {
      return;
    }

    setRemoving(true);
    clearMessage();

    try {
      const response =
        await api.delete(
          '/resume'
        );

      resetFileInput();

      await loadResumeData(
        true
      );

      await notifyResumeChanged();

      showMessage(
        response.data.message ||
        'Active Resume removed successfully.'
      );
    } catch (error) {
      console.error(
        'Unable to remove active Resume:',
        error
      );

      showMessage(
        getErrorMessage(
          error,
          'Unable to remove active Resume.'
        ),
        'error'
      );
    } finally {
      setRemoving(false);
    }
  }

  async function deleteHistoryResume(
    resume
  ) {
    if (!resume?.id) {
      showMessage(
        'Resume ID is missing.',
        'error'
      );

      return;
    }

    if (
      resume.isActive ===
      true
    ) {
      showMessage(
        'The active Resume cannot be deleted from history. Remove or replace the active Resume first.',
        'error'
      );

      return;
    }

    const confirmed =
      window.confirm(
        `Permanently delete "${resume.originalName}" from Resume history?`
      );

    if (!confirmed) {
      return;
    }

    setDeletingId(
      resume.id
    );

    clearMessage();

    try {
      const response =
        await api.delete(
          `/resume/${resume.id}`
        );

      await loadResumeData(
        true
      );

      await notifyResumeChanged();

      showMessage(
        response.data.message ||
        'Resume permanently deleted.'
      );
    } catch (error) {
      console.error(
        'Unable to permanently delete Resume:',
        error
      );

      showMessage(
        getErrorMessage(
          error,
          'Unable to permanently delete Resume.'
        ),
        'error'
      );
    } finally {
      setDeletingId('');
    }
  }

  async function deleteAllResumeHistory() {
    const inactiveHistory =
      history.filter(
        resume => {
          return (
            resume.isActive !==
            true
          );
        }
      );

    if (
      inactiveHistory.length ===
      0
    ) {
      showMessage(
        'No inactive Resume history is available.',
        'error'
      );

      return;
    }

    const confirmed =
      window.confirm(
        `Delete all ${inactiveHistory.length} inactive Resume history record(s)? Your active Resume will be preserved.`
      );

    if (!confirmed) {
      return;
    }

    setDeletingHistory(
      true
    );

    clearMessage();

    try {
      const response =
        await api.delete(
          '/resume/history'
        );

      await loadResumeData(
        true
      );

      await notifyResumeChanged();

      showMessage(
        response.data.message ||
        'Resume history deleted successfully.'
      );
    } catch (error) {
      console.error(
        'Unable to delete Resume history:',
        error
      );

      showMessage(
        getErrorMessage(
          error,
          'Unable to delete Resume history.'
        ),
        'error'
      );
    } finally {
      setDeletingHistory(
        false
      );
    }
  }

  async function refreshResumeData() {
    clearMessage();

    await loadResumeData(
      true
    );
  }

  const inactiveHistoryCount =
    history.filter(
      resume => {
        return (
          resume.isActive !==
          true
        );
      }
    ).length;

  const operationRunning =
    uploading ||
    removing ||
    deletingHistory ||
    Boolean(
      deletingId
    );

  if (loading) {
    return (
      <section className="resume-manager">
        <h2>
          Resume
        </h2>

        <p className="resume-manager-loading">
          Loading your active Resume...
        </p>
      </section>
    );
  }

  return (
    <section className="resume-manager">
      <div className="resume-manager-header">
        <div>
          <h2>
            Resume
          </h2>

          <p>
            Your Resume is stored
            privately for your account
            and attached only to live
            initial outreach emails.
          </p>
        </div>

        <button
          type="button"
          className={
            'resume-button ' +
            'resume-button-secondary'
          }
          disabled={
            refreshing ||
            operationRunning
          }
          onClick={
            refreshResumeData
          }
        >
          {refreshing
            ? 'Refreshing...'
            : 'Refresh'}
        </button>
      </div>

      {message && (
        <div
          className={
            messageType ===
            'error'
              ? (
                'resume-message ' +
                'resume-message-error'
              )
              : (
                'resume-message ' +
                'resume-message-success'
              )
          }
        >
          {message}
        </div>
      )}

      <div className="resume-active-card">
        <div className="resume-section-heading">
          <h3>
            Active Resume
          </h3>

          <span
            className={
              activeResume
                ? (
                  'resume-status ' +
                  'resume-status-active'
                )
                : (
                  'resume-status ' +
                  'resume-status-missing'
                )
            }
          >
            {activeResume
              ? 'Configured'
              : 'Not Configured'}
          </span>
        </div>

        {activeResume ? (
          <>
            <div className="resume-details-grid">
              <ResumeDetail
                label="File Name"
                value={
                  activeResume
                    .originalName
                }
              />

              <ResumeDetail
                label="File Type"
                value={
                  activeResume
                    .mimeType
                }
              />

              <ResumeDetail
                label="File Size"
                value={
                  formatFileSize(
                    activeResume
                      .fileSize
                  )
                }
              />

              <ResumeDetail
                label="Uploaded"
                value={
                  formatDateTime(
                    activeResume
                      .uploadedAt
                  )
                }
              />

              <ResumeDetail
                label="Physical File"
                value={
                  activeResume
                    .fileExists ===
                  false
                    ? 'Missing'
                    : 'Available'
                }
              />
            </div>

            {activeResume.fileExists ===
              false && (
              <div className="resume-file-warning">
                Resume metadata exists,
                but the physical file is
                missing. Upload the Resume
                again before live sending.
              </div>
            )}

            <button
              type="button"
              className={
                'resume-button ' +
                'resume-button-danger'
              }
              disabled={
                operationRunning
              }
              onClick={
                removeActiveResume
              }
            >
              {removing
                ? 'Removing...'
                : 'Remove Active Resume'}
            </button>
          </>
        ) : (
          <div className="resume-empty">
            No active Resume is configured.
            Upload a Resume before live
            initial-email sending.
          </div>
        )}
      </div>

      <form
        className="resume-upload-card"
        onSubmit={
          uploadResume
        }
      >
        <h3>
          Upload or Replace Resume
        </h3>

        <p>
          Accepted formats: PDF, DOC, and
          DOCX. Maximum file size: 10 MB.
        </p>

        <label className="resume-file-field">
          <span>
            Select Resume
          </span>

          <input
            ref={
              fileInputRef
            }
            type="file"
            name="resume"
            accept=".pdf,.doc,.docx"
            disabled={
              operationRunning
            }
            onChange={
              handleFileChange
            }
          />
        </label>

        {selectedFile && (
          <div className="resume-selected-file">
            <strong>
              Selected:
            </strong>

            {' '}

            {selectedFile.name}

            {' '}

            (
            {formatFileSize(
              selectedFile.size
            )}
            )
          </div>
        )}

        <button
          type="submit"
          className={
            'resume-button ' +
            'resume-button-primary'
          }
          disabled={
            operationRunning ||
            !selectedFile
          }
        >
          {uploading
            ? 'Uploading...'
            : activeResume
              ? 'Replace Resume'
              : 'Upload Resume'}
        </button>
      </form>

      <div className="resume-history-card">
        <div className="resume-section-heading">
          <div className="resume-history-heading-text">
            <h3>
              Resume History
            </h3>

            <span className="resume-history-count">
              {history.length}
              {' '}
              total record(s)
            </span>
          </div>

          <button
            type="button"
            className={
              'resume-button ' +
              'resume-button-danger'
            }
            disabled={
              operationRunning ||
              inactiveHistoryCount ===
                0
            }
            onClick={
              deleteAllResumeHistory
            }
          >
            {deletingHistory
              ? 'Deleting History...'
              : 'Delete All Resume History'}
          </button>
        </div>

        {history.length === 0 ? (
          <div className="resume-empty">
            No Resume history is
            available.
          </div>
        ) : (
          <div className="resume-history-list">
            {history.map(
              resume => (
                <article
                  key={
                    resume.id
                  }
                  className="resume-history-item"
                >
                  <div className="resume-history-information">
                    <h4>
                      {resume.originalName}
                    </h4>

                    <p>
                      {formatFileSize(
                        resume.fileSize
                      )}

                      {' | '}

                      {formatDateTime(
                        resume.uploadedAt
                      )}
                    </p>
                  </div>

                  <div className="resume-history-actions">
                    {resume.isActive ? (
                      <span
                        className={
                          'resume-status ' +
                          'resume-status-active'
                        }
                      >
                        Active
                      </span>
                    ) : (
                      <button
                        type="button"
                        className={
                          'resume-button ' +
                          'resume-button-danger'
                        }
                        disabled={
                          operationRunning
                        }
                        onClick={() => {
                          deleteHistoryResume(
                            resume
                          );
                        }}
                      >
                        {deletingId ===
                        resume.id
                          ? 'Deleting...'
                          : 'Delete'}
                      </button>
                    )}
                  </div>
                </article>
              )
            )}
          </div>
        )}
      </div>
    </section>
  );
}

function ResumeDetail({
  label,
  value
}) {
  return (
    <div className="resume-detail">
      <span>
        {label}
      </span>

      <strong>
        {value ||
          'Not available'}
      </strong>
    </div>
  );
}

export default ResumeManager;