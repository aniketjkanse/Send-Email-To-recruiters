import {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState
} from 'react';

import {
  api
} from '../services/api.js';

import './FollowUpBatchPanel.css';

const INITIAL_ELIGIBILITY = {
  source: 'POSTGRESQL',
  dryRun: true,

  followUp1: {
    eligibleCount: 0,
    dailyLimit: 0,
    sentToday: 0,
    remainingCapacity: 0,
    selectableCount: 0
  },

  followUp2: {
    eligibleCount: 0,
    dailyLimit: 0,
    sentToday: 0,
    remainingCapacity: 0,
    selectableCount: 0
  }
};

const INITIAL_BATCH_STATE = {
  status: 'IDLE',
  batchType: '',
  selected: 0,
  processed: 0,
  sent: 0,
  dryRun: 0,
  failed: 0,
  skipped: 0,
  currentEmail: '',
  dailyLimit: 0,
  sentToday: 0,
  remainingCapacity: 0,
  eligibleCount: 0,
  startedAt: '',
  completedAt: '',
  stopRequested: false,
  message: '',
  failures: []
};

const ACTIVE_BATCH_STATUSES = [
  'STARTING',
  'RUNNING',
  'STOPPING'
];

function isActiveBatchStatus(
  status
) {
  const normalizedStatus =
    String(
      status || ''
    ).toUpperCase();

  return ACTIVE_BATCH_STATUSES.includes(
    normalizedStatus
  );
}

function normalizeBatchState(
  state
) {
  const safeState =
    state &&
    typeof state === 'object'
      ? state
      : {};

  return {
    ...INITIAL_BATCH_STATE,
    ...safeState,

    failures:
      Array.isArray(
        safeState.failures
      )
        ? safeState.failures
        : []
  };
}

function normalizeEligibility(
  data
) {
  const safeData =
    data &&
    typeof data === 'object'
      ? data
      : {};

  return {
    ...INITIAL_ELIGIBILITY,
    ...safeData,

    followUp1: {
      ...INITIAL_ELIGIBILITY
        .followUp1,

      ...(
        safeData.followUp1 ||
        {}
      )
    },

    followUp2: {
      ...INITIAL_ELIGIBILITY
        .followUp2,

      ...(
        safeData.followUp2 ||
        {}
      )
    }
  };
}

