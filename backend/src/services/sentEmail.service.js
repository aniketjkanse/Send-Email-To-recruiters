const {
  prisma
} = require(
  '../config/prisma'
);

function requireUserId(
  userId
) {
  const normalizedUserId =
    String(
      userId || ''
    ).trim();

  if (!normalizedUserId) {
    throw new Error(
      'Authenticated user ID is required.'
    );
  }

  return normalizedUserId;
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

function normalizeEmailType(
  value
) {
  const normalizedValue =
    String(
      value ||
      'INITIAL'
    )
      .trim()
      .toUpperCase();

  const allowedTypes = [
    'INITIAL',
    'FOLLOW_UP_1',
    'FOLLOW_UP_2'
  ];

  if (
    !allowedTypes.includes(
      normalizedValue
    )
  ) {
    throw new Error(
      `Invalid email type: ${normalizedValue}`
    );
  }

  return normalizedValue;
}

function normalizeStatus(
  value
) {
  const normalizedValue =
    String(
      value ||
      'SENT'
    )
      .trim()
      .toUpperCase();

  const allowedStatuses = [
    'SENT',
    'FAILED',
    'DRY_RUN',
    'SKIPPED'
  ];

  if (
    !allowedStatuses.includes(
      normalizedValue
    )
  ) {
    throw new Error(
      `Invalid email status: ${normalizedValue}`
    );
  }

  return normalizedValue;
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
  fieldName = 'Date'
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
    1000
  );
}

function getStartOfToday() {
  const date =
    new Date();

  date.setHours(
    0,
    0,
    0,
    0
  );

  return date;
}

function getStartOfTomorrow() {
  const date =
    getStartOfToday();

  date.setDate(
    date.getDate() + 1
  );

  return date;
}

function mapSentEmailRecord(
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

    recipientEmail:
      record.recipientEmail,

    email:
      record.recipientEmail,

    senderEmail:
      record.senderEmail ||
      '',

    subject:
      record.subject,

    messageId:
      record.messageId ||
      '',

    status:
      record.status,

    emailType:
      record.emailType,

    sentAt:
      record.sentAt,

    createdAt:
      record.createdAt
  };
}

/*
 * Create or update one SentEmail record.
 *
 * Unique key:
 *
 * userId + recipientEmail + emailType
 *
 * This ensures that the same user cannot
 * create duplicate successful records for
 * the same recipient and email stage.
 */
async function recordSentEmail(
  userId,
  input = {}
) {
  const normalizedUserId =
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

  const emailType =
    normalizeEmailType(
      input.emailType
    );

  const status =
    normalizeStatus(
      input.status
    );

  const sentAt =
    parseRequiredDate(
      input.sentAt,
      'Sent date'
    );

  const senderEmail =
    normalizeEmail(
      input.senderEmail
    ) || null;

  const messageId =
    normalizeOptionalText(
      input.messageId
    );

  const record =
    await prisma.sentEmail.upsert({
      where: {
        userId_recipientEmail_emailType: {
          userId:
            normalizedUserId,

          recipientEmail,

          emailType
        }
      },

      update: {
        senderEmail,

        subject,

        messageId,

        status,

        sentAt
      },

      create: {
        userId:
          normalizedUserId,

        recipientEmail,

        senderEmail,

        subject,

        messageId,

        status,

        emailType,

        sentAt
      }
    });

  return mapSentEmailRecord(
    record
  );
}

/*
 * Get all SentEmail records belonging
 * to the authenticated user.
 */
async function getSentEmails(
  userId,
  options = {}
) {
  const normalizedUserId =
    requireUserId(
      userId
    );

  const where = {
    userId:
      normalizedUserId
  };

  if (
    options.emailType
  ) {
    where.emailType =
      normalizeEmailType(
        options.emailType
      );
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
    options.recipientEmail ||
    options.email
  ) {
    const recipientEmail =
      normalizeEmail(
        options.recipientEmail ||
        options.email
      );

    if (recipientEmail) {
      where.recipientEmail =
        recipientEmail;
    }
  }

  const records =
    await prisma.sentEmail.findMany({
      where,

      orderBy: {
        sentAt:
          'desc'
      },

      take:
        normalizeLimit(
          options.limit,
          500
        )
    });

  return records.map(
    mapSentEmailRecord
  );
}

/*
 * Return one SentEmail record using
 * its PostgreSQL ID.
 */
async function getSentEmailById(
  userId,
  sentEmailId
) {
  const normalizedUserId =
    requireUserId(
      userId
    );

  const normalizedId =
    String(
      sentEmailId || ''
    ).trim();

  if (!normalizedId) {
    throw new Error(
      'SentEmail ID is required.'
    );
  }

  const record =
    await prisma.sentEmail.findFirst({
      where: {
        id:
          normalizedId,

        userId:
          normalizedUserId
      }
    });

  return mapSentEmailRecord(
    record
  );
}

/*
 * Check whether one email stage was
 * already sent to a recipient.
 */
async function hasSentEmail(
  userId,
  recipientEmail,
  emailType = 'INITIAL'
) {
  const normalizedUserId =
    requireUserId(
      userId
    );

  const normalizedRecipientEmail =
    normalizeEmail(
      recipientEmail
    );

  if (
    !normalizedRecipientEmail
  ) {
    throw new Error(
      'Recipient email is required.'
    );
  }

  const normalizedEmailType =
    normalizeEmailType(
      emailType
    );

  const record =
    await prisma.sentEmail.findUnique({
      where: {
        userId_recipientEmail_emailType: {
          userId:
            normalizedUserId,

          recipientEmail:
            normalizedRecipientEmail,

          emailType:
            normalizedEmailType
        }
      },

      select: {
        id:
          true
      }
    });

  return Boolean(
    record
  );
}

