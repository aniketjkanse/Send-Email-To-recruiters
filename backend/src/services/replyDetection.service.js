const {
  getFollowUpRecords,
  markReplyDetected,
  markReplyCheckCompleted,
  setFollowUpError
} = require(
  './databaseFollowUp.service'
);

const {
  withGmailInbox,
  findReplyForTracker
} = require(
  './gmailReply.service'
);

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

function createEmptySummary() {
  return {
    checked: 0,
    repliesDetected: 0,
    alreadyReplied: 0,
    notReplied: 0,
    skipped: 0,
    failed: 0
  };
}

function canCheckTracker(
  tracker
) {
  if (
    !tracker ||
    typeof tracker !==
      'object'
  ) {
    return false;
  }

  if (!tracker.id) {
    return false;
  }

  if (
    !tracker.recipientEmail &&
    !tracker.email
  ) {
    return false;
  }

  if (
    !tracker.initialMessageId
  ) {
    return false;
  }

  if (
    tracker.removed === true
  ) {
    return false;
  }

  return true;
}

function mapDetectedReply(
  tracker,
  reply
) {
  return {
    trackerId:
      tracker.id,

    recipientEmail:
      tracker.recipientEmail ||
      tracker.email ||
      '',

    initialMessageId:
      tracker.initialMessageId ||
      '',

    replyMessageId:
      reply.messageId ||
      '',

    replySubject:
      reply.subject ||
      '',

    replyDate:
      reply.date ||
      null,

    from:
      reply.from ||
      '',

    uid:
      reply.uid ||
      null
  };
}

function mapFailedCheck(
  tracker,
  error
) {
  return {
    trackerId:
      tracker?.id ||
      '',

    recipientEmail:
      tracker
        ?.recipientEmail ||
      tracker?.email ||
      '',

    message:
      error?.message ||
      String(
        error ||
        'Unknown reply-check error.'
      )
  };
}

async function saveReplyCheckCompletedSafely(
  userId,
  trackerId
) {
  try {
    await markReplyCheckCompleted(
      userId,
      trackerId
    );

    return true;
  } catch (error) {
    console.error(
      `Unable to update reply-check timestamp for tracker ${trackerId}:`,
      error.message
    );

    return false;
  }
}

async function saveReplyErrorSafely(
  userId,
  trackerId,
  errorMessage
) {
  try {
    await setFollowUpError(
      userId,
      trackerId,
      errorMessage
    );

    return true;
  } catch (error) {
    console.error(
      `Unable to save reply-check error for tracker ${trackerId}:`,
      error.message
    );

    return false;
  }
}

async function processTrackerReply(
  userId,
  client,
  tracker
) {
  if (
    tracker.replyDetected ===
    true
  ) {
    return {
      status:
        'ALREADY_REPLIED',

      tracker,

      reply:
        null
    };
  }

  if (
    !canCheckTracker(
      tracker
    )
  ) {
    return {
      status:
        'SKIPPED',

      tracker,

      reply:
        null,

      reason:
        'Tracker is missing required reply-detection information or is removed.'
    };
  }

  try {
    const reply =
      await findReplyForTracker(
        client,
        tracker
      );

    if (!reply) {
      await saveReplyCheckCompletedSafely(
        userId,
        tracker.id
      );

      return {
        status:
          'NOT_REPLIED',

        tracker,

        reply:
          null
      };
    }

    const updatedTracker =
      await markReplyDetected(
        userId,
        tracker.id,
        {
          replyMessageId:
            reply.messageId ||
            '',

          replySubject:
            reply.subject ||
            '',

          replyDate:
            reply.date ||
            new Date()
              .toISOString()
        }
      );

    return {
      status:
        'REPLY_DETECTED',

      tracker:
        updatedTracker,

      reply
    };
  } catch (error) {
    await saveReplyErrorSafely(
      userId,
      tracker.id,
      error.message
    );

    return {
      status:
        'FAILED',

      tracker,

      reply:
        null,

      error
    };
  }
}

