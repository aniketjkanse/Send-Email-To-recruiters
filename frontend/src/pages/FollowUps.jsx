import {
  useCallback,
  useEffect,
  useMemo,
  useState
} from 'react';

import {
  api
} from '../services/api.js';

import {
  buildFollowUpBuckets,
  formatDateTime
} from '../utils/followUpBuckets.js';

import FollowUpBatchPanel from
  '../components/FollowUpBatchPanel.jsx';

import './FollowUps.css';

const INITIAL_TEMPLATE = {
  followUp1Body: '',
  followUp2Body: '',
  followUp1DailyLimit: 25,
  followUp2DailyLimit: 15,
  dryRun: true
};

const INITIAL_SUMMARY = {
  total: 0,
  initialSent: 0,
  followUp1Sent: 0,
  followUp2Sent: 0,
  replied: 0,
  removed: 0,
  stopped: 0
};

const TAB_CONFIG = [
  { key: 'FOLLOW_UP_1', label: 'Follow-Up 1', bucketKey: 'followUp1' },
  { key: 'FOLLOW_UP_2', label: 'Follow-Up 2', bucketKey: 'followUp2' },
  { key: 'COMPLETED', label: 'Completed', bucketKey: 'completed' },
  { key: 'REPLIED', label: 'Replied', bucketKey: 'replied' },
  { key: 'STOPPED', label: 'Stopped', bucketKey: 'stopped' },
  { key: 'REMOVED', label: 'Removed', bucketKey: 'removed' }
];

function getErrorMessage(error, fallbackMessage) {
  return (
    error?.response?.data?.message ||
    error?.message ||
    fallbackMessage
  );
}

function normalizeTemplate(databaseTemplate = {}) {
  return {
    followUp1Body: databaseTemplate.followUp1Body || '',
    followUp2Body: databaseTemplate.followUp2Body || '',
    followUp1DailyLimit: databaseTemplate.followUp1DailyLimit ?? 25,
    followUp2DailyLimit: databaseTemplate.followUp2DailyLimit ?? 15,
    dryRun: databaseTemplate.dryRun === true
  };
}

