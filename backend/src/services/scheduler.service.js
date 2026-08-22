const {
  SENT_EMAILS_FILE
} = require('../utils/path.util');

const {
  readJson,
  writeJson
} = require('../utils/file.util');

const {
  buildEmailPreview,
  normalizeEmail
} = require('./emailFilter.service');

const {
  readTemplate
} = require('./template.service');

const {
  sendEmail
} = require('./mail.service');

const {
  appendHistory
} = require('./history.service');

const {
  createFollowUpRecord
} = require('./followup.service');

let schedulerState = {
  status: 'IDLE',
  selected: 0,
  sent: 0,
  failed: 0,
  skipped: 0,
  currentEmail: '',
  startedAt: '',
  completedAt: '',
  message: '',
  stopRequested: false
};

function getRandomDelay(
  minSeconds,
  maxSeconds
) {
  return Math.floor(
    Math.random() *
      (
        maxSeconds -
        minSeconds +
        1
      ) +
      minSeconds
  );
}

function getState() {
  return schedulerState;
}

function resetState() {
  schedulerState = {
    status: 'IDLE',
    selected: 0,
    sent: 0,
    failed: 0,
    skipped: 0,
    currentEmail: '',
    startedAt: '',
    completedAt: '',
    message: '',
    stopRequested: false
  };

  return schedulerState;
}

function requestStop() {
  if (
    schedulerState.status !==
    'RUNNING'
  ) {
    schedulerState.message =
      'Scheduler is not running';

    return schedulerState;
  }

  schedulerState.stopRequested = true;
  schedulerState.status = 'STOPPING';

  schedulerState.message =
    'Stop requested. Scheduler will stop safely before the next email.';

  return schedulerState;
}

async function cancellableWait(seconds) {
  for (
    let index = 0;
    index < seconds;
    index++
  ) {
    if (schedulerState.stopRequested) {
      return false;
    }

    await new Promise(resolve =>
      setTimeout(resolve, 1000)
    );
  }

  return true;
}

async function runScheduler() {
  const template = readTemplate();

  const preview =
    buildEmailPreview(template);

  const emailsToSend =
    preview.newEmails.slice(
      0,
      template.dailyLimit || 100
    );

  schedulerState = {
    ...resetState(),

    status: 'RUNNING',

    selected:
      emailsToSend.length,

    startedAt:
      new Date().toISOString(),

    message:
      'Scheduler started',

    stopRequested: false
  };

  const historyRecords = [];

  const oldSentEmails = readJson(
    SENT_EMAILS_FILE,
    []
  ).map(normalizeEmail);

  const successfullySentEmails = [];

  let continuousFailureCount = 0;
  let totalFailureCount = 0;

  for (
    let index = 0;
    index < emailsToSend.length;
    index++
  ) {
    if (schedulerState.stopRequested) {
      schedulerState.message =
        'Scheduler stopped before the next email';

      break;
    }

    const email =
      emailsToSend[index];

    schedulerState.currentEmail =
      email;

    schedulerState.status =
      'RUNNING';

    try {
      console.log(
        `Sending email ${index + 1}/` +
        `${emailsToSend.length} to ${email}`
      );

      const result =
        await sendEmail(
          email,
          template
        );

      const sentAt =
        new Date().toISOString();

      console.log(
        `Email status for ${email}: ` +
        result.status
      );

      historyRecords.push({
        email,

        status: result.status,

        reason:
          result.reason || '',

        sentAt,

        messageId:
          result.messageId || '',

        emailType: 'INITIAL'
      });

      if (result.status === 'SENT') {
        successfullySentEmails.push(
          email
        );

        schedulerState.sent += 1;

        if (result.messageId) {
          createFollowUpRecord({
            email,

            messageId:
              result.messageId,

            sentAt,

            subject:
              template.subject
          });
        } else {
          console.log(
            `Follow-up tracking skipped for ${email} because no Message-ID was returned.`
          );
        }
      }

      if (
        result.status === 'DRY_RUN'
      ) {
        schedulerState.skipped += 1;
      }

      continuousFailureCount = 0;

      if (
        index <
        emailsToSend.length - 1
      ) {
        const delay =
          getRandomDelay(
            template.minDelaySeconds ||
              180,

            template.maxDelaySeconds ||
              420
          );

        schedulerState.message =
          `Waiting ${delay} seconds before the next email`;

        const completedWait =
          await cancellableWait(
            delay
          );

        if (!completedWait) {
          schedulerState.message =
            'Scheduler stopped during the waiting period';

          break;
        }
      }
    } catch (error) {
      continuousFailureCount += 1;
      totalFailureCount += 1;
      schedulerState.failed += 1;

      historyRecords.push({
        email,

        status: 'FAILED',

        reason: error.message,

        sentAt:
          new Date().toISOString(),

        emailType: 'INITIAL'
      });

      if (
        continuousFailureCount >=
        (
          template
            .stopAfterContinuousFailures ||
          3
        )
      ) {
        schedulerState.message =
          'Stopped because continuous failure limit was reached';

        break;
      }

      if (
        totalFailureCount >=
        (
          template
            .stopAfterTotalFailures ||
          8
        )
      ) {
        schedulerState.message =
          'Stopped because total failure limit was reached';

        break;
      }

      console.log(
        'Email sending failed:',
        error
      );

      const failureDelay =
        getRandomDelay(
          600,
          1200
        );

      schedulerState.message =
        `Failure detected: ${error.message}. ` +
        `Waiting ${failureDelay} seconds before continuing`;

      const completedFailureWait =
        await cancellableWait(
          failureDelay
        );

      if (!completedFailureWait) {
        schedulerState.message =
          'Scheduler stopped during failure waiting period';

        break;
      }
    }
  }

  if (historyRecords.length) {
    await appendHistory(
      historyRecords
    );
  }

  if (
    successfullySentEmails.length
  ) {
    writeJson(
      SENT_EMAILS_FILE,

      [
        ...new Set([
          ...oldSentEmails,
          ...successfullySentEmails
        ])
      ]
    );
  }

  schedulerState.status =
    schedulerState.stopRequested
      ? 'STOPPED'
      : 'COMPLETED';

  schedulerState.currentEmail = '';

  schedulerState.completedAt =
    new Date().toISOString();

  schedulerState.message =
    schedulerState.stopRequested
      ? 'Scheduler stopped safely'
      : 'Scheduler completed';

  return schedulerState;
}

module.exports = {
  runScheduler,
  getState,
  resetState,
  requestStop
};