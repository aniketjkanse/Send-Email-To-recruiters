import {
  useCallback,
  useEffect,
  useState
} from 'react';

import {
  api
} from '../services/api.js';

import './Dashboard.css';

const INITIAL_DATA = {
  recipients: 0,

  initialSent: 0,

  dryRun: 0,

  failed: 0,

  followUp1Sent: 0,

  followUp2Sent: 0,

  replies: 0,

  followUp1Eligible: 0,

  followUp2Eligible: 0,

  resume: {
    configured: false,
    fileExists: false,
    originalName: ''
  },

  scheduler: {
    status: 'IDLE',
    processed: 0,
    total: 0,
    sent: 0,
    dryRun: 0,
    failed: 0,
    currentEmail: ''
  },

  batch: {
    status: 'IDLE',
    batchType: '',
    processed: 0,
    selected: 0,
    sent: 0,
    dryRun: 0,
    failed: 0,
    currentEmail: ''
  }
};

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

function normalizeStatus(
  value
) {
  return (
    getText(
      value,
      'IDLE'
    ).toUpperCase()
  );
}

function getResponseSummary(
  response
) {
  const data =
    response?.data || {};

  if (
    data.summary &&
    typeof data.summary ===
      'object'
  ) {
    return data.summary;
  }

  return data;
}

function normalizeScheduler(
  response
) {
  const data =
    response?.data || {};

  const state =
    data.state ||
    (
      typeof data.status ===
        'object'
        ? data.status
        : data
    ) ||
    {};

  return {
    status:
      normalizeStatus(
        state.status
      ),

    processed:
      getNumber(
        state.processed,
        state.processedCount
      ),

    total:
      getNumber(
        state.total,
        state.selected,
        state.totalRecipients
      ),

    sent:
      getNumber(
        state.sent,
        state.sentCount
      ),

    dryRun:
      getNumber(
        state.dryRun,
        state.dryRunCount
      ),

    failed:
      getNumber(
        state.failed,
        state.failedCount
      ),

    currentEmail:
      getText(
        state.currentEmail,
        state.currentRecipient
      )
  };
}

function normalizeBatch(
  response
) {
  const data =
    response?.data || {};

  const state =
    data.state || data;

  return {
    status:
      normalizeStatus(
        state.status
      ),

    batchType:
      getText(
        state.batchType
      ),

    processed:
      getNumber(
        state.processed
      ),

    selected:
      getNumber(
        state.selected
      ),

    sent:
      getNumber(
        state.sent
      ),

    dryRun:
      getNumber(
        state.dryRun
      ),

    failed:
      getNumber(
        state.failed
      ),

    currentEmail:
      getText(
        state.currentEmail
      )
  };
}

