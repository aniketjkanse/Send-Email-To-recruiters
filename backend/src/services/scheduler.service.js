const {
  buildEmailPreview
} = require(
  './emailFilter.service'
);

const {
  getDatabaseTemplate
} = require(
  './databaseTemplate.service'
);

const {
  recordSentEmail
} = require(
  './sentEmail.service'
);

const {
  sendEmail
} = require(
  './mail.service'
);

const {
  createHistoryRecords
} = require(
  './databaseHistory.service'
);

const {
  createFollowUpRecord
} = require(
  './databaseFollowUp.service'
);

/*
 * Each logged-in user receives a separate
 * in-memory scheduler state.
 *
 * Key:
 * userId
 *
 * Value:
 * scheduler state object
 */
const schedulerStates =
  new Map();

function createInitialState() {
  return {
    status:
      'IDLE',

    selected:
      0,

    sent:
      0,

    failed:
      0,

    skipped:
      0,

    currentEmail:
      '',

    startedAt:
      '',

    completedAt:
      '',

    message:
      '',

    stopRequested:
      false
  };
}

function requireUserId(
  userId
) {
  if (!userId) {
    throw new Error(
      'Authenticated user ID is required.'
    );
  }

  return userId;
}

function getMutableState(
  userId
) {
  requireUserId(
    userId
  );

  if (
    !schedulerStates.has(
      userId
    )
  ) {
    schedulerStates.set(
      userId,
      createInitialState()
    );
  }

  return schedulerStates.get(
    userId
  );
}

function getState(
  userId
) {
  const state =
    getMutableState(
      userId
    );

  return {
    ...state
  };
}

function resetState(
  userId
) {
  requireUserId(
    userId
  );

  const currentState =
    getMutableState(
      userId
    );

  if (
    currentState.status ===
      'STARTING' ||
    currentState.status ===
      'RUNNING' ||
    currentState.status ===
      'STOPPING'
  ) {
    throw new Error(
      'Cannot reset while the scheduler is active.'
    );
  }

  const newState =
    createInitialState();

  schedulerStates.set(
    userId,
    newState
  );

  return {
    ...newState
  };
}

function requestStop(
  userId
) {
  const state =
    getMutableState(
      userId
    );

  if (
    state.status !==
      'STARTING' &&
    state.status !==
      'RUNNING' &&
    state.status !==
      'STOPPING'
  ) {
    state.message =
      'Scheduler is not running.';

    return {
      ...state
    };
  }

  state.stopRequested =
    true;

  state.status =
    'STOPPING';

  state.message =
    'Stop requested. Scheduler will stop safely before the next email.';

  return {
    ...state
  };
}

function getRandomDelay(
  minSeconds,
  maxSeconds
) {
  const parsedMinimum =
    Number(
      minSeconds
    );

  const parsedMaximum =
    Number(
      maxSeconds
    );

  const safeMinimum =
    Number.isFinite(
      parsedMinimum
    )
      ? Math.max(
          0,
          Math.floor(
            parsedMinimum
          )
        )
      : 0;

  const safeMaximum =
    Number.isFinite(
      parsedMaximum
    )
      ? Math.max(
          safeMinimum,
          Math.floor(
            parsedMaximum
          )
        )
      : safeMinimum;

  return Math.floor(
    Math.random() *
      (
        safeMaximum -
        safeMinimum +
        1
      ) +
      safeMinimum
  );
}

function toSafePositiveNumber(
  value,
  fallbackValue,
  minimumValue = 1
) {
  const convertedValue =
    Number(
      value
    );

  if (
    !Number.isFinite(
      convertedValue
    ) ||
    convertedValue <
      minimumValue
  ) {
    return fallbackValue;
  }

  return Math.floor(
    convertedValue
  );
}

async function cancellableWait(
  userId,
  seconds
) {
  const state =
    getMutableState(
      userId
    );

  for (
    let index = 0;
    index < seconds;
    index++
  ) {
    if (
      state.stopRequested
    ) {
      return false;
    }

    await new Promise(
      resolve => {
        setTimeout(
          resolve,
          1000
        );
      }
    );
  }

  return true;
}

