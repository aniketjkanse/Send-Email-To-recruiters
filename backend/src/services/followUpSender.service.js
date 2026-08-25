const {
  getDatabaseTemplate
} = require(
  './databaseTemplate.service'
);

const {
  getFollowUpRecordById,
  markFollowUp1Sent,
  markFollowUp2Sent,
  setFollowUpError
} = require(
  './databaseFollowUp.service'
);

const {
  recordSentEmail
} = require(
  './sentEmail.service'
);

const {
  createHistoryRecord
} = require(
  './databaseHistory.service'
);

const {
  sendEmail
} = require(
  './mail.service'
);

function requireUserId(userId) {
  if (!userId) {
    throw new Error(
      'Authenticated user ID is required.'
    );
  }

  return userId;
}

function requireTrackerId(
  trackerId
) {
  if (!trackerId) {
    throw new Error(
      'Follow-up tracker ID is required.'
    );
  }

  return trackerId;
}

function buildFollowUpSubject(
  subject
) {
  const normalizedSubject =
    String(subject || '')
      .trim();

  if (!normalizedSubject) {
    throw new Error(
      'Follow-up subject is required.'
    );
  }

  if (
    normalizedSubject
      .toLowerCase()
      .startsWith('re:')
  ) {
    return normalizedSubject;
  }

  return `Re: ${normalizedSubject}`;
}

function validateTrackerForSending(
  tracker
) {
  if (!tracker) {
    throw new Error(
      'Follow-up record was not found.'
    );
  }

  if (tracker.removed) {
    throw new Error(
      'Follow-up cannot be sent because the record is removed.'
    );
  }

  if (tracker.stopped) {
    throw new Error(
      'Follow-up cannot be sent because follow-ups are stopped.'
    );
  }

  if (tracker.replyDetected) {
    throw new Error(
      'Follow-up cannot be sent because a reply was already detected.'
    );
  }

  if (!tracker.initialMessageId) {
    throw new Error(
      'Initial Message-ID is missing. Threaded follow-up cannot be sent.'
    );
  }

  if (!tracker.recipientEmail) {
    throw new Error(
      'Recipient email is missing.'
    );
  }
}

async function saveFollowUpHistorySafely(
  userId,
  input
) {
  try {
    return await createHistoryRecord(
      userId,
      input
    );
  } catch (error) {
    console.error(
      'Unable to save PostgreSQL Follow-Up history:',
      error.message
    );

    return null;
  }
}

async function saveFollowUpSentEmailSafely(
  userId,
  input
) {
  try {
    return await recordSentEmail(
      userId,
      input
    );
  } catch (error) {
    console.error(
      'Unable to save PostgreSQL Follow-Up SentEmail record:',
      error.message
    );

    return null;
  }
}

async function saveTrackerErrorSafely(
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
  } catch (trackerError) {
    console.error(
      'Unable to save Follow-Up tracker error:',
      trackerError.message
    );
  }
}

async function sendFollowUp1(
  userId,
  trackerId
) {
  requireUserId(userId);
  requireTrackerId(trackerId);

  const [
    tracker,
    template
  ] = await Promise.all([
    getFollowUpRecordById(
      userId,
      trackerId
    ),

    getDatabaseTemplate(
      userId
    )
  ]);

  validateTrackerForSending(
    tracker
  );

  if (
    tracker.followUp1MessageId
  ) {
    throw new Error(
      'Follow-Up 1 was already sent for this recipient.'
    );
  }

  const body =
    String(
      template.followUp1Body ||
      ''
    ).trim();

  if (!body) {
    throw new Error(
      'Follow-Up 1 body is not configured.'
    );
  }

  const subject =
    buildFollowUpSubject(
      tracker.subject ||
      template.subject
    );

  const sentAt =
    new Date()
      .toISOString();

  try {
    const result =
      await sendEmail(
        userId,
        tracker.recipientEmail,
        template,
        {
          isFollowUp:
            true,

          subject,

          body,

          parentMessageId:
            tracker.initialMessageId,

          references: [
            tracker.initialMessageId
          ]
        }
      );

    if (
      result.status ===
      'DRY_RUN'
    ) {
      await saveFollowUpHistorySafely(
        userId,
        {
          recipientEmail:
            tracker.recipientEmail,

          senderEmail:
            '',

          subject,

          messageId:
            '',

          emailType:
            'FOLLOW_UP_1',

          status:
            'DRY_RUN',

          reason:
            result.reason ||
            'Dry run enabled.',

          sentAt
        }
      );

      return {
        status:
          'DRY_RUN',

        message:
          'Follow-Up 1 Dry Run completed. No email was sent.',

        tracker,

        result
      };
    }

    if (
      result.status !==
      'SENT'
    ) {
      throw new Error(
        result.reason ||
        `Unexpected Follow-Up 1 status: ${result.status}`
      );
    }

    if (!result.messageId) {
      throw new Error(
        'Follow-Up 1 was sent but Gmail Message-ID was not returned.'
      );
    }

    const updatedTracker =
      await markFollowUp1Sent(
        userId,
        trackerId,
        {
          messageId:
            result.messageId,

          sentAt
        }
      );

    await saveFollowUpSentEmailSafely(
      userId,
      {
        recipientEmail:
          tracker.recipientEmail,

        senderEmail:
          result.senderEmail ||
          tracker.senderEmail ||
          '',

        subject,

        messageId:
          result.messageId,

        emailType:
          'FOLLOW_UP_1',

        status:
          'SENT',

        sentAt
      }
    );

    await saveFollowUpHistorySafely(
      userId,
      {
        recipientEmail:
          tracker.recipientEmail,

        senderEmail:
          result.senderEmail ||
          tracker.senderEmail ||
          '',

        subject,

        messageId:
          result.messageId,

        emailType:
          'FOLLOW_UP_1',

        status:
          'SENT',

        reason:
          '',

        sentAt
      }
    );

    return {
      status:
        'SENT',

      message:
        'Follow-Up 1 sent successfully.',

      tracker:
        updatedTracker,

      result
    };
  } catch (error) {
    await saveTrackerErrorSafely(
      userId,
      trackerId,
      error.message
    );

    await saveFollowUpHistorySafely(
      userId,
      {
        recipientEmail:
          tracker.recipientEmail,

        senderEmail:
          tracker.senderEmail ||
          '',

        subject,

        messageId:
          '',

        emailType:
          'FOLLOW_UP_1',

        status:
          'FAILED',

        reason:
          error.message,

        sentAt
      }
    );

    throw error;
  }
}

