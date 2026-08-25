const {
  detectRepliesForUser,
  detectReplyForTracker
} = require(
  '../services/replyDetection.service'
);

const {
  testGmailImapConnection
} = require(
  '../services/gmailReply.service'
);

function getAuthenticatedUserId(
  req
) {
  const userId =
    req.user?.id;

  if (!userId) {
    throw new Error(
      'Authenticated user ID is required.'
    );
  }

  return userId;
}

function normalizeLimit(
  value,
  fallbackValue = 500
) {
  const parsedValue =
    Number(value);

  if (
    !Number.isFinite(
      parsedValue
    ) ||
    parsedValue < 1
  ) {
    return fallbackValue;
  }

  return Math.min(
    Math.floor(
      parsedValue
    ),
    500
  );
}

/*
 * Test Gmail IMAP connectivity using the
 * logged-in user's SenderAccount.
 *
 * POST /api/followups/test-imap
 */
async function testImapConnection(
  req,
  res
) {
  try {
    const userId =
      getAuthenticatedUserId(
        req
      );

    const result =
      await testGmailImapConnection(
        userId
      );

    return res.json({
      source:
        'GMAIL_IMAP',

      ...result
    });
  } catch (error) {
    console.error(
      'Gmail IMAP connection test failed:',
      error.message
    );

    return res
      .status(400)
      .json({
        success:
          false,

        source:
          'GMAIL_IMAP',

        message:
          error.message ||
          'Unable to connect to Gmail IMAP.'
      });
  }
}

/*
 * Check all eligible FollowUpTracker records
 * belonging to the logged-in user.
 *
 * POST /api/followups/refresh-replies
 *
 * Optional JSON body:
 *
 * {
 *   "limit": 500
 * }
 */
async function refreshAllReplies(
  req,
  res
) {
  try {
    const userId =
      getAuthenticatedUserId(
        req
      );

    const limit =
      normalizeLimit(
        req.body?.limit,
        500
      );

    const result =
      await detectRepliesForUser(
        userId,
        {
          limit
        }
      );

    return res.json({
      message:
        result.message,

      source:
        result.source ||
        'GMAIL_AND_POSTGRESQL',

      senderEmail:
        result.senderEmail ||
        '',

      mailbox:
        result.mailbox ||
        'INBOX',

      summary:
        result.summary,

      detectedReplies:
        result.detectedReplies ||
        [],

      failedChecks:
        result.failedChecks ||
        [],

      skippedRecords:
        result.skippedRecords ||
        []
    });
  } catch (error) {
    console.error(
      'Gmail reply refresh failed:',
      error.message
    );

    return res
      .status(400)
      .json({
        source:
          'GMAIL_AND_POSTGRESQL',

        message:
          error.message ||
          'Unable to refresh Gmail replies.',

        summary: {
          checked:
            0,

          repliesDetected:
            0,

          alreadyReplied:
            0,

          notReplied:
            0,

          skipped:
            0,

          failed:
            1
        },

        detectedReplies:
          [],

        failedChecks:
          [
            {
              message:
                error.message ||
                'Gmail reply refresh failed.'
            }
          ],

        skippedRecords:
          []
      });
  }
}

/*
 * Check one PostgreSQL FollowUpTracker
 * record for a Gmail reply.
 *
 * POST /api/followups/:id/check-reply
 */
async function refreshSingleReply(
  req,
  res
) {
  try {
    const userId =
      getAuthenticatedUserId(
        req
      );

    const trackerId =
      String(
        req.params.id ||
        ''
      ).trim();

    if (!trackerId) {
      return res
        .status(400)
        .json({
          message:
            'Follow-Up tracker ID is required.'
        });
    }

    const result =
      await detectReplyForTracker(
        userId,
        trackerId
      );

    let message =
      'Reply check completed. No reply was detected.';

    if (
      result.status ===
      'REPLY_DETECTED'
    ) {
      message =
        'Reply detected and Follow-Up tracker updated successfully.';
    }

    if (
      result.status ===
      'ALREADY_REPLIED'
    ) {
      message =
        'This Follow-Up record was already marked as replied.';
    }

    if (
      result.status ===
      'SKIPPED'
    ) {
      message =
        'This Follow-Up record was not eligible for reply checking.';
    }

    return res.json({
      message,

      source:
        result.source ||
        'GMAIL_AND_POSTGRESQL',

      status:
        result.status,

      replyDetected:
        result.replyDetected ===
        true,

      followUp:
        result.tracker ||
        null,

      reply:
        result.reply ||
        null
    });
  } catch (error) {
    console.error(
      'Single Gmail reply check failed:',
      error.message
    );

    const notFound =
      error.message ===
      'Follow-Up record was not found.';

    return res
      .status(
        notFound
          ? 404
          : 400
      )
      .json({
        source:
          'GMAIL_AND_POSTGRESQL',

        message:
          error.message ||
          'Unable to check Gmail reply.'
      });
  }
}

module.exports = {
  testImapConnection,
  refreshAllReplies,
  refreshSingleReply
};