function Dashboard() {
  const [
    dashboardData,
    setDashboardData
  ] = useState(
    INITIAL_DATA
  );

  const [
    loading,
    setLoading
  ] = useState(true);

  const [
    refreshing,
    setRefreshing
  ] = useState(false);

  const [
    message,
    setMessage
  ] = useState('');

  const [
    lastUpdated,
    setLastUpdated
  ] = useState(null);

  const loadDashboard =
    useCallback(
      async (
        isRefresh = false
      ) => {
        if (isRefresh) {
          setRefreshing(true);
        } else {
          setLoading(true);
        }

        setMessage('');

        try {
          const results =
            await Promise.allSettled([
              api.get(
                '/recipients/count'
              ),

              api.get(
                '/history/summary'
              ),

              api.get(
                '/followups/summary'
              ),

              api.get(
                '/resume'
              ),

              api.get(
                '/send/status'
              ),

              api.get(
                '/followup-send/eligibility'
              ),

              api.get(
                '/followup-send/batch/status'
              )
            ]);

          const [
            recipientsResult,
            historyResult,
            followUpsResult,
            resumeResult,
            schedulerResult,
            eligibilityResult,
            batchResult
          ] = results;

          const recipientsData =
            recipientsResult.status ===
              'fulfilled'
              ? recipientsResult
                  .value
                  .data
              : {};

          const historySummary =
            historyResult.status ===
              'fulfilled'
              ? getResponseSummary(
                  historyResult.value
                )
              : {};

          const followUpSummary =
            followUpsResult.status ===
              'fulfilled'
              ? getResponseSummary(
                  followUpsResult.value
                )
              : {};

          const resumeData =
            resumeResult.status ===
              'fulfilled'
              ? resumeResult
                  .value
                  .data
              : {};

          const eligibilityData =
            eligibilityResult.status ===
              'fulfilled'
              ? eligibilityResult
                  .value
                  .data
              : {};

          const resume =
            resumeData.resume || {};

          const initialFromHistory =
            getNumber(
              historySummary.initial,
              historySummary.initialSent,
              historySummary.initialCount
            );

          const initialFromTracker =
            getNumber(
              followUpSummary.initialSent,
              followUpSummary.initial
            );

          const followUp1FromHistory =
            getNumber(
              historySummary.followUp1,
              historySummary.followUp1Sent
            );

          const followUp1FromTracker =
            getNumber(
              followUpSummary.followUp1Sent,
              followUpSummary.followUp1
            );

          const followUp2FromHistory =
            getNumber(
              historySummary.followUp2,
              historySummary.followUp2Sent
            );

          const followUp2FromTracker =
            getNumber(
              followUpSummary.followUp2Sent,
              followUpSummary.followUp2
            );

          const failedSections =
            results.filter(
              result => {
                return (
                  result.status ===
                  'rejected'
                );
              }
            ).length;

          setDashboardData({
            recipients:
              getNumber(
                recipientsData.total,
                recipientsData.count,
                recipientsData
                  .recipientCount
              ),

            initialSent:
              Math.max(
                initialFromHistory,
                initialFromTracker
              ),

            dryRun:
              getNumber(
                historySummary.dryRun,
                historySummary.dryRunCount
              ),

            failed:
              getNumber(
                historySummary.failed,
                historySummary.failedCount
              ),

            followUp1Sent:
              Math.max(
                followUp1FromHistory,
                followUp1FromTracker
              ),

            followUp2Sent:
              Math.max(
                followUp2FromHistory,
                followUp2FromTracker
              ),

            replies:
              getNumber(
                followUpSummary.replied,
                followUpSummary
                  .repliesDetected
              ),

            followUp1Eligible:
              getNumber(
                eligibilityData
                  .followUp1
                  ?.eligibleCount
              ),

            followUp2Eligible:
              getNumber(
                eligibilityData
                  .followUp2
                  ?.eligibleCount
              ),

            resume: {
              configured:
                resumeData.configured ===
                true,

              fileExists:
                resume.fileExists ===
                true,

              originalName:
                getText(
                  resume.originalName
                )
            },

            scheduler:
              schedulerResult.status ===
                'fulfilled'
                ? normalizeScheduler(
                    schedulerResult.value
                  )
                : INITIAL_DATA.scheduler,

            batch:
              batchResult.status ===
                'fulfilled'
                ? normalizeBatch(
                    batchResult.value
                  )
                : INITIAL_DATA.batch
          });

          setLastUpdated(
            new Date()
          );

          if (
            failedSections > 0
          ) {
            setMessage(
              `${failedSections} Dashboard section(s) could not be loaded. Other available data is displayed.`
            );
          }
        } catch (error) {
          console.error(
            'Unable to load Dashboard:',
            error
          );

          setMessage(
            getErrorMessage(
              error,
              'Unable to load Dashboard.'
            )
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
      loadDashboard();
    },
    [loadDashboard]
  );

  async function refreshDashboard() {
    await loadDashboard(
      true
    );
  }

  const totalFollowUps =
    dashboardData.followUp1Sent +
    dashboardData.followUp2Sent;

  const resumeStatus =
    dashboardData
      .resume
      .configured &&
    dashboardData
      .resume
      .fileExists
      ? 'Ready'
      : dashboardData
          .resume
          .configured
        ? 'File Missing'
        : 'Not Configured';

  if (loading) {
    return (
      <section className="dashboard-page">
        <div className="dashboard-loading">
          <h1>
            Dashboard
          </h1>

          <p>
            Loading Dashboard...
          </p>
        </div>
      </section>
    );
  }

  return (
    <section className="dashboard-page">
      <header className="dashboard-header">
        <div>
          <h1>
            Dashboard
          </h1>

          <p>
            Quick overview of your
            outreach activity.
          </p>

          {lastUpdated && (
            <small>
              Updated:
              {' '}
              {lastUpdated
                .toLocaleString()}
            </small>
          )}
        </div>

        <button
          type="button"
          className="dashboard-refresh-button"
          disabled={
            refreshing
          }
          onClick={
            refreshDashboard
          }
        >
          {refreshing
            ? 'Refreshing...'
            : 'Refresh'}
        </button>
      </header>

      {message && (
        <div className="dashboard-warning">
          {message}
        </div>
      )}

      <div className="dashboard-primary-grid">
        <PrimaryCard
          label="Recipients"
          value={
            dashboardData.recipients
          }
          helper="Uploaded contacts"
          tone="blue"
        />

        <PrimaryCard
          label="Initial Sent"
          value={
            dashboardData.initialSent
          }
          helper="Live initial emails"
          tone="green"
        />

        <PrimaryCard
          label="Follow-Ups Sent"
          value={
            totalFollowUps
          }
          helper={
            `FU1: ${dashboardData.followUp1Sent} | FU2: ${dashboardData.followUp2Sent}`
          }
          tone="purple"
        />

        <PrimaryCard
          label="Replies"
          value={
            dashboardData.replies
          }
          helper="Detected replies"
          tone="orange"
        />
      </div>

      <div className="dashboard-activity-strip">
        <ActivityItem
          label="Dry Run"
          value={
            dashboardData.dryRun
          }
        />

        <ActivityItem
          label="Failed"
          value={
            dashboardData.failed
          }
          alert={
            dashboardData.failed > 0
          }
        />

        <ActivityItem
          label="FU1 Eligible"
          value={
            dashboardData
              .followUp1Eligible
          }
        />

        <ActivityItem
          label="FU2 Eligible"
          value={
            dashboardData
              .followUp2Eligible
          }
        />

        <ActivityItem
          label="Resume"
          value={
            resumeStatus
          }
          textValue
          positive={
            resumeStatus ===
            'Ready'
          }
        />
      </div>

      {dashboardData
        .resume
        .originalName && (
        <div className="dashboard-resume-row">
          <span>
            Active Resume
          </span>

          <strong
            title={
              dashboardData
                .resume
                .originalName
            }
          >
            {dashboardData
              .resume
              .originalName}
          </strong>
        </div>
      )}

      <div className="dashboard-process-grid">
        <ProcessCard
          title="Initial Scheduler"
          data={
            dashboardData.scheduler
          }
          totalKey="total"
        />

        <ProcessCard
          title="Follow-Up Batch"
          data={
            dashboardData.batch
          }
          totalKey="selected"
          subtitle={
            dashboardData
              .batch
              .batchType
          }
        />
      </div>
    </section>
  );
}

function PrimaryCard({
  label,
  value,
  helper,
  tone
}) {
  return (
    <article
      className={
        `dashboard-primary-card dashboard-primary-${tone}`
      }
    >
      <span>
        {label}
      </span>

      <strong>
        {getNumber(value)}
      </strong>

      <small>
        {helper}
      </small>
    </article>
  );
}

function ActivityItem({
  label,
  value,
  textValue = false,
  alert = false,
  positive = false
}) {
  let className =
    'dashboard-activity-item';

  if (alert) {
    className +=
      ' dashboard-activity-alert';
  }

  if (positive) {
    className +=
      ' dashboard-activity-positive';
  }

  return (
    <div className={className}>
      <span>
        {label}
      </span>

      <strong>
        {textValue
          ? getText(
              value,
              'Unknown'
            )
          : getNumber(
              value
            )}
      </strong>
    </div>
  );
}

function ProcessCard({
  title,
  data,
  totalKey,
  subtitle = ''
}) {
  const processed =
    getNumber(
      data.processed
    );

  const total =
    getNumber(
      data[totalKey]
    );

  const progress =
    total > 0
      ? Math.min(
          100,
          Math.round(
            (
              processed /
              total
            ) *
            100
          )
        )
      : 0;

  return (
    <article className="dashboard-process-card">
      <div className="dashboard-process-header">
        <div>
          <h2>
            {title}
          </h2>

          {subtitle && (
            <small>
              {subtitle}
            </small>
          )}
        </div>

        <StatusBadge
          status={
            data.status
          }
        />
      </div>

      <div className="dashboard-progress-heading">
        <span>
          Progress
        </span>

        <strong>
          {processed}
          {' / '}
          {total}
        </strong>
      </div>

      <div className="dashboard-progress-track">
        <div
          className="dashboard-progress-value"
          style={{
            width:
              `${progress}%`
          }}
        />
      </div>

      <div className="dashboard-process-summary">
        <ProcessMetric
          label="Sent"
          value={
            data.sent
          }
        />

        <ProcessMetric
          label="Dry Run"
          value={
            data.dryRun
          }
        />

        <ProcessMetric
          label="Failed"
          value={
            data.failed
          }
        />
      </div>

      {data.currentEmail && (
        <div className="dashboard-current-recipient">
          <span>
            Current:
          </span>

          <strong>
            {data.currentEmail}
          </strong>
        </div>
      )}
    </article>
  );
}

function ProcessMetric({
  label,
  value
}) {
  return (
    <div>
      <span>
        {label}
      </span>

      <strong>
        {getNumber(value)}
      </strong>
    </div>
  );
}

function StatusBadge({
  status
}) {
  const normalizedStatus =
    normalizeStatus(
      status
    );

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
        `dashboard-status dashboard-status-${statusClass}`
      }
    >
      {normalizedStatus}
    </span>
  );
}

export default Dashboard;