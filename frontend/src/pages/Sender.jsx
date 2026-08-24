import {
  useCallback,
  useEffect,
  useState
} from 'react';

import {
  api
} from '../services/api.js';

function createInitialStatus() {
  return {
    status: 'IDLE',
    selected: 0,
    sent: 0,
    failed: 0,
    skipped: 0,
    currentEmail: '',
    message: '',
    startedAt: '',
    completedAt: '',
    stopRequested: false
  };
}

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
  for (const value of values) {
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
  for (const value of values) {
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

/*
 * Supports direct and nested backend
 * response formats.
 *
 * Direct:
 *
 * {
 *   status: "COMPLETED",
 *   selected: 1,
 *   sent: 1
 * }
 *
 * Nested:
 *
 * {
 *   state: {
 *     status: "COMPLETED",
 *     selected: 1,
 *     sent: 1
 *   }
 * }
 *
 * Controller wrapper:
 *
 * {
 *   message: "Scheduler started.",
 *   scheduler: {
 *     status: "RUNNING"
 *   }
 * }
 */
function normalizeSchedulerStatus(
  responseData
) {
  const root =
    responseData &&
    typeof responseData ===
      'object'
      ? responseData
      : {};

  let state =
    root;

  const candidates = [
    root.state,
    root.scheduler,
    root.schedulerState,
    root.result,
    root.data
  ];

  for (
    const candidate of
    candidates
  ) {
    if (
      candidate &&
      typeof candidate ===
        'object' &&
      !Array.isArray(
        candidate
      )
    ) {
      state =
        candidate;

      break;
    }
  }

  return {
    status:
      getText(
        state.status,
        root.status,
        'IDLE'
      ).toUpperCase(),

    selected:
      getNumber(
        state.selected,
        state.total,
        state.totalRecipients,
        root.selected,
        root.total
      ),

    sent:
      getNumber(
        state.sent,
        state.sentCount,
        root.sent
      ),

    failed:
      getNumber(
        state.failed,
        state.failedCount,
        root.failed
      ),

    skipped:
      getNumber(
        state.skipped,
        state.dryRun,
        state.dryRunCount,
        root.skipped,
        root.dryRun,
        root.dryRunCount
      ),

    currentEmail:
      getText(
        state.currentEmail,
        state.currentRecipient,
        root.currentEmail,
        root.currentRecipient
      ),

    message:
      getText(
        state.message,
        root.message
      ),

    startedAt:
      state.startedAt ||
      root.startedAt ||
      '',

    completedAt:
      state.completedAt ||
      root.completedAt ||
      '',

    stopRequested:
      state.stopRequested ===
        true ||
      root.stopRequested ===
        true
  };
}

function formatDateTime(
  value
) {
  if (!value) {
    return '-';
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
    return '-';
  }

  return date.toLocaleString();
}

function getStatusStyle(
  status
) {
  if (
    status ===
    'COMPLETED'
  ) {
    return {
      color: '#17653a',
      background: '#eaf8f0',
      border: '#b7dfc5'
    };
  }

  if (
    status ===
      'STARTING' ||
    status ===
      'RUNNING'
  ) {
    return {
      color: '#1769c2',
      background: '#eaf3ff',
      border: '#cce0f7'
    };
  }

  if (
    status ===
      'STOPPING' ||
    status ===
      'STOPPED'
  ) {
    return {
      color: '#8a5a00',
      background: '#fff4d8',
      border: '#efd58d'
    };
  }

  if (
    status ===
    'FAILED'
  ) {
    return {
      color: '#a21628',
      background: '#fff0f2',
      border: '#f2bac2'
    };
  }

  return {
    color: '#52647b',
    background: '#eef3f8',
    border: '#d4deea'
  };
}

function Sender() {
  const [
    status,
    setStatus
  ] = useState(
    createInitialStatus()
  );

  const [
    message,
    setMessage
  ] = useState('');

  const [
    messageType,
    setMessageType
  ] = useState('');

  const [
    loading,
    setLoading
  ] = useState(true);

  const [
    starting,
    setStarting
  ] = useState(false);

  const [
    stopping,
    setStopping
  ] = useState(false);

  const [
    resetting,
    setResetting
  ] = useState(false);

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

  const loadStatus =
    useCallback(
      async (
        showError = false
      ) => {
        try {
          const response =
            await api.get(
              '/send/status'
            );

          const loadedStatus =
            normalizeSchedulerStatus(
              response.data
            );

          setStatus(
            loadedStatus
          );

          return loadedStatus;
        } catch (error) {
          console.error(
            'Unable to load Scheduler status:',
            error
          );

          if (showError) {
            showMessage(
              getErrorMessage(
                error,
                'Unable to load Scheduler status.'
              ),
              'error'
            );
          }

          return null;
        } finally {
          setLoading(false);
        }
      },
      []
    );

  async function startScheduler() {
    setStarting(true);
    clearMessage();

    try {
      const response =
        await api.post(
          '/send/start'
        );

      const returnedStatus =
        normalizeSchedulerStatus(
          response.data
        );

      setStatus(
        returnedStatus
      );

      showMessage(
        response.data.message ||
        returnedStatus.message ||
        'Scheduler started successfully.'
      );

      await loadStatus(
        true
      );
    } catch (error) {
      console.error(
        'Unable to start Scheduler:',
        error
      );

      showMessage(
        getErrorMessage(
          error,
          'Unable to start Scheduler.'
        ),
        'error'
      );

      await loadStatus();
    } finally {
      setStarting(false);
    }
  }

  async function stopScheduler() {
    setStopping(true);
    clearMessage();

    try {
      const response =
        await api.post(
          '/send/stop'
        );

      const returnedStatus =
        normalizeSchedulerStatus(
          response.data
        );

      setStatus(
        returnedStatus
      );

      showMessage(
        response.data.message ||
        returnedStatus.message ||
        'Scheduler stop requested.'
      );

      await loadStatus(
        true
      );
    } catch (error) {
      console.error(
        'Unable to stop Scheduler:',
        error
      );

      showMessage(
        getErrorMessage(
          error,
          'Unable to stop Scheduler.'
        ),
        'error'
      );

      await loadStatus();
    } finally {
      setStopping(false);
    }
  }

  async function resetScheduler() {
    const confirmed =
      window.confirm(
        'Reset Scheduler status? Email History, SentEmail records, Follow-Up trackers, recipients, and Resume data will not be deleted.'
      );

    if (!confirmed) {
      return;
    }

    setResetting(true);
    clearMessage();

    try {
      const response =
        await api.post(
          '/send/reset'
        );

      const returnedStatus =
        normalizeSchedulerStatus(
          response.data
        );

      setStatus(
        returnedStatus
      );

      showMessage(
        response.data.message ||
        returnedStatus.message ||
        'Scheduler status reset successfully.'
      );

      await loadStatus(
        true
      );
    } catch (error) {
      console.error(
        'Unable to reset Scheduler:',
        error
      );

      showMessage(
        getErrorMessage(
          error,
          'Unable to reset Scheduler.'
        ),
        'error'
      );

      await loadStatus();
    } finally {
      setResetting(false);
    }
  }

  useEffect(
    () => {
      loadStatus(
        true
      );

      const intervalId =
        window.setInterval(
          () => {
            loadStatus();
          },
          2000
        );

      return () => {
        window.clearInterval(
          intervalId
        );
      };
    },
    [loadStatus]
  );

  const isRunning =
    status.status ===
      'STARTING' ||
    status.status ===
      'RUNNING' ||
    status.status ===
      'STOPPING';

  const operationRunning =
    starting ||
    stopping ||
    resetting;

  const processed =
    status.sent +
    status.failed +
    status.skipped;

  const progress =
    status.selected > 0
      ? Math.min(
          100,
          Math.round(
            (
              processed /
              status.selected
            ) *
            100
          )
        )
      : 0;

  const statusStyle =
    getStatusStyle(
      status.status
    );

  if (loading) {
    return (
      <section>
        <h1>
          Start Scheduled Sending
        </h1>

        <div className="panel">
          Loading Scheduler status...
        </div>
      </section>
    );
  }

  return (
    <section>
      <h1>
        Start Scheduled Sending
      </h1>

      <div className="panel">
        <p>
          This sends only new emails,
          skips duplicates, applies the
          daily limit, and uses the delay
          configured in Template.
        </p>

        <div
          style={{
            display:
              'flex',

            flexWrap:
              'wrap',

            gap:
              '10px'
          }}
        >
          <button
            type="button"
            className="primary-button"
            disabled={
              isRunning ||
              operationRunning
            }
            onClick={
              startScheduler
            }
          >
            {starting
              ? 'Starting...'
              : 'Start Scheduler'}
          </button>

          <button
            type="button"
            className="danger-button"
            disabled={
              !isRunning ||
              operationRunning
            }
            onClick={
              stopScheduler
            }
          >
            {stopping
              ? 'Stopping...'
              : 'Stop Scheduler'}
          </button>

          <button
            type="button"
            className="secondary"
            disabled={
              isRunning ||
              operationRunning
            }
            onClick={
              resetScheduler
            }
          >
            {resetting
              ? 'Resetting...'
              : 'Reset Status'}
          </button>
        </div>

        {message && (
          <div
            className={
              messageType ===
              'error'
                ? 'notice error'
                : 'notice'
            }
            style={{
              marginTop:
                '16px'
            }}
          >
            {message}
          </div>
        )}
      </div>

      <div className="panel">
        <div
          style={{
            display:
              'flex',

            justifyContent:
              'space-between',

            alignItems:
              'center',

            flexWrap:
              'wrap',

            gap:
              '12px',

            marginBottom:
              '18px'
          }}
        >
          <h3
            style={{
              margin:
                0
            }}
          >
            Scheduler Status
          </h3>

          <span
            style={{
              padding:
                '6px 11px',

              color:
                statusStyle.color,

              background:
                statusStyle.background,

              border:
                (
                  '1px solid ' +
                  statusStyle.border
                ),

              borderRadius:
                '20px',

              fontSize:
                '12px',

              fontWeight:
                '800'
            }}
          >
            {status.status}
          </span>
        </div>

        <div
          style={{
            display:
              'grid',

            gridTemplateColumns:
              (
                'repeat(auto-fit, ' +
                'minmax(130px, 1fr))'
              ),

            gap:
              '10px',

            marginBottom:
              '18px'
          }}
        >
          <StatusItem
            label="Selected"
            value={
              status.selected
            }
          />

          <StatusItem
            label="Processed"
            value={
              processed
            }
          />

          <StatusItem
            label="Sent"
            value={
              status.sent
            }
            color="#17653a"
          />

          <StatusItem
            label="Failed"
            value={
              status.failed
            }
            color="#a21628"
          />

          <StatusItem
            label="Skipped / Dry Run"
            value={
              status.skipped
            }
            color="#6b46c1"
          />
        </div>

        <div
          style={{
            display:
              'flex',

            justifyContent:
              'space-between',

            alignItems:
              'center',

            marginBottom:
              '7px',

            color:
              '#6b7a90',

            fontSize:
              '12px'
          }}
        >
          <span>
            Progress
          </span>

          <strong>
            {progress}%
          </strong>
        </div>

        <div
          style={{
            width:
              '100%',

            height:
              '9px',

            marginBottom:
              '18px',

            overflow:
              'hidden',

            background:
              '#e5ebf2',

            borderRadius:
              '6px'
          }}
        >
          <div
            style={{
              width:
                `${progress}%`,

              height:
                '100%',

              background:
                '#1769c2',

              borderRadius:
                '6px',

              transition:
                'width 0.25s ease'
            }}
          />
        </div>

        <div
          style={{
            display:
              'grid',

            gridTemplateColumns:
              (
                'repeat(auto-fit, ' +
                'minmax(220px, 1fr))'
              ),

            gap:
              '10px'
          }}
        >
          <SchedulerDetail
            label="Current Recipient"
            value={
              status.currentEmail ||
              '-'
            }
          />

          <SchedulerDetail
            label="Message"
            value={
              status.message ||
              '-'
            }
          />

          <SchedulerDetail
            label="Started"
            value={
              formatDateTime(
                status.startedAt
              )
            }
          />

          <SchedulerDetail
            label="Completed"
            value={
              formatDateTime(
                status.completedAt
              )
            }
          />
        </div>
      </div>

      <div
        className="panel"
        style={{
          borderLeft:
            '4px solid #efd58d'
        }}
      >
        <strong>
          Live sending checklist
        </strong>

        <ul
          style={{
            lineHeight:
              '1.7',

            marginBottom:
              0
          }}
        >
          <li>
            Template Dry Run must be OFF.
          </li>

          <li>
            Use a daily limit of 1 for the
            first controlled test.
          </li>

          <li>
            Sender Settings must contain a
            valid Gmail App Password.
          </li>

          <li>
            Active Resume must show
            Physical File Available.
          </li>

          <li>
            Use a recipient address that
            has no existing SentEmail
            record.
          </li>
        </ul>
      </div>
    </section>
  );
}

function StatusItem({
  label,
  value,
  color = '#24364f'
}) {
  return (
    <div
      style={{
        padding:
          '12px',

        background:
          '#f7f9fc',

        border:
          '1px solid #e1e8f1',

        borderRadius:
          '8px'
      }}
    >
      <small
        style={{
          display:
            'block',

          marginBottom:
            '5px',

          color:
            '#718096'
        }}
      >
        {label}
      </small>

      <strong
        style={{
          color,

          fontSize:
            '20px'
        }}
      >
        {Number(value) || 0}
      </strong>
    </div>
  );
}

function SchedulerDetail({
  label,
  value
}) {
  return (
    <div
      style={{
        minWidth:
          0,

        padding:
          '11px 13px',

        background:
          '#f7f9fc',

        border:
          '1px solid #e1e8f1',

        borderRadius:
          '8px'
      }}
    >
      <small
        style={{
          display:
            'block',

          marginBottom:
            '5px',

          color:
            '#718096',

          fontWeight:
            '700'
        }}
      >
        {label}
      </small>

      <strong
        style={{
          display:
            'block',

          color:
            '#31445f',

          fontSize:
            '13px',

          lineHeight:
            '1.4',

          overflowWrap:
            'anywhere'
        }}
      >
        {value}
      </strong>
    </div>
  );
}

export default Sender;