function FollowUps() {
  const [template, setTemplate] = useState(INITIAL_TEMPLATE);
  const [originalTemplate, setOriginalTemplate] = useState(INITIAL_TEMPLATE);
  const [records, setRecords] = useState([]);
  const [summary, setSummary] = useState(INITIAL_SUMMARY);
  const [activeTab, setActiveTab] = useState('FOLLOW_UP_1');
  const [expandedFolders, setExpandedFolders] = useState({});
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [checkingReplies, setCheckingReplies] = useState(false);
  const [savingTemplate, setSavingTemplate] = useState(false);
  const [actionKey, setActionKey] = useState('');
  const [message, setMessage] = useState('');
  const [messageType, setMessageType] = useState('');

  function showMessage(text, type = 'success') {
    setMessage(text);
    setMessageType(type);
  }

  function clearMessage() {
    setMessage('');
    setMessageType('');
  }

  const loadPageData = useCallback(
    async (isRefresh = false, preserveMessage = false) => {
      if (isRefresh) {
        setRefreshing(true);
      } else {
        setLoading(true);
      }

      if (!preserveMessage) {
        clearMessage();
      }

      try {
        const [templateResponse, recordsResponse, summaryResponse] =
          await Promise.all([
            api.get('/db-template'),
            api.get(
              '/followups' +
              '?includeRemoved=true' +
              '&includeStopped=true' +
              '&limit=500'
            ),
            api.get('/followups/summary')
          ]);

        const loadedTemplate = normalizeTemplate(
          templateResponse.data.template || {}
        );

        setTemplate(loadedTemplate);
        setOriginalTemplate(loadedTemplate);

        const responseRecords =
          recordsResponse.data.followUps ||
          recordsResponse.data.records ||
          [];

        setRecords(
          Array.isArray(responseRecords)
            ? responseRecords
            : []
        );

        setSummary({
          ...INITIAL_SUMMARY,
          ...(summaryResponse.data.summary || {})
        });
      } catch (error) {
        console.error('Unable to load Follow-Ups:', error);
        showMessage(
          getErrorMessage(error, 'Unable to load Follow-Up information.'),
          'error'
        );
      } finally {
        setLoading(false);
        setRefreshing(false);
      }
    },
    []
  );

  const handleBatchCompleted = useCallback(async () => {
    await loadPageData(false, true);
  }, [loadPageData]);

  useEffect(() => {
    loadPageData();
  }, [loadPageData]);

  const buckets = useMemo(
    () => buildFollowUpBuckets(records),
    [records]
  );

  const activeTabConfig = useMemo(
    () => TAB_CONFIG.find(item => item.key === activeTab) || TAB_CONFIG[0],
    [activeTab]
  );

  const activeGroups = buckets[activeTabConfig.bucketKey] || [];

  const hasTemplateChanges =
    JSON.stringify(template) !== JSON.stringify(originalTemplate);

  function getTabCount(tab) {
    return buckets.counts[tab.bucketKey] || 0;
  }

  function updateTemplateField(event) {
    const { name, value } = event.target;
    setTemplate(current => ({ ...current, [name]: value }));
  }

  function validateTemplate() {
    const followUp1Body = String(template.followUp1Body || '').trim();
    const followUp2Body = String(template.followUp2Body || '').trim();
    const followUp1DailyLimit = Number(template.followUp1DailyLimit);
    const followUp2DailyLimit = Number(template.followUp2DailyLimit);

    if (!followUp1Body) {
      throw new Error('Follow-Up 1 body is required.');
    }

    if (!followUp2Body) {
      throw new Error('Follow-Up 2 body is required.');
    }

    if (!Number.isInteger(followUp1DailyLimit) || followUp1DailyLimit < 1) {
      throw new Error('Follow-Up 1 daily limit must be at least 1.');
    }

    if (!Number.isInteger(followUp2DailyLimit) || followUp2DailyLimit < 1) {
      throw new Error('Follow-Up 2 daily limit must be at least 1.');
    }
  }

  async function saveTemplate(event) {
    event.preventDefault();
    setSavingTemplate(true);
    clearMessage();

    try {
      validateTemplate();

      const response = await api.put('/db-template', {
        followUp1Body: String(template.followUp1Body),
        followUp2Body: String(template.followUp2Body),
        followUp1DailyLimit: Number(template.followUp1DailyLimit),
        followUp2DailyLimit: Number(template.followUp2DailyLimit)
      });

      const savedTemplate = normalizeTemplate(response.data.template || {});
      setTemplate(savedTemplate);
      setOriginalTemplate(savedTemplate);
      showMessage('Follow-Up templates saved successfully.');
    } catch (error) {
      showMessage(
        getErrorMessage(error, 'Unable to save Follow-Up templates.'),
        'error'
      );
    } finally {
      setSavingTemplate(false);
    }
  }

  function discardTemplateChanges() {
    setTemplate({ ...originalTemplate });
    showMessage('Unsaved template changes were discarded.');
  }

  function changeTab(tabKey) {
    setActiveTab(tabKey);
    setExpandedFolders({});
  }

  function toggleFolder(groupKey) {
    const folderKey = `${activeTab}:${groupKey}`;
    setExpandedFolders(current => ({
      ...current,
      [folderKey]: !current[folderKey]
    }));
  }

  function isFolderExpanded(groupKey, groupIndex) {
    const folderKey = `${activeTab}:${groupKey}`;

    if (expandedFolders[folderKey] !== undefined) {
      return expandedFolders[folderKey];
    }

    return groupIndex === 0;
  }

  async function refreshData() {
    await loadPageData(true);
  }

  async function checkGmailReplies() {
    setCheckingReplies(true);
    clearMessage();

    try {
      const response = await api.post('/followups/refresh-replies', {
        limit: 500
      });

      const result = response.data || {};
      const repliesDetected = Number(
        result.summary?.repliesDetected
      ) || 0;

      await loadPageData(false, true);

      if (repliesDetected > 0) {
        setActiveTab('REPLIED');
        setExpandedFolders({});
      }

      showMessage(
        result.message ||
        (
          repliesDetected > 0
            ? `${repliesDetected} new Gmail reply record(s) detected and PostgreSQL Follow-Up trackers updated successfully.`
            : 'Gmail reply check completed. No new replies were detected.'
        )
      );
    } catch (error) {
      console.error('Gmail reply refresh failed:', error);
      showMessage(
        getErrorMessage(
          error,
          'Unable to check Gmail replies. Configure a valid Gmail App Password before using reply detection.'
        ),
        'error'
      );
    } finally {
      setCheckingReplies(false);
    }
  }

  async function runRecordAction({
    trackerId,
    actionName,
    endpoint,
    method = 'post',
    body = {}
  }) {
    const operationKey = `${trackerId}:${actionName}`;
    setActionKey(operationKey);
    clearMessage();

    try {
      const response = method === 'delete'
        ? await api.delete(endpoint)
        : await api.post(endpoint, body);

      await loadPageData(false, true);
      showMessage(
        response.data.message ||
        'Follow-Up action completed successfully.'
      );
    } catch (error) {
      console.error(`Follow-Up action ${actionName} failed:`, error);
      showMessage(
        getErrorMessage(error, 'Follow-Up action failed.'),
        'error'
      );
    } finally {
      setActionKey('');
    }
  }

  async function sendFollowUp1(record) {
    await runRecordAction({
      trackerId: record.id,
      actionName: 'FOLLOW_UP_1',
      endpoint: `/followup-send/${record.id}/follow-up-1`
    });
  }

  async function sendFollowUp2(record) {
    await runRecordAction({
      trackerId: record.id,
      actionName: 'FOLLOW_UP_2',
      endpoint: `/followup-send/${record.id}/follow-up-2`
    });
  }

  async function checkSingleReply(record) {
    await runRecordAction({
      trackerId: record.id,
      actionName: 'CHECK_REPLY',
      endpoint: `/followups/${record.id}/check-reply`
    });
  }

  async function stopRecord(record) {
    const confirmed = window.confirm(
      `Stop future follow-ups for ${record.recipientEmail}?`
    );

    if (!confirmed) {
      return;
    }

    await runRecordAction({
      trackerId: record.id,
      actionName: 'STOP',
      endpoint: `/followups/${record.id}/stop`,
      body: { reason: 'Stopped from Follow-Ups page' }
    });
  }

  async function resumeRecord(record) {
    await runRecordAction({
      trackerId: record.id,
      actionName: 'RESUME',
      endpoint: `/followups/${record.id}/resume`
    });
  }

  async function removeRecord(record) {
    const confirmed = window.confirm(
      `Remove the Follow-Up record for ${record.recipientEmail}?`
    );

    if (!confirmed) {
      return;
    }

    await runRecordAction({
      trackerId: record.id,
      actionName: 'REMOVE',
      endpoint: `/followups/${record.id}/remove`,
      body: { reason: 'Removed from Follow-Ups page' }
    });
  }

  async function restoreRecord(record) {
    await runRecordAction({
      trackerId: record.id,
      actionName: 'RESTORE',
      endpoint: `/followups/${record.id}/restore`
    });
  }

  async function deleteRecord(record) {
    const confirmed = window.confirm(
      `Permanently delete the Follow-Up record for ${record.recipientEmail}?`
    );

    if (!confirmed) {
      return;
    }

    await runRecordAction({
      trackerId: record.id,
      actionName: 'DELETE',
      endpoint: `/followups/${record.id}`,
      method: 'delete'
    });
  }

  if (loading) {
    return (
      <section className="followups-page">
        <div className="followups-card">
          <h1>Follow-Ups</h1>
          <p>Loading PostgreSQL Follow-Up data...</p>
        </div>
      </section>
    );
  }

  return (
    <section className="followups-page">
      <header className="followups-header">
        <div>
          <h1>Follow-Ups</h1>
          <p>
            Manage templates, threaded sending, reply detection,
            batch sending, and date-wise Follow-Up buckets.
          </p>
        </div>

        <div className="followups-header-actions">
          <span
            className={
              template.dryRun
                ? 'followups-mode followups-mode-dry'
                : 'followups-mode followups-mode-live'
            }
          >
            {template.dryRun ? 'Dry Run ON' : 'Live Sending'}
          </span>

          <button
            type="button"
            className="followups-button followups-button-secondary"
            disabled={refreshing || checkingReplies}
            onClick={refreshData}
          >
            {refreshing ? 'Refreshing...' : 'Refresh Data'}
          </button>

          <button
            type="button"
            className="followups-button followups-button-primary"
            disabled={refreshing || checkingReplies}
            onClick={checkGmailReplies}
          >
            {checkingReplies ? 'Checking Gmail...' : 'Check Gmail Replies'}
          </button>
        </div>
      </header>

      {message && (
        <div
          className={
            messageType === 'error'
              ? 'followups-message followups-message-error'
              : 'followups-message followups-message-success'
          }
        >
          {message}
        </div>
      )}

      <div className="followups-summary-grid">
        <SummaryItem label="Total" value={summary.total} />
        <SummaryItem label="Follow-Up 1" value={buckets.counts.followUp1} tone="blue" />
        <SummaryItem label="Follow-Up 2" value={buckets.counts.followUp2} tone="purple" />
        <SummaryItem label="Completed" value={buckets.counts.completed} tone="green" />
        <SummaryItem label="Replied" value={buckets.counts.replied} tone="green" />
        <SummaryItem label="Stopped" value={buckets.counts.stopped} tone="orange" />
        <SummaryItem label="Removed" value={buckets.counts.removed} tone="red" />
      </div>

      <form
        className="followups-card followups-template-card"
        onSubmit={saveTemplate}
      >
        <div className="followups-section-heading">
          <div>
            <h2>Follow-Up Templates</h2>
            <p>
              Follow-Up settings are stored in PostgreSQL for the logged-in user.
            </p>
          </div>

          <span className="followups-database-badge">PostgreSQL</span>
        </div>

        <div className="followups-template-grid">
          <TemplateColumn
            title="Follow-Up 1"
            bodyName="followUp1Body"
            body={template.followUp1Body}
            limitName="followUp1DailyLimit"
            limit={template.followUp1DailyLimit}
            onChange={updateTemplateField}
          />

          <TemplateColumn
            title="Follow-Up 2"
            bodyName="followUp2Body"
            body={template.followUp2Body}
            limitName="followUp2DailyLimit"
            limit={template.followUp2DailyLimit}
            onChange={updateTemplateField}
          />
        </div>

        <div className="followups-template-actions">
          <button
            type="submit"
            className="followups-button followups-button-primary"
            disabled={savingTemplate || !hasTemplateChanges}
          >
            {savingTemplate ? 'Saving...' : 'Save Templates'}
          </button>

          <button
            type="button"
            className="followups-button followups-button-secondary"
            disabled={savingTemplate || !hasTemplateChanges}
            onClick={discardTemplateChanges}
          >
            Discard Changes
          </button>
        </div>
      </form>

      <FollowUpBatchPanel onBatchCompleted={handleBatchCompleted} />

      <div className="followups-card">
        <div className="followups-section-heading">
          <div>
            <h2>Follow-Up Buckets</h2>
            <p>Records are grouped by sent, reply, stopped, or removed date.</p>
          </div>
        </div>

        <div className="followups-tabs">
          {TAB_CONFIG.map(tab => (
            <button
              key={tab.key}
              type="button"
              className={
                activeTab === tab.key
                  ? 'followups-tab followups-tab-active'
                  : 'followups-tab'
              }
              onClick={() => changeTab(tab.key)}
            >
              {tab.label}{' '}
              <span className="followups-tab-count">
                {getTabCount(tab)}
              </span>
            </button>
          ))}
        </div>

        <div className="followups-active-bucket-heading">
          <h3>{activeTabConfig.label}</h3>
          <span>{getTabCount(activeTabConfig)} record(s)</span>
        </div>

        {activeGroups.length === 0 ? (
          <div className="followups-empty">
            No records are available in this bucket.
          </div>
        ) : (
          <div className="followups-folder-list">
            {activeGroups.map((group, groupIndex) => (
              <DateFolder
                key={`${activeTab}:${group.key}`}
                group={group}
                expanded={isFolderExpanded(group.key, groupIndex)}
                actionKey={actionKey}
                activeTab={activeTab}
                dryRun={template.dryRun}
                checkingReplies={checkingReplies}
                onToggle={() => toggleFolder(group.key)}
                onSendFollowUp1={sendFollowUp1}
                onSendFollowUp2={sendFollowUp2}
                onCheckReply={checkSingleReply}
                onStop={stopRecord}
                onResume={resumeRecord}
                onRemove={removeRecord}
                onRestore={restoreRecord}
                onDelete={deleteRecord}
              />
            ))}
          </div>
        )}
      </div>
    </section>
  );
}

