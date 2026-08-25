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

/*
 * Some failures are not worth retrying — a missing sender config, for
 * example, will fail identically for every remaining email. Retrying
 * those with long delays just burns through the whole batch producing
 * a wall of duplicate FAILED history rows. Stop immediately instead.
 */
const NON_RETRYABLE_ERROR_PATTERNS = [
  'Gmail sender email or app password is missing',
  'Invalid login',
  'Username and Password not accepted',
  'invalid_grant'
];

function isNonRetryableError(error) {
  const message = String(error && error.message || '');
  return NON_RETRYABLE_ERROR_PATTERNS.some(pattern => message.includes(pattern));
}

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
    schedulerState.status !== 'RUNNING' &&
    schedulerState.status !== 'STOPPING'
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

function saveSentEmailImmediately(email) {
  const currentSentEmails =
    readJson(
      SENT_EMAILS_FILE,
      []
    )
      .map(normalizeEmail)
      .filter(Boolean);

  const normalizedEmail =
    normalizeEmail(email);

  if (!normalizedEmail) {
    throw new Error(
      `Unable to normalize sent email: ${email}`
    );
  }

  const updatedSentEmails = [
    ...new Set([
      ...currentSentEmails,
      normalizedEmail
    ])
  ];

  writeJson(
    SENT_EMAILS_FILE,
    updatedSentEmails
  );

  console.log(
    `Added ${normalizedEmail} to sent_emails.json`
  );
}

async function saveHistorySafely(
  records
) {
  if (!records.length) {
    return;
  }

  try {
    await appendHistory(records);

    console.log(
      `Saved ${records.length} record(s) to send history`
    );
  } catch (error) {
    console.error(
      'Unable to update send history:',
      error.message
    );
  }
}