function FollowUpBatchPanel({
  onBatchCompleted
}) {
  const [
    eligibility,
    setEligibility
  ] = useState(
    INITIAL_ELIGIBILITY
  );

  const [
    batchState,
    setBatchState
  ] = useState(
    INITIAL_BATCH_STATE
  );

  const [
    loading,
    setLoading
  ] = useState(true);

  const [
    startingBatch,
    setStartingBatch
  ] = useState('');

  const [
    stoppingBatch,
    setStoppingBatch
  ] = useState(false);

  const [
    resettingBatch,
    setResettingBatch
  ] = useState(false);

  const [
    refreshing,
    setRefreshing
  ] = useState(false);

  const [
    message,
    setMessage
  ] = useState('');

  const [
    messageType,
    setMessageType
  ] = useState('');

  const previousStatusRef =
    useRef('IDLE');

  const completionHandledRef =
    useRef(true);

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

  function getErrorMessage(
    error,
    fallbackMessage
  ) {
    return (
      error
        ?.response
        ?.data
        ?.message ||
      error?.message ||
      fallbackMessage
    );
  }

  const loadEligibility =
    useCallback(
      async () => {
        const response =
          await api.get(
            '/followup-send/eligibility'
          );

        const normalizedData =
          normalizeEligibility(
            response.data
          );

        setEligibility(
          normalizedData
        );

        return normalizedData;
      },
      []
    );

  const loadBatchStatus =
    useCallback(
      async () => {
        const response =
          await api.get(
            '/followup-send/batch/status'
          );

        const normalizedState =
          normalizeBatchState(
            response.data.state
          );

        setBatchState(
          normalizedState
        );

        return normalizedState;
      },
      []
    );

  const loadPanelData =
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
            loadedEligibility,
            loadedState
          ] = await Promise.all([
            loadEligibility(),
            loadBatchStatus()
          ]);

          previousStatusRef.current =
            loadedState.status;

          completionHandledRef.current =
            !isActiveBatchStatus(
              loadedState.status
            );

          return {
            eligibility:
              loadedEligibility,

            state:
              loadedState
          };
        } catch (error) {
          console.error(
            'Unable to load Follow-Up batch data:',
            error
          );

          showMessage(
            getErrorMessage(
              error,
              'Unable to load Follow-Up batch information.'
            ),
            'error'
          );

          return null;
        } finally {
          setLoading(false);
          setRefreshing(false);
        }
      },
      [
        loadBatchStatus,
        loadEligibility
      ]
    );

  useEffect(
    () => {
      loadPanelData();
    },
    [loadPanelData]
  );

  const batchActive =
    useMemo(
      () => {
        return isActiveBatchStatus(
          batchState.status
        );
      },
      [batchState.status]
    );

  useEffect(
    () => {
      if (!batchActive) {
        return undefined;
      }

      let requestRunning =
        false;

      const pollBatchStatus =
        async () => {
          if (requestRunning) {
            return;
          }

          requestRunning =
            true;

          try {
            const previousStatus =
              previousStatusRef.current;

            const latestState =
              await loadBatchStatus();

            const latestStatus =
              latestState.status ||
              'IDLE';

            const wasActive =
              isActiveBatchStatus(
                previousStatus
              );

            const isFinished =
              !isActiveBatchStatus(
                latestStatus
              );

            previousStatusRef.current =
              latestStatus;

            if (
              wasActive &&
              isFinished &&
              !completionHandledRef.current
            ) {
              completionHandledRef.current =
                true;

              await loadEligibility();

              if (
                typeof onBatchCompleted ===
                'function'
              ) {
                await onBatchCompleted();
              }

              showMessage(
                latestState.message ||
                'Follow-Up batch completed.'
              );
            }
          } catch (error) {
            console.error(
              'Unable to refresh Follow-Up batch status:',
              error
            );
          } finally {
            requestRunning =
              false;
          }
        };

      const intervalId =
        window.setInterval(
          pollBatchStatus,
          1500
        );

      return () => {
        window.clearInterval(
          intervalId
        );
      };
    },
    [
      batchActive,
      loadBatchStatus,
      loadEligibility,
      onBatchCompleted
    ]
  );

  async function startBatch(
    batchType
  ) {
    const isFollowUp1 =
      batchType ===
      'FOLLOW_UP_1';

    const batchEligibility =
      isFollowUp1
        ? eligibility.followUp1
        : eligibility.followUp2;

    const eligibleCount =
      Number(
        batchEligibility
          .eligibleCount
      ) || 0;

    const selectableCount =
      Number(
        batchEligibility
          .selectableCount
      ) || 0;

    if (
      eligibleCount <= 0
    ) {
      showMessage(
        isFollowUp1
          ? 'No Follow-Up 1 records are currently eligible.'
          : 'No Follow-Up 2 records are currently eligible.',
        'error'
      );

      return;
    }

    if (
      selectableCount <= 0
    ) {
      showMessage(
        isFollowUp1
          ? 'No Follow-Up 1 records can be selected under the current daily limit.'
          : 'No Follow-Up 2 records can be selected under the current daily limit.',
        'error'
      );

      return;
    }

    const endpoint =
      isFollowUp1
        ? '/followup-send/batch/follow-up-1'
        : '/followup-send/batch/follow-up-2';

    const displayName =
      isFollowUp1
        ? 'Follow-Up 1'
        : 'Follow-Up 2';

    const confirmationMessage =
      eligibility.dryRun
        ? (
          `Start ${displayName} batch in Dry Run mode? No real email will be sent.`
        )
        : (
          `Start live ${displayName} batch? This will send real emails.`
        );

    const confirmed =
      window.confirm(
        confirmationMessage
      );

    if (!confirmed) {
      return;
    }

    setStartingBatch(
      batchType
    );

    clearMessage();

    completionHandledRef.current =
      false;

    previousStatusRef.current =
      'STARTING';

    try {
      const response =
        await api.post(
          endpoint,
          {}
        );

      const receivedState =
        normalizeBatchState(
          response.data.state
        );

      setBatchState(
        receivedState
      );

      previousStatusRef.current =
        receivedState.status ||
        'STARTING';

      showMessage(
        response.data.message ||
        `${displayName} batch started successfully.`
      );
    } catch (error) {
      console.error(
        `${displayName} batch start failed:`,
        error
      );

      showMessage(
        getErrorMessage(
          error,
          `Unable to start ${displayName} batch.`
        ),
        'error'
      );

      try {
        await loadBatchStatus();
      } catch (
        statusError
      ) {
        console.error(
          'Unable to reload batch status after start failure:',
          statusError
        );
      }
    } finally {
      setStartingBatch('');
    }
  }

  async function stopBatch() {
    const confirmed =
      window.confirm(
        'Stop the currently running Follow-Up batch?'
      );

    if (!confirmed) {
      return;
    }

    setStoppingBatch(true);
    clearMessage();

    try {
      const response =
        await api.post(
          '/followup-send/batch/stop',
          {}
        );

      const receivedState =
        normalizeBatchState(
          response.data.state
        );

      setBatchState(
        receivedState
      );

      previousStatusRef.current =
        receivedState.status;

      showMessage(
        response.data.message ||
        'Follow-Up batch stop requested.'
      );
    } catch (error) {
      console.error(
        'Unable to stop Follow-Up batch:',
        error
      );

      showMessage(
        getErrorMessage(
          error,
          'Unable to stop Follow-Up batch.'
        ),
        'error'
      );
    } finally {
      setStoppingBatch(false);
    }
  }

  async function resetBatch() {
    const confirmed =
      window.confirm(
        'Reset the current Follow-Up batch status?'
      );

    if (!confirmed) {
      return;
    }

    setResettingBatch(true);
    clearMessage();

    try {
      const response =
        await api.post(
          '/followup-send/batch/reset',
          {}
        );

      const receivedState =
        normalizeBatchState(
          response.data.state
        );

      setBatchState(
        receivedState
      );

      previousStatusRef.current =
        'IDLE';

      completionHandledRef.current =
        true;

      showMessage(
        response.data.message ||
        'Follow-Up batch state reset successfully.'
      );

      await loadEligibility();
    } catch (error) {
      console.error(
        'Unable to reset Follow-Up batch:',
        error
      );

      showMessage(
        getErrorMessage(
          error,
          'Unable to reset Follow-Up batch.'
        ),
        'error'
      );
    } finally {
      setResettingBatch(false);
    }
  }

  async function refreshPanel() {
    clearMessage();

    await loadPanelData(
      true
    );
  }

  const progressPercentage =
    batchState.selected > 0
      ? Math.min(
          100,
          Math.round(
            (
              batchState.processed /
              batchState.selected
            ) *
            100
          )
        )
      : 0;

  if (loading) {
    return (
      <section className="followup-batch-panel">
        <h2>
          Follow-Up Batch Sending
        </h2>

        <p>
          Loading Follow-Up eligibility
          and batch status...
        </p>
      </section>
    );
  }

  return (
    <section className="followup-batch-panel">
      <div className="followup-batch-heading">
        <div>
          <h2>
            Follow-Up Batch Sending
          </h2>

          <p>
            Follow-ups are immediately
            eligible. The logged-in user
            chooses when to start each
            batch.
          </p>
        </div>

        <div className="followup-batch-heading-actions">
          <span
            className={
              eligibility.dryRun
                ? (
                  'followup-batch-mode ' +
                  'followup-batch-mode-dry'
                )
                : (
                  'followup-batch-mode ' +
                  'followup-batch-mode-live'
                )
            }
          >
            {eligibility.dryRun
              ? 'Dry Run ON'
              : 'Live Sending'}
          </span>

          <button
            type="button"
            className={
              'followups-button ' +
              'followups-button-secondary'
            }
            disabled={
              refreshing ||
              batchActive ||
              Boolean(
                startingBatch
              )
            }
            onClick={
              refreshPanel
            }
          >
            {refreshing
              ? 'Refreshing...'
              : 'Refresh Batch Data'}
          </button>
        </div>
      </div>

      {message && (
        <div
          className={
            messageType === 'error'
              ? (
                'followups-message ' +
                'followups-message-error'
              )
              : (
                'followups-message ' +
                'followups-message-success'
              )
          }
        >
          {message}
        </div>
      )}

      <div className="followup-batch-eligibility-grid">
        <EligibilityCard
          title="Follow-Up 1"
          data={
            eligibility.followUp1
          }
          dryRun={
            eligibility.dryRun
          }
          disabled={
            batchActive ||
            Boolean(
              startingBatch
            )
          }
          loading={
            startingBatch ===
            'FOLLOW_UP_1'
          }
          onStart={() => {
            startBatch(
              'FOLLOW_UP_1'
            );
          }}
        />

        <EligibilityCard
          title="Follow-Up 2"
          data={
            eligibility.followUp2
          }
          dryRun={
            eligibility.dryRun
          }
          disabled={
            batchActive ||
            Boolean(
              startingBatch
            )
          }
          loading={
            startingBatch ===
            'FOLLOW_UP_2'
          }
          onStart={() => {
            startBatch(
              'FOLLOW_UP_2'
            );
          }}
        />
      </div>

      <div className="followup-batch-status-card">
        <div className="followup-batch-status-header">
          <div>
            <h3>
              Batch Status
            </h3>

            <p>
              {batchState.message ||
                'No Follow-Up batch has been started.'}
            </p>
          </div>

          <BatchStatusBadge
            status={
              batchState.status
            }
          />
        </div>

        <div className="followup-batch-progress">
          <div className="followup-batch-progress-label">
            <span>
              Progress
            </span>

            <strong>
              {batchState.processed}
              {' / '}
              {batchState.selected}
            </strong>
          </div>

          <div className="followup-batch-progress-track">
            <div
              className="followup-batch-progress-value"
              style={{
                width:
                  `${progressPercentage}%`
              }}
            />
          </div>
        </div>

        <div className="followup-batch-metrics-grid">
          <BatchMetric
            label="Eligible"
            value={
              batchState.eligibleCount
            }
          />

          <BatchMetric
            label="Selected"
            value={
              batchState.selected
            }
          />

          <BatchMetric
            label="Processed"
            value={
              batchState.processed
            }
          />

          <BatchMetric
            label="Sent"
            value={
              batchState.sent
            }
            tone="green"
          />

          <BatchMetric
            label="Dry Run"
            value={
              batchState.dryRun
            }
            tone="blue"
          />

          <BatchMetric
            label="Failed"
            value={
              batchState.failed
            }
            tone="red"
          />

          <BatchMetric
            label="Skipped"
            value={
              batchState.skipped
            }
            tone="orange"
          />

          <BatchMetric
            label="Daily Limit"
            value={
              batchState.dailyLimit
            }
          />
        </div>

        {batchState.currentEmail && (
          <div className="followup-batch-current">
            <strong>
              Current Recipient:
            </strong>
            {' '}
            {batchState.currentEmail}
          </div>
        )}

        {Array.isArray(
          batchState.failures
        ) &&
          batchState.failures
            .length > 0 && (
          <div className="followup-batch-failures">
            <h4>
              Failed Recipients
            </h4>

            <ul>
              {batchState.failures.map(
                (
                  failure,
                  index
                ) => (
                  <li
                    key={
                      failure.trackerId ||
                      `${failure.recipientEmail}-${index}`
                    }
                  >
                    <strong>
                      {failure.recipientEmail ||
                        'Unknown recipient'}
                    </strong>

                    {': '}

                    {failure.message ||
                      'Unknown batch error.'}
                  </li>
                )
              )}
            </ul>
          </div>
        )}

        <div className="followup-batch-actions">
          <button
            type="button"
            className={
              'followups-button ' +
              'followups-button-warning'
            }
            disabled={
              !batchActive ||
              stoppingBatch
            }
            onClick={
              stopBatch
            }
          >
            {stoppingBatch
              ? 'Stopping...'
              : 'Stop Batch'}
          </button>

          <button
            type="button"
            className={
              'followups-button ' +
              'followups-button-secondary'
            }
            disabled={
              batchActive ||
              resettingBatch
            }
            onClick={
              resetBatch
            }
          >
            {resettingBatch
              ? 'Resetting...'
              : 'Reset Batch'}
          </button>
        </div>
      </div>
    </section>
  );
}

