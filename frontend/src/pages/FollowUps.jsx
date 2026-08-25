import {
  useEffect,
  useMemo,
  useState
} from 'react';

import './FollowUps.css';

const API_URL =
  'http://localhost:5000/api/followups';

const emptyPageData = {
  templates: {
    followUp1Body: '',
    followUp2Body: '',
    followUp1DailyLimit: 25,
    followUp2DailyLimit: 15
  },

  dailyUsage: {
    followUp1: {
      sentToday: 0,
      dailyLimit: 25,
      remaining: 25
    },

    followUp2: {
      sentToday: 0,
      dailyLimit: 15,
      remaining: 15
    }
  },

  followUp1Eligible: [],
  followUp2Eligible: [],
  replied: [],
  completed: [],
  stopped: [],
  removed: [],
  failed: []
};

function getLocalDateKey(dateValue) {
  if (!dateValue) {
    return 'unknown';
  }

  const date = new Date(dateValue);

  if (
    Number.isNaN(
      date.getTime()
    )
  ) {
    return 'unknown';
  }

  const year =
    date.getFullYear();

  const month =
    String(
      date.getMonth() + 1
    ).padStart(2, '0');

  const day =
    String(
      date.getDate()
    ).padStart(2, '0');

  return `${year}-${month}-${day}`;
}

function formatDateLabel(dateKey) {
  if (
    !dateKey ||
    dateKey === 'unknown'
  ) {
    return 'Unknown Date';
  }

  const [
    year,
    month,
    day
  ] = dateKey
    .split('-')
    .map(Number);

  const date = new Date(
    year,
    month - 1,
    day
  );

  return date.toLocaleDateString(
    'en-IN',
    {
      year: 'numeric',
      month: 'long',
      day: '2-digit'
    }
  );
}

function formatDateTime(dateValue) {
  if (!dateValue) {
    return '';
  }

  const date =
    new Date(dateValue);

  if (
    Number.isNaN(
      date.getTime()
    )
  ) {
    return '';
  }

  return date.toLocaleString(
    'en-IN'
  );
}

function groupRecordsByDate(
  records,
  dateField
) {
  const groupedRecords =
    records.reduce(
      (groups, record) => {
        const dateKey =
          getLocalDateKey(
            record[dateField]
          );

        if (!groups[dateKey]) {
          groups[dateKey] = [];
        }

        groups[dateKey].push(
          record
        );

        return groups;
      },
      {}
    );

  /*
   * Oldest date folders appear first.
   */
  return Object.entries(
    groupedRecords
  ).sort(
    ([firstDate], [secondDate]) => {
      if (
        firstDate === 'unknown'
      ) {
        return 1;
      }

      if (
        secondDate === 'unknown'
      ) {
        return -1;
      }

      return firstDate.localeCompare(
        secondDate
      );
    }
  );
}