/*
 * Return only recipient email strings
 * already recorded for the user.
 *
 * This is useful for Preview duplicate
 * prevention.
 */
async function getSentRecipientEmails(
  userId,
  emailType = 'INITIAL'
) {
  const normalizedUserId =
    requireUserId(
      userId
    );

  const normalizedEmailType =
    normalizeEmailType(
      emailType
    );

  const records =
    await prisma.sentEmail.findMany({
      where: {
        userId:
          normalizedUserId,

        emailType:
          normalizedEmailType,

        status:
          'SENT'
      },

      select: {
        recipientEmail:
          true
      }
    });

  return records.map(
    record =>
      record.recipientEmail
  );
}

/*
 * Count successful emails sent today for
 * one user and one email type.
 *
 * Used by:
 *
 * Follow-Up 1 daily-limit calculation
 * Follow-Up 2 daily-limit calculation
 *
 * Local-server day boundaries are used:
 *
 * today 00:00:00
 * tomorrow 00:00:00
 */
async function countSentEmailsToday(
  userId,
  emailType = 'INITIAL'
) {
  const normalizedUserId =
    requireUserId(
      userId
    );

  const normalizedEmailType =
    normalizeEmailType(
      emailType
    );

  const startOfToday =
    getStartOfToday();

  const startOfTomorrow =
    getStartOfTomorrow();

  return prisma.sentEmail.count({
    where: {
      userId:
        normalizedUserId,

      emailType:
        normalizedEmailType,

      status:
        'SENT',

      sentAt: {
        gte:
          startOfToday,

        lt:
          startOfTomorrow
      }
    }
  });
}

/*
 * Count successful emails within a custom
 * date range.
 */
async function countSentEmailsBetween(
  userId,
  emailType,
  startDate,
  endDate
) {
  const normalizedUserId =
    requireUserId(
      userId
    );

  const normalizedEmailType =
    normalizeEmailType(
      emailType
    );

  const parsedStartDate =
    parseRequiredDate(
      startDate,
      'Start date'
    );

  const parsedEndDate =
    parseRequiredDate(
      endDate,
      'End date'
    );

  if (
    parsedEndDate.getTime() <=
    parsedStartDate.getTime()
  ) {
    throw new Error(
      'End date must be after start date.'
    );
  }

  return prisma.sentEmail.count({
    where: {
      userId:
        normalizedUserId,

      emailType:
        normalizedEmailType,

      status:
        'SENT',

      sentAt: {
        gte:
          parsedStartDate,

        lt:
          parsedEndDate
      }
    }
  });
}

/*
 * Return per-user SentEmail counts.
 */
async function getSentEmailSummary(
  userId
) {
  const normalizedUserId =
    requireUserId(
      userId
    );

  const [
    total,
    initial,
    followUp1,
    followUp2,
    initialToday,
    followUp1Today,
    followUp2Today
  ] = await Promise.all([
    prisma.sentEmail.count({
      where: {
        userId:
          normalizedUserId,

        status:
          'SENT'
      }
    }),

    prisma.sentEmail.count({
      where: {
        userId:
          normalizedUserId,

        status:
          'SENT',

        emailType:
          'INITIAL'
      }
    }),

    prisma.sentEmail.count({
      where: {
        userId:
          normalizedUserId,

        status:
          'SENT',

        emailType:
          'FOLLOW_UP_1'
      }
    }),

    prisma.sentEmail.count({
      where: {
        userId:
          normalizedUserId,

        status:
          'SENT',

        emailType:
          'FOLLOW_UP_2'
      }
    }),

    countSentEmailsToday(
      normalizedUserId,
      'INITIAL'
    ),

    countSentEmailsToday(
      normalizedUserId,
      'FOLLOW_UP_1'
    ),

    countSentEmailsToday(
      normalizedUserId,
      'FOLLOW_UP_2'
    )
  ]);

  return {
    total,

    initial,

    followUp1,

    followUp2,

    today: {
      initial:
        initialToday,

      followUp1:
        followUp1Today,

      followUp2:
        followUp2Today
    }
  };
}

/*
 * Delete one SentEmail record safely.
 */
async function deleteSentEmail(
  userId,
  sentEmailId
) {
  const normalizedUserId =
    requireUserId(
      userId
    );

  const normalizedId =
    String(
      sentEmailId || ''
    ).trim();

  if (!normalizedId) {
    throw new Error(
      'SentEmail ID is required.'
    );
  }

  const result =
    await prisma.sentEmail.deleteMany({
      where: {
        id:
          normalizedId,

        userId:
          normalizedUserId
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
 * Delete all SentEmail records belonging
 * to one authenticated user.
 */
async function deleteAllSentEmails(
  userId
) {
  const normalizedUserId =
    requireUserId(
      userId
    );

  const result =
    await prisma.sentEmail.deleteMany({
      where: {
        userId:
          normalizedUserId
      }
    });

  return {
    deleted:
      result.count > 0,

    deletedCount:
      result.count
  };
}

module.exports = {
  normalizeEmail,
  normalizeEmailType,
  normalizeStatus,
  normalizeOptionalText,
  parseRequiredDate,
  getStartOfToday,
  getStartOfTomorrow,
  mapSentEmailRecord,
  recordSentEmail,
  getSentEmails,
  getSentEmailById,
  hasSentEmail,
  getSentRecipientEmails,
  countSentEmailsToday,
  countSentEmailsBetween,
  getSentEmailSummary,
  deleteSentEmail,
  deleteAllSentEmails
};