function EligibilityCard({
  title,
  data,
  dryRun,
  disabled,
  loading,
  onStart
}) {
  const eligibleCount =
    Number(
      data?.eligibleCount
    ) || 0;

  const dailyLimit =
    Number(
      data?.dailyLimit
    ) || 0;

  const sentToday =
    Number(
      data?.sentToday
    ) || 0;

  const remainingCapacity =
    Number(
      data?.remainingCapacity
    ) || 0;

  const selectableCount =
    Number(
      data?.selectableCount
    ) || 0;

  const noEligibleRecords =
    eligibleCount <= 0;

  const noSelectableRecords =
    selectableCount <= 0;

  const capacityReached =
    remainingCapacity <= 0;

  return (
    <article className="followup-batch-eligibility-card">
      <h3>
        {title}
      </h3>

      <div className="followup-batch-card-grid">
        <BatchMetric
          label="Eligible"
          value={
            eligibleCount
          }
          tone="blue"
        />

        <BatchMetric
          label="Daily Limit"
          value={
            dailyLimit
          }
        />

        <BatchMetric
          label="Sent Today"
          value={
            sentToday
          }
          tone="green"
        />

        <BatchMetric
          label="Remaining"
          value={
            remainingCapacity
          }
          tone="purple"
        />

        <BatchMetric
          label="Will Process"
          value={
            selectableCount
          }
          tone="orange"
        />
      </div>

      {noEligibleRecords && (
        <p className="followup-batch-info">
          No records are currently
          eligible for {title}.
        </p>
      )}

      {!noEligibleRecords &&
        capacityReached && (
        <p className="followup-batch-warning">
          The daily limit has already
          been reached.
        </p>
      )}

      <button
        type="button"
        className={
          'followups-button ' +
          'followups-button-primary'
        }
        disabled={
          disabled ||
          noEligibleRecords ||
          noSelectableRecords
        }
        onClick={
          onStart
        }
      >
        {loading
          ? 'Starting...'
          : dryRun
            ? `Dry Run ${title} Batch`
            : `Send ${title} Batch`}
      </button>
    </article>
  );
}

function BatchMetric({
  label,
  value,
  tone = 'default'
}) {
  return (
    <div
      className={
        `followup-batch-metric followup-batch-metric-${tone}`
      }
    >
      <span>
        {label}
      </span>

      <strong>
        {Number(value) || 0}
      </strong>
    </div>
  );
}

function BatchStatusBadge({
  status
}) {
  const normalizedStatus =
    String(
      status || 'IDLE'
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
        `followup-batch-status-badge followup-batch-status-${statusClass}`
      }
    >
      {normalizedStatus}
    </span>
  );
}

export default FollowUpBatchPanel;