function TemplateColumn({
  title,
  bodyName,
  body,
  limitName,
  limit,
  onChange
}) {
  return (
    <div className="followups-template-column">
      <h3>{title}</h3>

      <label className="followups-field">
        <span>Email Body</span>
        <textarea
          name={bodyName}
          rows="10"
          value={body}
          onChange={onChange}
          placeholder={`Enter ${title} email body`}
        />
      </label>

      <label className="followups-field">
        <span>Daily Limit</span>
        <input
          type="number"
          name={limitName}
          min="1"
          value={limit}
          onChange={onChange}
        />
      </label>
    </div>
  );
}

function DateFolder({
  group,
  expanded,
  actionKey,
  activeTab,
  dryRun,
  checkingReplies,
  onToggle,
  onSendFollowUp1,
  onSendFollowUp2,
  onCheckReply,
  onStop,
  onResume,
  onRemove,
  onRestore,
  onDelete
}) {
  return (
    <section className="followups-date-folder">
      <button
        type="button"
        className="followups-folder-header"
        onClick={onToggle}
      >
        <span className="followups-folder-arrow">
          {expanded ? '▼' : '▶'}
        </span>
        <span className="followups-folder-title">{group.label}</span>
        <span className="followups-folder-count">
          {group.count} recipient(s)
        </span>
      </button>

      {expanded && (
        <div className="followups-folder-content">
          {group.records.map(record => (
            <FollowUpRecord
              key={record.id}
              record={record}
              actionKey={actionKey}
              activeTab={activeTab}
              dryRun={dryRun}
              checkingReplies={checkingReplies}
              onSendFollowUp1={onSendFollowUp1}
              onSendFollowUp2={onSendFollowUp2}
              onCheckReply={onCheckReply}
              onStop={onStop}
              onResume={onResume}
              onRemove={onRemove}
              onRestore={onRestore}
              onDelete={onDelete}
            />
          ))}
        </div>
      )}
    </section>
  );
}