/*
 * Save one or more EmailHistory records
 * in PostgreSQL.
 *
 * History errors do not stop the scheduler.
 */
async function saveHistorySafely(
  userId,
  historyRecords
) {
  if (
    !Array.isArray(
      historyRecords
    ) ||
    historyRecords.length ===
      0
  ) {
    return [];
  }

  try {
    return await createHistoryRecords(
      userId,
      historyRecords
    );
  } catch (error) {
    console.error(
      'Unable to save PostgreSQL email history:',
      error.message
    );

    return [];
  }
}

/*
 * Save a successful initial send in
 * the PostgreSQL SentEmail table.
 *
 * This replaces sent_emails.json.
 */
async function saveSentEmailSafely(
  userId,
  email,
  template,
  result,
  sentAt
) {
  try {
    const savedRecord =
      await recordSentEmail(
        userId,
        {
          recipientEmail:
            email,

          senderEmail:
            result.senderEmail ||
            '',

          subject:
            template.subject,

          messageId:
            result.messageId ||
            '',

          status:
            'SENT',

          emailType:
            'INITIAL',

          sentAt
        }
      );

    console.log(
      `SentEmail PostgreSQL record saved for ${email}`
    );

    return savedRecord;
  } catch (error) {
    console.error(
      `Email was sent to ${email}, but PostgreSQL SentEmail tracking failed:`,
      error.message
    );

    return null;
  }
}

/*
 * Create the PostgreSQL FollowUpTracker
 * record after a real initial email is sent.
 *
 * This replaces followup_tracker.json.
 */
async function saveFollowUpTrackerSafely(
  userId,
  email,
  template,
  result,
  sentAt
) {
  if (
    !result.messageId
  ) {
    console.log(
      `PostgreSQL Follow-Up tracking skipped for ${email} because Message-ID is missing.`
    );

    return null;
  }

  try {
    const followUpRecord =
      await createFollowUpRecord(
        userId,
        {
          recipientEmail:
            email,

          email,

          initialMessageId:
            result.messageId,

          messageId:
            result.messageId,

          initialSentAt:
            sentAt,

          sentAt,

          subject:
            template.subject,

          senderEmail:
            result.senderEmail ||
            ''
        }
      );

    console.log(
      'PostgreSQL Follow-Up tracker created:',
      {
        trackerId:
          followUpRecord.id,

        userId:
          followUpRecord.userId,

        recipientEmail:
          followUpRecord
            .recipientEmail,

        status:
          followUpRecord.status,

        initialMessageId:
          followUpRecord
            .initialMessageId
      }
    );

    return followUpRecord;
  } catch (error) {
    console.error(
      `Email was sent to ${email}, but PostgreSQL Follow-Up tracking failed:`,
      error.message
    );

    return null;
  }
}