async function sendFollowUp2(
  userId,
  trackerId
) {
  requireUserId(userId);
  requireTrackerId(trackerId);

  const [
    tracker,
    template
  ] = await Promise.all([
    getFollowUpRecordById(
      userId,
      trackerId
    ),

    getDatabaseTemplate(
      userId
    )
  ]);

  validateTrackerForSending(
    tracker
  );

  if (
    !tracker.followUp1MessageId
  ) {
    throw new Error(
      'Follow-Up 2 cannot be sent before Follow-Up 1.'
    );
  }

  if (
    tracker.followUp2MessageId
  ) {
    throw new Error(
      'Follow-Up 2 was already sent for this recipient.'
    );
  }

  const body =
    String(
      template.followUp2Body ||
      ''
    ).trim();

  if (!body) {
    throw new Error(
      'Follow-Up 2 body is not configured.'
    );
  }

  const subject =
    buildFollowUpSubject(
      tracker.subject ||
      template.subject
    );

  const sentAt =
    new Date()
      .toISOString();

  try {
    const result =
      await sendEmail(
        userId,
        tracker.recipientEmail,
        template,
        {
          isFollowUp:
            true,

          subject,

          body,

          /*
           * Reply to the latest sent
           * message in the thread.
           */
          parentMessageId:
            tracker
              .followUp1MessageId,

          /*
           * Keep the complete thread
           * reference chain.
           */
          references: [
            tracker.initialMessageId,
            tracker
              .followUp1MessageId
          ]
        }
      );

    if (
      result.status ===
      'DRY_RUN'
    ) {
      await saveFollowUpHistorySafely(
        userId,
        {
          recipientEmail:
            tracker.recipientEmail,

          senderEmail:
            '',

          subject,

          messageId:
            '',

          emailType:
            'FOLLOW_UP_2',

          status:
            'DRY_RUN',

          reason:
            result.reason ||
            'Dry run enabled.',

          sentAt
        }
      );

      return {
        status:
          'DRY_RUN',

        message:
          'Follow-Up 2 Dry Run completed. No email was sent.',

        tracker,

        result
      };
    }

    if (
      result.status !==
      'SENT'
    ) {
      throw new Error(
        result.reason ||
        `Unexpected Follow-Up 2 status: ${result.status}`
      );
    }

    if (!result.messageId) {
      throw new Error(
        'Follow-Up 2 was sent but Gmail Message-ID was not returned.'
      );
    }

    const updatedTracker =
      await markFollowUp2Sent(
        userId,
        trackerId,
        {
          messageId:
            result.messageId,

          sentAt
        }
      );

    await saveFollowUpSentEmailSafely(
      userId,
      {
        recipientEmail:
          tracker.recipientEmail,

        senderEmail:
          result.senderEmail ||
          tracker.senderEmail ||
          '',

        subject,

        messageId:
          result.messageId,

        emailType:
          'FOLLOW_UP_2',

        status:
          'SENT',

        sentAt
      }
    );

    await saveFollowUpHistorySafely(
      userId,
      {
        recipientEmail:
          tracker.recipientEmail,

        senderEmail:
          result.senderEmail ||
          tracker.senderEmail ||
          '',

        subject,

        messageId:
          result.messageId,

        emailType:
          'FOLLOW_UP_2',

        status:
          'SENT',

        reason:
          '',

        sentAt
      }
    );

    return {
      status:
        'SENT',

      message:
        'Follow-Up 2 sent successfully.',

      tracker:
        updatedTracker,

      result
    };
  } catch (error) {
    await saveTrackerErrorSafely(
      userId,
      trackerId,
      error.message
    );

    await saveFollowUpHistorySafely(
      userId,
      {
        recipientEmail:
          tracker.recipientEmail,

        senderEmail:
          tracker.senderEmail ||
          '',

        subject,

        messageId:
          '',

        emailType:
          'FOLLOW_UP_2',

        status:
          'FAILED',

        reason:
          error.message,

        sentAt
      }
    );

    throw error;
  }
}

module.exports = {
  buildFollowUpSubject,
  validateTrackerForSending,
  sendFollowUp1,
  sendFollowUp2
};