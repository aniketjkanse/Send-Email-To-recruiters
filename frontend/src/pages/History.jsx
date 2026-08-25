import {
  useCallback,
  useEffect,
  useMemo,
  useState
} from 'react';

import {
  api
} from '../services/api.js';

import './History.css';

const INITIAL_SUMMARY = {
  total: 0,
  sent: 0,
  dryRun: 0,
  failed: 0,
  skipped: 0
};

const EMAIL_TYPE_OPTIONS = [
  {
    value: 'ALL',
    label: 'All Email Types'
  },
  {
    value: 'INITIAL',
    label: 'Initial Email'
  },
  {
    value: 'FOLLOW_UP_1',
    label: 'Follow-Up 1'
  },
  {
    value: 'FOLLOW_UP_2',
    label: 'Follow-Up 2'
  }
];

const STATUS_OPTIONS = [
  {
    value: 'ALL',
    label: 'All Statuses'
  },
  {
    value: 'SENT',
    label: 'Sent'
  },
  {
    value: 'DRY_RUN',
    label: 'Dry Run'
  },
  {
    value: 'FAILED',
    label: 'Failed'
  },
  {
    value: 'SKIPPED',
    label: 'Skipped'
  }
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

function getNumber(
  ...values
) {
  for (
    const value of
    values
  ) {
    const parsedValue =
      Number(value);

    if (
      Number.isFinite(
        parsedValue
      )
    ) {
      return parsedValue;
    }
  }

  return 0;
}

function getText(
  ...values
) {
  for (
    const value of
    values
  ) {
    const normalizedValue =
      String(
        value || ''
      ).trim();

    if (normalizedValue) {
      return normalizedValue;
    }
  }

  return '';
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

function formatEmailType(
  value
) {
  const normalizedValue =
    String(
      value || ''
    ).toUpperCase();

  if (
    normalizedValue ===
    'FOLLOW_UP_1'
  ) {
    return 'Follow-Up 1';
  }

  if (
    normalizedValue ===
    'FOLLOW_UP_2'
  ) {
    return 'Follow-Up 2';
  }

  if (
    normalizedValue ===
    'INITIAL'
  ) {
    return 'Initial';
  }

  return (
    normalizedValue ||
    'Unknown'
  );
}

function normalizeHistoryRecords(
  responseData
) {
  const data =
    responseData &&
    typeof responseData ===
      'object'
      ? responseData
      : {};

  const records =
    data.history ||
    data.records ||
    data.emailHistory ||
    data.items ||
    [];

  if (
    !Array.isArray(
      records
    )
  ) {
    return [];
  }

  return records.map(
    record => {
      return {
        id:
          record.id,

        recipientEmail:
          getText(
            record.recipientEmail,
            record.email,
            record.recipient
          ),

        senderEmail:
          getText(
            record.senderEmail,
            record.sender
          ),

        subject:
          getText(
            record.subject,
            'Subject not available'
          ),

        messageId:
          getText(
            record.messageId
          ),

        emailType:
          getText(
            record.emailType,
            'INITIAL'
          ).toUpperCase(),

        status:
          getText(
            record.status,
            'UNKNOWN'
          ).toUpperCase(),

        reason:
          getText(
            record.reason
          ),

        sentAt:
          record.sentAt ||
          record.createdAt,

        createdAt:
          record.createdAt
      };
    }
  );
}

function normalizeSummary(
  responseData,
  records
) {
  const data =
    responseData &&
    typeof responseData ===
      'object'
      ? responseData
      : {};

  const summary =
    data.summary &&
    typeof data.summary ===
      'object'
      ? data.summary
      : data;

  const localCounts =
    records.reduce(
      (
        result,
        record
      ) => {
        result.total +=
          1;

        if (
          record.status ===
          'SENT'
        ) {
          result.sent +=
            1;
        }

        if (
          record.status ===
          'DRY_RUN'
        ) {
          result.dryRun +=
            1;
        }

        if (
          record.status ===
          'FAILED'
        ) {
          result.failed +=
            1;
        }

        if (
          record.status ===
          'SKIPPED'
        ) {
          result.skipped +=
            1;
        }

        return result;
      },
      {
        ...INITIAL_SUMMARY
      }
    );

  return {
    total:
      getNumber(
        summary.total,
        summary.totalRecords,
        summary.totalHistory,
        localCounts.total
      ),

    sent:
      getNumber(
        summary.sent,
        summary.sentCount,
        summary.successful,
        localCounts.sent
      ),

    dryRun:
      getNumber(
        summary.dryRun,
        summary.dryRunCount,
        localCounts.dryRun
      ),

    failed:
      getNumber(
        summary.failed,
        summary.failedCount,
        localCounts.failed
      ),

    skipped:
      getNumber(
        summary.skipped,
        summary.skippedCount,
        localCounts.skipped
      )
  };
}

function History() {
  const [
    records,
    setRecords
  ] = useState([]);

  const [
    summary,
    setSummary
  ] = useState(
    INITIAL_SUMMARY
  );

  const [
    searchText,
    setSearchText
  ] = useState('');

  const [
    emailTypeFilter,
    setEmailTypeFilter
  ] = useState('ALL');

  const [
    statusFilter,
    setStatusFilter
  ] = useState('ALL');

  const [
    loading,
    setLoading
  ] = useState(true);

  const [
    refreshing,
    setRefreshing
  ] = useState(false);

  const [
    deletingAll,
    setDeletingAll
  ] = useState(false);

  const [
    deletingId,
    setDeletingId
  ] = useState('');

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

  const loadHistory =
    useCallback(
      async (
        isRefresh = false,
        preserveMessage = false
      ) => {
        if (isRefresh) {
          setRefreshing(true);
        } else {
          setLoading(true);
        }

        if (!preserveMessage) {
          clearMessage();
        }

        try {
          const [
            historyResponse,
            summaryResponse
          ] = await Promise.all([
            api.get(
              '/history?limit=500'
            ),

            api.get(
              '/history/summary'
            )
          ]);

          const loadedRecords =
            normalizeHistoryRecords(
              historyResponse.data
            );

          setRecords(
            loadedRecords
          );

          setSummary(
            normalizeSummary(
              summaryResponse.data,
              loadedRecords
            )
          );
        } catch (error) {
          console.error(
            'Unable to load Email History:',
            error
          );

          showMessage(
            getErrorMessage(
              error,
              'Unable to load Email History.'
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
      loadHistory();
    },
    [loadHistory]
  );

  const filteredRecords =
    useMemo(
      () => {
        const normalizedSearch =
          searchText
            .trim()
            .toLowerCase();

        return records.filter(
          record => {
            const searchMatches =
              !normalizedSearch ||
              record
                .recipientEmail
                .toLowerCase()
                .includes(
                  normalizedSearch
                ) ||
              record
                .senderEmail
                .toLowerCase()
                .includes(
                  normalizedSearch
                ) ||
              record
                .subject
                .toLowerCase()
                .includes(
                  normalizedSearch
                );

            const typeMatches =
              emailTypeFilter ===
                'ALL' ||
              record.emailType ===
                emailTypeFilter;

            const statusMatches =
              statusFilter ===
                'ALL' ||
              record.status ===
                statusFilter;

            return (
              searchMatches &&
              typeMatches &&
              statusMatches
            );
          }
        );
      },
      [
        records,
        searchText,
        emailTypeFilter,
        statusFilter
      ]
    );

  async function refreshHistory() {
    await loadHistory(
      true
    );
  }

  async function deleteHistoryRecord(
    record
  ) {
    const confirmed =
      window.confirm(
        `Delete the History record for ${record.recipientEmail}?`
      );

    if (!confirmed) {
      return;
    }

    setDeletingId(
      record.id
    );

    clearMessage();

    try {
      const response =
        await api.delete(
          `/history/${record.id}`
        );

      await loadHistory(
        false,
        true
      );

      showMessage(
        response.data.message ||
        'History record deleted successfully.'
      );
    } catch (error) {
      console.error(
        'Unable to delete History record:',
        error
      );

      showMessage(
        getErrorMessage(
          error,
          'Unable to delete History record.'
        ),
        'error'
      );
    } finally {
      setDeletingId('');
    }
  }

  async function deleteAllHistory() {
    if (
      records.length ===
      0
    ) {
      showMessage(
        'No Email History is available.',
        'error'
      );

      return;
    }

    const confirmed =
      window.confirm(
        `Permanently delete all ${records.length} Email History record(s) for your account?`
      );

    if (!confirmed) {
      return;
    }

    setDeletingAll(true);
    clearMessage();

    try {
      const response =
        await api.delete(
          '/history'
        );

      setSearchText('');
      setEmailTypeFilter('ALL');
      setStatusFilter('ALL');

      await loadHistory(
        false,
        true
      );

      showMessage(
        response.data.message ||
        'All Email History deleted successfully.'
      );
    } catch (error) {
      console.error(
        'Unable to delete all Email History:',
        error
      );

      showMessage(
        getErrorMessage(
          error,
          'Unable to delete all Email History.'
        ),
        'error'
      );
    } finally {
      setDeletingAll(false);
    }
  }

  function clearFilters() {
    setSearchText('');
    setEmailTypeFilter('ALL');
    setStatusFilter('ALL');
  }

  const operationRunning =
    refreshing ||
    deletingAll ||
    Boolean(
      deletingId
    );

  if (loading) {
    return (
      <section className="history-page">
        <div className="history-panel">
          <h1>
            Email History
          </h1>

          <p>
            Loading PostgreSQL Email
            History...
          </p>
        </div>
      </section>
    );
  }

  return (
    <section className="history-page">
      <header className="history-header">
        <div>
          <h1>
            Email History
          </h1>

          <p>
            Review initial emails,
            Follow-Ups, Dry Runs, and
            failures stored in PostgreSQL.
          </p>
        </div>

        <div className="history-header-actions">
          <button
            type="button"
            className={
              'history-button ' +
              'history-button-secondary'
            }
            disabled={
              operationRunning
            }
            onClick={
              refreshHistory
            }
          >
            {refreshing
              ? 'Refreshing...'
              : 'Refresh'}
          </button>

          <button
            type="button"
            className={
              'history-button ' +
              'history-button-danger'
            }
            disabled={
              operationRunning ||
              records.length === 0
            }
            onClick={
              deleteAllHistory
            }
          >
            {deletingAll
              ? 'Deleting...'
              : 'Delete All History'}
          </button>
        </div>
      </header>

      {message && (
        <div
          className={
            messageType ===
            'error'
              ? (
                'history-message ' +
                'history-message-error'
              )
              : (
                'history-message ' +
                'history-message-success'
              )
          }
        >
          {message}
        </div>
      )}

      <div className="history-summary-grid">
        <SummaryCard
          label="Total"
          value={
            summary.total
          }
        />

        <SummaryCard
          label="Sent"
          value={
            summary.sent
          }
          tone="green"
        />

        <SummaryCard
          label="Dry Run"
          value={
            summary.dryRun
          }
          tone="purple"
        />

        <SummaryCard
          label="Failed"
          value={
            summary.failed
          }
          tone="red"
        />
      </div>

      <div className="history-filter-panel">
        <input
          type="search"
          value={
            searchText
          }
          placeholder={
            'Search recipient, sender, or subject'
          }
          disabled={
            operationRunning
          }
          onChange={
            event => {
              setSearchText(
                event.target.value
              );
            }
          }
        />

        <select
          value={
            emailTypeFilter
          }
          disabled={
            operationRunning
          }
          onChange={
            event => {
              setEmailTypeFilter(
                event.target.value
              );
            }
          }
        >
          {EMAIL_TYPE_OPTIONS.map(
            option => (
              <option
                key={
                  option.value
                }
                value={
                  option.value
                }
              >
                {option.label}
              </option>
            )
          )}
        </select>

        <select
          value={
            statusFilter
          }
          disabled={
            operationRunning
          }
          onChange={
            event => {
              setStatusFilter(
                event.target.value
              );
            }
          }
        >
          {STATUS_OPTIONS.map(
            option => (
              <option
                key={
                  option.value
                }
                value={
                  option.value
                }
              >
                {option.label}
              </option>
            )
          )}
        </select>

        <button
          type="button"
          className={
            'history-button ' +
            'history-button-secondary'
          }
          disabled={
            operationRunning
          }
          onClick={
            clearFilters
          }
        >
          Clear Filters
        </button>
      </div>

      <div className="history-result-heading">
        <span>
          Showing
          {' '}
          <strong>
            {filteredRecords.length}
          </strong>
          {' '}
          of
          {' '}
          <strong>
            {records.length}
          </strong>
          {' '}
          records
        </span>
      </div>

      {filteredRecords.length ===
      0 ? (
        <div className="history-empty">
          No Email History records match
          the current filters.
        </div>
      ) : (
        <div className="history-table-wrapper">
          <table className="history-table">
            <thead>
              <tr>
                <th>
                  Recipient
                </th>

                <th>
                  Type
                </th>

                <th>
                  Status
                </th>

                <th>
                  Subject
                </th>

                <th>
                  Sent Date
                </th>

                <th>
                  Action
                </th>
              </tr>
            </thead>

            <tbody>
              {filteredRecords.map(
                record => (
                  <tr
                    key={
                      record.id
                    }
                  >
                    <td>
                      <strong>
                        {record
                          .recipientEmail ||
                          'Not available'}
                      </strong>

                      {record.senderEmail && (
                        <small>
                          From:
                          {' '}
                          {record.senderEmail}
                        </small>
                      )}
                    </td>

                    <td>
                      {formatEmailType(
                        record.emailType
                      )}
                    </td>

                    <td>
                      <HistoryStatus
                        status={
                          record.status
                        }
                      />
                    </td>

                    <td>
                      <span
                        className="history-subject"
                        title={
                          record.subject
                        }
                      >
                        {record.subject}
                      </span>

                      {record.reason && (
                        <small
                          className="history-reason"
                        >
                          {record.reason}
                        </small>
                      )}
                    </td>

                    <td>
                      {formatDateTime(
                        record.sentAt
                      )}
                    </td>

                    <td>
                      <button
                        type="button"
                        className={
                          'history-button ' +
                          'history-button-danger ' +
                          'history-button-small'
                        }
                        disabled={
                          operationRunning
                        }
                        onClick={() => {
                          deleteHistoryRecord(
                            record
                          );
                        }}
                      >
                        {deletingId ===
                        record.id
                          ? 'Deleting...'
                          : 'Delete'}
                      </button>
                    </td>
                  </tr>
                )
              )}
            </tbody>
          </table>
        </div>
      )}
    </section>
  );
}

function SummaryCard({
  label,
  value,
  tone = 'default'
}) {
  return (
    <article
      className={
        `history-summary-card history-summary-${tone}`
      }
    >
      <span>
        {label}
      </span>

      <strong>
        {getNumber(value)}
      </strong>
    </article>
  );
}

function HistoryStatus({
  status
}) {
  const normalizedStatus =
    String(
      status ||
      'UNKNOWN'
    ).toUpperCase();

  const statusClass =
    normalizedStatus
      .toLowerCase()
      .replace(
        /[^a-z0-9_-]/g,
        ''
      );

  return (
    <span
      className={
        `history-status history-status-${statusClass}`
      }
    >
      {normalizedStatus}
    </span>
  );
}

export default History;