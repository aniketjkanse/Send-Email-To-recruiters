const {
  prisma
} = require('../config/prisma');

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

function normalizeEmail(
  value
) {
  return String(
    value || ''
  )
    .trim()
    .toLowerCase();
}

function normalizeStatus(
  value
) {
  return String(
    value ||
    'INITIAL_SENT'
  )
    .trim()
    .toUpperCase();
}

function normalizeOptionalText(
  value
) {
  const normalizedValue =
    String(
      value || ''
    ).trim();

  return (
    normalizedValue ||
    null
  );
}

function parseRequiredDate(
  value,
  fieldName
) {
  const parsedDate =
    value
      ? new Date(value)
      : new Date();

  if (
    Number.isNaN(
      parsedDate.getTime()
    )
  ) {
    throw new Error(
      `${fieldName} is invalid.`
    );
  }

  return parsedDate;
}

function parseOptionalDate(
  value,
  fieldName
) {
  if (!value) {
    return null;
  }

  const parsedDate =
    new Date(value);

  if (
    Number.isNaN(
      parsedDate.getTime()
    )
  ) {
    throw new Error(
      `${fieldName} is invalid.`
    );
  }

  return parsedDate;
}

function normalizeLimit(
  value,
  fallbackValue = 100
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

function mapFollowUpRecord(
  record
) {
  if (!record) {
    return null;
  }

  return {
    id:
      record.id,

    userId:
      record.userId,

    email:
      record.recipientEmail,

    recipientEmail:
      record.recipientEmail,

    senderEmail:
      record.senderEmail ||
      '',

    subject:
      record.subject,

    initialMessageId:
      record.initialMessageId,

    messageId:
      record.initialMessageId,

    initialSentAt:
      record.initialSentAt,

    sentAt:
      record.initialSentAt,

    followUp1MessageId:
      record.followUp1MessageId ||
      '',

    followUp1SentAt:
      record.followUp1SentAt,

    followUp2MessageId:
      record.followUp2MessageId ||
      '',

    followUp2SentAt:
      record.followUp2SentAt,

    replyDetected:
      record.replyDetected,

    replyMessageId:
      record.replyMessageId ||
      '',

    replySubject:
      record.replySubject ||
      '',

    replyDate:
      record.replyDate,

    status:
      record.status,

    removed:
      record.removed,

    removedAt:
      record.removedAt,

    removedReason:
      record.removedReason ||
      '',

    stopped:
      record.stopped,

    stoppedAt:
      record.stoppedAt,

    stoppedReason:
      record.stoppedReason ||
      '',

    lastError:
      record.lastError ||
      '',

    lastCheckedAt:
      record.lastCheckedAt,

    createdAt:
      record.createdAt,

    updatedAt:
      record.updatedAt
  };
}

/*
 * Create or update a follow-up tracker
 * after an initial email is sent.
 *
 * Unique key:
 *
 * userId + recipientEmail
 */
async function createFollowUpRecord(
  userId,
  input = {}
) {
  requireUserId(
    userId
  );

  const recipientEmail =
    normalizeEmail(
      input.recipientEmail ||
      input.email
    );

  if (!recipientEmail) {
    throw new Error(
      'Recipient email is required.'
    );
  }

  const subject =
    String(
      input.subject || ''
    ).trim();

  if (!subject) {
    throw new Error(
      'Email subject is required.'
    );
  }

  const initialMessageId =
    normalizeOptionalText(
      input.initialMessageId ||
      input.messageId
    );

  if (!initialMessageId) {
    throw new Error(
      'Initial Message-ID is required for follow-up tracking.'
    );
  }

  const initialSentAt =
    parseRequiredDate(
      input.initialSentAt ||
      input.sentAt,
      'Initial sent date'
    );

  const senderEmail =
    normalizeEmail(
      input.senderEmail
    ) || null;

  const record =
    await prisma
      .followUpTracker
      .upsert({
        where: {
          userId_recipientEmail: {
            userId,

            recipientEmail
          }
        },

        update: {
          senderEmail,

          subject,

          initialMessageId,

          initialSentAt,

          followUp1MessageId:
            null,

          followUp1SentAt:
            null,

          followUp2MessageId:
            null,

          followUp2SentAt:
            null,

          replyDetected:
            false,

          replyMessageId:
            null,

          replySubject:
            null,

          replyDate:
            null,

          status:
            'INITIAL_SENT',

          removed:
            false,

          removedAt:
            null,

          removedReason:
            null,

          stopped:
            false,

          stoppedAt:
            null,

          stoppedReason:
            null,

          lastError:
            null,

          lastCheckedAt:
            null
        },

        create: {
          userId,

          recipientEmail,

          senderEmail,

          subject,

          initialMessageId,

          initialSentAt,

          status:
            'INITIAL_SENT'
        }
      });

  return mapFollowUpRecord(
    record
  );
}

/*
 * Get all follow-up records belonging
 * to the authenticated user.
 */
async function getFollowUpRecords(
  userId,
  options = {}
) {
  requireUserId(
    userId
  );

  const where = {
    userId
  };

  if (
    options.includeRemoved !==
    true
  ) {
    where.removed =
      false;
  }

  if (
    options.includeStopped !==
    true
  ) {
    where.stopped =
      false;
  }

  if (
    options.status
  ) {
    where.status =
      normalizeStatus(
        options.status
      );
  }

  if (
    options.replyDetected !==
    undefined
  ) {
    where.replyDetected =
      options.replyDetected ===
        true ||
      options.replyDetected ===
        'true';
  }

  const records =
    await prisma
      .followUpTracker
      .findMany({
        where,

        orderBy: {
          initialSentAt:
            'desc'
        },

        take:
          normalizeLimit(
            options.limit
          )
      });

  return records.map(
    mapFollowUpRecord
  );
}

/*
 * Get one follow-up record safely.
 */
async function getFollowUpRecordById(
  userId,
  trackerId
) {
  requireUserId(
    userId
  );

  if (!trackerId) {
    throw new Error(
      'Follow-up tracker ID is required.'
    );
  }

  const record =
    await prisma
      .followUpTracker
      .findFirst({
        where: {
          id:
            trackerId,

          userId
        }
      });

  return mapFollowUpRecord(
    record
  );
}

/*
 * Get a follow-up record using
 * recipient email.
 */
async function getFollowUpRecordByEmail(
  userId,
  recipientEmail
) {
  requireUserId(
    userId
  );

  const normalizedEmail =
    normalizeEmail(
      recipientEmail
    );

  if (!normalizedEmail) {
    throw new Error(
      'Recipient email is required.'
    );
  }

  const record =
    await prisma
      .followUpTracker
      .findUnique({
        where: {
          userId_recipientEmail: {
            userId,

            recipientEmail:
              normalizedEmail
          }
        }
      });

  return mapFollowUpRecord(
    record
  );
}

/*
 * Record successful Follow-Up 1.
 */
async function markFollowUp1Sent(
  userId,
  trackerId,
  input = {}
) {
  requireUserId(
    userId
  );

  const existingRecord =
    await getFollowUpRecordById(
      userId,
      trackerId
    );

  if (!existingRecord) {
    throw new Error(
      'Follow-up record was not found.'
    );
  }

  if (
    existingRecord
      .replyDetected
  ) {
    throw new Error(
      'Follow-Up 1 cannot be sent because a reply was already detected.'
    );
  }

  if (
    existingRecord.removed
  ) {
    throw new Error(
      'Follow-Up 1 cannot be sent because the record is removed.'
    );
  }

  if (
    existingRecord.stopped
  ) {
    throw new Error(
      'Follow-Up 1 cannot be sent because follow-ups are stopped.'
    );
  }

  const messageId =
    normalizeOptionalText(
      input.messageId ||
      input.followUp1MessageId
    );

  if (!messageId) {
    throw new Error(
      'Follow-Up 1 Message-ID is required.'
    );
  }

  const sentAt =
    parseRequiredDate(
      input.sentAt ||
      input.followUp1SentAt,
      'Follow-Up 1 sent date'
    );

  const record =
    await prisma
      .followUpTracker
      .update({
        where: {
          id:
            trackerId
        },

        data: {
          followUp1MessageId:
            messageId,

          followUp1SentAt:
            sentAt,

          status:
            'FOLLOW_UP_1_SENT',

          lastError:
            null
        }
      });

  return mapFollowUpRecord(
    record
  );
}

/*
 * Record successful Follow-Up 2.
 */
async function markFollowUp2Sent(
  userId,
  trackerId,
  input = {}
) {
  requireUserId(
    userId
  );

  const existingRecord =
    await getFollowUpRecordById(
      userId,
      trackerId
    );

  if (!existingRecord) {
    throw new Error(
      'Follow-up record was not found.'
    );
  }

  if (
    existingRecord
      .replyDetected
  ) {
    throw new Error(
      'Follow-Up 2 cannot be sent because a reply was already detected.'
    );
  }

  if (
    existingRecord.removed
  ) {
    throw new Error(
      'Follow-Up 2 cannot be sent because the record is removed.'
    );
  }

  if (
    existingRecord.stopped
  ) {
    throw new Error(
      'Follow-Up 2 cannot be sent because follow-ups are stopped.'
    );
  }

  if (
    !existingRecord
      .followUp1MessageId
  ) {
    throw new Error(
      'Follow-Up 2 cannot be sent before Follow-Up 1.'
    );
  }

  const messageId =
    normalizeOptionalText(
      input.messageId ||
      input.followUp2MessageId
    );

  if (!messageId) {
    throw new Error(
      'Follow-Up 2 Message-ID is required.'
    );
  }

  const sentAt =
    parseRequiredDate(
      input.sentAt ||
      input.followUp2SentAt,
      'Follow-Up 2 sent date'
    );

  const record =
    await prisma
      .followUpTracker
      .update({
        where: {
          id:
            trackerId
        },

        data: {
          followUp2MessageId:
            messageId,

          followUp2SentAt:
            sentAt,

          status:
            'FOLLOW_UP_2_SENT',

          lastError:
            null
        }
      });

  return mapFollowUpRecord(
    record
  );
}

/*
 * Mark a reply as detected.
 */
async function markReplyDetected(
  userId,
  trackerId,
  input = {}
) {
  requireUserId(
    userId
  );

  const existingRecord =
    await getFollowUpRecordById(
      userId,
      trackerId
    );

  if (!existingRecord) {
    throw new Error(
      'Follow-up record was not found.'
    );
  }

  const replyDate =
    parseOptionalDate(
      input.replyDate ||
      new Date(),
      'Reply date'
    );

  const record =
    await prisma
      .followUpTracker
      .update({
        where: {
          id:
            trackerId
        },

        data: {
          replyDetected:
            true,

          replyMessageId:
            normalizeOptionalText(
              input.replyMessageId ||
              input.messageId
            ),

          replySubject:
            normalizeOptionalText(
              input.replySubject ||
              input.subject
            ),

          replyDate,

          status:
            'REPLIED',

          stopped:
            true,

          stoppedAt:
            replyDate,

          stoppedReason:
            'Reply detected',

          lastError:
            null,

          lastCheckedAt:
            new Date()
        }
      });

  return mapFollowUpRecord(
    record
  );
}

/*
 * Update the reply-check timestamp.
 */
async function markReplyCheckCompleted(
  userId,
  trackerId
) {
  requireUserId(
    userId
  );

  const existingRecord =
    await getFollowUpRecordById(
      userId,
      trackerId
    );

  if (!existingRecord) {
    throw new Error(
      'Follow-up record was not found.'
    );
  }

  const record =
    await prisma
      .followUpTracker
      .update({
        where: {
          id:
            trackerId
        },

        data: {
          lastCheckedAt:
            new Date(),

          lastError:
            null
        }
      });

  return mapFollowUpRecord(
    record
  );
}

/*
 * Save an operation error.
 */
async function setFollowUpError(
  userId,
  trackerId,
  errorMessage
) {
  requireUserId(
    userId
  );

  const existingRecord =
    await getFollowUpRecordById(
      userId,
      trackerId
    );

  if (!existingRecord) {
    throw new Error(
      'Follow-up record was not found.'
    );
  }

  const record =
    await prisma
      .followUpTracker
      .update({
        where: {
          id:
            trackerId
        },

        data: {
          lastError:
            String(
              errorMessage ||
              'Unknown follow-up error'
            ),

          lastCheckedAt:
            new Date()
        }
      });

  return mapFollowUpRecord(
    record
  );
}

/*
 * Soft-remove a Follow-Up record.
 */
async function removeFollowUpRecord(
  userId,
  trackerId,
  reason = ''
) {
  requireUserId(
    userId
  );

  const existingRecord =
    await getFollowUpRecordById(
      userId,
      trackerId
    );

  if (!existingRecord) {
    throw new Error(
      'Follow-up record was not found.'
    );
  }

  const record =
    await prisma
      .followUpTracker
      .update({
        where: {
          id:
            trackerId
        },

        data: {
          removed:
            true,

          removedAt:
            new Date(),

          removedReason:
            normalizeOptionalText(
              reason
            ),

          status:
            'REMOVED'
        }
      });

  return mapFollowUpRecord(
    record
  );
}

/*
 * Restore a removed Follow-Up record.
 */
async function restoreFollowUpRecord(
  userId,
  trackerId
) {
  requireUserId(
    userId
  );

  const existingRecord =
    await getFollowUpRecordById(
      userId,
      trackerId
    );

  if (!existingRecord) {
    throw new Error(
      'Follow-up record was not found.'
    );
  }

  let restoredStatus =
    'INITIAL_SENT';

  if (
    existingRecord
      .followUp2MessageId
  ) {
    restoredStatus =
      'FOLLOW_UP_2_SENT';
  } else if (
    existingRecord
      .followUp1MessageId
  ) {
    restoredStatus =
      'FOLLOW_UP_1_SENT';
  }

  if (
    existingRecord
      .replyDetected
  ) {
    restoredStatus =
      'REPLIED';
  }

  const record =
    await prisma
      .followUpTracker
      .update({
        where: {
          id:
            trackerId
        },

        data: {
          removed:
            false,

          removedAt:
            null,

          removedReason:
            null,

          status:
            restoredStatus
        }
      });

  return mapFollowUpRecord(
    record
  );
}

/*
 * Stop all future follow-ups for one record.
 */
async function stopFollowUps(
  userId,
  trackerId,
  reason = ''
) {
  requireUserId(
    userId
  );

  const existingRecord =
    await getFollowUpRecordById(
      userId,
      trackerId
    );

  if (!existingRecord) {
    throw new Error(
      'Follow-up record was not found.'
    );
  }

  const record =
    await prisma
      .followUpTracker
      .update({
        where: {
          id:
            trackerId
        },

        data: {
          stopped:
            true,

          stoppedAt:
            new Date(),

          stoppedReason:
            normalizeOptionalText(
              reason ||
              'Stopped manually'
            ),

          status:
            'STOPPED'
        }
      });

  return mapFollowUpRecord(
    record
  );
}

/*
 * Resume follow-ups for one record.
 */
async function resumeFollowUps(
  userId,
  trackerId
) {
  requireUserId(
    userId
  );

  const existingRecord =
    await getFollowUpRecordById(
      userId,
      trackerId
    );

  if (!existingRecord) {
    throw new Error(
      'Follow-up record was not found.'
    );
  }

  if (
    existingRecord
      .replyDetected
  ) {
    throw new Error(
      'Follow-ups cannot resume because a reply was detected.'
    );
  }

  let resumedStatus =
    'INITIAL_SENT';

  if (
    existingRecord
      .followUp2MessageId
  ) {
    resumedStatus =
      'FOLLOW_UP_2_SENT';
  } else if (
    existingRecord
      .followUp1MessageId
  ) {
    resumedStatus =
      'FOLLOW_UP_1_SENT';
  }

  const record =
    await prisma
      .followUpTracker
      .update({
        where: {
          id:
            trackerId
        },

        data: {
          stopped:
            false,

          stoppedAt:
            null,

          stoppedReason:
            null,

          status:
            resumedStatus
        }
      });

  return mapFollowUpRecord(
    record
  );
}

/*
 * Permanently delete a follow-up record.
 */
async function deleteFollowUpRecord(
  userId,
  trackerId
) {
  requireUserId(
    userId
  );

  if (!trackerId) {
    throw new Error(
      'Follow-up tracker ID is required.'
    );
  }

  const result =
    await prisma
      .followUpTracker
      .deleteMany({
        where: {
          id:
            trackerId,

          userId
        }
      });

  return {
    deleted:
      result.count > 0,

    deletedCount:
      result.count
  };
}

/*
 * Get per-user Follow-Up summary.
 */
async function getFollowUpSummary(
  userId
) {
  requireUserId(
    userId
  );

  const [
    total,
    initialSent,
    followUp1Sent,
    followUp2Sent,
    replied,
    removed,
    stopped
  ] = await Promise.all([
    prisma
      .followUpTracker
      .count({
        where: {
          userId
        }
      }),

    prisma
      .followUpTracker
      .count({
        where: {
          userId,

          status:
            'INITIAL_SENT'
        }
      }),

    prisma
      .followUpTracker
      .count({
        where: {
          userId,

          status:
            'FOLLOW_UP_1_SENT'
        }
      }),

    prisma
      .followUpTracker
      .count({
        where: {
          userId,

          status:
            'FOLLOW_UP_2_SENT'
        }
      }),

    prisma
      .followUpTracker
      .count({
        where: {
          userId,

          replyDetected:
            true
        }
      }),

    prisma
      .followUpTracker
      .count({
        where: {
          userId,

          removed:
            true
        }
      }),

    prisma
      .followUpTracker
      .count({
        where: {
          userId,

          stopped:
            true
        }
      })
  ]);

  return {
    total,
    initialSent,
    followUp1Sent,
    followUp2Sent,
    replied,
    removed,
    stopped
  };
}

module.exports = {
  normalizeEmail,
  normalizeStatus,
  normalizeOptionalText,
  parseRequiredDate,
  parseOptionalDate,
  mapFollowUpRecord,
  createFollowUpRecord,
  getFollowUpRecords,
  getFollowUpRecordById,
  getFollowUpRecordByEmail,
  markFollowUp1Sent,
  markFollowUp2Sent,
  markReplyDetected,
  markReplyCheckCompleted,
  setFollowUpError,
  removeFollowUpRecord,
  restoreFollowUpRecord,
  stopFollowUps,
  resumeFollowUps,
  deleteFollowUpRecord,
  getFollowUpSummary
};