async function runScheduler(
  userId
) {
  requireUserId(
    userId
  );

  const existingState =
    getMutableState(
      userId
    );

  if (
    existingState.status ===
      'STARTING' ||
    existingState.status ===
      'RUNNING' ||
    existingState.status ===
      'STOPPING'
  ) {
    throw new Error(
      'Your scheduler is already active.'
    );
  }

  /*
   * STARTING is set immediately so two
   * quick requests cannot start two runs
   * for the same user.
   */
  const state = {
    ...createInitialState(),

    status:
      'STARTING',

    startedAt:
      new Date()
        .toISOString(),

    message:
      'Loading your PostgreSQL template and recipients.',

    stopRequested:
      false
  };

  schedulerStates.set(
    userId,
    state
  );

  let template;

  try {
    template =
      await getDatabaseTemplate(
        userId
      );
  } catch (error) {
    state.status =
      'FAILED';

    state.completedAt =
      new Date()
        .toISOString();

    state.message =
      `Unable to load PostgreSQL template: ${error.message}`;

    throw error;
  }

  if (
    state.stopRequested
  ) {
    state.status =
      'STOPPED';

    state.completedAt =
      new Date()
        .toISOString();

    state.message =
      'Scheduler stopped before email processing started.';

    return {
      ...state
    };
  }

  let preview;

  try {
    /*
     * Preview loads per-user data from:
     *
     * Recipient
     * SentEmail
     * EmailTemplate
     */
    preview =
      await buildEmailPreview(
        userId,
        template
      );
  } catch (error) {
    state.status =
      'FAILED';

    state.completedAt =
      new Date()
        .toISOString();

    state.message =
      `Unable to load PostgreSQL recipients: ${error.message}`;

    throw error;
  }

  const dailyLimit =
    toSafePositiveNumber(
      template.dailyLimit,
      100,
      1
    );

  const newEmails =
    Array.isArray(
      preview.newEmails
    )
      ? preview.newEmails
      : [];

  const emailsToSend =
    newEmails.slice(
      0,
      dailyLimit
    );

  state.status =
    'RUNNING';

  state.selected =
    emailsToSend.length;

  state.sent =
    0;

  state.failed =
    0;

  state.skipped =
    0;

  state.currentEmail =
    '';

  state.message =
    'Scheduler started.';

  console.log(
    '=================================='
  );

  console.log(
    `Scheduler started for user ${userId}`
  );

  console.log(
    'Scheduler database configuration:',
    {
      userId,

      templateId:
        template.id,

      templateOwnerId:
        template.userId,

      rawDailyLimit:
        template.dailyLimit,

      calculatedDailyLimit:
        dailyLimit,

      subject:
        template.subject,

      dryRun:
        template.dryRun,

      availableNewEmails:
        newEmails.length,

      selectedEmails:
        emailsToSend.length,

      recipientSource:
        preview.dataSource
          ?.recipients ||
        'UNKNOWN',

      sentEmailSource:
        preview.dataSource
          ?.sentEmails ||
        'UNKNOWN',

      templateSource:
        preview.dataSource
          ?.template ||
        'POSTGRESQL'
    }
  );

  console.log(
    '=================================='
  );

  if (
    emailsToSend.length ===
      0
  ) {
    state.status =
      'COMPLETED';

    state.completedAt =
      new Date()
        .toISOString();

    state.message =
      'No new eligible emails are available to send.';

    return {
      ...state
    };
  }

  let continuousFailureCount =
    0;

  let totalFailureCount =
    0;

  const continuousFailureLimit =
    toSafePositiveNumber(
      template
        .stopAfterContinuousFailures,
      3,
      1
    );

  const totalFailureLimit =
    toSafePositiveNumber(
      template
        .stopAfterTotalFailures,
      8,
      1
    );

  for (
    let index = 0;
    index < emailsToSend.length;
    index++
  ) {
    if (
      state.stopRequested
    ) {
      state.message =
        'Scheduler stopped before the next email.';

      break;
    }

    const email =
      emailsToSend[
        index
      ];

    state.currentEmail =
      email;

    state.status =
      'RUNNING';

    state.message =
      `Processing email ${index + 1} of ${emailsToSend.length}`;

    try {
      console.log(
        `User ${userId}: Processing email ${index + 1}/${emailsToSend.length} for ${email}`
      );

      /*
       * mail.service.js loads the user's
       * encrypted SenderAccount using userId.
       */
      const result =
        await sendEmail(
          userId,
          email,
          template
        );

      const sentAt =
        new Date()
          .toISOString();

      console.log(
        `Email status for ${email}: ${result.status}`
      );

      if (
        result.status ===
          'SENT'
      ) {
        state.sent +=
          1;

        /*
         * Save duplicate-prevention record.
         */
        await saveSentEmailSafely(
          userId,
          email,
          template,
          result,
          sentAt
        );

        /*
         * Save threading information for
         * Follow-Up 1 and Follow-Up 2.
         */
        await saveFollowUpTrackerSafely(
          userId,
          email,
          template,
          result,
          sentAt
        );

        /*
         * Save PostgreSQL history.
         */
        await saveHistorySafely(
          userId,
          [
            {
              recipientEmail:
                email,

              senderEmail:
                result.senderEmail ||
                '',

              subject:
                template.subject,

              status:
                'SENT',

              reason:
                '',

              sentAt,

              messageId:
                result.messageId ||
                '',

              emailType:
                'INITIAL'
            }
          ]
        );
      } else if (
        result.status ===
          'DRY_RUN'
      ) {
        state.skipped +=
          1;

        /*
         * Dry runs are saved in history,
         * but not in SentEmail or
         * FollowUpTracker.
         */
        await saveHistorySafely(
          userId,
          [
            {
              recipientEmail:
                email,

              senderEmail:
                '',

              subject:
                template.subject,

              status:
                'DRY_RUN',

              reason:
                result.reason ||
                'Dry run enabled.',

              sentAt,

              messageId:
                '',

              emailType:
                'INITIAL'
            }
          ]
        );
      } else {
        throw new Error(
          result.reason ||
          `Unexpected email status: ${result.status}`
        );
      }

      continuousFailureCount =
        0;

      if (
        index <
        emailsToSend.length -
          1
      ) {
        const delay =
          getRandomDelay(
            template
              .minDelaySeconds,
            template
              .maxDelaySeconds
          );

        state.message =
          `Waiting ${delay} seconds before the next email.`;

        console.log(
          `User ${userId}: Waiting ${delay} seconds`
        );

        const completedWait =
          await cancellableWait(
            userId,
            delay
          );

        if (
          !completedWait
        ) {
          state.message =
            'Scheduler stopped during the waiting period.';

          break;
        }
      }
    } catch (error) {
      continuousFailureCount +=
        1;

      totalFailureCount +=
        1;

      state.failed +=
        1;

      const failureTime =
        new Date()
          .toISOString();

      console.error(
        `User ${userId}: Email failed for ${email}:`,
        error.message
      );

      /*
       * Save failed attempt in PostgreSQL
       * history using the correct userId.
       */
      await saveHistorySafely(
        userId,
        [
          {
            recipientEmail:
              email,

            senderEmail:
              '',

            subject:
              template.subject,

            status:
              'FAILED',

            reason:
              error.message,

            sentAt:
              failureTime,

            messageId:
              '',

            emailType:
              'INITIAL'
          }
        ]
      );

      if (
        continuousFailureCount >=
        continuousFailureLimit
      ) {
        state.message =
          'Stopped because the continuous failure limit was reached.';

        break;
      }

      if (
        totalFailureCount >=
        totalFailureLimit
      ) {
        state.message =
          'Stopped because the total failure limit was reached.';

        break;
      }

      /*
       * Temporary retry delay.
       *
       * BullMQ will replace this later.
       */
      const failureDelay =
        getRandomDelay(
          30,
          60
        );

      state.message =
        `Failure detected: ${error.message}. Waiting ${failureDelay} seconds before continuing.`;

      const completedFailureWait =
        await cancellableWait(
          userId,
          failureDelay
        );

      if (
        !completedFailureWait
      ) {
        state.message =
          'Scheduler stopped during the failure waiting period.';

        break;
      }
    }
  }

  state.status =
    state.stopRequested
      ? 'STOPPED'
      : 'COMPLETED';

  state.currentEmail =
    '';

  state.completedAt =
    new Date()
      .toISOString();

  if (
    state.stopRequested
  ) {
    state.message =
      'Scheduler stopped safely.';
  } else if (
    !state.message.startsWith(
      'Stopped because'
    )
  ) {
    state.message =
      `Scheduler completed. Sent: ${state.sent}, Failed: ${state.failed}, Skipped: ${state.skipped}`;
  }

  console.log(
    `User ${userId}: ${state.message}`
  );

  return {
    ...state
  };
}

function removeSchedulerState(
  userId
) {
  requireUserId(
    userId
  );

  const state =
    getMutableState(
      userId
    );

  if (
    state.status ===
      'STARTING' ||
    state.status ===
      'RUNNING' ||
    state.status ===
      'STOPPING'
  ) {
    throw new Error(
      'Cannot remove scheduler state while it is active.'
    );
  }

  schedulerStates.delete(
    userId
  );

  return createInitialState();
}

module.exports = {
  runScheduler,
  getState,
  resetState,
  requestStop,
  removeSchedulerState
};