async function detectRepliesForUser(
  userId,
  options = {}
) {
  requireUserId(
    userId
  );

  const summary =
    createEmptySummary();

  const detectedReplies = [];

  const failedChecks = [];

  const skippedRecords = [];

  /*
   * Include stopped records because a record
   * may have been stopped manually but could
   * still receive a reply.
   *
   * Removed records are not checked.
   */
  const trackers =
    await getFollowUpRecords(
      userId,
      {
        includeRemoved:
          false,

        includeStopped:
          true,

        limit:
          options.limit ||
          500
      }
    );

  if (
    !Array.isArray(
      trackers
    ) ||
    trackers.length === 0
  ) {
    return {
      source:
        'GMAIL_AND_POSTGRESQL',

      senderEmail:
        '',

      summary,

      detectedReplies,

      failedChecks,

      skippedRecords,

      message:
        'No Follow-Up records are available for reply checking.'
    };
  }

  const result =
    await withGmailInbox(
      userId,
      async (
        client,
        context
      ) => {
        for (
          const tracker of trackers
        ) {
          const trackerResult =
            await processTrackerReply(
              userId,
              client,
              tracker
            );

          switch (
            trackerResult.status
          ) {
            case 'REPLY_DETECTED':
              summary.checked +=
                1;

              summary.repliesDetected +=
                1;

              detectedReplies.push(
                mapDetectedReply(
                  tracker,
                  trackerResult.reply
                )
              );

              console.log(
                `Reply detected for ${tracker.recipientEmail}`
              );

              break;

            case 'NOT_REPLIED':
              summary.checked +=
                1;

              summary.notReplied +=
                1;

              break;

            case 'ALREADY_REPLIED':
              summary.alreadyReplied +=
                1;

              break;

            case 'SKIPPED':
              summary.skipped +=
                1;

              skippedRecords.push({
                trackerId:
                  tracker.id,

                recipientEmail:
                  tracker.recipientEmail ||
                  tracker.email ||
                  '',

                reason:
                  trackerResult.reason ||
                  'Record was not eligible for reply checking.'
              });

              break;

            case 'FAILED':
              summary.checked +=
                1;

              summary.failed +=
                1;

              failedChecks.push(
                mapFailedCheck(
                  tracker,
                  trackerResult.error
                )
              );

              break;

            default:
              summary.skipped +=
                1;

              skippedRecords.push({
                trackerId:
                  tracker.id,

                recipientEmail:
                  tracker.recipientEmail ||
                  tracker.email ||
                  '',

                reason:
                  `Unknown reply detection status: ${trackerResult.status}`
              });

              break;
          }
        }

        return {
          senderEmail:
            context.senderEmail,

          mailbox:
            client
              .mailbox
              ?.path ||
            'INBOX'
        };
      }
    );

  return {
    source:
      'GMAIL_AND_POSTGRESQL',

    senderEmail:
      result.senderEmail ||
      '',

    mailbox:
      result.mailbox ||
      'INBOX',

    summary,

    detectedReplies,

    failedChecks,

    skippedRecords,

    message:
      summary.repliesDetected > 0
        ? (
          `${summary.repliesDetected} reply/replies detected and updated successfully.`
        )
        : (
          'Reply refresh completed. No new replies were detected.'
        )
  };
}

async function detectReplyForTracker(
  userId,
  trackerId
) {
  requireUserId(
    userId
  );

  if (!trackerId) {
    throw new Error(
      'Follow-Up tracker ID is required.'
    );
  }

  const trackers =
    await getFollowUpRecords(
      userId,
      {
        includeRemoved:
          true,

        includeStopped:
          true,

        limit:
          500
      }
    );

  const tracker =
    trackers.find(
      item => {
        return (
          item.id ===
          trackerId
        );
      }
    );

  if (!tracker) {
    throw new Error(
      'Follow-Up record was not found.'
    );
  }

  if (
    tracker.removed === true
  ) {
    throw new Error(
      'Removed Follow-Up records cannot be checked for replies.'
    );
  }

  return withGmailInbox(
    userId,
    async client => {
      const result =
        await processTrackerReply(
          userId,
          client,
          tracker
        );

      if (
        result.status ===
        'FAILED'
      ) {
        throw result.error;
      }

      return {
        source:
          'GMAIL_AND_POSTGRESQL',

        status:
          result.status,

        replyDetected:
          result.status ===
          'REPLY_DETECTED' ||
          result.status ===
          'ALREADY_REPLIED',

        tracker:
          result.tracker,

        reply:
          result.reply
      };
    }
  );
}

module.exports = {
  createEmptySummary,
  canCheckTracker,
  mapDetectedReply,
  mapFailedCheck,
  processTrackerReply,
  detectRepliesForUser,
  detectReplyForTracker
};