async function runScheduler() {
  const template =
    readTemplate();

  const preview =
    buildEmailPreview(template);

  const dailyLimit =
    Number(
      template.dailyLimit || 100
    );

  const emailsToSend =
    preview.newEmails.slice(
      0,
      dailyLimit
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

  let continuousFailureCount = 0;
  let totalFailureCount = 0;

  console.log(
    '=================================='
  );

  console.log(
    `Scheduler selected ${emailsToSend.length} email(s)`
  );

  console.log(
    `Daily limit: ${dailyLimit}`
  );

  console.log(
    '=================================='
  );

  if (!emailsToSend.length) {
    schedulerState.status =
      'COMPLETED';

    schedulerState.completedAt =
      new Date().toISOString();

    schedulerState.message =
      'No new emails available to send';

    return schedulerState;
  }

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

    schedulerState.message =
      `Sending email ${index + 1} of ${emailsToSend.length}`;

    try {
      console.log(
        '=================================='
      );

      console.log(
        `Sending email ${index + 1}/${emailsToSend.length} to ${email}`
      );

      const result =
        await sendEmail(
          email,
          template
        );

      const sentAt =
        new Date().toISOString();

      console.log(
        `Email status for ${email}: ${result.status}`
      );

      if (result.status === 'SENT') {
        schedulerState.sent += 1;

        /*
         * Save the email immediately.
         *
         * This prevents duplicate sending if
         * Nodemon restarts or the backend stops
         * before the complete batch finishes.
         */
        try {
          saveSentEmailImmediately(
            email
          );
        } catch (error) {
          console.error(
            `Email was sent to ${email}, but sent_emails.json update failed:`,
            error.message
          );

          await saveHistorySafely([
            {
              email,

              status:
                'SENT_TRACKING_FAILED',

              reason:
                error.message,

              sentAt,

              messageId:
                result.messageId || '',

              emailType:
                'INITIAL'
            }
          ]);
        }

        /*
         * Create the follow-up tracker record
         * immediately after a successful send.
         */
        if (result.messageId) {
          try {
            const followUpRecord =
              createFollowUpRecord({
                email,

                messageId:
                  result.messageId,

                sentAt,

                subject:
                  template.subject
              });

            if (followUpRecord) {
              console.log(
                `Follow-up tracking created for ${email}`
              );
            } else {
              console.log(
                `Follow-up record was not created for ${email}`
              );
            }
          } catch (error) {
            console.error(
              `Email was sent to ${email}, but follow-up tracking failed:`,
              error.message
            );

            await saveHistorySafely([
              {
                email,

                status:
                  'FOLLOWUP_TRACKING_FAILED',

                reason:
                  error.message,

                sentAt,

                messageId:
                  result.messageId,

                emailType:
                  'INITIAL'
              }
            ]);
          }
        } else {
          console.log(
            `Follow-up tracking skipped for ${email} because Message-ID is missing`
          );

          await saveHistorySafely([
            {
              email,

              status:
                'FOLLOWUP_TRACKING_SKIPPED',

              reason:
                'Gmail did not return a Message-ID',

              sentAt,

              messageId: '',

              emailType:
                'INITIAL'
            }
          ]);
        }

        /*
         * Save successful history immediately.
         */
        await saveHistorySafely([
          {
            email,

            status:
              'SENT',

            reason: '',

            sentAt,

            messageId:
              result.messageId || '',

            emailType:
              'INITIAL'
          }
        ]);

        console.log(
          `Completed processing for ${email}`
        );
      } else if (
        result.status === 'DRY_RUN'
      ) {
        schedulerState.skipped += 1;

        await saveHistorySafely([
          {
            email,

            status:
              'DRY_RUN',

            reason:
              result.reason || '',

            sentAt,

            messageId: '',

            emailType:
              'INITIAL'
          }
        ]);

        console.log(
          `Dry run completed for ${email}`
        );
      } else {
        throw new Error(
          result.reason ||
          `Unexpected email status: ${result.status}`
        );
      }

      continuousFailureCount = 0;

      if (
        index <
        emailsToSend.length - 1
      ) {
        const minDelay =
          Number(
            template.minDelaySeconds ||
            180
          );

        const maxDelay =
          Number(
            template.maxDelaySeconds ||
            420
          );

        const safeMinDelay =
          Math.max(
            0,
            Math.min(
              minDelay,
              maxDelay
            )
          );

        const safeMaxDelay =
          Math.max(
            safeMinDelay,
            maxDelay
          );

        const delay =
          getRandomDelay(
            safeMinDelay,
            safeMaxDelay
          );

        schedulerState.message =
          `Waiting ${delay} seconds before the next email`;

        console.log(
          `Waiting ${delay} seconds before email ${index + 2}/${emailsToSend.length}`
        );

        const completedWait =
          await cancellableWait(
            delay
          );

        if (!completedWait) {
          schedulerState.message =
            'Scheduler stopped during the waiting period';

          console.log(
            schedulerState.message
          );

          break;
        }

        console.log(
          'Wait completed. Moving to the next email.'
        );
      }
    } catch (error) {
      schedulerState.failed += 1;

      const failureTime =
        new Date().toISOString();

      console.error(
        `Email sending failed for ${email}:`,
        error.message
      );

      await saveHistorySafely([
        {
          email,

          status:
            'FAILED',

          reason:
            error.message,

          sentAt:
            failureTime,

          messageId: '',

          emailType:
            'INITIAL'
        }
      ]);

      if (isNonRetryableError(error)) {
        schedulerState.status = 'ERROR';

        schedulerState.message =
          `Scheduler stopped: ${error.message} Fix Sender Settings and try again.`;

        console.log(
          schedulerState.message
        );

        break;
      }

      continuousFailureCount += 1;
      totalFailureCount += 1;

      if (
        continuousFailureCount >=
        Number(
          template
            .stopAfterContinuousFailures ||
          3
        )
      ) {
        schedulerState.message =
          'Stopped because continuous failure limit was reached';

        console.log(
          schedulerState.message
        );

        break;
      }

      if (
        totalFailureCount >=
        Number(
          template
            .stopAfterTotalFailures ||
          8
        )
      ) {
        schedulerState.message =
          'Stopped because total failure limit was reached';

        console.log(
          schedulerState.message
        );

        break;
      }

      const failureDelay =
        getRandomDelay(
          600,
          1200
        );

      schedulerState.message =
        `Failure detected: ${error.message}. ` +
        `Waiting ${failureDelay} seconds before continuing`;

      console.log(
        schedulerState.message
      );

      const completedFailureWait =
        await cancellableWait(
          failureDelay
        );

      if (!completedFailureWait) {
        schedulerState.message =
          'Scheduler stopped during the failure waiting period';

        break;
      }
    }
  }

  if (schedulerState.status !== 'ERROR') {
    schedulerState.status =
      schedulerState.stopRequested
        ? 'STOPPED'
        : 'COMPLETED';

    if (schedulerState.stopRequested) {
      schedulerState.message =
        'Scheduler stopped safely';
    } else {
      schedulerState.message =
        `Scheduler completed. Sent: ${schedulerState.sent}, ` +
        `Failed: ${schedulerState.failed}, ` +
        `Skipped: ${schedulerState.skipped}`;
    }
  }

  schedulerState.currentEmail = '';

  schedulerState.completedAt =
    new Date().toISOString();

  console.log(
    '=================================='
  );

  console.log(
    schedulerState.message
  );

  console.log(
    '=================================='
  );

  return schedulerState;
}

module.exports = {
  runScheduler,
  getState,
  resetState,
  requestStop
};