function FollowUps() {
  const [
    pageData,
    setPageData
  ] = useState(
    emptyPageData
  );

  const [
    selectedFollowUp1,
    setSelectedFollowUp1
  ] = useState([]);

  const [
    selectedFollowUp2,
    setSelectedFollowUp2
  ] = useState([]);

  const [
    openFolders,
    setOpenFolders
  ] = useState({});

  const [
    loading,
    setLoading
  ] = useState(false);

  const [
    message,
    setMessage
  ] = useState('');

  const [
    messageType,
    setMessageType
  ] = useState('');

  const followUp1Folders =
    useMemo(
      () =>
        groupRecordsByDate(
          pageData.followUp1Eligible ||
          [],
          'initialSentAt'
        ),
      [
        pageData.followUp1Eligible
      ]
    );

  const followUp2Folders =
    useMemo(
      () =>
        groupRecordsByDate(
          pageData.followUp2Eligible ||
          [],
          'followUp1SentAt'
        ),
      [
        pageData.followUp2Eligible
      ]
    );

  async function loadPage() {
    const response =
      await fetch(API_URL);

    const result =
      await response.json();

    if (!response.ok) {
      throw new Error(
        result.message ||
        'Unable to load follow-up data.'
      );
    }

    setPageData({
      ...emptyPageData,
      ...result,

      templates: {
        ...emptyPageData.templates,
        ...(result.templates || {})
      },

      dailyUsage: {
        ...emptyPageData.dailyUsage,
        ...(result.dailyUsage || {}),

        followUp1: {
          ...emptyPageData
            .dailyUsage
            .followUp1,

          ...(
            result
              .dailyUsage
              ?.followUp1 ||
            {}
          )
        },

        followUp2: {
          ...emptyPageData
            .dailyUsage
            .followUp2,

          ...(
            result
              .dailyUsage
              ?.followUp2 ||
            {}
          )
        }
      },

      followUp1Eligible:
        result.followUp1Eligible ||
        [],

      followUp2Eligible:
        result.followUp2Eligible ||
        [],

      replied:
        result.replied ||
        [],

      completed:
        result.completed ||
        [],

      stopped:
        result.stopped ||
        [],

      removed:
        result.removed ||
        [],

      failed:
        result.failed ||
        []
    });
  }

  useEffect(() => {
    loadPage().catch(error => {
      setMessage(
        error.message
      );

      setMessageType(
        'error'
      );
    });
  }, []);

  function updateTemplate(
    fieldName,
    value
  ) {
    setPageData(current => ({
      ...current,

      templates: {
        ...current.templates,

        [fieldName]:
          value
      }
    }));
  }

  async function executeRequest(
    url,
    options = {}
  ) {
    setLoading(true);
    setMessage('');
    setMessageType('');

    try {
      const response =
        await fetch(
          url,
          {
            headers: {
              'Content-Type':
                'application/json'
            },

            ...options
          }
        );

      const result =
        await response.json();

      if (!response.ok) {
        throw new Error(
          result.message ||
          'Request failed.'
        );
      }

      await loadPage();

      setSelectedFollowUp1([]);
      setSelectedFollowUp2([]);

      const sentCount =
        result.sent?.length ||
        0;

      const skippedCount =
        result.skipped?.length ||
        0;

      const failedCount =
        result.failed?.length ||
        0;

      const replyCount =
        result.repliesFound ??
        result.replied?.length ??
        0;

      const removedCount =
        result.removedCount ||
        0;

      if (result.message) {
        setMessage(
          result.message
        );
      } else {
        setMessage(
          `Sent: ${sentCount}, ` +
          `Replies: ${replyCount}, ` +
          `Skipped: ${skippedCount}, ` +
          `Failed: ${failedCount}, ` +
          `Removed: ${removedCount}`
        );
      }

      setMessageType(
        'success'
      );
    } catch (error) {
      setMessage(
        error.message
      );

      setMessageType(
        'error'
      );
    } finally {
      setLoading(false);
    }
  }

  function saveTemplates() {
    executeRequest(
      `${API_URL}/templates`,
      {
        method: 'PUT',

        body:
          JSON.stringify(
            pageData.templates
          )
      }
    );
  }

  function checkReplies() {
    executeRequest(
      `${API_URL}/check-replies`,
      {
        method: 'POST'
      }
    );
  }

  function sendFollowUp(
    stage,
    selectedIds
  ) {
    if (
      selectedIds.length === 0
    ) {
      return;
    }

    executeRequest(
      `${API_URL}/send-followup-${stage}`,
      {
        method: 'POST',

        body:
          JSON.stringify({
            trackerIds:
              selectedIds
          })
      }
    );
  }

  function removeRecords(
    trackerIds
  ) {
    if (
      !Array.isArray(trackerIds) ||
      trackerIds.length === 0
    ) {
      return;
    }

    const confirmed =
      window.confirm(
        'Remove selected emails from follow-up tracking?\n\n' +
        'This will not delete Gmail messages.\n' +
        'This will not remove addresses from sent_emails.json.'
      );

    if (!confirmed) {
      return;
    }

    executeRequest(
      `${API_URL}/remove`,
      {
        method: 'POST',

        body:
          JSON.stringify({
            trackerIds,

            reason:
              'Removed from Follow-Ups page'
          })
      }
    );
  }

  function restoreRecord(
    trackerId
  ) {
    executeRequest(
      `${API_URL}/${trackerId}/restore`,
      {
        method: 'POST'
      }
    );
  }

  /*
   * Corrected function.
   *
   * The folder key must be used as a
   * computed object property.
   */
  function toggleFolder(folderKey) {
    setOpenFolders(current => {
      const updatedFolders = {
        ...current
      };

      updatedFolders[folderKey] =
        !current[folderKey];

      return updatedFolders;
    });
  }

  function toggleSelection(
    trackerId,
    selectedIds,
    setSelectedIds
  ) {
    if (
      selectedIds.includes(
        trackerId
      )
    ) {
      setSelectedIds(
        selectedIds.filter(
          id =>
            id !== trackerId
        )
      );

      return;
    }

    setSelectedIds([
      ...selectedIds,
      trackerId
    ]);
  }

  function selectFolder(
    folderRecords,
    selectedIds,
    setSelectedIds
  ) {
    const folderIds =
      folderRecords.map(
        record =>
          record.id
      );

    setSelectedIds([
      ...new Set([
        ...selectedIds,
        ...folderIds
      ])
    ]);
  }

  function clearFolderSelection(
    folderRecords,
    selectedIds,
    setSelectedIds
  ) {
    const folderIds =
      new Set(
        folderRecords.map(
          record =>
            record.id
        )
      );

    setSelectedIds(
      selectedIds.filter(
        id =>
          !folderIds.has(id)
      )
    );
  }

  function removeSelectedFromFolder(
    folderRecords,
    selectedIds
  ) {
    const selectedFolderIds =
      folderRecords
        .filter(record =>
          selectedIds.includes(
            record.id
          )
        )
        .map(record =>
          record.id
        );

    removeRecords(
      selectedFolderIds
    );
  }

  function renderDateFolders({
    title,
    stage,
    folders,
    selectedIds,
    setSelectedIds,
    usage
  }) {
    return (
      <section className="followup-panel">
        <div className="section-heading">
          <div>
            <h2>{title}</h2>

            <p className="usage-text">
              Sent today:
              {' '}
              <strong>
                {usage.sentToday}
              </strong>

              {' / '}

              {usage.dailyLimit}

              {' | '}

              Remaining:
              {' '}

              <strong>
                {usage.remaining}
              </strong>
            </p>
          </div>
        </div>

        {folders.length === 0 ? (
          <div className="empty-state">
            No eligible emails.
          </div>
        ) : (
          folders.map(
            ([
              dateKey,
              folderRecords
            ]) => {
              const dateLabel =
                formatDateLabel(
                  dateKey
                );

              const folderKey =
                `stage-${stage}-${dateKey}`;

              const isOpen =
                Boolean(
                  openFolders[
                    folderKey
                  ]
                );

              const selectedInFolder =
                folderRecords.filter(
                  record =>
                    selectedIds.includes(
                      record.id
                    )
                ).length;

              const allFolderSelected =
                folderRecords.length >
                  0 &&
                selectedInFolder ===
                  folderRecords.length;

              return (
                <div
                  className="date-folder"
                  key={folderKey}
                >
                  <button
                    type="button"
                    className="folder-header"
                    onClick={() =>
                      toggleFolder(
                        folderKey
                      )
                    }
                  >
                    <span className="folder-arrow">
                      {isOpen
                        ? '▼'
                        : '▶'}
                    </span>

                    <span className="folder-date">
                      {dateLabel}
                    </span>

                    <span className="folder-count">
                      {folderRecords.length}
                      {' '}
                      email(s)
                    </span>

                    {selectedInFolder >
                      0 && (
                      <span className="selected-count">
                        {selectedInFolder}
                        {' '}
                        selected
                      </span>
                    )}
                  </button>

                  {isOpen && (
                    <div className="folder-content">
                      <div className="folder-actions">
                        <button
                          type="button"
                          className="secondary-button"
                          disabled={
                            loading ||
                            allFolderSelected
                          }
                          onClick={() =>
                            selectFolder(
                              folderRecords,
                              selectedIds,
                              setSelectedIds
                            )
                          }
                        >
                          Select All
                        </button>

                        <button
                          type="button"
                          className="secondary-button"
                          disabled={
                            loading ||
                            selectedInFolder ===
                              0
                          }
                          onClick={() =>
                            clearFolderSelection(
                              folderRecords,
                              selectedIds,
                              setSelectedIds
                            )
                          }
                        >
                          Clear Folder
                        </button>

                        <button
                          type="button"
                          className="followup-danger-button"
                          disabled={
                            loading ||
                            selectedInFolder ===
                              0
                          }
                          onClick={() =>
                            removeSelectedFromFolder(
                              folderRecords,
                              selectedIds
                            )
                          }
                        >
                          Remove Selected
                        </button>
                      </div>

                      <div className="email-list">
                        {folderRecords.map(
                          record => {
                            const selected =
                              selectedIds.includes(
                                record.id
                              );

                            return (
                              <div
                                className="email-row"
                                key={
                                  record.id
                                }
                              >
                                <label className="email-select">
                                  <input
                                    type="checkbox"
                                    checked={
                                      selected
                                    }
                                    onChange={() =>
                                      toggleSelection(
                                        record.id,
                                        selectedIds,
                                        setSelectedIds
                                      )
                                    }
                                  />

                                  <div className="email-details">
                                    <strong>
                                      {record.email}
                                    </strong>

                                    <span>
                                      Initial sent:
                                      {' '}
                                      {formatDateTime(
                                        record.initialSentAt
                                      )}
                                    </span>

                                    {record.followUp1SentAt && (
                                      <span>
                                        Follow-Up 1 sent:
                                        {' '}
                                        {formatDateTime(
                                          record.followUp1SentAt
                                        )}
                                      </span>
                                    )}

                                    <span>
                                      Status:
                                      {' '}
                                      {record.status}
                                    </span>
                                  </div>
                                </label>

                                <button
                                  type="button"
                                  className="row-delete-button"
                                  disabled={
                                    loading
                                  }
                                  onClick={() =>
                                    removeRecords([
                                      record.id
                                    ])
                                  }
                                >
                                  Remove
                                </button>
                              </div>
                            );
                          }
                        )}
                      </div>
                    </div>
                  )}
                </div>
              );
            }
          )
        )}

        <button
          type="button"
          className="primary-button send-button"
          disabled={
            loading ||
            selectedIds.length ===
              0 ||
            usage.remaining ===
              0
          }
          onClick={() =>
            sendFollowUp(
              stage,
              selectedIds
            )
          }
        >
          {loading
            ? 'Processing...'
            : (
              `Send Follow-Up ${stage} ` +
              `(${selectedIds.length} selected)`
            )}
        </button>
      </section>
    );
  }

  return (
    <main className="followup-page">
      <div className="page-heading">
        <div>
          <h1>Follow-Ups</h1>

          <p>
            Select date-wise email batches
            and send follow-ups in the
            original email conversation.
          </p>
        </div>

        <button
          type="button"
          className="primary-button"
          disabled={loading}
          onClick={
            checkReplies
          }
        >
          {loading
            ? 'Checking...'
            : 'Check Replies'}
        </button>
      </div>

      {message && (
        <div
          className={
            messageType ===
              'error'
              ? 'message error-message'
              : 'message success-message'
          }
        >
          {message}
        </div>
      )}

      <section className="followup-panel">
        <h2>
          Follow-Up Settings
        </h2>

        <label className="template-field">
          <span>
            Follow-Up 1 Body
          </span>

          <textarea
            rows="7"
            value={
              pageData
                .templates
                .followUp1Body ||
              ''
            }
            onChange={event =>
              updateTemplate(
                'followUp1Body',
                event.target.value
              )
            }
          />
        </label>

        <label className="template-field">
          <span>
            Follow-Up 1 Daily Limit
          </span>

          <input
            type="number"
            min="1"
            value={
              pageData
                .templates
                .followUp1DailyLimit
            }
            onChange={event =>
              updateTemplate(
                'followUp1DailyLimit',
                event.target.value
              )
            }
          />
        </label>

        <label className="template-field">
          <span>
            Follow-Up 2 Body
          </span>

          <textarea
            rows="7"
            value={
              pageData
                .templates
                .followUp2Body ||
              ''
            }
            onChange={event =>
              updateTemplate(
                'followUp2Body',
                event.target.value
              )
            }
          />
        </label>

        <label className="template-field">
          <span>
            Follow-Up 2 Daily Limit
          </span>

          <input
            type="number"
            min="1"
            value={
              pageData
                .templates
                .followUp2DailyLimit
            }
            onChange={event =>
              updateTemplate(
                'followUp2DailyLimit',
                event.target.value
              )
            }
          />
        </label>

        <button
          type="button"
          className="primary-button"
          disabled={loading}
          onClick={
            saveTemplates
          }
        >
          Save Follow-Up Settings
        </button>
      </section>

      <div className="followup-grid">
        {renderDateFolders({
          title:
            'Follow-Up 1',

          stage: 1,

          folders:
            followUp1Folders,

          selectedIds:
            selectedFollowUp1,

          setSelectedIds:
            setSelectedFollowUp1,

          usage:
            pageData
              .dailyUsage
              .followUp1
        })}

        {renderDateFolders({
          title:
            'Follow-Up 2',

          stage: 2,

          folders:
            followUp2Folders,

          selectedIds:
            selectedFollowUp2,

          setSelectedIds:
            setSelectedFollowUp2,

          usage:
            pageData
              .dailyUsage
              .followUp2
        })}
      </div>

      <section className="followup-panel">
        <h2>
          Replied
          {' '}
          ({pageData.replied.length})
        </h2>

        {pageData.replied.length ===
        0 ? (
          <div className="empty-state">
            No replies detected.
          </div>
        ) : (
          pageData.replied.map(
            record => (
              <div
                className="status-row"
                key={record.id}
              >
                <div>
                  <strong>
                    {record.email}
                  </strong>

                  <span>
                    {record.replySubject ||
                    'Reply detected'}
                  </span>

                  <span>
                    {formatDateTime(
                      record.replyDate
                    )}
                  </span>
                </div>

                <span className="status-badge replied">
                  REPLIED
                </span>
              </div>
            )
          )
        )}
      </section>

      <section className="followup-panel">
        <h2>
          Completed
          {' '}
          ({pageData.completed.length})
        </h2>

        {pageData.completed.length ===
        0 ? (
          <div className="empty-state">
            No completed sequences.
          </div>
        ) : (
          pageData.completed.map(
            record => (
              <div
                className="status-row"
                key={record.id}
              >
                <div>
                  <strong>
                    {record.email}
                  </strong>

                  <span>
                    Follow-Up 2 sent:
                    {' '}
                    {formatDateTime(
                      record.followUp2SentAt
                    )}
                  </span>
                </div>

                <span className="status-badge completed">
                  FOLLOW-UP 2 SENT
                </span>
              </div>
            )
          )
        )}
      </section>

      <section className="followup-panel">
        <h2>
          Removed
          {' '}
          ({pageData.removed.length})
        </h2>

        {pageData.removed.length ===
        0 ? (
          <div className="empty-state">
            No removed records.
          </div>
        ) : (
          pageData.removed.map(
            record => (
              <div
                className="status-row"
                key={record.id}
              >
                <div>
                  <strong>
                    {record.email}
                  </strong>

                  <span>
                    Removed:
                    {' '}
                    {formatDateTime(
                      record.removedAt
                    )}
                  </span>

                  <span>
                    {record.removedReason}
                  </span>
                </div>

                <button
                  type="button"
                  className="secondary-button"
                  disabled={loading}
                  onClick={() =>
                    restoreRecord(
                      record.id
                    )
                  }
                >
                  Restore
                </button>
              </div>
            )
          )
        )}
      </section>

      {pageData.failed.length >
        0 && (
        <section className="followup-panel">
          <h2>
            Failed
            {' '}
            ({pageData.failed.length})
          </h2>

          {pageData.failed.map(
            record => (
              <div
                className="status-row"
                key={record.id}
              >
                <div>
                  <strong>
                    {record.email}
                  </strong>

                  <span>
                    {record.lastError}
                  </span>
                </div>

                <span className="status-badge failed">
                  FAILED
                </span>
              </div>
            )
          )}
        </section>
      )}
    </main>
  );
}

export default FollowUps;