function FollowUpRecord({
  record,
  actionKey,
  activeTab,
  dryRun,
  checkingReplies,
  onSendFollowUp1,
  onSendFollowUp2,
  onCheckReply,
  onStop,
  onResume,
  onRemove,
  onRestore,
  onDelete
}) {
  const busy = actionKey.startsWith(`${record.id}:`);
  const recipientEmail = record.recipientEmail || record.email || 'Unknown recipient';
  const activeRecord = !record.removed && !record.replyDetected;

  return (
    <article className="followups-record">
      <div className="followups-record-header">
        <div>
          <h3>{recipientEmail}</h3>
          <p>{record.subject || 'Subject not available'}</p>
        </div>

        <StatusBadge record={record} />
      </div>

      <div className="followups-record-details">
        <DetailItem
          label="Initial Sent"
          value={formatDateTime(record.initialSentAt)}
        />
        <DetailItem
          label="Follow-Up 1"
          value={
            record.followUp1SentAt
              ? formatDateTime(record.followUp1SentAt)
              : 'Pending'
          }
        />
        <DetailItem
          label="Follow-Up 2"
          value={
            record.followUp2SentAt
              ? formatDateTime(record.followUp2SentAt)
              : 'Pending'
          }
        />
        <DetailItem
          label="Reply"
          value={
            record.replyDetected
              ? formatDateTime(record.replyDate)
              : 'Not detected'
          }
        />
        <DetailItem
          label="Last Checked"
          value={
            record.lastCheckedAt
              ? formatDateTime(record.lastCheckedAt)
              : 'Not checked'
          }
        />
      </div>

      {record.lastError && (
        <div className="followups-record-error">
          <strong>Last Error:</strong>{' '}
          {record.lastError}
        </div>
      )}

      <div className="followups-record-actions">
        {activeTab === 'FOLLOW_UP_1' &&
          activeRecord &&
          !record.stopped && (
            <button
              type="button"
              className="followups-button followups-button-primary"
              disabled={busy || checkingReplies}
              onClick={() => onSendFollowUp1(record)}
            >
              {busy
                ? 'Processing...'
                : dryRun
                  ? 'Dry Run Follow-Up 1'
                  : 'Send Follow-Up 1'}
            </button>
          )}

        {activeTab === 'FOLLOW_UP_2' &&
          activeRecord &&
          !record.stopped && (
            <button
              type="button"
              className="followups-button followups-button-primary"
              disabled={busy || checkingReplies}
              onClick={() => onSendFollowUp2(record)}
            >
              {busy
                ? 'Processing...'
                : dryRun
                  ? 'Dry Run Follow-Up 2'
                  : 'Send Follow-Up 2'}
            </button>
          )}

        {activeRecord &&
          !record.stopped &&
          record.initialMessageId && (
            <button
              type="button"
              className="followups-button followups-button-secondary"
              disabled={busy || checkingReplies}
              onClick={() => onCheckReply(record)}
            >
              {busy ? 'Checking...' : 'Check Reply'}
            </button>
          )}

        {activeRecord &&
          !record.stopped &&
          activeTab !== 'COMPLETED' && (
            <button
              type="button"
              className="followups-button followups-button-warning"
              disabled={busy || checkingReplies}
              onClick={() => onStop(record)}
            >
              Stop
            </button>
          )}

        {record.stopped &&
          !record.replyDetected &&
          !record.removed && (
            <button
              type="button"
              className="followups-button followups-button-secondary"
              disabled={busy || checkingReplies}
              onClick={() => onResume(record)}
            >
              Resume
            </button>
          )}

        {!record.removed && (
          <button
            type="button"
            className="followups-button followups-button-danger"
            disabled={busy || checkingReplies}
            onClick={() => onRemove(record)}
          >
            Remove
          </button>
        )}

        {record.removed && (
          <>
            <button
              type="button"
              className="followups-button followups-button-secondary"
              disabled={busy || checkingReplies}
              onClick={() => onRestore(record)}
            >
              Restore
            </button>

            <button
              type="button"
              className="followups-button followups-button-danger"
              disabled={busy || checkingReplies}
              onClick={() => onDelete(record)}
            >
              Delete Permanently
            </button>
          </>
        )}
      </div>
    </article>
  );
}

function StatusBadge({ record }) {
  let label = 'INITIAL SENT';
  let className = 'followups-status followups-status-active';

  if (record.removed) {
    label = 'REMOVED';
    className = 'followups-status followups-status-removed';
  } else if (record.replyDetected) {
    label = 'REPLIED';
    className = 'followups-status followups-status-replied';
  } else if (record.stopped) {
    label = 'STOPPED';
    className = 'followups-status followups-status-stopped';
  } else if (record.followUp2MessageId) {
    label = 'FOLLOW-UP 2 SENT';
    className = 'followups-status followups-status-completed';
  } else if (record.followUp1MessageId) {
    label = 'FOLLOW-UP 1 SENT';
    className = 'followups-status followups-status-progress';
  }

  return <span className={className}>{label}</span>;
}

function SummaryItem({ label, value, tone = 'default' }) {
  return (
    <div className={`followups-summary-item followups-summary-${tone}`}>
      <span>{label}</span>
      <strong>{Number(value) || 0}</strong>
    </div>
  );
}

function DetailItem({ label, value }) {
  return (
    <div className="followups-detail">
      <span>{label}</span>
      <strong>{value}</strong>
    </div>
  );
}

export default FollowUps;
